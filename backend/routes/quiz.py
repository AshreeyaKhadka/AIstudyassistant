from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from config import db
from models.quiz import QuizSet
import json

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/generate', methods=['POST'])
@login_required
def generate_quiz(user):
    data = request.json or {}
    topic = data.get('topic', 'General Knowledge')
    
    # Mock AI response
    mock_quiz = [
        {"question": f"What is the core principle of {topic}?", "options": ["A", "B", "C", "D"], "answer": "A"},
        {"question": "How does memory management work?", "options": ["Option 1", "Option 2", "Option 3"], "answer": "Option 2"}
    ]
    
    quiz_set = QuizSet(
        topic=topic,
        questions=json.dumps(mock_quiz),
        user_id=user.id
    )
    db.session.add(quiz_set)
    db.session.commit()
    
    return jsonify({
        "message": "Quiz generated",
        "quiz_id": quiz_set.id,
        "questions": mock_quiz
    }), 200

@quiz_bp.route('/history', methods=['GET'])
@login_required
def quiz_history(user):
    quizzes = QuizSet.query.filter_by(user_id=user.id).order_by(QuizSet.created_at.desc()).all()
    return jsonify([
        {
            "id": q.id,
            "topic": q.topic,
            "created_at": q.created_at
        } for q in quizzes
    ]), 200
