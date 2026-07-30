from models.focus import StudySession, UserAchievement
from models.user import User
from models.revision import RevisionPlan
from models.exam import Exam
from models.quiz import QuizSet
from models.content import StudentUpload, Subject
from config import Config, db
from datetime import datetime, timedelta
import logging
import requests

logger = logging.getLogger(__name__)

def log_session(user_id, data):
    session = StudySession(
        user_id=user_id,
        subject=data.get('subject', 'General'),
        topic=data.get('topic'),
        duration_minutes=data.get('duration_minutes', 0),
        break_duration_minutes=data.get('break_duration_minutes', 0),
        completed=data.get('completed', False),
        notes=data.get('notes')
    )
    db.session.add(session)
    db.session.commit()
    
    # Check for achievements
    check_achievements(user_id)
    
    return {"message": "Session logged successfully", "id": session.id}

def get_history(user_id):
    sessions = StudySession.query.filter_by(user_id=user_id).order_by(StudySession.created_at.desc()).all()
    return [{
        "id": s.id,
        "subject": s.subject,
        "topic": s.topic,
        "duration_minutes": s.duration_minutes,
        "completed": s.completed,
        "created_at": s.created_at.isoformat()
    } for s in sessions]

def get_analytics(user_id):
    sessions = StudySession.query.filter_by(user_id=user_id).all()
    total_minutes = sum(s.duration_minutes for s in sessions if s.completed)
    total_hours = round(total_minutes / 60, 2)
    
    # Simple streak calculation based on days with at least one completed session
    dates_studied = sorted(list(set(s.created_at.date() for s in sessions if s.completed)), reverse=True)
    streak = 0
    current_date = datetime.utcnow().date()
    
    for date in dates_studied:
        if current_date - date <= timedelta(days=1):
            streak += 1
            current_date = date
        else:
            break
            
    # Calculate hours this week
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    week_sessions = [s for s in sessions if s.created_at >= one_week_ago and s.completed]
    week_hours = round(sum(s.duration_minutes for s in week_sessions) / 60, 2)

    return {
        "total_hours": total_hours,
        "streak": streak,
        "week_hours": week_hours,
        "total_sessions": len(sessions)
    }

def get_recommendations(user_id):
    # Deterministic recommendation engine bridging real user activity across modules.
    recommendations = []
    today = datetime.utcnow().date()
    
    # 1. Check upcoming exams
    upcoming_exams = Exam.query.filter_by(user_id=user_id).order_by(Exam.exam_date.asc()).all()
    
    for exam in upcoming_exams:
        try:
            exam_date = datetime.strptime(exam.exam_date, '%Y-%m-%d').date()
        except (TypeError, ValueError):
            continue
        days_away = (exam_date - today).days
        if days_away < 0:
            continue
        if days_away <= 7:
            recommendations.append({
                "type": "exam",
                "message": f"{exam.subject} exam is in {days_away} days! Prioritize this.",
                "subject": exam.subject,
                "priority": "high"
            })
            
    # 2. Check quiz history and recommend recent weak context.
    quizzes = QuizSet.query.filter_by(user_id=user_id).all()
    if quizzes:
        recent_quiz = quizzes[-1]
        recommendations.append({
            "type": "quiz_review",
            "message": f"Review concepts from your recent {recent_quiz.topic} quiz.",
            "subject": recent_quiz.topic,
            "priority": "medium"
        })
        
    # 3. Check pending revision plans
    pending_revisions = RevisionPlan.query.filter_by(user_id=user_id, status='pending').order_by(RevisionPlan.revision_date.asc()).all()
    if pending_revisions:
        rev = pending_revisions[0]
        recommendations.append({
            "type": "revision",
            "message": f"You have a pending revision for {rev.title}.",
            "subject": rev.subject,
            "priority": "medium"
        })

    # 4. Check syllabus/RAG readiness from actual uploads.
    subjects = Subject.query.filter_by(user_id=user_id).all()
    for subject in subjects[:8]:
        has_syllabus = StudentUpload.query.filter_by(user_id=user_id, subject_id=subject.id, doc_type='syllabus').first()
        if not has_syllabus:
            recommendations.append({
                "type": "syllabus_gap",
                "message": f"Add or activate syllabus context for {subject.name} before AI-heavy practice.",
                "subject": subject.name,
                "priority": "low"
            })
            break

    # Fallback recommendation
    if not recommendations:
        recommendations.append({
            "type": "general",
            "message": "Start a 25-minute Pomodoro session on your weakest subject.",
            "subject": "General",
            "priority": "low"
        })

    return recommendations

