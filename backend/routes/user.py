from flask import Blueprint, jsonify, request
from models import User, StudentUpload, ChatSession, QuizSet, RevisionPlan, Subject, StudySession, TopicProgress, Exam
from services.auth_service import login_required
from config import db
from datetime import datetime, timedelta

user_bp = Blueprint('user', __name__)


def _is_flashcard_item(item):
    return isinstance(item, dict) and 'front' in item and 'back' in item


def _is_mcq_item(item):
    return isinstance(item, dict) and 'question' in item and ('options' in item or 'correct' in item)


def _mcq_answer(item):
    if not isinstance(item, dict):
        return ''
    if item.get('correct_answer'):
        return item['correct_answer']
    correct = item.get('correct')
    options = item.get('options')
    if correct and isinstance(options, dict):
        return options.get(correct, correct)
    if isinstance(options, list) and options:
        return options[0]
    if isinstance(options, dict) and options:
        return next(iter(options.values()), '')
    return ''


def _compute_study_streak(user_id):
    sessions = StudySession.query.filter_by(user_id=user_id, completed=True).all()
    dates_studied = sorted(
        {s.created_at.date() for s in sessions if s.created_at},
        reverse=True,
    )
    streak = 0
    current_date = datetime.utcnow().date()
    for date in dates_studied:
        if current_date - date <= timedelta(days=1):
            streak += 1
            current_date = date
        else:
            break
    return streak


