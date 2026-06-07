from flask import Blueprint, jsonify, request
from services.auth_service import admin_required
from config import db
from models.user import User
import logging

admin_bp = Blueprint('admin', __name__)
logger = logging.getLogger(__name__)

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
    # Mock endpoint for syllabus upload
    return jsonify({"message": "Syllabus uploaded and parsed for RAG embeddings."}), 200
