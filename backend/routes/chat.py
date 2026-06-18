from flask import Blueprint, jsonify, request
from config import Config, db
from models.content import StudentUpload
from models.chat import ChatSession, ChatMessage
from services.auth_service import login_required
import logging
import requests

chat_bp = Blueprint('chat', __name__)
logger = logging.getLogger(__name__)


def _build_material_context(user):
    try:
        uploads = (
            StudentUpload.query.filter_by(user_id=user.id)
            .order_by(StudentUpload.created_at.desc())
            .limit(3)
            .all()
        )
    except Exception as exc:
        logger.warning(f'Unable to load uploaded materials for chat context: {exc}')
        return 'No uploaded study materials are available yet.'

    sections = []
    for upload in uploads:
        if not upload.parsed_text:
            continue

        excerpt = upload.parsed_text.strip()
        if len(excerpt) > 2200:
            excerpt = excerpt[:2200] + '...'

        sections.append(f"File: {upload.filename}\nExcerpt:\n{excerpt}")

    if not sections:
        return "No uploaded study materials are available yet."

    return "\n\n".join(sections)


def _normalize_history(history):
    normalized = []
    if not isinstance(history, list):
        return normalized

    for item in history[-12:]:
        if not isinstance(item, dict):
            continue

        role = item.get('role')
        content = item.get('content')
        if role not in {'user', 'assistant'}:
            continue
        if not isinstance(content, str) or not content.strip():
            continue

        normalized.append({'role': role, 'content': content.strip()})

    return normalized


def _parse_response_body(response):
    try:
        return response.json()
    except ValueError:
        return None


def _build_gemini_contents(history, message, material_context, subject=None, unit=None, unit_label=None):
    topic_hint = ''
    if subject:
        topic_hint = f'The student is currently studying **{subject}**'
        if unit:
            topic_hint += f', specifically the chapter/unit: **{unit_label + ": " if unit_label else ""}{unit}**'
        topic_hint += '. Focus your answers on this topic. '

    prompt = (
        'You are AiStudy, a precise and supportive study assistant for engineering students. '
        + topic_hint +
        'Use the provided uploaded study materials when they are relevant. '
        'If the uploaded material does not contain enough information, say so clearly instead of inventing details. '
        'Keep answers concise, practical, and easy to revise.'
    )

    assembled_messages = [
        {
            'role': 'user',
            'parts': [
                {
                    'text': (
                        f'{prompt}\n\n'
                        f'Uploaded study material context:\n{material_context}\n\n'
                        'Answer the student question below.'
                    ),
                }
            ],
        }
    ]

    for item in history:
        role = item['role']
        mapped_role = 'model' if role == 'assistant' else 'user'
        assembled_messages.append({
            'role': mapped_role,
            'parts': [{'text': item['content']}],
        })

    assembled_messages.append({
        'role': 'user',
        'parts': [{'text': message.strip()}],
    })

    return assembled_messages


