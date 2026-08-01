from flask import Blueprint, jsonify, request, Response
from services.auth_service import admin_required
from config import db
from models.user import User
from models.content import StudentUpload, Subject
from models.chat import ChatSession, ChatMessage
from models.progress import ActivityLog
from models.ai_usage import AiUsageLog
from services.document_parser import parse_uploaded_material_with_metadata, supported_material_message
from services.rag_service import embed_document, delete_document_embeddings
from werkzeug.utils import secure_filename
import logging
import os
import io
import csv
import threading
from datetime import datetime, timedelta
from sqlalchemy import func, cast, Date

admin_bp = Blueprint('admin', __name__)
logger = logging.getLogger(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users(admin_user):
    search = request.args.get('search', '').strip()
    role_filter = request.args.get('role', '').strip()
    status_filter = request.args.get('status', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    query = User.query

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                User.email.ilike(like),
                User.name.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )

    if role_filter in ('student', 'admin'):
        query = query.filter(User.role == role_filter)

    if status_filter == 'banned':
        query = query.filter(User.is_banned == True)
    elif status_filter == 'active':
        query = query.filter(User.is_banned == False)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'users': [u.to_dict() for u in users],
        'total': total,
        'page': page,
        'per_page': per_page,
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_detail(admin_user, user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    upload_count = StudentUpload.query.filter_by(user_id=user_id).count()
    chat_count = ChatSession.query.filter_by(user_id=user_id).count()
    activity_count = ActivityLog.query.filter_by(user_id=user_id).count()
    token_usage = db.session.query(
        func.coalesce(func.sum(AiUsageLog.total_tokens), 0)
    ).filter(AiUsageLog.user_id == user_id).scalar()

    return jsonify({
        'user': user.to_dict(),
        'stats': {
            'uploads': upload_count,
            'chat_sessions': chat_count,
            'activities': activity_count,
            'total_tokens': token_usage,
        }
    }), 200


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


@admin_bp.route('/users/<int:user_id>/role', methods=['PATCH'])
@admin_required
def update_user_role(admin_user, user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json or {}
    new_role = data.get('role', '')
    if new_role not in ('student', 'admin'):
        return jsonify({"error": "Invalid role"}), 400

    user.role = new_role
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update role"}), 500

    return jsonify({"message": f"User {user.email} role updated to {new_role}"}), 200


@admin_bp.route('/users/<int:user_id>/quota', methods=['PATCH'])
@admin_required
def update_user_quota(admin_user, user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json or {}
    if 'token_quota' in data:
        user.token_quota = max(0, int(data['token_quota']))
    if 'token_quota_enabled' in data:
        user.token_quota_enabled = bool(data['token_quota_enabled'])

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update quota"}), 500

    return jsonify({"message": "Quota updated", "user": user.to_dict()}), 200


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats(admin_user):
    total_users = User.query.count()
    active_users = User.query.filter_by(is_banned=False).count()
    banned_users = User.query.filter_by(is_banned=True).count()
    admin_count = User.query.filter_by(role='admin').count()

    total_uploads = StudentUpload.query.count()
    material_uploads = StudentUpload.query.filter_by(doc_type='material').count()
    syllabus_uploads = StudentUpload.query.filter_by(doc_type='syllabus').count()

    total_chats = ChatSession.query.count()
    total_messages = ChatMessage.query.count()

    total_tokens = db.session.query(
        func.coalesce(func.sum(AiUsageLog.total_tokens), 0)
    ).scalar()

    today = datetime.utcnow().date()
    today_tokens = db.session.query(
        func.coalesce(func.sum(AiUsageLog.total_tokens), 0)
    ).filter(func.date(AiUsageLog.created_at) == today).scalar()

    week_ago = today - timedelta(days=7)
    weekly_tokens = db.session.query(
        func.coalesce(func.sum(AiUsageLog.total_tokens), 0)
    ).filter(AiUsageLog.created_at >= datetime.combine(week_ago, datetime.min.time())).scalar()

    recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()

    return jsonify({
        'total_users': total_users,
        'active_users': active_users,
        'banned_users': banned_users,
        'admin_count': admin_count,
        'total_uploads': total_uploads,
        'material_uploads': material_uploads,
        'syllabus_uploads': syllabus_uploads,
        'total_chats': total_chats,
        'total_messages': total_messages,
        'total_tokens': total_tokens,
        'today_tokens': today_tokens,
        'weekly_tokens': weekly_tokens,
        'recent_users': [u.to_dict() for u in recent_users],
        'database_health': 'ok',
    }), 200


@admin_bp.route('/stats/token-usage', methods=['GET'])
@admin_required
def get_token_usage(admin_user):
    days = int(request.args.get('days', 30))
    since = datetime.utcnow() - timedelta(days=days)

    daily_usage = db.session.query(
        func.date(AiUsageLog.created_at).label('date'),
        func.sum(AiUsageLog.total_tokens).label('total'),
        func.sum(AiUsageLog.prompt_tokens).label('prompt'),
        func.sum(AiUsageLog.completion_tokens).label('completion'),
    ).filter(
        AiUsageLog.created_at >= since
    ).group_by(
        func.date(AiUsageLog.created_at)
    ).order_by(
        func.date(AiUsageLog.created_at)
    ).all()

    by_action = db.session.query(
        AiUsageLog.action_type,
        func.sum(AiUsageLog.total_tokens).label('total'),
        func.count(AiUsageLog.id).label('count'),
    ).filter(
        AiUsageLog.created_at >= since
    ).group_by(
        AiUsageLog.action_type
    ).all()

    by_user = db.session.query(
        User.email,
        User.display_name if hasattr(User, 'display_name') else User.name,
        func.sum(AiUsageLog.total_tokens).label('total'),
        func.count(AiUsageLog.id).label('count'),
    ).join(
        User, AiUsageLog.user_id == User.id
    ).filter(
        AiUsageLog.created_at >= since
    ).group_by(
        User.id
    ).order_by(
        func.sum(AiUsageLog.total_tokens).desc()
    ).limit(20).all()

    return jsonify({
        'daily': [
            {
                'date': str(r.date),
                'total_tokens': r.total or 0,
                'prompt_tokens': r.prompt or 0,
                'completion_tokens': r.completion or 0,
            }
            for r in daily_usage
        ],
        'by_action': [
            {
                'action_type': r.action_type,
                'total_tokens': r.total or 0,
                'count': r.count,
            }
            for r in by_action
        ],
        'by_user': [
            {
                'email': r[0],
                'name': r[1],
                'total_tokens': r[2] or 0,
                'count': r[3],
            }
            for r in by_user
        ],
    }), 200


@admin_bp.route('/stats/content', methods=['GET'])
@admin_required
def get_content_stats(admin_user):
    by_subject = db.session.query(
        StudentUpload.subject,
        func.count(StudentUpload.id).label('count'),
        func.sum(StudentUpload.size_bytes).label('total_size'),
    ).filter(
        StudentUpload.subject.isnot(None),
        StudentUpload.subject != '',
    ).group_by(
        StudentUpload.subject
    ).order_by(
        func.count(StudentUpload.id).desc()
    ).all()

    by_type = db.session.query(
        StudentUpload.doc_type,
        func.count(StudentUpload.id).label('count'),
    ).group_by(
        StudentUpload.doc_type
    ).all()

    by_validation = db.session.query(
        StudentUpload.validation_status,
        func.count(StudentUpload.id).label('count'),
    ).group_by(
        StudentUpload.validation_status
    ).all()

    recent_uploads = StudentUpload.query.order_by(
        StudentUpload.created_at.desc()
    ).limit(20).all()

    return jsonify({
        'by_subject': [
            {
                'subject': r[0],
                'count': r[1],
                'total_size': r[2] or 0,
            }
            for r in by_subject
        ],
        'by_type': [
            {'doc_type': r[0], 'count': r[1]}
            for r in by_type
        ],
        'by_validation': [
            {'status': r[0], 'count': r[1]}
            for r in by_validation
        ],
        'recent_uploads': [
            {
                'id': u.id,
                'filename': u.filename,
                'subject': u.subject,
                'doc_type': u.doc_type,
                'size_bytes': u.size_bytes,
                'validation_status': u.validation_status,
                'created_at': u.created_at.isoformat() if u.created_at else None,
                'user_id': u.user_id,
            }
            for u in recent_uploads
        ],
    }), 200


@admin_bp.route('/activity', methods=['GET'])
@admin_required
def get_activity_log(admin_user):
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    action_filter = request.args.get('action', '').strip()

    query = ActivityLog.query

    if action_filter:
        query = query.filter(ActivityLog.action == action_filter)

    total = query.count()
    logs = query.order_by(ActivityLog.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    user_ids = list(set(log.user_id for log in logs))
    users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}

    return jsonify({
        'logs': [
            {
                'id': log.id,
                'user_id': log.user_id,
                'user_email': users[log.user_id].email if log.user_id in users else 'Unknown',
                'user_name': users[log.user_id].name if log.user_id in users else 'Unknown',
                'action': log.action,
                'score': log.score,
                'topic_title': log.topic_title,
                'metadata': log.activity_metadata,
                'created_at': log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        'total': total,
        'page': page,
        'per_page': per_page,
    }), 200


@admin_bp.route('/uploads/<int:upload_id>', methods=['DELETE'])
@admin_required
def delete_upload(admin_user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    try:
        delete_document_embeddings(upload.id)
        if upload.file_url and os.path.exists(upload.file_url):
            try:
                os.remove(upload.file_url)
            except Exception:
                pass
        db.session.delete(upload)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete upload {upload_id}: {e}")
        return jsonify({"error": "Failed to delete upload"}), 500

    return jsonify({"message": f"Upload '{upload.filename}' deleted"}), 200


@admin_bp.route('/uploads/<int:upload_id>/validate', methods=['PATCH'])
@admin_required
def validate_upload(admin_user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    data = request.json or {}
    status = data.get('status', '')
    if status not in ('approved', 'rejected', 'pending'):
        return jsonify({"error": "Invalid status"}), 400

    upload.validation_status = status
    upload.validation_error = data.get('reason', '') if status == 'rejected' else None

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update validation status"}), 500

    return jsonify({"message": f"Upload validation set to {status}"}), 200


@admin_bp.route('/export/users', methods=['GET'])
@admin_required
def export_users_csv(admin_user):
    users = User.query.order_by(User.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'ID', 'Email', 'Name', 'Role', 'Status', 'College', 'Semester',
        'Token Quota', 'Quota Enabled', 'Created At', 'Last Active'
    ])

    for u in users:
        writer.writerow([
            u.id, u.email, u.name, u.role,
            'Banned' if u.is_banned else 'Active',
            u.college or '', u.semester or '',
            u.token_quota, u.token_quota_enabled,
            u.created_at.isoformat() if u.created_at else '',
            u.last_active.isoformat() if u.last_active else '',
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=users_export.csv'}
    )


@admin_bp.route('/export/tokens', methods=['GET'])
@admin_required
def export_tokens_csv(admin_user):
    logs = db.session.query(
        AiUsageLog.user_id,
        User.email,
        User.name,
        AiUsageLog.action_type,
        func.sum(AiUsageLog.prompt_tokens).label('prompt_total'),
        func.sum(AiUsageLog.completion_tokens).label('completion_total'),
        func.sum(AiUsageLog.total_tokens).label('total'),
        func.count(AiUsageLog.id).label('count'),
    ).join(
        User, AiUsageLog.user_id == User.id
    ).group_by(
        AiUsageLog.user_id, AiUsageLog.action_type
    ).order_by(
        func.sum(AiUsageLog.total_tokens).desc()
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'User ID', 'Email', 'Name', 'Action Type',
        'Prompt Tokens', 'Completion Tokens', 'Total Tokens', 'Request Count'
    ])

    for r in logs:
        writer.writerow([
            r.user_id, r.email, r.name, r.action_type,
            r.prompt_total or 0, r.completion_total or 0, r.total or 0, r.count
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=token_usage_export.csv'}
    )


@admin_bp.route('/syllabus', methods=['POST'])
@admin_required
def upload_syllabus(admin_user):
    text = (request.form.get('text') or '').strip()
    file = request.files.get('file')
    if not text and not file:
        return jsonify({"error": f"Provide syllabus text or upload a file. {supported_material_message()}"}), 400

    filename = 'official-syllabus.txt'
    filepath = os.path.join(UPLOAD_FOLDER, f"official_syllabus_{int(datetime.utcnow().timestamp())}.txt")
    parsed_text = text
    extraction_meta = {
        'extraction_method': 'typed_text',
        'extraction_quality': 'good' if len(parsed_text.strip()) >= 500 else 'partial' if len(parsed_text.strip()) >= 120 else 'low',
    }

    try:
        if file:
            filename = secure_filename(file.filename)
            if not filename:
                return jsonify({"error": "Uploaded file must have a filename"}), 400
            filepath = os.path.join(UPLOAD_FOLDER, f"official_syllabus_{int(datetime.utcnow().timestamp())}_{filename}")
            parsed_text, extraction_meta = parse_uploaded_material_with_metadata(file, filepath)
        else:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(parsed_text)

        if not parsed_text.strip():
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": "Syllabus content is empty after parsing"}), 400

        size_bytes = os.path.getsize(filepath) if os.path.exists(filepath) else len(parsed_text.encode('utf-8'))

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
            upload.size_bytes = size_bytes
            upload.embedding_status = 'pending'
            upload.embedding_error = None
            upload.user_id = admin_user.id
            upload.extraction_method = extraction_meta.get('extraction_method')
            upload.extraction_quality = extraction_meta.get('extraction_quality')
            upload.processing_warnings = extraction_meta.get('warnings') or []
            upload.page_count = extraction_meta.get('page_count')
            upload.character_count = extraction_meta.get('character_count')
            upload.validation_status = 'approved'
            upload.validation_error = None
            upload.structured_syllabus = None
            upload.syllabus_version = int(upload.syllabus_version or 1) + 1
            upload.syllabus_structure_hash = None
        else:
            upload = StudentUpload(
                filename=filename,
                file_url=filepath,
                parsed_text=parsed_text,
                size_bytes=size_bytes,
                user_id=admin_user.id,
                subject='Official Syllabus',
                doc_type='syllabus',
                syllabus_kind='official',
                extraction_method=extraction_meta.get('extraction_method'),
                extraction_quality=extraction_meta.get('extraction_quality'),
                processing_warnings=extraction_meta.get('warnings') or [],
                page_count=extraction_meta.get('page_count'),
                character_count=extraction_meta.get('character_count'),
                validation_status='approved',
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
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
        logger.error(f"Official syllabus upload failed: {e}")
        return jsonify({"error": "Failed to upload official syllabus"}), 500


@admin_bp.route('/materials', methods=['GET'])
@admin_required
def get_all_materials(admin_user):
    search = request.args.get('search', '').strip()
    doc_type = request.args.get('doc_type', '').strip()
    validation = request.args.get('validation', '').strip()
    subject = request.args.get('subject', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    query = StudentUpload.query

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                StudentUpload.filename.ilike(like),
                StudentUpload.subject.ilike(like),
            )
        )
    if doc_type in ('material', 'syllabus'):
        query = query.filter(StudentUpload.doc_type == doc_type)
    if validation in ('pending', 'approved', 'rejected'):
        query = query.filter(StudentUpload.validation_status == validation)
    if subject:
        query = query.filter(StudentUpload.subject.ilike(f'%{subject}%'))

    total = query.count()
    uploads = query.order_by(StudentUpload.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    user_ids = list(set(u.user_id for u in uploads))
    users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}

    return jsonify({
        'uploads': [
            {
                'id': u.id,
                'filename': u.filename,
                'file_url': u.file_url,
                'size_bytes': u.size_bytes,
                'subject': u.subject,
                'doc_type': u.doc_type,
                'syllabus_kind': u.syllabus_kind,
                'embedding_status': u.embedding_status,
                'validation_status': u.validation_status,
                'validation_error': u.validation_error,
                'extraction_method': u.extraction_method,
                'extraction_quality': u.extraction_quality,
                'user_id': u.user_id,
                'user_email': users[u.user_id].email if u.user_id in users else 'Unknown',
                'user_name': users[u.user_id].name if u.user_id in users else 'Unknown',
                'created_at': u.created_at.isoformat() if u.created_at else None,
            }
            for u in uploads
        ],
        'total': total,
        'page': page,
        'per_page': per_page,
    }), 200


@admin_bp.route('/materials/<int:upload_id>/file', methods=['GET'])
@admin_required
def view_material_file(admin_user, upload_id):
    from flask import send_file
    import mimetypes

    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    if not upload.file_url or not os.path.exists(upload.file_url):
        return jsonify({"error": "File not found on disk"}), 404

    mimetype = mimetypes.guess_type(upload.filename)[0] or 'application/octet-stream'
    return send_file(upload.file_url, mimetype=mimetype, as_attachment=False, download_name=upload.filename)


@admin_bp.route('/materials/<int:upload_id>/parsed', methods=['GET'])
@admin_required
def view_material_parsed(admin_user, upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    return jsonify({
        'id': upload.id,
        'filename': upload.filename,
        'parsed_text': upload.parsed_text or '',
        'subject': upload.subject,
        'doc_type': upload.doc_type,
        'size_bytes': upload.size_bytes,
        'extraction_method': upload.extraction_method,
        'extraction_quality': upload.extraction_quality,
    }), 200
