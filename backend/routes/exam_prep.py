from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from services.exam_prep_service import get_exam_prep_overview, upsert_subject_exam_date
from services.generation_service import generate_exam_questions, generate_blueprint_sheet, generate_rapid_revision, generate_mock_test
from services.document_admission import is_upload_usable
from services.rag_service import get_full_context
from models.content import Subject, StudentUpload
from models.quiz import QuizSet
from config import db
from services.api_response import ai_service_error_response
import logging
import traceback

exam_prep_bp = Blueprint('exam_prep', __name__)
logger = logging.getLogger(__name__)


def _resolve_upload(user, subject_name, upload_id=None):
    if upload_id:
        upload = StudentUpload.query.filter_by(id=upload_id, user_id=user.id).first()
        if upload and _upload_allowed_for_generation(upload):
            return upload

    subject = Subject.query.filter_by(user_id=user.id, name=subject_name).first()
    if subject:
        uploads = (
            StudentUpload.query.filter_by(user_id=user.id, subject_id=subject.id, embedding_status='embedded')
            .order_by(StudentUpload.created_at.desc())
            .all()
        )
        for upload in uploads:
            if _upload_allowed_for_generation(upload):
                return upload

    active_syllabus = (
        StudentUpload.query.filter_by(user_id=user.id, doc_type='syllabus', is_active_syllabus=True, embedding_status='embedded')
        .order_by(StudentUpload.created_at.desc())
        .first()
    )
    if not active_syllabus:
        active_syllabus = (
            StudentUpload.query.filter_by(doc_type='syllabus', syllabus_kind='official', embedding_status='embedded')
            .order_by(StudentUpload.created_at.desc())
            .first()
        )
    if active_syllabus:
        return active_syllabus

    fallback = (
        StudentUpload.query.filter_by(user_id=user.id, subject=subject_name, embedding_status='embedded')
        .order_by(StudentUpload.created_at.desc())
        .first()
    )
    if fallback and _upload_allowed_for_generation(fallback):
        return fallback
    return None


def _upload_allowed_for_generation(upload):
    if upload.doc_type == 'syllabus':
        return True
    return upload.embedding_status == 'embedded' and is_upload_usable(upload)


def _resolve_exact_exam_pdf(user, upload_id, subject_name):
    if not upload_id:
        return None
    upload = StudentUpload.query.filter_by(id=upload_id, user_id=user.id).first()
    if not upload or upload.doc_type != 'material' or not upload.filename.lower().endswith('.pdf'):
        return None
    if not _upload_allowed_for_generation(upload) or upload.processing_status != 'ready':
        return None
    if subject_name and (upload.subject or '').casefold() != subject_name.casefold():
        subject = Subject.query.filter_by(id=upload.subject_id, user_id=user.id).first()
        if not subject or subject.name.casefold() != subject_name.casefold():
            return None
    return upload


@exam_prep_bp.route('/overview', methods=['GET'])
@login_required
def overview(user):
    try:
        return jsonify(get_exam_prep_overview(user)), 200
    except Exception as e:
        logger.error(f"Exam prep overview failed: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to load exam prep overview"}), 500