@chat_bp.route('/message', methods=['POST'])
@login_required
def send_message(user):
    if not Config.GEMINI_API_KEY:
        return jsonify({'error': 'Gemini API key is not configured.'}), 500

    data = request.get_json(silent=True) or {}
    message = data.get('message', '')
    if not isinstance(message, str) or not message.strip():
        return jsonify({'error': 'Message is required.'}), 400

    history = _normalize_history(data.get('history', []))
    material_context = _build_material_context(user)
    subject = data.get('subject') or None
    unit = data.get('unit') or None
    unit_label = data.get('unitLabel') or None
    session_id = data.get('session_id')

    payload = {
        'contents': _build_gemini_contents(history, message, material_context, subject, unit, unit_label),
        'generationConfig': {
            'temperature': 0.3,
            'maxOutputTokens': 900,
        },
    }

    try:
        response = requests.post(
            f"{Config.GEMINI_API_BASE_URL.rstrip('/')}/models/{Config.GEMINI_MODEL}:generateContent",
            params={'key': Config.GEMINI_API_KEY},
            json=payload,
            timeout=60,
        )
    except requests.RequestException as exc:
        logger.error(f'Gemini request failed: {exc}')
        return jsonify({'error': 'Unable to reach the AI service right now.'}), 502

    if response.status_code >= 400:
        logger.error(f'Gemini API error {response.status_code}: {response.text}')
        return jsonify({
            'error': 'AI service returned an error.',
            'details': _parse_response_body(response) or response.text or response.reason,
        }), 502

    response_data = _parse_response_body(response)
    if not isinstance(response_data, dict):
        return jsonify({'error': 'The AI service returned an invalid response.'}), 502

    candidates = response_data.get('candidates', [])
    assistant_message = ''
    if candidates:
        content = candidates[0].get('content', {}) or {}
        parts = content.get('parts', []) or []
        text_parts = [part.get('text', '') for part in parts if isinstance(part, dict)]
        assistant_message = '\n'.join(part for part in text_parts if part).strip()

    if not assistant_message:
        return jsonify({'error': 'The AI service returned an empty response.'}), 502

    # Persist chat to database
    try:
        # Get or create session
        if session_id:
            session = ChatSession.query.get(session_id)
            if not session or session.user_id != user.id:
                session = None

        if not session:
            # Create new session with title from first message
            title = message.strip()[:80]
            if len(message.strip()) > 80:
                title += '...'
            session = ChatSession(
                user_id=user.id,
                subject_id=None,
                title=title,
            )
            db.session.add(session)
            db.session.flush()

        # Save user message
        user_msg = ChatMessage(
            session_id=session.id,
            role='user',
            content=message.strip(),
        )
        db.session.add(user_msg)

        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=session.id,
            role='assistant',
            content=assistant_message.strip(),
        )
        db.session.add(assistant_msg)

        from datetime import datetime
        session.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'reply': assistant_message.strip(),
            'session_id': session.id,
        }), 200

    except Exception as exc:
        db.session.rollback()
        logger.error(f'Failed to persist chat: {exc}')
        # Still return the reply even if persistence fails
        return jsonify({
            'reply': assistant_message.strip(),
            'session_id': None,
        }), 200


# ---------------------------------------------------------------------------
# GET /chat/sessions — list user's chat sessions
# ---------------------------------------------------------------------------
@chat_bp.route('/sessions', methods=['GET'])
@login_required
def get_sessions(user):
    sessions = (
        ChatSession.query.filter_by(user_id=user.id)
        .order_by(ChatSession.updated_at.desc().nullslast(), ChatSession.created_at.desc())
        .all()
    )
    return jsonify([
        {
            'id': s.id,
            'title': s.title or 'Untitled Chat',
            'subject_id': s.subject_id,
            'message_count': len(s.messages),
            'created_at': s.created_at,
            'updated_at': s.updated_at,
        }
        for s in sessions
    ]), 200


# ---------------------------------------------------------------------------
# GET /chat/sessions/<session_id> — get messages for a session
# ---------------------------------------------------------------------------
@chat_bp.route('/sessions/<int:session_id>', methods=['GET'])
@login_required
def get_session_messages(user, session_id):
    session = ChatSession.query.get(session_id)
    if not session or session.user_id != user.id:
        return jsonify({'error': 'Session not found'}), 404

    messages = (
        ChatMessage.query.filter_by(session_id=session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return jsonify({
        'id': session.id,
        'title': session.title,
        'subject_id': session.subject_id,
        'created_at': session.created_at,
        'messages': [
            {
                'id': m.id,
                'role': m.role,
                'content': m.content,
                'created_at': m.created_at,
            }
            for m in messages
        ],
    }), 200


# ---------------------------------------------------------------------------
# DELETE /chat/sessions/<session_id> — delete a chat session
# ---------------------------------------------------------------------------
@chat_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@login_required
def delete_session(user, session_id):
    session = ChatSession.query.get(session_id)
    if not session or session.user_id != user.id:
        return jsonify({'error': 'Session not found'}), 404

    try:
        db.session.delete(session)
        db.session.commit()
        return jsonify({'message': 'Session deleted'}), 200
    except Exception as exc:
        db.session.rollback()
        logger.error(f'Failed to delete session {session_id}: {exc}')
        return jsonify({'error': 'Failed to delete session'}), 500
