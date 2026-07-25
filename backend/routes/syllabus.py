from flask import Blueprint, request, jsonify
from config import db
from models.content import Subject, StudentUpload
from services.auth_service import login_required
from services.rag_service import embed_document, delete_document_embeddings
from werkzeug.utils import secure_filename
import os
import json
import re
import logging
import threading

syllabus_bp = Blueprint('syllabus', __name__)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _seed_default_subjects_if_empty(user):
    """Seed default Pokhara University subjects for new users if their subject list is empty."""
    existing = Subject.query.filter_by(user_id=user.id).first()
    if existing:
        return

    json_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'syllabusparser',
        'unitwise.json'
    )
    if not os.path.exists(json_path):
        logger.warning(f"Default syllabus file not found at {json_path}")
        return

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        pu_data = data.get("Pokhara University - Bachelor in Computer Engineering", {})
        user_sem = user.semester if user.semester else 1

        new_subjects = []
        seen = set()
        for raw_name, sub_info in pu_data.items():
            if not isinstance(sub_info, dict):
                continue
            sem_str = str(sub_info.get("Semester") or sub_info.get("semester") or "1").strip()
            try:
                sem = int(sem_str)
            except ValueError:
                sem = 1

            clean_name = re.sub(r'\s*\(\d+-\d+-\d+\)', '', raw_name).strip()
            key = (clean_name, sem)
            if key in seen:
                continue
            seen.add(key)

            is_current = (sem == user_sem)
            subject = Subject(
                user_id=user.id,
                name=clean_name,
                semester=sem,
                code=None,
                credits=3,
                is_current=is_current,
                is_backlog=False
            )
            new_subjects.append(subject)

        if new_subjects:
            db.session.add_all(new_subjects)
            db.session.commit()
            logger.info(f"Seeded {len(new_subjects)} default Pokhara University subjects for user {user.id}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to seed default subjects for user {user.id}: {e}")


@syllabus_bp.route('/subjects', methods=['GET'])
@login_required
def get_subjects(user):
    _seed_default_subjects_if_empty(user)
    subjects = Subject.query.filter_by(user_id=user.id).order_by(Subject.semester.asc(), Subject.name.asc()).all()
    return jsonify([{
        "id": s.id,
        "name": s.name,
        "semester": s.semester,
        "code": s.code,
        "credits": s.credits,
        "is_current": s.is_current,
        "is_backlog": s.is_backlog,
        "created_at": s.created_at.isoformat() if s.created_at else None
    } for s in subjects]), 200


@syllabus_bp.route('/subjects', methods=['POST'])
@login_required
def create_subject(user):
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    semester_val = data.get('semester')
    code = data.get('code', '').strip() or None
    credits_val = data.get('credits', 3)
    is_backlog = bool(data.get('is_backlog', False))

    if not name or semester_val is None:
        return jsonify({"error": "Subject name and semester are required"}), 400

    try:
        semester = int(semester_val)
    except (ValueError, TypeError):
        return jsonify({"error": "Semester must be a valid number"}), 400

    if is_backlog:
        backlog_count = Subject.query.filter_by(user_id=user.id, is_backlog=True).count()
        if backlog_count >= 4:
            return jsonify({"error": "Backlog limit reached (4/4)"}), 400

    is_current = (semester == user.semester) if not is_backlog else False

    subject = Subject(
        user_id=user.id,
        name=name,
        semester=semester,
        code=code,
        credits=credits_val,
        is_current=is_current,
        is_backlog=is_backlog
    )
    try:
        db.session.add(subject)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create subject: {e}")
        return jsonify({"error": "Failed to create subject"}), 500

    return jsonify({
        "id": subject.id,
        "name": subject.name,
        "semester": subject.semester,
        "code": subject.code,
        "credits": subject.credits,
        "is_current": subject.is_current,
        "is_backlog": subject.is_backlog,
        "created_at": subject.created_at.isoformat() if subject.created_at else None
    }), 201

