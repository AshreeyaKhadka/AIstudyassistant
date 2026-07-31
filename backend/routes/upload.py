from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from config import db
from models.content import StudentUpload, Subject
from models.quiz import QuizSet
from services.auth_service import login_required
from services.document_parser import is_supported_material, parse_uploaded_material_with_metadata, supported_material_message
from services.progress_service import map_material_upload_to_topics
from services.rag_service import (
    embed_document,
    is_document_embedded,
    delete_document_embeddings,
    validate_upload_against_syllabus,
)
import os
import logging
import threading
import mimetypes

upload_bp = Blueprint('upload', __name__)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@upload_bp.route('/', methods=['POST'])
@login_required
def upload_pdf(user):
    # Check file size (10MB limit)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    if request.content_length and request.content_length > MAX_FILE_SIZE:
        return jsonify({"error": "File too large (Max 10MB allowed)."}), 413

    # Check upload count limit
    upload_count = StudentUpload.query.filter_by(user_id=user.id).count()
    if upload_count >= 10:
        return jsonify({"error": "Upload limit of 10 materials reached."}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and is_supported_material(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"{user.id}_{filename}")
        
        try:
            text, extraction_meta = parse_uploaded_material_with_metadata(file, filepath)
            size_bytes = os.path.getsize(filepath)
        except ValueError as e:
            logger.error(f"Failed to parse upload: {e}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            logger.error(f"Failed to parse upload: {e}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": "Failed to parse this file. It may be corrupted or in an unsupported format."}), 500

        if not text.strip():
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": "No readable text could be extracted from this file."}), 400
            
        # Create DB record mapping to the user
        subject_id = request.form.get('subject_id')
        subject_name = request.form.get('subject')
        
        if subject_id:
            try:
                subject_id = int(subject_id)
                subj = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
                if not subj:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    return jsonify({"error": "Selected subject was not found."}), 404
                subject_name = subj.name
            except (ValueError, TypeError):
                if os.path.exists(filepath):
                    os.remove(filepath)
                return jsonify({"error": "subject_id must be a valid integer"}), 400

        upload = StudentUpload(
            filename=filename,
            file_url=filepath,  # In real life, might be S3 URL
            parsed_text=text,
            size_bytes=size_bytes,
            user_id=user.id,
            subject=subject_name,
            subject_id=subject_id,
            doc_type='material',
            extraction_method=extraction_meta.get('extraction_method'),
            extraction_quality=extraction_meta.get('extraction_quality'),
            validation_status='pending',
        )
        
        try:
            db.session.add(upload)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            if os.path.exists(filepath):
                os.remove(filepath)
            logger.error(f"Database error during upload: {e}")
            return jsonify({"error": "Failed to save record to database"}), 500
        
        # Truncating parse text for response
        # Trigger background embedding into ChromaDB
        def _bg_embed(app, uid, u_id, fname, ptext):
            with app.app_context():
                try:
                    embed_document(uid, u_id, fname, ptext)
                except Exception as e:
                    logger.error(f"Background embedding failed for upload {uid}: {e}")

        from flask import current_app
        app = current_app._get_current_object()
        t = threading.Thread(
            target=_bg_embed,
            args=(app, upload.id, user.id, filename, text),
            daemon=True,
        )
        t.start()

        return jsonify({
            "message": "File uploaded and parsed successfully",
            "upload_id": upload.id,
            "validation_status": upload.validation_status,
            "parsed_preview": text[:200] if text else ""
        }), 200
        
    return jsonify({"error": supported_material_message()}), 400

@upload_bp.route('/', methods=['GET'])
@login_required
def get_uploads(user):
    try:
        uploads = StudentUpload.query.filter_by(user_id=user.id).order_by(StudentUpload.created_at.desc()).all()
        return jsonify([{
            "id": u.id, 
            "filename": u.filename, 
            "size_bytes": u.size_bytes,
            "subject": u.subject,
            "embedding_status": u.embedding_status or 'pending',
            "embedding_error": u.embedding_error,
            "extraction_method": u.extraction_method,
            "extraction_quality": u.extraction_quality,
            "validation_status": u.validation_status or 'pending',
            "validation_error": u.validation_error,
            "syllabus_match_score": u.syllabus_match_score,
            "syllabus_match_coverage": u.syllabus_match_coverage,
            "mcq_generation_count": u.mcq_generation_count or 0,
            "created_at": u.created_at
        } for u in uploads]), 200
    except Exception as e:
        logger.error(f"Database error fetching uploads: {e}")
        return jsonify({"error": "Failed to fetch uploads"}), 500

@upload_bp.route('/retry-embedding', methods=['POST'])
@login_required
def retry_embedding(user):
    data = request.get_json()
    upload_id = data.get('upload_id')

    if not upload_id:
        return jsonify({"error": "upload_id required"}), 400

    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    if upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if not upload.parsed_text:
        return jsonify({"error": "No parsed text available for this document"}), 400

    # Reset status
    upload.embedding_status = 'pending'
    upload.embedding_error = None
    upload.validation_status = 'pending'
    upload.validation_error = None
    upload.syllabus_match_score = None
    upload.syllabus_match_coverage = None
    db.session.commit()

    # Trigger background embedding
    def _bg_embed(app, uid, u_id, fname, ptext):
        with app.app_context():
            try:
                embed_document(uid, u_id, fname, ptext)
            except Exception as e:
                logger.error(f"Background embedding failed for upload {uid}: {e}")

    from flask import current_app
    app = current_app._get_current_object()
    t = threading.Thread(
        target=_bg_embed,
        args=(app, upload.id, user.id, upload.filename, upload.parsed_text),
        daemon=True,
    )
    t.start()

    return jsonify({"message": "Retry embedding started"}), 200


@upload_bp.route('/<int:upload_id>', methods=['DELETE'])
@login_required
def delete_upload(user, upload_id):
    """Delete an uploaded document, its embeddings, and physical file."""
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    if upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        # 1. Delete ChromaDB embeddings
        delete_document_embeddings(upload.id)

        # 2. Delete physical file
        if upload.file_url and os.path.exists(upload.file_url):
            os.remove(upload.file_url)

        # 3. Delete associated quiz sets
        QuizSet.query.filter_by(upload_id=upload.id).delete()

        # 4. Delete DB record
        db.session.delete(upload)
        db.session.commit()

        return jsonify({"message": "Document deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete upload {upload_id}: {e}")
        return jsonify({"error": "Failed to delete document"}), 500

@upload_bp.route('/<int:upload_id>/subject', methods=['PATCH'])
@login_required
def update_subject(user, upload_id):
    data = request.get_json()
    subject = data.get('subject')

    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    if upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        upload.subject = subject
        db.session.commit()
        return jsonify({"message": "Subject updated successfully", "subject": subject}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to update subject for upload {upload_id}: {e}")
        return jsonify({"error": "Failed to update subject"}), 500


@upload_bp.route('/<int:upload_id>/validate', methods=['POST'])
@login_required
def validate_upload(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    if upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if upload.doc_type != 'material':
        return jsonify({"error": "Only note/material uploads need syllabus validation"}), 400

    if not is_document_embedded(upload.id):
        return jsonify({"error": "Document embeddings are not ready yet"}), 409

    try:
        result = validate_upload_against_syllabus(upload.id)
        if result.get('validation_status') == 'approved':
            result['mapped_topics'] = map_material_upload_to_topics(upload.id)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Failed to validate upload {upload_id}: {e}")
        return jsonify({"error": "Failed to validate upload"}), 500


@upload_bp.route('/<int:upload_id>', methods=['GET'])
@login_required
def get_upload_detail(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    if upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify({
        "id": upload.id,
        "filename": upload.filename,
        "size_bytes": upload.size_bytes,
        "subject": upload.subject,
        "subject_id": upload.subject_id,
        "validation_status": upload.validation_status or 'pending',
        "validation_error": upload.validation_error,
        "syllabus_match_score": upload.syllabus_match_score,
        "syllabus_match_coverage": upload.syllabus_match_coverage,
        "extraction_method": upload.extraction_method,
        "extraction_quality": upload.extraction_quality,
        "parsed_text": upload.parsed_text,
        "created_at": upload.created_at
    }), 200


@upload_bp.route('/<int:upload_id>/file', methods=['GET'])
@login_required
def view_upload_file(user, upload_id):
    from flask import send_file
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    if upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if upload.file_url and os.path.exists(upload.file_url):
        mimetype = mimetypes.guess_type(upload.file_url)[0] or 'application/octet-stream'
        return send_file(
            upload.file_url,
            mimetype=mimetype,
            as_attachment=False,
            download_name=upload.filename
        )
    return jsonify({"error": "File not found"}), 404
