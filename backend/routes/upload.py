import hashlib
import logging
import mimetypes
import os
import threading
from datetime import datetime
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from config import db
from models.content import StudentUpload, Subject
from models.quiz import QuizSet
from services.api_response import error_response
from services.auth_service import login_required
from services.document_parser import extract_material_from_path, is_supported_material, supported_material_message
from services.document_admission import screen_document_content
from services.progress_service import map_material_upload_to_topics
from services.rag_service import (
    delete_document_embeddings,
    embed_document,
    update_document_filename,
)

upload_bp = Blueprint('upload', __name__)
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_UPLOADS_PER_USER = 10
UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _serialize_upload(upload, include_text=False):
    payload = {
        'id': upload.id,
        'filename': upload.filename,
        'size_bytes': upload.size_bytes,
        'subject': upload.subject,
        'subject_id': upload.subject_id,
        'doc_type': upload.doc_type,
        'processing_status': upload.processing_status or _legacy_processing_status(upload),
        'processing_error': upload.processing_error,
        'processing_warnings': upload.processing_warnings or [],
        'embedding_status': upload.embedding_status or 'pending',
        'embedding_error': upload.embedding_error,
        'extraction_method': upload.extraction_method,
        'extraction_quality': upload.extraction_quality,
        'native_text_pages': upload.native_text_pages or 0,
        'ocr_pages': upload.ocr_pages or 0,
        'page_count': upload.page_count,
        'character_count': upload.character_count,
        'validation_status': upload.validation_status or 'pending',
        'validation_error': upload.validation_error,
        'validation_details': upload.validation_details or {},
        'syllabus_match_score': upload.syllabus_match_score,
        'syllabus_match_coverage': upload.syllabus_match_coverage,
        'admission_status': upload.admission_status or ('admitted' if upload.validation_status != 'rejected' else 'rejected'),
        'admission_error': upload.admission_error,
        'screening_details': upload.screening_details or {},
        'screened_at': upload.screened_at,
        'mcq_generation_count': upload.mcq_generation_count or 0,
        'created_at': upload.created_at,
    }
    if include_text:
        payload['parsed_text'] = upload.parsed_text
    return payload


def _legacy_processing_status(upload):
    if upload.embedding_status == 'failed':
        return 'failed'
    if upload.embedding_status == 'indexing':
        return 'indexing'
    if upload.embedding_status == 'embedded':
        return 'ready'
    return 'uploaded'


