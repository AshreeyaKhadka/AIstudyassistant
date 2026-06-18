from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from config import db
from models.exam import Exam
import logging

exam_bp = Blueprint('exam', __name__)
logger = logging.getLogger(__name__)

EXAM_TYPES = ['ut', 'assessment', 'final']


# GET /exams — list user's exams
@exam_bp.route('', methods=['GET'])
@login_required
def get_exams(user):
    try:
        exams = Exam.query.filter_by(user_id=user.id).order_by(Exam.exam_date.asc()).all()
        return jsonify([e.to_dict() for e in exams]), 200
    except Exception as e:
        logger.error(f"Failed to fetch exams: {e}")
        return jsonify({"error": "Failed to fetch exams"}), 500


# POST /exams — create exam
@exam_bp.route('', methods=['POST'])
@login_required
def create_exam(user):
    data = request.json or {}
    title = data.get('title', '').strip()
    exam_type = data.get('exam_type', '').strip()
    subject = data.get('subject', '').strip()
    exam_date = data.get('exam_date', '').strip()

    if not title or not exam_type or not subject or not exam_date:
        return jsonify({"error": "Title, type, subject, and date are required"}), 400

    if exam_type not in EXAM_TYPES:
        return jsonify({"error": f"Invalid exam type. Must be one of: {', '.join(EXAM_TYPES)}"}), 400

    exam = Exam(
        user_id=user.id,
        title=title,
        exam_type=exam_type,
        subject=subject,
        exam_date=exam_date,
        description=data.get('description', ''),
    )

    try:
        db.session.add(exam)
        db.session.commit()
        return jsonify(exam.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create exam: {e}")
        return jsonify({"error": "Failed to create exam"}), 500


# DELETE /exams/<id>
@exam_bp.route('/<int:exam_id>', methods=['DELETE'])
@login_required
def delete_exam(user, exam_id):
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": "Exam not found"}), 404
    if exam.user_id != user.id:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        db.session.delete(exam)
        db.session.commit()
        return jsonify({"message": "Exam deleted"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete exam {exam_id}: {e}")
        return jsonify({"error": "Failed to delete exam"}), 500
