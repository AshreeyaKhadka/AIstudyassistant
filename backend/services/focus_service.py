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
from services.generation_service import _call_gemini, _parse_json_response
from services.rag_service import retrieve_context

logger = logging.getLogger(__name__)

def log_session(user_id, data):
    subject_id = data.get('subject_id')
    subject = Subject.query.filter_by(id=subject_id, user_id=user_id).first() if subject_id else None
    if not subject:
        raise ValueError('Choose a valid subject before starting focus mode.')
    session = StudySession(
        user_id=user_id,
        subject_id=subject.id,
        subject=subject.name,
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
    history = []
    for session in sessions:
        metadata = session.recall_metadata or {}
        history.append({
            "id": session.id,
            "subject_id": session.subject_id,
            "subject": session.subject,
            "topic": session.topic,
            "duration_minutes": session.duration_minutes,
            "completed": session.completed,
            "created_at": session.created_at.isoformat(),
            "recall_question": session.recall_question,
            "recall_answer": session.recall_answer,
            "recall_feedback": session.recall_feedback,
            "recall_score": session.recall_score,
            "recall_next_step": metadata.get('next_step'),
            "recall_citations": metadata.get('citations', []),
        })
    return history


def _recall_context(user_id, subject_id, topic):
    uploads = StudentUpload.query.filter_by(user_id=user_id, subject_id=subject_id).all()
    eligible = [
        upload for upload in uploads
        if upload.embedding_status == 'embedded'
        and (upload.doc_type == 'syllabus' or (
            upload.doc_type == 'material'
            and upload.admission_status == 'admitted'
            and upload.validation_status in {'approved', 'needs_review'}
        ))
    ]
    query = (topic or '').strip() or 'important concepts and key ideas'
    matches = []
    for upload in eligible[:8]:
        try:
            matches.extend(retrieve_context(upload_id=upload.id, query=query, top_k=2))
        except Exception as exc:
            logger.warning('Recall retrieval failed for upload %s: %s', upload.id, exc)
    matches.sort(key=lambda item: float(item.get('score', 0) or 0), reverse=True)
    selected = matches[:5]
    context = '\n\n'.join((item.get('text') or '').strip() for item in selected if item.get('text'))
    citations = []
    for item in selected[:3]:
        metadata = item.get('metadata') or {}
        citations.append({
            'upload_id': metadata.get('upload_id'),
            'filename': metadata.get('filename'),
            'page_number': metadata.get('page_number'),
            'heading': metadata.get('heading'),
        })
    return context[:9000], citations


def create_recall_question(user_id, session_id):
    session = StudySession.query.filter_by(id=session_id, user_id=user_id, completed=True).first()
    if not session:
        raise ValueError('Completed focus session not found.')
    if session.recall_question:
        return {
            'session_id': session.id,
            'question': session.recall_question,
            'citations': (session.recall_metadata or {}).get('citations', []),
            'grounded': bool((session.recall_metadata or {}).get('grounded')),
        }

    context, citations = _recall_context(user_id, session.subject_id, session.topic)
    grounded = bool(context)
    fallback = (
        f"Without looking at your notes, explain the most important idea you studied in "
        f"{session.subject}{f' about {session.topic}' if session.topic else ''}."
    )
    question = fallback
    if grounded:
        prompt = f"""Create one short active-recall question for a university student.
Subject: {session.subject}
Topic: {session.topic or 'general review'}
Use only the source context below. Ask for an explanation, comparison, or process; do not ask trivia.
Return JSON only: {{"question": "..."}}

SOURCE CONTEXT:
{context}"""
        try:
            generated = _parse_json_response(_call_gemini(prompt, temperature=0.25, max_tokens=180))
            if isinstance(generated, dict) and str(generated.get('question') or '').strip():
                question = str(generated['question']).strip()
        except Exception as exc:
            logger.warning('Recall question generation fell back to a general prompt: %s', exc)

    session.recall_question = question
    session.recall_metadata = {'grounded': grounded, 'citations': citations, 'context': context}
    db.session.commit()
    return {'session_id': session.id, 'question': question, 'citations': citations, 'grounded': grounded}


def evaluate_recall_answer(user_id, session_id, answer):
    session = StudySession.query.filter_by(id=session_id, user_id=user_id, completed=True).first()
    if not session or not session.recall_question:
        raise ValueError('Recall question not found.')
    clean_answer = str(answer or '').strip()
    if len(clean_answer) < 3:
        raise ValueError('Write a short answer before checking your recall.')

    metadata = session.recall_metadata or {}
    context = metadata.get('context') or ''
    result = None
    if context:
        prompt = f"""Evaluate a student's active-recall answer using only the source context.
Question: {session.recall_question}
Student answer: {clean_answer}
Source context: {context}

Return JSON only with:
{{"score": 0-100, "feedback": "two concise sentences", "next_step": "one concrete revision action"}}
Describe only the answer quality and useful review guidance. Do not say the answer was saved or stored."""
        try:
            parsed = _parse_json_response(_call_gemini(prompt, temperature=0.2, max_tokens=260))
            if isinstance(parsed, dict):
                result = parsed
        except Exception as exc:
            logger.warning('Recall evaluation unavailable: %s', exc)

    if not result:
        result = {
            'score': None,
            'feedback': 'Automated scoring is unavailable. Compare your answer with your notes and identify one important point you missed.',
            'next_step': 'Review the relevant section once, then explain it again without looking.',
        }
    score = result.get('score')
    try:
        score = max(0, min(100, float(score))) if score is not None else None
    except (TypeError, ValueError):
        score = None
    feedback = str(result.get('feedback') or '').strip()
    next_step = str(result.get('next_step') or '').strip()
    session.recall_answer = clean_answer
    session.recall_feedback = feedback
    session.recall_score = score
    session.recall_metadata = {**metadata, 'context': None, 'next_step': next_step}
    db.session.commit()
    return {
        'session_id': session.id,
        'score': score,
        'feedback': feedback,
        'next_step': next_step,
        'citations': metadata.get('citations', []),
    }

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