@user_bp.route('/dashboard', methods=['GET'])
@login_required
def get_dashboard_data(user):
    user_id = user.id

    # 1. Student Profile & Stats
    uploads = StudentUpload.query.filter_by(user_id=user_id).all()
    material_uploads = [
        upload for upload in uploads
        if upload.doc_type == 'material' and (upload.admission_status or 'admitted') == 'admitted'
    ]
    uploads_count = len(uploads)
    quizzes = QuizSet.query.filter_by(user_id=user_id).all()
    quizzes_count = len(quizzes)
    chats_count = ChatSession.query.filter_by(user_id=user_id).count()
    pending_revisions = RevisionPlan.query.filter_by(user_id=user_id, status='pending').count()
    notes_count = sum(1 for u in uploads if u.parsed_text and u.parsed_text.strip())
    user_subjects = Subject.query.filter_by(user_id=user_id).all()

    # Flashcards: only count persisted front/back pairs (not MCQ sets)
    total_flashcards = 0
    total_quiz_score_pct = []
    for q in quizzes:
        if not isinstance(q.questions_json, list):
            continue
        for item in q.questions_json:
            if _is_flashcard_item(item):
                total_flashcards += 1
        if q.score is not None and q.completed_at and _is_mcq_item(q.questions_json[0]):
            mcq_count = sum(1 for item in q.questions_json if _is_mcq_item(item))
            if mcq_count > 0:
                total_quiz_score_pct.append(round((q.score / mcq_count) * 100))

    avg_quiz_accuracy = (
        round(sum(total_quiz_score_pct) / len(total_quiz_score_pct))
        if total_quiz_score_pct else None
    )

    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_sessions = StudySession.query.filter(
        StudySession.user_id == user_id,
        StudySession.completed == True,
        StudySession.created_at >= week_ago,
    ).all()
    weekly_study_hours = round(
        sum(s.duration_minutes for s in weekly_sessions) / 60,
        1,
    )
    study_streak = _compute_study_streak(user_id)

    # Academic progress follows the topics represented by admitted uploaded materials.
    user_sem = user.semester if user.semester else 1
    tracked_keys = {
        (upload.subject_id, str(item.get('topic_id')))
        for upload in material_uploads
        for item in ((upload.validation_details or {}).get('matched_topics') or [])
        if upload.subject_id and isinstance(item, dict) and item.get('topic_id')
    }
    tracked_rows = [
        row for row in TopicProgress.query.filter_by(user_id=user_id).all()
        if (row.subject_id, row.topic_id) in tracked_keys
    ]
    academic_progress = round(
        sum(1 for row in tracked_rows if row.covered) * 100 / len(tracked_keys)
    ) if tracked_keys else 0
    active_subjects = [s for s in user_subjects if s.is_current or s.is_backlog]

    student_data = {
        'name': user.name,
        'semester': f"{user_sem}th Semester",
        'department': user.college or 'Computer Engineering',
        'streak': study_streak,
        'academicProgress': academic_progress,
        'stats': {
            'totalNotes': notes_count,
            'flashcardsCompleted': total_flashcards,
            'uploadedPDFs': uploads_count,
            'weeklyStudyHours': weekly_study_hours,
            'quizAccuracy': avg_quiz_accuracy,
            'pendingRevision': pending_revisions,
        }
    }

    # 2. Recent Queries (from ChatSession)
    recent_sessions = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.updated_at.desc()).limit(3).all()
    recent_queries = []
    for s in recent_sessions:
        sub_name = 'General'
        if s.subject_id:
            sub_obj = Subject.query.get(s.subject_id)
            if sub_obj:
                sub_name = sub_obj.name
        recent_queries.append({
            'id': s.id,
            'title': s.title or "New Conversation",
            'subject': sub_name,
            'time': s.updated_at.strftime('%b %d, %H:%M') if s.updated_at else 'Recent'
        })

    # 3. Uploaded Materials
    recent_uploads = StudentUpload.query.filter_by(user_id=user_id).order_by(StudentUpload.created_at.desc()).limit(3).all()
    uploaded_materials = []
    for u in recent_uploads:
        uploaded_materials.append({
            'id': u.id,
            'filename': u.filename,
            'subject': u.subject or 'General',
            'date': u.created_at.strftime('%b %d, %Y') if u.created_at else 'Recently',
            'size': f"{round(u.size_bytes / 1024 / 1024, 2)} MB" if u.size_bytes else "0.1 MB",
            'type': u.filename.split('.')[-1] if '.' in u.filename else 'file'
        })

    # 4. Flashcards Preview (front/back pairs only — not MCQ sets)
    recent_quizzes = QuizSet.query.filter_by(user_id=user_id).order_by(QuizSet.created_at.desc()).limit(10).all()
    flashcards = []
    for q in recent_quizzes:
        if not isinstance(q.questions_json, list):
            continue
        for idx, item in enumerate(q.questions_json):
            if not _is_flashcard_item(item):
                continue
            flashcards.append({
                'id': f'{q.id}_{idx}',
                'question': item['front'],
                'answer': item['back'],
                'subject': q.topic or 'General',
            })
            if len(flashcards) >= 3:
                break
        if len(flashcards) >= 3:
            break

    # 5. Generated Notes Preview (from StudentUpload or RevisionPlan)
    generated_notes = []
    for u in recent_uploads:
        if u.parsed_text:
            snippet = u.parsed_text[:120].strip() + "..."
            generated_notes.append({
                'id': u.id,
                'title': f"Summary: {u.filename}",
                'snippet': snippet,
                'subject': u.subject or 'General',
                'date': u.created_at.strftime('%b %d') if u.created_at else 'Recent'
            })

    # 6. Dynamic AI Recommendations based on user subjects and activity
    recommendations = []
    if active_subjects:
        for s in active_subjects[:3]:
            has_syllabus = StudentUpload.query.filter_by(subject_id=s.id, doc_type='syllabus').first()
            if not has_syllabus:
                recommendations.append({
                    'id': f"rec_{s.id}",
                    'title': f"Upload Syllabus for {s.name}",
                    'subject': f"Semester {s.semester} • Pending",
                    'type': 'upload'
                })
            else:
                recommendations.append({
                    'id': f"rec_{s.id}",
                    'title': f"Practice MCQs for {s.name}",
                    'subject': f"Semester {s.semester} • Ready",
                    'type': 'mcq'
                })
    if not recommendations:
        recommendations.append({
            'id': 'rec_default',
            'title': 'Upload your first syllabus or PDF',
            'subject': 'Getting Started',
            'type': 'upload'
        })

    today = datetime.utcnow().strftime('%Y-%m-%d')
    calendar_items = [
        {
            'id': f'plan-{plan.id}', 'title': plan.title, 'subject': plan.subject or 'General',
            'date': plan.revision_date, 'start_time': plan.start_time, 'type': plan.event_type or 'Study Session',
        }
        for plan in RevisionPlan.query.filter(
            RevisionPlan.user_id == user_id,
            RevisionPlan.status == 'pending',
            RevisionPlan.revision_date >= today,
        ).all()
    ]
    calendar_items.extend({
        'id': f'exam-{exam.id}', 'title': exam.title, 'subject': exam.subject,
        'date': exam.exam_date, 'start_time': exam.start_time, 'type': 'Exam',
    } for exam in Exam.query.filter(Exam.user_id == user_id, Exam.exam_date >= today).all())
    calendar_items.sort(key=lambda item: (item['date'], item.get('start_time') or '23:59'))

    return jsonify({
        'studentData': student_data,
        'recentQueries': recent_queries,
        'uploadedMaterials': uploaded_materials,
        'sharedResources': [],
        'flashcards': flashcards,
        'generatedNotes': generated_notes,
        'recommendations': recommendations,
        'revisionSchedule': calendar_items[:3],
    }), 200
