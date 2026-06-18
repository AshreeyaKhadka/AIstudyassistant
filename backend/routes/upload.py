from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import fitz  # PyMuPDF
from config import db
from models.content import StudentUpload
from models.quiz import QuizSet
from services.auth_service import login_required
from services.rag_service import embed_document, is_document_embedded, delete_document_embeddings
import os
import logging
import threading

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
        return jsonify({"error": "Upload limit of 10 PDFs reached."}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"{user.id}_{filename}")
        
        try:
            file.save(filepath)
            size_bytes = os.path.getsize(filepath)
        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            return jsonify({"error": "Failed to save file locally"}), 500
        
        # Parse PDF using PyMuPDF
        text = ""
        try:
            doc = fitz.open(filepath)
            for page in doc:
                text += page.get_text()
            doc.close()
        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 500
            
        # Create DB record mapping to the user
        upload = StudentUpload(
            filename=filename,
            file_url=filepath,  # In real life, might be S3 URL
            parsed_text=text,
            size_bytes=size_bytes,
            user_id=user.id
        )
        
        try:
            db.session.add(upload)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
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
            "parsed_preview": text[:200] if text else ""
        }), 200
        
    return jsonify({"error": "Invalid file type, only PDF allowed"}), 400

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
