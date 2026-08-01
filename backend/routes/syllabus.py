from flask import Blueprint, request, jsonify, send_file
from config import db
from models.content import Subject, StudentUpload
from services.auth_service import login_required
from services.document_parser import parse_uploaded_material_with_metadata, supported_material_message
from services.progress_service import get_subject_mastery, seed_syllabus_topics
from services.generation_service import generate_learning_path
from services.rag_service import (
    embed_document,
    delete_document_embeddings,
    get_syllabus_coverage,
    is_document_embedded,
    embed_structured_syllabus,
    normalize_syllabus_structure,
    update_document_metadata,
)
from services.generation_service import parse_syllabus_hierarchy
from services.syllabus_catalog import get_catalog, find_subject
from werkzeug.utils import secure_filename
import os
import json
import re
import logging
import threading
from datetime import datetime

syllabus_bp = Blueprint('syllabus', __name__)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads'
OFFICIAL_PDF_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pdf')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def _slugify(value):
    value = (value or '').strip().lower()
    value = re.sub(r'[^a-z0-9]+', '-', value)
    return value.strip('-') or 'general'


@syllabus_bp.route('/pdf/<path:filename>', methods=['GET'])
def view_official_pdf(filename):
    safe_name = os.path.basename(filename)
    filepath = os.path.join(OFFICIAL_PDF_FOLDER, safe_name)
    if not os.path.exists(filepath) or not safe_name.lower().endswith('.pdf'):
        return jsonify({"error": "PDF not found"}), 404
    return send_file(filepath, mimetype='application/pdf', as_attachment=False, download_name=safe_name)


def _serialize_upload(upload, include_text=False):
    if not upload:
        return None
    data = {
        "id": upload.id,
        "filename": upload.filename,
        "size_bytes": upload.size_bytes,
        "subject": upload.subject,
        "subject_id": upload.subject_id,
        "doc_type": upload.doc_type,
        "syllabus_kind": upload.syllabus_kind,
        "is_active_syllabus": bool(upload.is_active_syllabus),
        "embedding_status": upload.embedding_status or 'pending',
        "embedding_error": upload.embedding_error,
        "extraction_method": upload.extraction_method,
        "extraction_quality": upload.extraction_quality,
        "validation_status": upload.validation_status or 'pending',
        "validation_error": upload.validation_error,
        "validation_details": upload.validation_details or {},
        "syllabus_match_score": upload.syllabus_match_score,
        "syllabus_match_coverage": upload.syllabus_match_coverage,
        "syllabus_version": upload.syllabus_version or 1,
        "syllabus_structure_hash": upload.syllabus_structure_hash,
        "created_at": upload.created_at.isoformat() if upload.created_at else None,
    }
    if upload.structured_syllabus:
        try:
            data["structured_syllabus"] = json.loads(upload.structured_syllabus)
            data["structure_status"] = "ready"
        except (json.JSONDecodeError, TypeError):
            data["structured_syllabus"] = None
            data["structure_status"] = "failed"
    else:
        data["structured_syllabus"] = None
        data["structure_status"] = "processing" if upload.parsed_text else "pending"
    if include_text:
        data["parsed_text"] = upload.parsed_text or ""
    else:
        data["parsed_preview"] = (upload.parsed_text or "")[:600]
    return data


def _parse_syllabus_file(file, filepath):
    text, _metadata = parse_uploaded_material_with_metadata(file, filepath)
    return text


def _start_embedding(upload_id, user_id, filename, text):
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
        args=(app, upload_id, user_id, filename, text),
        daemon=True,
    )
    t.start()