@exam_prep_bp.route('/exam-date', methods=['POST'])
@login_required
def set_exam_date(user):
    data = request.get_json(silent=True) or {}
    subject = (data.get('subject') or '').strip()
    exam_date = (data.get('exam_date') or '').strip()
    exam_type = (data.get('exam_type') or 'final').strip()

    if not subject or not exam_date:
        return jsonify({"error": "Subject and exam_date are required"}), 400

    try:
        exam = upsert_subject_exam_date(user, subject, exam_date, exam_type)
        overview = get_exam_prep_overview(user)
        return jsonify({"exam": exam, "overview": overview}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Failed to set exam date: {e}")
        return jsonify({"error": "Failed to save exam date"}), 500


@exam_prep_bp.route('/high-yield', methods=['POST'])
@login_required
def high_yield_questions(user):
    data = request.get_json(silent=True) or {}
    subject = (data.get('subject') or '').strip()
    upload_id = data.get('upload_id')
    intensity = (data.get('intensity') or 'medium').strip()

    upload = _resolve_exact_exam_pdf(user, upload_id, subject)
    if not upload:
        return jsonify({"error": "Choose one ready, approved PDF for this subject. Exam questions never fall back to another source."}), 400

    try:
        context = get_full_context(upload.id, max_chunks=100)
        if not context:
            return jsonify({"error": "No content found for this document"}), 400

        questions = generate_exam_questions(context, subject=subject or upload.subject)
        disclaimer = (
            'These are AI-generated exam suggestions based only on the selected PDF. '
            'They may not match the actual Pokhara University examination. '
            'Use them for practice, not as guaranteed questions.'
        )
        return jsonify({
            "subject": subject or upload.subject,
            "upload_id": upload.id,
            "source_doc": upload.filename,
            "questions": questions,
            "question_count": len(questions),
            "marks_distribution": {
                "5": sum(1 for question in questions if question['marks'] == 5),
                "8": sum(1 for question in questions if question['marks'] == 8),
            },
            "ai_generated": True,
            "disclaimer": disclaimer,
            "intensity": intensity,
        }), 200
    except Exception as e:
        logger.error(f"High yield generation failed: {e}\n{traceback.format_exc()}")
        return ai_service_error_response(e)


@exam_prep_bp.route('/blueprint', methods=['POST'])
@login_required
def blueprint_sheet(user):
    data = request.get_json(silent=True) or {}
    subject = (data.get('subject') or '').strip()
    upload_id = data.get('upload_id')

    upload = _resolve_upload(user, subject, upload_id)
    if not upload:
        return jsonify({"error": "No embedded study material found for this subject."}), 400

    try:
        context = get_full_context(upload.id, max_chunks=18)
        if not context:
            return jsonify({"error": "No content found for this document"}), 400

        sheet = generate_blueprint_sheet(context, subject=subject or upload.subject)
        return jsonify({
            "subject": subject or upload.subject,
            "upload_id": upload.id,
            "source_doc": upload.filename,
            "blueprint": sheet,
        }), 200
    except Exception as e:
        logger.error(f"Blueprint generation failed: {e}\n{traceback.format_exc()}")
        return ai_service_error_response(e)


@exam_prep_bp.route('/mock-test', methods=['POST'])
@login_required
def mock_test(user):
    data = request.get_json(silent=True) or {}
    subject = (data.get('subject') or '').strip()
    upload_id = data.get('upload_id')

    upload = _resolve_upload(user, subject, upload_id)
    if not upload:
        return jsonify({"error": "No approved embedded study material found for this subject."}), 400

    try:
        context = get_full_context(upload.id, max_chunks=25)
        if not context:
            return jsonify({"error": "No content found for this document"}), 400
        test = generate_mock_test(context, subject=subject or upload.subject)
        questions = [question for section in test['sections'] for question in section.get('questions', [])]
        assessment = QuizSet(
            user_id=user.id,
            subject_id=upload.subject_id,
            upload_id=upload.id,
            topic=subject or upload.subject or upload.filename,
            assessment_type='mock_test',
            title=test['title'],
            questions_json=questions,
            total_marks=test['total_marks'],
            duration_minutes=test['duration_minutes'],
            source_metadata={
                'filename': upload.filename,
                'sections': test['sections'],
                'warning': upload.validation_status == 'needs_review',
            },
        )
        db.session.add(assessment)
        db.session.commit()
        return jsonify({
            "subject": subject or upload.subject,
            "upload_id": upload.id,
            "source_doc": upload.filename,
            "mock_test": test,
            "assessment_id": assessment.id,
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Mock test generation failed: {e}\n{traceback.format_exc()}")
        return ai_service_error_response(e)


@exam_prep_bp.route('/rapid-revision', methods=['POST'])
@login_required
def rapid_revision(user):
    data = request.get_json(silent=True) or {}
    subject = (data.get('subject') or '').strip()
    upload_id = data.get('upload_id')
    count = min(int(data.get('count', 15)), 25)

    upload = _resolve_upload(user, subject, upload_id)
    if not upload:
        return jsonify({"error": "No embedded study material found for this subject."}), 400

    try:
        context = get_full_context(upload.id, max_chunks=12)
        if not context:
            return jsonify({"error": "No content found for this document"}), 400

        cards = generate_rapid_revision(context, count=count)
        return jsonify({
            "subject": subject or upload.subject,
            "upload_id": upload.id,
            "source_doc": upload.filename,
            "cards": cards,
        }), 200
    except Exception as e:
        logger.error(f"Rapid revision generation failed: {e}\n{traceback.format_exc()}")
        return ai_service_error_response(e)
