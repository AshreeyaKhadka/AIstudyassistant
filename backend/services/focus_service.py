from models.focus import StudySession, UserAchievement
from models.user import User
from models.revision import RevisionPlan
from models.exam import Exam
from models.quiz import QuizSet
from models.content import StudentUpload, Subject
from config import db
from datetime import datetime, timedelta

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
