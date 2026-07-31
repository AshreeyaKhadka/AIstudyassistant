from datetime import datetime, timedelta
from models.content import Subject, StudentUpload
from models.exam import Exam
from models.quiz import QuizSet
from config import db


def _is_mcq_item(item):
    return isinstance(item, dict) and 'question' in item and ('options' in item or 'correct' in item)


def _subject_uploads(user_id, subject):
    by_id = StudentUpload.query.filter_by(user_id=user_id, subject_id=subject.id).all()
    by_name = StudentUpload.query.filter_by(user_id=user_id, subject=subject.name).all()
    seen = {u.id for u in by_id}
    merged = list(by_id)
    for upload in by_name:
        if upload.id not in seen:
            merged.append(upload)
            seen.add(upload.id)
    return merged


def _subject_quizzes(user_id, subject, uploads):
    upload_ids = [u.id for u in uploads]
    quizzes = QuizSet.query.filter_by(user_id=user_id).all()
    matched = []
    for quiz in quizzes:
        topic = (quiz.topic or '').lower()
        if quiz.upload_id and quiz.upload_id in upload_ids:
            matched.append(quiz)
        elif subject.name.lower() in topic:
            matched.append(quiz)
    return matched


def _coverage_pct(uploads):
    if not uploads:
        return 0
    has_syllabus = any(u.doc_type == 'syllabus' for u in uploads)
    material_count = sum(1 for u in uploads if u.doc_type != 'syllabus')
    if has_syllabus and material_count >= 2:
        return 100
    if has_syllabus:
        return 65
    if material_count >= 2:
        return 45
    if material_count == 1:
        return 25
    return 10


def _weak_topic_count(quizzes):
    weak = 0
    for quiz in quizzes:
        if quiz.score is None or not isinstance(quiz.questions_json, list):
            continue
        mcq_count = sum(1 for item in quiz.questions_json if _is_mcq_item(item))
        if mcq_count == 0:
            continue
        accuracy = (quiz.score / mcq_count) * 100
        if accuracy < 60:
            weak += 1
    return weak


def _last_practiced(quizzes):
    dates = [q.completed_at for q in quizzes if q.completed_at]
    if not dates:
        return None
    latest = max(dates)
    return latest.strftime('%b %d, %Y')


def _nearest_exam(user_id, subject_name):
    today = datetime.utcnow().date()
    exams = Exam.query.filter_by(user_id=user_id, subject=subject_name).order_by(Exam.exam_date.asc()).all()
    for exam in exams:
        try:
            exam_date = datetime.strptime(exam.exam_date, '%Y-%m-%d').date()
        except ValueError:
            continue
        if exam_date >= today:
            days_left = (exam_date - today).days
            return {
                'id': exam.id,
                'exam_date': exam.exam_date,
                'days_left': days_left,
                'title': exam.title,
            }
    return None


def _priority_score(coverage, weak_topics, days_left):
    urgency = 0
    if days_left is not None:
        if days_left <= 7:
            urgency = 100
        elif days_left <= 14:
            urgency = 70
        elif days_left <= 30:
            urgency = 40
        else:
            urgency = max(10, 60 - days_left)
    return round((100 - coverage) * 1.5 + weak_topics * 12 + urgency)


def get_exam_prep_overview(user):
    user_sem = user.semester if user.semester else 1
    subjects = Subject.query.filter_by(user_id=user.id, semester=user_sem).order_by(Subject.name.asc()).all()

    subject_rows = []
    for subject in subjects:
        uploads = _subject_uploads(user.id, subject)
        quizzes = _subject_quizzes(user.id, subject, uploads)
        coverage = _coverage_pct(uploads)
        weak_topics = _weak_topic_count(quizzes)
        last_practiced = _last_practiced(quizzes)
        exam_info = _nearest_exam(user.id, subject.name)
        days_left = exam_info['days_left'] if exam_info else None
        primary_upload = next((u for u in uploads if u.embedding_status == 'embedded'), None)
        if not primary_upload and uploads:
            primary_upload = uploads[0]

        subject_rows.append({
            'id': subject.id,
            'name': subject.name,
            'semester': subject.semester,
            'syllabus_coverage': coverage,
            'weak_topics': weak_topics,
            'last_practiced': last_practiced,
            'materials_count': len(uploads),
            'has_materials': len(uploads) > 0,
            'primary_upload_id': primary_upload.id if primary_upload else None,
            'exam': exam_info,
            'days_until_exam': days_left,
            'priority_score': _priority_score(coverage, weak_topics, days_left),
            'status_label': _status_label(coverage, weak_topics, last_practiced, days_left),
        })

    subject_rows.sort(key=lambda row: (-row['priority_score'], row['name']))

    nearest = None
    for row in subject_rows:
        if row['exam']:
            if nearest is None or row['days_until_exam'] < nearest['days_left']:
                nearest = {
                    'subject': row['name'],
                    'days_left': row['days_until_exam'],
                    'exam_date': row['exam']['exam_date'],
                }

    return {
        'semester': user_sem,
        'subjects': subject_rows,
        'nearest_exam': nearest,
        'total_subjects': len(subject_rows),
    }


def _status_label(coverage, weak_topics, last_practiced, days_left):
    if days_left is not None and days_left <= 7:
        return f'Exam in {days_left} day{"s" if days_left != 1 else ""}'
    if weak_topics >= 2:
        return f'{weak_topics} weak areas detected'
    if coverage >= 80:
        return f'{coverage}% syllabus covered'
    if last_practiced:
        return f'Last practiced {last_practiced}'
    if coverage > 0:
        return f'{coverage}% syllabus covered'
    return 'Upload materials to begin prep'


def upsert_subject_exam_date(user, subject_name, exam_date, exam_type='final'):
    if not subject_name or not exam_date:
        raise ValueError('Subject and exam date are required')

    existing = Exam.query.filter_by(
        user_id=user.id,
        subject=subject_name,
        exam_type=exam_type,
    ).first()

    title = f'{subject_name} {exam_type.replace("_", " ").title()}'

    if existing:
        existing.exam_date = exam_date
        existing.title = title
        db.session.commit()
        return existing.to_dict()

    exam = Exam(
        user_id=user.id,
        title=title,
        exam_type=exam_type,
        subject=subject_name,
        exam_date=exam_date,
    )
    db.session.add(exam)
    db.session.commit()
    return exam.to_dict()