def _start_structure_extraction(upload_id, parsed_text):
    def _bg_extract(app, uid, ptext):
        with app.app_context():
            try:
                structured = normalize_syllabus_structure(parse_syllabus_hierarchy(ptext))
                upload = StudentUpload.query.get(uid)
                if upload:
                    upload.structured_syllabus = json.dumps(structured)
                    upload.syllabus_structure_hash = structured.get('structure_hash')
                    db.session.commit()
                    logger.info(f"Structure extraction completed for upload {uid}")

                embed_structured_syllabus(
                    upload_id=uid,
                    user_id=upload.user_id if upload else 0,
                    filename=upload.filename if upload else '',
                    structured=structured,
                )
            except Exception as e:
                logger.error(f"Background structure extraction failed for upload {uid}: {e}")

    from flask import current_app
    app = current_app._get_current_object()
    t = threading.Thread(
        target=_bg_extract,
        args=(app, upload_id, parsed_text),
        daemon=True,
    )
    t.start()


def _set_active_syllabus(user_id, upload):
    StudentUpload.query.filter_by(user_id=user_id, doc_type='syllabus').update({"is_active_syllabus": False})
    upload.is_active_syllabus = True


def _invalidate_material_validation(subject_id, reason='The syllabus changed. Validate this material again.'):
    if not subject_id:
        return
    materials = StudentUpload.query.filter_by(subject_id=subject_id, doc_type='material').all()
    for material in materials:
        material.validation_status = 'pending'
        material.validation_error = reason
        material.validation_details = {}
        material.syllabus_match_score = None
        material.syllabus_match_coverage = None
        update_document_metadata(material.id, {'validation_status': 'pending'})


def _semester_from_path(path):
    match = re.search(r'(?:^|[/\\])sem-(\d+)(?:[/\\]|$)', path or '')
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _serialize_personal_upload(upload, include_text=False):
    item = _serialize_upload(upload, include_text=include_text)
    subject = None
    if upload and upload.subject_id:
        subject = Subject.query.filter_by(id=upload.subject_id, user_id=upload.user_id).first()
    item["semester"] = subject.semester if subject else _semester_from_path(upload.file_url)
    item["credits"] = subject.credits if subject else None
    item["code"] = subject.code if subject else None
    return item


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
                catalog_key=(find_subject(name=clean_name, semester=sem) or {}).get('id'),
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
    current_semester = int(user.semester or 1)
    all_subjects = Subject.query.filter_by(user_id=user.id).all()
    changed = False
    for subject in all_subjects:
        should_be_current = int(subject.semester) == current_semester
        if subject.is_current != should_be_current:
            subject.is_current = should_be_current
            changed = True
    if changed:
        db.session.commit()
    scope = (request.args.get('scope') or 'active').strip().lower()
    query = Subject.query.filter_by(user_id=user.id)
    if scope == 'active':
        query = query.filter(db.or_(Subject.is_current.is_(True), Subject.is_backlog.is_(True)))
    subjects = query.order_by(Subject.semester.asc(), Subject.name.asc()).all()
    return jsonify([{
        "id": s.id,
        "name": s.name,
        "catalog_key": s.catalog_key,
        "semester": s.semester,
        "code": s.code,
        "credits": s.credits,
        "is_current": s.is_current,
        "is_backlog": s.is_backlog,
        "created_at": s.created_at.isoformat() if s.created_at else None
    } for s in subjects]), 200


@syllabus_bp.route('/subjects/additional', methods=['POST'])
@login_required
def add_additional_subject(user):
    data = request.get_json(silent=True) or {}
    catalog_key = str(data.get('catalog_key') or '').strip()
    if not catalog_key:
        return jsonify({'error': 'Choose a subject to add'}), 400

    catalog_subject = find_subject(subject_key=catalog_key)
    if not catalog_subject:
        return jsonify({'error': 'Catalog subject not found'}), 404
    if int(catalog_subject['semester']) == int(user.semester or 1):
        return jsonify({'error': 'Current-semester subjects are already available'}), 400

    subject = Subject.query.filter_by(user_id=user.id, catalog_key=catalog_key).first()
    if subject and subject.is_backlog:
        return jsonify({'error': 'Subject is already added'}), 409
    if Subject.query.filter_by(user_id=user.id, is_backlog=True).count() >= 4:
        return jsonify({'error': 'Additional subject limit reached (4/4)'}), 400

    if not subject:
        subject = Subject(
            user_id=user.id,
            name=catalog_subject['name'],
            catalog_key=catalog_key,
            semester=int(catalog_subject['semester']),
            code=catalog_subject.get('code'),
            credits=catalog_subject.get('credits') or 3,
            is_current=False,
        )
        db.session.add(subject)
    subject.is_backlog = True
    db.session.commit()
    return jsonify({
        'id': subject.id, 'name': subject.name, 'catalog_key': subject.catalog_key,
        'semester': subject.semester, 'code': subject.code, 'credits': subject.credits,
        'is_current': subject.is_current, 'is_backlog': subject.is_backlog,
    }), 201


