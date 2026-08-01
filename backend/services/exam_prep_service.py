import os
from datetime import datetime, timedelta
from models.content import Subject, StudentUpload
from models.exam import Exam
from models.quiz import QuizSet
from config import db
from services.document_admission import is_upload_usable


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


def _eligible_exam_materials(uploads):
    return [
        upload for upload in uploads
        if upload.doc_type == 'material'
        and upload.filename.lower().endswith('.pdf')
        and upload.embedding_status == 'embedded'
        and upload.processing_status == 'ready'
        and is_upload_usable(upload)
    ]


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


def _priority_score(weak_topics, days_left):
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
    return round(weak_topics * 12 + urgency)


def get_exam_prep_overview(user):
    user_sem = user.semester if user.semester else 1
    all_uploads = (
        StudentUpload.query.filter_by(user_id=user.id)
        .order_by(StudentUpload.created_at.desc(), StudentUpload.id.desc())
        .all()
    )
    eligible_uploads = _eligible_exam_materials(all_uploads)
    subject_ids = {upload.subject_id for upload in eligible_uploads if upload.subject_id}
    subjects_by_id = {
        subject.id: subject
        for subject in Subject.query.filter(
            Subject.user_id == user.id,
            Subject.id.in_(subject_ids),
        ).all()
    } if subject_ids else {}

    grouped_uploads = {}
    for upload in eligible_uploads:
        subject = subjects_by_id.get(upload.subject_id)
        subject_name = (subject.name if subject else upload.subject or '').strip()
        if not subject_name:
            subject_name = os.path.splitext(upload.filename)[0].replace('_', ' ').strip()
        key = ('subject', subject.id) if subject else ('name', subject_name.casefold())
        group = grouped_uploads.setdefault(key, {
            'subject': subject,
            'name': subject_name,
            'uploads': [],
        })
        group['uploads'].append(upload)

    subject_rows = []
    for group in grouped_uploads.values():
        subject = group['subject']
        subject_name = group['name']
        eligible_materials = group['uploads']
        uploads = _subject_uploads(user.id, subject) if subject else eligible_materials
        quizzes = _subject_quizzes(user.id, subject, uploads) if subject else []
        weak_topics = _weak_topic_count(quizzes)
        last_practiced = _last_practiced(quizzes)
        exam_info = _nearest_exam(user.id, subject_name)
        days_left = exam_info['days_left'] if exam_info else None
        primary_upload = eligible_materials[0] if eligible_materials else None

        subject_rows.append({
            'id': subject.id if subject else f'upload-{primary_upload.id}',
            'name': subject_name,
            'semester': subject.semester if subject else None,
            'weak_topics': weak_topics,
            'last_practiced': last_practiced,
            'materials_count': len(eligible_materials),
            'has_materials': bool(eligible_materials),
            'primary_upload_id': primary_upload.id if primary_upload else None,
            'eligible_materials': [{
                'id': upload.id,
                'filename': upload.filename,
                'page_count': upload.page_count,
                'size_bytes': upload.size_bytes,
            } for upload in eligible_materials],
            'exam': exam_info,
            'days_until_exam': days_left,
            'priority_score': _priority_score(weak_topics, days_left),
            'status_label': _status_label(
                weak_topics, last_practiced, days_left, len(eligible_materials),
            ),
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


def _status_label(weak_topics, last_practiced, days_left, material_count):
    if days_left is not None:
        return f'Exam in {days_left} day{"s" if days_left != 1 else ""}'
    if weak_topics >= 2:
        return f'{weak_topics} weak areas detected'
    if last_practiced:
        return f'Last practiced {last_practiced}'
    return f'{material_count} ready PDF{"s" if material_count != 1 else ""}'


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
