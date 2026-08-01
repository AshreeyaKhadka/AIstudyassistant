from flask import Blueprint, jsonify, request
from sqlalchemy import or_
from urllib.parse import urlencode

from models.chat import ChatSession
from models.content import StudentUpload, Subject
from models.exam import Exam
from models.revision import RevisionPlan
from services.auth_service import login_required


search_bp = Blueprint('search', __name__)


def _like(value):
    return f"%{value.replace('%', '').replace('_', '')}%"


@search_bp.route('', methods=['GET'])
@login_required
def universal_search(user):
    query = (request.args.get('q') or '').strip()
    if len(query) < 2:
        return jsonify([]), 200
    pattern = _like(query)
    results = []

    uploads = StudentUpload.query.filter(
        StudentUpload.user_id == user.id,
        or_(StudentUpload.filename.ilike(pattern), StudentUpload.subject.ilike(pattern)),
    ).order_by(StudentUpload.created_at.desc()).limit(8).all()
    for upload in uploads:
        ready = upload.processing_status == 'ready' and upload.embedding_status == 'embedded'
        results.append({
            'type': 'syllabus' if upload.doc_type == 'syllabus' else 'document',
            'id': upload.id,
            'title': upload.filename,
            'subtitle': upload.subject or ('Personal syllabus' if upload.doc_type == 'syllabus' else 'Uploaded material'),
            'url': (
                f'/dashboard/syllabus?personal={upload.id}' if upload.doc_type == 'syllabus'
                else f'/dashboard/chat?{urlencode({"study_mode": "document", "upload_id": upload.id, "filename": upload.filename})}'
                if ready else '/dashboard/upload'
            ),
        })

    subjects = Subject.query.filter(
        Subject.user_id == user.id, Subject.name.ilike(pattern),
    ).order_by(Subject.semester.asc()).limit(8).all()
    for subject in subjects:
        results.append({
            'type': 'subject', 'id': subject.id, 'title': subject.name,
            'subtitle': f'Semester {subject.semester}',
            'url': f'/dashboard/syllabus?subject_id={subject.id}&semester={subject.semester}',
        })

    sessions = ChatSession.query.filter(
        ChatSession.user_id == user.id, ChatSession.title.ilike(pattern),
    ).order_by(ChatSession.updated_at.desc()).limit(6).all()
    for session in sessions:
        results.append({
            'type': 'chat', 'id': session.id, 'title': session.title or 'Study conversation',
            'subtitle': 'Chat history', 'url': f'/dashboard/chat?session_id={session.id}',
        })

    plans = RevisionPlan.query.filter(
        RevisionPlan.user_id == user.id,
        or_(RevisionPlan.title.ilike(pattern), RevisionPlan.subject.ilike(pattern), RevisionPlan.topic_title.ilike(pattern)),
    ).order_by(RevisionPlan.revision_date.asc()).limit(6).all()
    for plan in plans:
        results.append({
            'type': 'plan', 'id': plan.id, 'title': plan.title,
            'subtitle': f'{plan.revision_date} · {plan.subject or plan.event_type}',
            'url': f'/dashboard/revision?date={plan.revision_date}',
        })

    exams = Exam.query.filter(
        Exam.user_id == user.id,
        or_(Exam.title.ilike(pattern), Exam.subject.ilike(pattern)),
    ).order_by(Exam.exam_date.asc()).limit(6).all()
    for exam in exams:
        results.append({
            'type': 'exam', 'id': exam.id, 'title': exam.title,
            'subtitle': f'{exam.exam_date} · {exam.subject}',
            'url': f'/dashboard/revision?date={exam.exam_date}',
        })

    return jsonify(results[:24]), 200
