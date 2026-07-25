from flask import Blueprint, request, jsonify
from services.auth_service import login_required
import services.focus_service as focus_service

focus_bp = Blueprint('focus', __name__)

@focus_bp.route('/sessions', methods=['POST'])
@login_required
def log_session(user):
    data = request.json
    result = focus_service.log_session(user.id, data)
    return jsonify(result), 201

@focus_bp.route('/sessions', methods=['GET'])
@login_required
def get_sessions(user):
    history = focus_service.get_history(user.id)
    return jsonify(history), 200

@focus_bp.route('/analytics', methods=['GET'])
@login_required
def get_analytics(user):
    analytics = focus_service.get_analytics(user.id)
    return jsonify(analytics), 200

@focus_bp.route('/recommendations', methods=['GET'])
@login_required
def get_recommendations(user):
    recommendations = focus_service.get_recommendations(user.id)
    return jsonify(recommendations), 200