@syllabus_bp.route('/subjects/<int:subject_id>/additional', methods=['DELETE'])
@login_required
def remove_additional_subject(user, subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404
    if subject.is_current:
        return jsonify({'error': 'Current-semester subjects cannot be removed'}), 400
    subject.is_backlog = False
    db.session.commit()
    return jsonify({'message': 'Additional subject removed', 'id': subject.id}), 200


@syllabus_bp.route('/catalog', methods=['GET'])
@login_required
def get_official_catalog(user):
    """Return the normalized official syllabus hierarchy with stable IDs."""
    catalog = get_catalog()
    semester = request.args.get('semester', type=int)
    subject_key = (request.args.get('subject_key') or '').strip()
    subjects = catalog['subjects']
    if semester:
        subjects = [item for item in subjects if item['semester'] == semester]
    if subject_key:
        subjects = [item for item in subjects if item['id'] == subject_key]
    return jsonify({**catalog, 'subjects': subjects}), 200


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
    replacing_upload = None
    if existing_syllabus:
        if not replace:
            return jsonify({
                "error": "A syllabus already exists for this subject. Replace it?",
                "needs_confirm": True,
                "existing_id": existing_syllabus.id
            }), 409

        replacing_upload = existing_syllabus

    # Handle file upload
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, f"syllabus_{user.id}_{subject_id}_{filename}")

    try:
        text, extraction_meta = parse_uploaded_material_with_metadata(file, filepath)
        size_bytes = os.path.getsize(filepath)
    except ValueError as e:
        logger.error(f"Failed to parse syllabus file: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Failed to parse syllabus file: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": "Failed to parse this PDF. Please try a different file."}), 500

    if not text or not text.strip():
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": "No readable text could be extracted from this syllabus."}), 400

    if replacing_upload:
        delete_document_embeddings(replacing_upload.id)
        old_file_url = replacing_upload.file_url
        upload = replacing_upload
        upload.filename = filename
        upload.file_url = filepath
        upload.parsed_text = text
        upload.size_bytes = size_bytes
        upload.user_id = user.id
        upload.subject = subject.name
        upload.subject_id = subject_id
        upload.embedding_status = 'pending'
        upload.embedding_error = None
        upload.structured_syllabus = None
        upload.syllabus_version = int(upload.syllabus_version or 1) + 1
        upload.syllabus_structure_hash = None
        _invalidate_material_validation(subject_id)
        if old_file_url and old_file_url != filepath and os.path.exists(old_file_url):
            try:
                os.remove(old_file_url)
            except OSError:
                logger.warning('Could not remove replaced syllabus file %s', old_file_url)
    else:
        upload = StudentUpload(
            filename=filename,
            file_url=filepath,
            parsed_text=text,
            size_bytes=size_bytes,
            user_id=user.id,
            subject=subject.name,
            subject_id=subject_id,
            doc_type='syllabus',
            validation_status='approved',
        )

    upload.extraction_method = extraction_meta.get('extraction_method')
    upload.extraction_quality = extraction_meta.get('extraction_quality')
    upload.processing_warnings = extraction_meta.get('warnings') or []
    upload.page_count = extraction_meta.get('page_count')
    upload.character_count = extraction_meta.get('character_count')
    upload.validation_status = 'approved'
    upload.validation_error = None

    try:
        if not replacing_upload:
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

    if text and text.strip():
        _start_structure_extraction(upload.id, text)

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