def _file_sha256(filepath):
    digest = hashlib.sha256()
    with open(filepath, 'rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def _set_pipeline_status(upload, status, error=None):
    upload.processing_status = status
    upload.processing_error = str(error)[:1000] if error else None
    db.session.commit()


def _run_document_pipeline(app, upload_id, reextract=True):
    with app.app_context():
        upload = StudentUpload.query.get(upload_id)
        if not upload:
            return

        try:
            if reextract or not upload.parsed_text:
                _set_pipeline_status(upload, 'extracting')
                text, metadata = extract_material_from_path(upload.file_url, upload.filename)
                if not text.strip():
                    raise ValueError('No readable text could be extracted from this file.')
                upload.parsed_text = text
                upload.extraction_method = metadata.get('extraction_method')
                upload.extraction_quality = metadata.get('extraction_quality')
                upload.processing_warnings = metadata.get('warnings') or []
                upload.page_count = metadata.get('page_count')
                upload.character_count = metadata.get('character_count')
                upload.native_text_pages = metadata.get('native_text_pages') or 0
                upload.ocr_pages = metadata.get('ocr_pages') or 0

            _set_pipeline_status(upload, 'screening')
            screening = screen_document_content(upload.subject_rel, upload.parsed_text)
            upload.admission_status = screening['admission_status']
            upload.admission_error = screening['reason'] if screening['admission_status'] == 'rejected' else None
            upload.screening_details = screening
            upload.screened_at = datetime.utcnow()
            upload.validation_status = screening['validation_status']
            upload.validation_error = screening['warning'] or screening['reason'] or None
            upload.validation_details = {
                'matched_topics': screening['matched_topics'],
                'screening_source': screening['screening_source'],
                'detected_subject': screening['detected_subject'],
                'confidence': screening['confidence'],
                'relevance': screening['relevance'],
            }
            upload.syllabus_match_score = screening['confidence']
            upload.syllabus_match_coverage = None
            db.session.commit()

            if upload.admission_status == 'rejected':
                delete_document_embeddings(upload.id)
                if upload.file_url and os.path.isfile(upload.file_url):
                    os.remove(upload.file_url)
                upload.file_url = ''
                upload.parsed_text = None
                upload.embedding_status = 'not_indexed'
                upload.embedding_error = 'Rejected before indexing because the content is irrelevant to the selected subject.'
                upload.processing_status = 'rejected'
                upload.processing_error = upload.admission_error
                db.session.commit()
                logger.info('Rejected upload %s before embedding', upload.id)
                return

            _set_pipeline_status(upload, 'indexing')
            upload.embedding_status = 'pending'
            upload.embedding_error = None
            db.session.commit()

            delete_document_embeddings(upload.id)
            chunk_count = embed_document(
                upload_id=upload.id,
                user_id=upload.user_id,
                filename=upload.filename,
                parsed_text=upload.parsed_text,
            )
            if not chunk_count:
                raise ValueError('No useful study chunks could be created from the extracted text.')

            if upload.validation_status == 'approved':
                map_material_upload_to_topics(upload.id)

            _set_pipeline_status(upload, 'ready')
            logger.info('Document pipeline completed for upload %s with %s chunks', upload.id, chunk_count)
        except Exception as exc:
            db.session.rollback()
            failed_upload = StudentUpload.query.get(upload_id)
            if failed_upload:
                failed_upload.processing_status = 'failed'
                failed_upload.processing_error = str(exc)[:1000]
                if failed_upload.embedding_status != 'embedded':
                    failed_upload.embedding_status = 'failed'
                    failed_upload.embedding_error = str(exc)[:500]
                db.session.commit()
            logger.exception('Document pipeline failed for upload %s: %s', upload_id, exc)


def _queue_document_pipeline(upload, reextract=True):
    app = current_app._get_current_object()
    thread = threading.Thread(
        target=_run_document_pipeline,
        args=(app, upload.id, reextract),
        daemon=True,
        name=f'document-pipeline-{upload.id}',
    )
    thread.start()


def _resolve_subject(user, raw_subject_id, fallback_name=None):
    if raw_subject_id in (None, ''):
        return None, fallback_name, None
    try:
        subject_id = int(raw_subject_id)
    except (ValueError, TypeError):
        return None, None, error_response('subject_id must be a valid integer.', 400, code='invalid_subject')
    subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
    if not subject:
        return None, None, error_response('Selected subject was not found.', 404, code='subject_not_found')
    return subject.id, subject.name, None


@upload_bp.route('/', methods=['POST'])
@login_required
def upload_material(user):
    if request.content_length and request.content_length > MAX_FILE_SIZE + (1024 * 1024):
        return error_response('File too large. Maximum size is 10MB.', 413, code='file_too_large')
    active_upload_count = StudentUpload.query.filter_by(user_id=user.id, doc_type='material').filter(
        StudentUpload.admission_status != 'rejected'
    ).count()
    if active_upload_count >= MAX_UPLOADS_PER_USER:
        return error_response('Upload limit of 10 study materials reached.', 403, code='upload_limit_reached')
    if 'file' not in request.files:
        return error_response('Choose a file to upload.', 400, code='file_required')

    file = request.files['file']
    original_filename = file.filename or ''
    if not original_filename:
        return error_response('Choose a file to upload.', 400, code='file_required')
    if not is_supported_material(original_filename):
        return error_response(supported_material_message(), 400, code='unsupported_file_type')

    subject_id, subject_name, subject_error = _resolve_subject(
        user,
        request.form.get('subject_id'),
        request.form.get('subject'),
    )
    if subject_error:
        return subject_error
    if not subject_id:
        return error_response('Choose a subject before uploading study material.', 400, code='subject_required')

    filename = secure_filename(original_filename) or f'material{os.path.splitext(original_filename)[1].lower()}'
    filepath = os.path.join(UPLOAD_FOLDER, f'{user.id}_{uuid4().hex}_{filename}')
    try:
        file.save(filepath)
        size_bytes = os.path.getsize(filepath)
        if size_bytes <= 0:
            raise ValueError('The selected file is empty.')
        if size_bytes > MAX_FILE_SIZE:
            raise ValueError('File too large. Maximum size is 10MB.')
        content_sha256 = _file_sha256(filepath)
    except ValueError as exc:
        if os.path.isfile(filepath):
            os.remove(filepath)
        status = 413 if 'too large' in str(exc).lower() else 400
        return error_response(str(exc), status, code='invalid_file')
    except Exception as exc:
        if os.path.isfile(filepath):
            os.remove(filepath)
        logger.exception('Could not save upload: %s', exc)
        return error_response('Could not save the uploaded file.', 500, code='file_save_failed', retryable=True)

    duplicate = StudentUpload.query.filter_by(
        user_id=user.id,
        subject_id=subject_id,
        doc_type='material',
        content_sha256=content_sha256,
    ).filter(StudentUpload.admission_status != 'rejected').first()
    if duplicate:
        os.remove(filepath)
        return jsonify({
            'error': 'This document is already in the selected subject.',
            'code': 'duplicate_document',
            'retryable': False,
            'existing_upload': _serialize_upload(duplicate),
        }), 409

    upload = StudentUpload(
        filename=filename,
        file_url=filepath,
        parsed_text=None,
        size_bytes=size_bytes,
        user_id=user.id,
        subject=subject_name,
        subject_id=subject_id,
        doc_type='material',
        content_sha256=content_sha256,
        processing_status='screening',
        embedding_status='pending',
        validation_status='pending',
        admission_status='screening',
    )
    try:
        db.session.add(upload)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        if os.path.isfile(filepath):
            os.remove(filepath)
        logger.exception('Database error during upload: %s', exc)
        return error_response('Failed to create the document record.', 500, code='upload_record_failed', retryable=True)

    _queue_document_pipeline(upload, reextract=True)
    return jsonify({
        'message': 'Upload received. Subject relevance screening has started.',
        'upload': _serialize_upload(upload),
        'upload_id': upload.id,
    }), 202


@upload_bp.route('/', methods=['GET'])
@login_required
def get_uploads(user):
    try:
        uploads = StudentUpload.query.filter_by(user_id=user.id).order_by(StudentUpload.created_at.desc()).all()
        return jsonify([_serialize_upload(upload) for upload in uploads]), 200
    except Exception as exc:
        logger.exception('Database error fetching uploads: %s', exc)
        return error_response('Failed to fetch uploads.', 500, code='uploads_fetch_failed', retryable=True)


def _retry_upload(user, upload_id, reextract):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return error_response('Upload not found.', 404, code='upload_not_found')
    if upload.user_id != user.id:
        return error_response('You do not have access to this upload.', 403, code='forbidden')
    if upload.processing_status in {'screening', 'extracting', 'indexing', 'validating'}:
        return error_response('This document is already being processed.', 409, code='processing_in_progress')
    if not upload.file_url or not os.path.isfile(upload.file_url):
        return error_response('The source file is missing. Upload the document again.', 409, code='source_file_missing')

    upload.processing_status = 'uploaded'
    upload.processing_error = None
    upload.embedding_error = None
    upload.admission_status = 'screening'
    upload.admission_error = None
    upload.screening_details = {}
    db.session.commit()
    _queue_document_pipeline(upload, reextract=reextract)
    return jsonify({'message': 'Document processing restarted.', 'upload': _serialize_upload(upload)}), 202


@upload_bp.route('/<int:upload_id>/retry', methods=['POST'])
@login_required
def retry_document(user, upload_id):
    return _retry_upload(user, upload_id, reextract=True)


@upload_bp.route('/retry-embedding', methods=['POST'])
@login_required
def retry_embedding(user):
    data = request.get_json(silent=True) or {}
    upload_id = data.get('upload_id')
    if not upload_id:
        return error_response('upload_id is required.', 400, code='upload_id_required')
    return _retry_upload(user, upload_id, reextract=False)


@upload_bp.route('/<int:upload_id>', methods=['DELETE'])
@login_required
def delete_upload(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return error_response('Upload not found.', 404, code='upload_not_found')
    if upload.user_id != user.id:
        return error_response('You do not have access to this upload.', 403, code='forbidden')
    if upload.processing_status in {'screening', 'extracting', 'indexing', 'validating'}:
        return error_response('Wait for document processing to finish before deleting it.', 409, code='processing_in_progress')

    try:
        delete_document_embeddings(upload.id)
        if upload.file_url and os.path.isfile(upload.file_url):
            os.remove(upload.file_url)
        QuizSet.query.filter_by(upload_id=upload.id).delete()
        db.session.delete(upload)
        db.session.commit()
        return jsonify({'message': 'Document deleted successfully.'}), 200
    except Exception as exc:
        db.session.rollback()
        logger.exception('Failed to delete upload %s: %s', upload_id, exc)
        return error_response('Failed to delete document.', 500, code='document_delete_failed', retryable=True)


@upload_bp.route('/<int:upload_id>/subject', methods=['PATCH'])
@login_required
def update_subject(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return error_response('Upload not found.', 404, code='upload_not_found')
    if upload.user_id != user.id:
        return error_response('You do not have access to this upload.', 403, code='forbidden')
    if not upload.file_url or not os.path.isfile(upload.file_url):
        return error_response('The rejected file data was removed. Select the file again to screen it under another subject.', 409, code='source_file_unavailable')

    data = request.get_json(silent=True) or {}
    subject_id, subject_name, subject_error = _resolve_subject(user, data.get('subject_id'), data.get('subject'))
    if subject_error:
        return subject_error
    if not subject_id:
        return error_response('Choose a valid subject.', 400, code='subject_required')

    upload.subject_id = subject_id
    upload.subject = subject_name
    upload.validation_status = 'pending'
    upload.validation_error = None
    upload.validation_details = {}
    upload.syllabus_match_score = None
    upload.syllabus_match_coverage = None
    upload.admission_status = 'screening'
    upload.admission_error = None
    upload.screening_details = {}
    upload.processing_status = 'screening'
    db.session.commit()
    _queue_document_pipeline(upload, reextract=False)
    return jsonify({'message': 'Subject updated. Reindexing has started.', 'upload': _serialize_upload(upload)}), 202


@upload_bp.route('/<int:upload_id>/name', methods=['PATCH'])
@login_required
def rename_upload(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return error_response('Upload not found.', 404, code='upload_not_found')
    if upload.user_id != user.id:
        return error_response('You do not have access to this upload.', 403, code='forbidden')

    data = request.get_json(silent=True) or {}
    requested_name = secure_filename(str(data.get('filename') or '').strip())
    if not requested_name:
        return error_response('Enter a valid filename.', 400, code='invalid_filename')
    current_extension = os.path.splitext(upload.filename)[1].lower()
    requested_extension = os.path.splitext(requested_name)[1].lower()
    if requested_extension != current_extension:
        return error_response(
            f'The filename must keep its {current_extension or "original"} extension.',
            400,
            code='file_extension_changed',
        )

    upload.filename = requested_name
    db.session.commit()
    try:
        update_document_filename(upload.id, requested_name)
    except Exception as exc:
        logger.warning('Could not update citation filename for upload %s: %s', upload.id, exc)
    return jsonify({'message': 'Document renamed.', 'upload': _serialize_upload(upload)}), 200


@upload_bp.route('/<int:upload_id>/validate', methods=['POST'])
@login_required
def validate_upload(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return error_response('Upload not found.', 404, code='upload_not_found')
    if upload.user_id != user.id:
        return error_response('You do not have access to this upload.', 403, code='forbidden')
    if upload.doc_type != 'material':
        return error_response('Only study-material uploads require syllabus validation.', 400, code='validation_not_required')
    if not upload.file_url or not os.path.isfile(upload.file_url) or not upload.parsed_text:
        return error_response('The original file is no longer available. Upload it again to re-screen it.', 409, code='source_file_unavailable')

    upload.admission_status = 'screening'
    upload.admission_error = None
    upload.processing_status = 'screening'
    upload.processing_error = None
    db.session.commit()
    _queue_document_pipeline(upload, reextract=False)
    return jsonify({
        'message': 'Subject relevance screening restarted.',
        'upload': _serialize_upload(upload),
    }), 202


@upload_bp.route('/<int:upload_id>', methods=['GET'])
@login_required
def get_upload_detail(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return error_response('Upload not found.', 404, code='upload_not_found')
    if upload.user_id != user.id:
        return error_response('You do not have access to this upload.', 403, code='forbidden')
    return jsonify(_serialize_upload(upload, include_text=True)), 200


@upload_bp.route('/<int:upload_id>/file', methods=['GET'])
@login_required
def view_upload_file(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return error_response('Upload not found.', 404, code='upload_not_found')
    if upload.user_id != user.id:
        return error_response('You do not have access to this upload.', 403, code='forbidden')
    if upload.file_url and os.path.isfile(upload.file_url):
        mimetype = mimetypes.guess_type(upload.filename)[0] or 'application/octet-stream'
        return send_file(upload.file_url, mimetype=mimetype, as_attachment=False, download_name=upload.filename)
    return error_response('Source file not found.', 404, code='source_file_missing')