def _parse_ai_response(response):
    try:
        data = response.json()
    except ValueError:
        return ''

    if not isinstance(data, dict):
        return ''

    candidates = data.get('candidates') or []
    if not candidates:
        return ''

    content = (candidates[0] or {}).get('content') or {}
    parts = content.get('parts') or []
    return '\n'.join(
        part.get('text', '')
        for part in parts
        if isinstance(part, dict) and part.get('text')
    ).strip()

def get_ai_coach_response(user_id, data):
    if not Config.GEMINI_API_KEY:
        raise RuntimeError('Gemini API key is not configured.')

    prompt = data.get('prompt', '')
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError('Prompt is required.')

    subject = data.get('subject') or 'General'
    topic = data.get('topic') or 'Review'
    focus_minutes = data.get('focus_minutes')
    break_minutes = data.get('break_minutes')

    recent_sessions = (
        StudySession.query.filter_by(user_id=user_id)
        .order_by(StudySession.created_at.desc())
        .limit(6)
        .all()
    )
    session_context = '\n'.join(
        f"- {session.subject} / {session.topic or 'Review'}: {session.duration_minutes} min, completed={session.completed}"
        for session in recent_sessions
    ) or 'No completed focus sessions yet.'

    uploads = (
        StudentUpload.query.filter_by(user_id=user_id)
        .order_by(StudentUpload.created_at.desc())
        .limit(3)
        .all()
    )
    material_context = ', '.join(upload.filename for upload in uploads) or 'No uploaded materials yet.'

    system_prompt = (
        'You are AiStudy Focus Coach. Give concise, actionable study guidance for a timed focus session. '
        'Prefer concrete steps, short checklists, and realistic scope. Do not invent facts from unavailable materials. '
        'Keep the response under 180 words.'
    )
    user_prompt = (
        f"{system_prompt}\n\n"
        f"Current focus session:\n"
        f"- Subject: {subject}\n"
        f"- Topic: {topic}\n"
        f"- Focus minutes: {focus_minutes or 'not specified'}\n"
        f"- Break minutes: {break_minutes or 'not specified'}\n\n"
        f"Recent focus history:\n{session_context}\n\n"
        f"Available material filenames: {material_context}\n\n"
        f"Student request: {prompt.strip()}"
    )

    payload = {
        'contents': [{'role': 'user', 'parts': [{'text': user_prompt}]}],
        'generationConfig': {
            'temperature': 0.35,
            'maxOutputTokens': 320,
        },
    }

    try:
        response = requests.post(
            f"{Config.GEMINI_API_BASE_URL.rstrip('/')}/models/{Config.GEMINI_MODEL}:generateContent",
            headers={'x-goog-api-key': Config.GEMINI_API_KEY},
            json=payload,
            timeout=45,
        )
    except requests.RequestException as exc:
        logger.error(f'Focus coach Gemini request failed: {exc}')
        raise RuntimeError('Unable to reach the AI service right now.') from exc

    if response.status_code >= 400:
        logger.error(f'Focus coach Gemini API error {response.status_code}: {response.text}')
        raise RuntimeError('AI service returned an error.')

    reply = _parse_ai_response(response)
    if not reply:
        raise RuntimeError('The AI service returned an empty response.')

    return {
        'reply': reply,
        'subject': subject,
        'topic': topic,
    }

def check_achievements(user_id):
    sessions = StudySession.query.filter_by(user_id=user_id, completed=True).all()
    achievements = UserAchievement.query.filter_by(user_id=user_id).all()
    earned = [a.achievement_type for a in achievements]
    
    new_achievements = []
    
    if len(sessions) >= 1 and 'First Step' not in earned:
        new_achievements.append('First Step')
        
    if sum(s.duration_minutes for s in sessions) >= 600 and '10 Hours' not in earned:
        new_achievements.append('10 Hours')
        
    for ac in new_achievements:
        db.session.add(UserAchievement(user_id=user_id, achievement_type=ac))
        
    db.session.commit()