@syllabus_bp.route('/<int:subject_id>/coverage', methods=['GET'])
@login_required
def get_syllabus_coverage_report(user, subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
    if not subject:
        return jsonify({"error": "Subject not found or access denied"}), 404

    syllabus_upload_id = request.args.get('syllabus_upload_id', type=int)
    if syllabus_upload_id:
        syllabus = StudentUpload.query.filter_by(
            id=syllabus_upload_id,
            subject_id=subject_id,
            doc_type='syllabus',
        ).first()
    else:
        syllabus = StudentUpload.query.filter_by(
            subject_id=subject_id,
            doc_type='syllabus',
        ).order_by(StudentUpload.created_at.desc()).first()

    if not syllabus:
        return jsonify({"error": "No syllabus uploaded for this subject"}), 404
    if syllabus.user_id != user.id and syllabus.syllabus_kind != 'official':
        return jsonify({"error": "Unauthorized"}), 403
    if not is_document_embedded(syllabus.id):
        return jsonify({
            "error": "Syllabus embeddings are not ready yet",
            "embedding_status": syllabus.embedding_status or 'pending',
        }), 409

    top_k = request.args.get('top_k', default=5, type=int)
    threshold = request.args.get('threshold', default=0.72, type=float)
    same_subject_only = request.args.get('same_subject_only', default='true').lower() != 'false'
    top_k = max(1, min(top_k, 20))
    threshold = max(0.0, min(threshold, 1.0))

    try:
        report = get_syllabus_coverage(
            syllabus_upload_id=syllabus.id,
            user_id=user.id,
            subject_id=subject_id,
            top_k=top_k,
            threshold=threshold,
            same_subject_only=same_subject_only,
        )
        report["syllabus"] = _serialize_upload(syllabus)
        report["subject"] = {
            "id": subject.id,
            "name": subject.name,
            "semester": subject.semester,
            "code": subject.code,
        }
        return jsonify(report), 200
    except Exception as e:
        logger.error(f"Failed to compute syllabus coverage: {e}")
        return jsonify({"error": "Failed to compute syllabus coverage"}), 500


@syllabus_bp.route('/<int:subject_id>/mastery', methods=['GET'])
@login_required
def get_subject_mastery_report(user, subject_id):
    try:
        report = get_subject_mastery(user.id, subject_id)
        if not report:
            return jsonify({"error": "Subject not found or access denied"}), 404
        return jsonify(report), 200
    except Exception as e:
        logger.error(f"Failed to load subject mastery: {e}")
        return jsonify({"error": "Failed to load subject mastery"}), 500


@syllabus_bp.route('/<int:subject_id>/topics/seed', methods=['POST'])
@login_required
def seed_subject_topics(user, subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
    if not subject:
        return jsonify({"error": "Subject not found or access denied"}), 404
    try:
        rows = seed_syllabus_topics(user.id, subject_id)
        return jsonify({"message": "Topics synced", "count": len(rows)}), 200
    except Exception as e:
        logger.error(f"Failed to seed syllabus topics: {e}")
        return jsonify({"error": "Failed to sync syllabus topics"}), 500


@syllabus_bp.route('/<int:subject_id>/learning-path', methods=['POST'])
@login_required
def generate_subject_learning_path(user, subject_id):
    report = get_subject_mastery(user.id, subject_id)
    if not report:
        return jsonify({"error": "Subject not found or access denied"}), 404

    topics = [
        topic for topic in report.get('topics', [])
        if topic.get('weak') or not topic.get('covered')
    ]
    try:
        path = generate_learning_path(report['subject']['name'], topics)
        return jsonify(path), 200
    except Exception as e:
        logger.error(f"Failed to generate learning path: {e}")
        return jsonify({"error": f"Failed to generate learning path: {str(e)}"}), 500


@syllabus_bp.route('/workspace', methods=['GET'])
@login_required
def get_syllabus_workspace(user):
    subject_id = request.args.get('subject_id', type=int)
    semester = request.args.get('semester', type=int)
    subject_name = (request.args.get('subject') or '').strip()
    if not subject_id and semester and subject_name:
        subject = Subject.query.filter_by(user_id=user.id, semester=semester, name=subject_name).first()
        if subject:
            subject_id = subject.id

    official = (
        StudentUpload.query.filter_by(doc_type='syllabus', syllabus_kind='official')
        .order_by(StudentUpload.created_at.desc())
        .first()
    )
    personal_query = StudentUpload.query.filter_by(user_id=user.id, doc_type='syllabus', syllabus_kind='personal')
    if subject_id:
        personal_query = personal_query.filter_by(subject_id=subject_id)
    elif subject_name:
        personal_query = personal_query.filter_by(subject=subject_name)
    personal = personal_query.order_by(StudentUpload.created_at.desc()).first()

    active = (
        StudentUpload.query.filter_by(user_id=user.id, doc_type='syllabus', is_active_syllabus=True)
        .order_by(StudentUpload.created_at.desc())
        .first()
    )
    if not active:
        active = official or personal
        if active and active.user_id == user.id:
            _set_active_syllabus(user.id, active)
            db.session.commit()

    return jsonify({
        "official": _serialize_upload(official),
        "personal": _serialize_upload(personal),
        "active_upload_id": active.id if active else None,
        "active_kind": active.syllabus_kind if active else None,
        "note": None if official else "No official syllabus uploaded yet by admin",
    }), 200


@syllabus_bp.route('/workspace/personal', methods=['POST'])
@login_required
def upsert_personal_syllabus(user):
    text = (request.form.get('text') or '').strip()
    file = request.files.get('file')
    replace_id = request.form.get('replace_id')
    semester = request.form.get('semester', type=int)
    subject_id = request.form.get('subject_id', type=int)
    subject_name = (request.form.get('subject') or '').strip()
    syllabus_name = (request.form.get('syllabus_name') or '').strip()

    if not text and not file:
        return jsonify({"error": "Paste syllabus text or upload a PDF/TXT file"}), 400
    if not semester or not subject_name:
        return jsonify({"error": "Choose a semester and subject first"}), 400

    subject = None
    if subject_id:
        subject = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
        if subject:
            subject_name = subject.name
            semester = subject.semester
    if not subject:
        subject = Subject.query.filter_by(user_id=user.id, semester=semester, name=subject_name).first()

    existing_query = StudentUpload.query.filter_by(user_id=user.id, doc_type='syllabus', syllabus_kind='personal')
    if subject:
        existing_query = existing_query.filter_by(subject_id=subject.id)
    elif subject_id:
        existing_query = existing_query.filter_by(subject_id=subject_id)
    else:
        existing_query = existing_query.filter_by(subject=subject_name)
    existing = existing_query.first()
    if existing and not replace_id:
        return jsonify({"error": "Personal syllabus already exists. Edit or delete it first."}), 409

    filename = f"{_slugify(syllabus_name or subject_name)}.txt"
    subject_slug = _slugify(subject_name)
    scoped_dir = os.path.join(UPLOAD_FOLDER, 'syllabus', str(user.id), f"sem-{semester}", subject_slug)
    os.makedirs(scoped_dir, exist_ok=True)
    filepath = os.path.join(scoped_dir, filename)
    parsed_text = text
    size_bytes = len(text.encode('utf-8'))
    extraction_meta = {
        'extraction_method': 'typed_text',
        'extraction_quality': 'good' if len(parsed_text.strip()) >= 500 else 'partial' if len(parsed_text.strip()) >= 120 else 'low',
        'warnings': [],
        'page_count': 1,
        'character_count': len(parsed_text.strip()),
    }

    try:
        if file:
            original_name = secure_filename(file.filename)
            if syllabus_name:
                _, ext = os.path.splitext(original_name)
                filename = secure_filename(f"{syllabus_name}{ext or '.pdf'}")
            else:
                filename = original_name
            if not filename:
                return jsonify({"error": "Uploaded file must have a filename"}), 400
            filepath = os.path.join(scoped_dir, filename)
            parsed_text, extraction_meta = parse_uploaded_material_with_metadata(file, filepath)
            size_bytes = os.path.getsize(filepath)
        else:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(parsed_text)

        if not parsed_text.strip():
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": "Syllabus content is empty after parsing"}), 400

        if existing:
            delete_document_embeddings(existing.id)
            if existing.file_url and os.path.exists(existing.file_url):
                try:
                    os.remove(existing.file_url)
                except Exception:
                    pass
            existing.filename = filename
            existing.file_url = filepath
            existing.parsed_text = parsed_text
            existing.size_bytes = size_bytes
            existing.subject = subject_name
            existing.subject_id = subject.id if subject else subject_id
            existing.embedding_status = 'pending'
            existing.embedding_error = None
            existing.extraction_method = extraction_meta.get('extraction_method')
            existing.extraction_quality = extraction_meta.get('extraction_quality')
            existing.processing_warnings = extraction_meta.get('warnings') or []
            existing.page_count = extraction_meta.get('page_count')
            existing.character_count = extraction_meta.get('character_count')
            existing.validation_status = 'approved'
            existing.validation_error = None
            existing.structured_syllabus = None
            existing.syllabus_version = int(existing.syllabus_version or 1) + 1
            existing.syllabus_structure_hash = None
            _invalidate_material_validation(existing.subject_id)
            upload = existing
        else:
            upload = StudentUpload(
                filename=filename,
                file_url=filepath,
                parsed_text=parsed_text,
                size_bytes=size_bytes,
                user_id=user.id,
                subject=subject_name,
                subject_id=subject.id if subject else subject_id,
                doc_type='syllabus',
                syllabus_kind='personal',
                extraction_method=extraction_meta.get('extraction_method'),
                extraction_quality=extraction_meta.get('extraction_quality'),
                processing_warnings=extraction_meta.get('warnings') or [],
                page_count=extraction_meta.get('page_count'),
                character_count=extraction_meta.get('character_count'),
                validation_status='approved',
            )
            db.session.add(upload)

        if request.form.get('set_active', 'true').lower() == 'true':
            _set_active_syllabus(user.id, upload)

        db.session.commit()
        _start_embedding(upload.id, user.id, upload.filename, parsed_text)
        if parsed_text.strip():
            _start_structure_extraction(upload.id, parsed_text)
        return jsonify(_serialize_personal_upload(upload, include_text=True)), 200 if existing else 201
    except ValueError as e:
        db.session.rollback()
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
        logger.error(f"Failed to save personal syllabus: {e}")
        return jsonify({"error": "Failed to save personal syllabus. Please try a different file."}), 500


@syllabus_bp.route('/workspace/personal', methods=['GET'])
@login_required
def list_personal_syllabi(user):
    uploads = (
        StudentUpload.query.filter_by(user_id=user.id, doc_type='syllabus', syllabus_kind='personal')
        .order_by(StudentUpload.created_at.desc())
        .all()
    )
    subject_ids = [upload.subject_id for upload in uploads if upload.subject_id]
    subjects = {}
    if subject_ids:
        subjects = {
            subject.id: subject
            for subject in Subject.query.filter(Subject.user_id == user.id, Subject.id.in_(subject_ids)).all()
        }

    items = []
    for upload in uploads:
        item = _serialize_upload(upload)
        subject = subjects.get(upload.subject_id)
        item["semester"] = subject.semester if subject else _semester_from_path(upload.file_url)
        item["credits"] = subject.credits if subject else None
        item["code"] = subject.code if subject else None
        items.append(item)

    return jsonify(items), 200


@syllabus_bp.route('/workspace/<int:upload_id>/active', methods=['POST'])
@login_required
def set_active_workspace_syllabus(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload or upload.doc_type != 'syllabus':
        return jsonify({"error": "Syllabus not found"}), 404
    if upload.syllabus_kind != 'official' and upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        _set_active_syllabus(user.id, upload)
        db.session.commit()
        return jsonify({"active_upload_id": upload.id, "active_kind": upload.syllabus_kind}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to set active syllabus: {e}")
        return jsonify({"error": "Failed to set active syllabus"}), 500


@syllabus_bp.route('/workspace/<int:upload_id>', methods=['GET'])
@login_required
def get_workspace_syllabus_detail(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload or upload.doc_type != 'syllabus':
        return jsonify({"error": "Syllabus not found"}), 404
    if upload.syllabus_kind != 'official' and upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(_serialize_upload(upload, include_text=True)), 200


@syllabus_bp.route('/workspace/<int:upload_id>/file', methods=['GET'])
@login_required
def get_workspace_syllabus_file(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload or upload.doc_type != 'syllabus':
        return jsonify({"error": "Syllabus not found"}), 404
    if upload.syllabus_kind != 'official' and upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403
    if upload.file_url and os.path.exists(upload.file_url):
        mimetype = 'application/pdf' if upload.filename.lower().endswith('.pdf') else 'text/plain'
        return send_file(upload.file_url, mimetype=mimetype, as_attachment=False, download_name=upload.filename)
    return jsonify({"error": "File not found"}), 404


@syllabus_bp.route('/workspace/personal/<int:upload_id>', methods=['DELETE'])
@login_required
def delete_personal_syllabus(user, upload_id):
    upload = StudentUpload.query.filter_by(id=upload_id, user_id=user.id, doc_type='syllabus', syllabus_kind='personal').first()
    if not upload:
        return jsonify({"error": "Personal syllabus not found"}), 404

    try:
        was_active = upload.is_active_syllabus
        delete_document_embeddings(upload.id)
        if upload.file_url and os.path.exists(upload.file_url):
            os.remove(upload.file_url)
        db.session.delete(upload)
        if was_active:
            official = StudentUpload.query.filter_by(doc_type='syllabus', syllabus_kind='official').order_by(StudentUpload.created_at.desc()).first()
            if official and official.user_id == user.id:
                _set_active_syllabus(user.id, official)
        db.session.commit()
        return jsonify({"message": "Personal syllabus deleted"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete personal syllabus: {e}")
        return jsonify({"error": "Failed to delete personal syllabus"}), 500


@syllabus_bp.route('/workspace/<int:upload_id>/extract-structure', methods=['POST'])
@login_required
def extract_syllabus_structure(user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload or upload.doc_type != 'syllabus':
        return jsonify({"error": "Syllabus not found"}), 404
    if upload.syllabus_kind != 'official' and upload.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    if upload.structured_syllabus:
        try:
            structured = normalize_syllabus_structure(json.loads(upload.structured_syllabus))
            if structured.get('structure_hash') != upload.syllabus_structure_hash:
                upload.structured_syllabus = json.dumps(structured)
                upload.syllabus_structure_hash = structured.get('structure_hash')
                db.session.commit()
                embed_structured_syllabus(upload.id, upload.user_id, upload.filename, structured)
            return jsonify(structured), 200
        except (json.JSONDecodeError, TypeError):
            pass

    if not upload.parsed_text:
        return jsonify({"error": "No parsed text available for this syllabus"}), 400

    force = request.args.get('force', 'false').lower() == 'true'
    if not force and upload.structured_syllabus is None:
        _start_structure_extraction(upload.id, upload.parsed_text)
        return jsonify({"status": "processing", "message": "Structure extraction started in background"}), 202

    try:
        structured = normalize_syllabus_structure(parse_syllabus_hierarchy(upload.parsed_text))
        upload.structured_syllabus = json.dumps(structured)
        upload.syllabus_structure_hash = structured.get('structure_hash')
        db.session.commit()
        embed_structured_syllabus(upload.id, upload.user_id, upload.filename, structured)
        return jsonify(structured), 200
    except Exception as e:
        logger.error(f"Structure extraction failed for upload {upload_id}: {e}")
        return jsonify({"error": f"Failed to extract syllabus structure: {str(e)}"}), 500
