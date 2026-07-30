from flask import Blueprint, jsonify, request
from services.auth_service import admin_required
from config import db
from models.user import User
from models.content import StudentUpload
from services.rag_service import embed_document, delete_document_embeddings
from werkzeug.utils import secure_filename
import logging
import os
import threading
from datetime import datetime

admin_bp = Blueprint('admin', __name__)
logger = logging.getLogger(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users(admin_user):
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@admin_bp.route('/users/<int:user_id>/ban', methods=['POST'])
@admin_required
def ban_user(admin_user, user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    data = request.json or {}
    user.is_banned = not user.is_banned
    user.ban_reason = data.get('reason', '') if user.is_banned else None
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to ban/unban user: {e}")
        return jsonify({"error": "Failed to update user status"}), 500
        
    status = "banned" if user.is_banned else "unbanned"
    return jsonify({"message": f"User {user.email} has been {status}"}), 200

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats(admin_user):
    user_count = User.query.count()
    return jsonify({
        "total_users": user_count,
        "active_sessions_mock": 5,
        "database_health": "ok"
    }), 200

@admin_bp.route('/syllabus', methods=['POST'])
@admin_required
def upload_syllabus(admin_user):
    text = (request.form.get('text') or '').strip()
    file = request.files.get('file')
    if not text and not file:
        return jsonify({"error": "Provide syllabus text or upload a PDF/TXT file"}), 400

    filename = 'official-syllabus.txt'
    filepath = os.path.join(UPLOAD_FOLDER, f"official_syllabus_{int(datetime.utcnow().timestamp())}.txt")
    parsed_text = text

    try:
        if file:
            filename = secure_filename(file.filename)
            if not filename:
                return jsonify({"error": "Uploaded file must have a filename"}), 400
            filepath = os.path.join(UPLOAD_FOLDER, f"official_syllabus_{int(datetime.utcnow().timestamp())}_{filename}")
            if filename.lower().endswith('.pdf'):
                import fitz
                file.save(filepath)
                parsed_text = ""
                doc = fitz.open(filepath)
                for page in doc:
                    parsed_text += page.get_text()
                doc.close()
            elif filename.lower().endswith('.txt'):
                file.save(filepath)
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    parsed_text = f.read()
            else:
                return jsonify({"error": "Only PDF and TXT files are supported"}), 400
        else:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(parsed_text)

        if not parsed_text.strip():
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": "Syllabus content is empty after parsing"}), 400

        existing = StudentUpload.query.filter_by(doc_type='syllabus', syllabus_kind='official').first()
        if existing:
            delete_document_embeddings(existing.id)
            if existing.file_url and os.path.exists(existing.file_url):
                try:
                    os.remove(existing.file_url)
                except Exception:
                    pass
            upload = existing
            upload.filename = filename
            upload.file_url = filepath
            upload.parsed_text = parsed_text
            upload.size_bytes = os.path.getsize(filepath)
            upload.embedding_status = 'pending'
            upload.embedding_error = None
            upload.user_id = admin_user.id
        else:
            upload = StudentUpload(
                filename=filename,
                file_url=filepath,
                parsed_text=parsed_text,
                size_bytes=os.path.getsize(filepath),
                user_id=admin_user.id,
                subject='Official Syllabus',
                doc_type='syllabus',
                syllabus_kind='official',
            )
            db.session.add(upload)

        db.session.commit()

        def _bg_embed(app, uid, u_id, fname, ptext):
            with app.app_context():
                try:
                    embed_document(uid, u_id, fname, ptext)
                except Exception as e:
                    logger.error(f"Official syllabus embedding failed for upload {uid}: {e}")

        from flask import current_app
        app = current_app._get_current_object()
        threading.Thread(
            target=_bg_embed,
            args=(app, upload.id, admin_user.id, filename, parsed_text),
            daemon=True,
        ).start()

        return jsonify({
            "message": "Official syllabus uploaded and queued for RAG embeddings.",
            "upload_id": upload.id,
            "filename": upload.filename,
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Official syllabus upload failed: {e}")
        return jsonify({"error": "Failed to upload official syllabus"}), 500
