from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from config import db
from models.quiz import QuizSet
from services.progress_service import record_quiz_result
from datetime import datetime, timedelta
import math
import logging

quiz_bp = Blueprint('quiz', __name__)
logger = logging.getLogger(__name__)

@quiz_bp.route('/generate', methods=['POST'])
@login_required
def generate_quiz(user):
    data = request.get_json(silent=True) or {}
    if not data.get('upload_id'):
        return jsonify({
            'error': 'upload_id is required. Quizzes must be grounded in a selected study document.'
        }), 400

    # Compatibility endpoint: use the same grounded generation path as /generate/mcqs.
    from routes.generate import gen_mcqs
    return gen_mcqs.__wrapped__(user)

@quiz_bp.route('/history', methods=['GET'])
@login_required
def quiz_history(user):
    try:
        quizzes = QuizSet.query.filter_by(user_id=user.id).order_by(QuizSet.created_at.desc()).all()
        return jsonify([
            {
                "id": q.id,
                "topic": q.topic,
                "assessment_type": q.assessment_type or 'mcq',
                "title": q.title,
                "score": q.score,
                "total_marks": q.total_marks,
                "created_at": q.created_at
            } for q in quizzes
        ]), 200
    except Exception as e:
        logger.error(f"Failed to fetch quiz history: {e}")
        return jsonify({"error": "Failed to fetch quiz history"}), 500


@quiz_bp.route('/submit', methods=['POST'])
@login_required
def submit_quiz_score(user):
    data = request.json or {}
    quiz_set_id = data.get('quiz_set_id')
    answers = data.get('answers')

    if quiz_set_id is None or not isinstance(answers, (dict, list)):
        return jsonify({"error": "quiz_set_id and answers are required"}), 400

    quiz_set = QuizSet.query.get(quiz_set_id)
    if not quiz_set or quiz_set.user_id != user.id:
        return jsonify({"error": "Quiz set not found"}), 404
    if (quiz_set.assessment_type or 'mcq') != 'mcq':
        return jsonify({"error": "Only MCQ sets can be submitted through this endpoint"}), 400

    questions = quiz_set.questions_json if isinstance(quiz_set.questions_json, list) else []
    normalized_answers = {
        int(index): str(value).strip().upper()
        for index, value in (answers.items() if isinstance(answers, dict) else enumerate(answers))
        if str(index).isdigit()
    }
    results = []
    for index, question in enumerate(questions):
        selected = normalized_answers.get(index)
        correct = str(question.get('correct') or question.get('correct_answer') or '').strip().upper()
        results.append({
            'index': index,
            'selected': selected,
            'correct': correct,
            'is_correct': bool(selected and selected == correct),
            'topic_title': question.get('topic_title') or quiz_set.topic,
            'page_number': question.get('page_number', 0),
        })
    score = sum(1 for result in results if result['is_correct'])

    try:
        quiz_set.score = score
        quiz_set.completed_at = datetime.utcnow()
        quiz_set.attempt_json = {'answers': normalized_answers, 'results': results}
        record_quiz_result(user.id, quiz_set, score, results=results)
        db.session.commit()
        return jsonify({
            "message": "Quiz graded successfully",
            "score": score,
            "total": len(questions),
            "percentage": round(score * 100 / len(questions), 1) if questions else 0,
            "results": results,
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to submit quiz score: {e}")
        return jsonify({"error": "Failed to record score"}), 500


def _serialize_flashcard_deck(deck):
    cards = deck.questions_json if isinstance(deck.questions_json, list) else []
    now = datetime.utcnow()
    due_count = 0
    for card in cards:
        due_at = ((card.get('review') or {}).get('due_at') if isinstance(card, dict) else None)
        if not due_at:
            due_count += 1
            continue
        try:
            if datetime.fromisoformat(due_at) <= now:
                due_count += 1
        except ValueError:
            due_count += 1
    return {
        'id': deck.id,
        'upload_id': deck.upload_id,
        'subject_id': deck.subject_id,
        'title': deck.title or deck.topic,
        'source_doc': (deck.source_metadata or {}).get('filename'),
        'cards': cards,
        'card_count': len(cards),
        'due_count': due_count,
        'created_at': deck.created_at.isoformat() if deck.created_at else None,
    }


@quiz_bp.route('/flashcards', methods=['GET'])
@login_required
def flashcard_decks(user):
    decks = QuizSet.query.filter_by(user_id=user.id, assessment_type='flashcard').order_by(QuizSet.created_at.desc()).all()
    return jsonify({'decks': [_serialize_flashcard_deck(deck) for deck in decks]}), 200


@quiz_bp.route('/flashcards/<int:deck_id>/review', methods=['POST'])
@login_required
def review_flashcard(user, deck_id):
    deck = QuizSet.query.get(deck_id)
    if not deck or deck.user_id != user.id or deck.assessment_type != 'flashcard':
        return jsonify({'error': 'Flashcard deck not found'}), 404
    data = request.get_json(silent=True) or {}
    try:
        card_index = int(data.get('card_index'))
    except (TypeError, ValueError):
        return jsonify({'error': 'card_index is required'}), 400
    rating = str(data.get('rating') or '').strip().lower()
    if rating not in {'again', 'hard', 'good', 'easy'}:
        return jsonify({'error': 'rating must be again, hard, good, or easy'}), 400

    cards = list(deck.questions_json or [])
    if card_index < 0 or card_index >= len(cards) or not isinstance(cards[card_index], dict):
        return jsonify({'error': 'Flashcard not found'}), 404
    card = dict(cards[card_index])
    previous = card.get('review') or {}
    repetitions = int(previous.get('repetitions', 0) or 0)
    old_interval = int(previous.get('interval_days', 0) or 0)
    if rating == 'again':
        repetitions = 0
        interval = 1
    elif rating == 'hard':
        repetitions += 1
        interval = max(2, math.ceil(old_interval * 1.2))
    elif rating == 'good':
        repetitions += 1
        interval = 3 if old_interval == 0 else max(3, math.ceil(old_interval * 2))
    else:
        repetitions += 1
        interval = 7 if old_interval == 0 else max(7, math.ceil(old_interval * 2.5))
    reviewed_at = datetime.utcnow()
    card['review'] = {
        'rating': rating,
        'repetitions': repetitions,
        'interval_days': interval,
        'last_reviewed_at': reviewed_at.isoformat(),
        'due_at': (reviewed_at + timedelta(days=interval)).isoformat(),
    }
    cards[card_index] = card
    deck.questions_json = cards
    deck.score = sum(1 for item in cards if int((item.get('review') or {}).get('repetitions', 0) or 0) >= 2)
    from services.progress_service import record_flashcard_review
    record_flashcard_review(user.id, deck, card, rating, interval)
    db.session.commit()
    return jsonify({'deck': _serialize_flashcard_deck(deck), 'card': card}), 200