@syllabus_bp.route('/subjects/<int:subject_id>', methods=['DELETE'])
@login_required
def delete_subject(user, subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
    if not subject:
        return jsonify({"error": "Subject not found"}), 404

    try:
        # Delete associated student uploads (materials & syllabus) and their embeddings
        uploads = StudentUpload.query.filter_by(subject_id=subject.id).all()
        for upload in uploads:
            delete_document_embeddings(upload.id)
            if upload.file_url and os.path.exists(upload.file_url):
                try:
                    os.remove(upload.file_url)
                except Exception:
                    pass
            db.session.delete(upload)

        db.session.delete(subject)
        db.session.commit()
        return jsonify({"message": "Subject deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete subject: {e}")
        return jsonify({"error": "Failed to delete subject"}), 500

@syllabus_bp.route('/upload', methods=['POST'])
@login_required
def upload_syllabus(user):
    subject_id = request.form.get('subject_id')
    replace = request.form.get('replace', 'false').lower() == 'true'

    if not subject_id:
        return jsonify({"error": "subject_id is required"}), 400

    try:
        subject_id = int(subject_id)
    except ValueError:
        return jsonify({"error": "subject_id must be a valid integer"}), 400

    subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
    if not subject:
        return jsonify({"error": "Subject not found or access denied"}), 404

    # Enforce exactly one syllabus file per subject
    existing_syllabus = StudentUpload.query.filter_by(subject_id=subject_id, doc_type='syllabus').first()
    if existing_syllabus:
        if not replace:
            return jsonify({
                "error": "A syllabus already exists for this subject. Replace it?",
                "needs_confirm": True,
                "existing_id": existing_syllabus.id
            }), 409

        # User wants to replace
        try:
            delete_document_embeddings(existing_syllabus.id)
            if existing_syllabus.file_url and os.path.exists(existing_syllabus.file_url):
                try:
                    os.remove(existing_syllabus.file_url)
                except Exception:
                    pass
            db.session.delete(existing_syllabus)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to delete existing syllabus for replace: {e}")
            return jsonify({"error": "Failed to replace existing syllabus"}), 500

    # Handle file upload
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Invalid file type, only PDF allowed"}), 400

    import fitz  # PyMuPDF
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, f"syllabus_{user.id}_{subject_id}_{filename}")

    try:
        file.save(filepath)
        size_bytes = os.path.getsize(filepath)
    except Exception as e:
        logger.error(f"Failed to save syllabus file: {e}")
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
        # cleanup file
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 500

    upload = StudentUpload(
        filename=filename,
        file_url=filepath,
        parsed_text=text,
        size_bytes=size_bytes,
        user_id=user.id,
        subject=subject.name,
        subject_id=subject_id,
        doc_type='syllabus'
    )

    try:
        db.session.add(upload)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        if os.path.exists(filepath):
            os.remove(filepath)
        logger.error(f"Database error during syllabus upload: {e}")
        return jsonify({"error": "Failed to save record to database"}), 500

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
        "message": "Syllabus uploaded and parsed successfully",
        "upload_id": upload.id,
        "parsed_preview": text[:200] if text else ""
    }), 200

@syllabus_bp.route('/<int:subject_id>', methods=['GET'])
@login_required
def get_syllabus_meta(user, subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
    if not subject:
        return jsonify({"error": "Subject not found or access denied"}), 404

    doc = StudentUpload.query.filter_by(subject_id=subject_id, doc_type='syllabus').first()
    if not doc:
        return jsonify({"error": "No syllabus uploaded for this subject"}), 404

    return jsonify({
        "id": doc.id,
        "filename": doc.filename,
        "size_bytes": doc.size_bytes,
        "uploaded_at": doc.created_at.isoformat() if doc.created_at else None,
        "subject": {
            "id": subject.id,
            "name": subject.name,
            "semester": subject.semester
        }
    }), 200
