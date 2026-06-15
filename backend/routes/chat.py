from flask import Blueprint, jsonify, request
from config import Config
from models import User
from models.content import StudentUpload
from services.auth_service import decode_token
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


def _get_optional_user():
    token = request.cookies.get('session_token')
    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    user = User.query.get(payload.get('user_id'))
    if not user or user.is_banned:
        return None

    return user


def _parse_response_body(response):
    try:
        return response.json()
    except ValueError:
        return None


def _build_gemini_contents(history, message, material_context):
    prompt = (
        'You are AiStudy, a precise and supportive study assistant for engineering students. '
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
def send_message():
    if not Config.GEMINI_API_KEY:
        return jsonify({'error': 'Gemini API key is not configured.'}), 500

    data = request.get_json(silent=True) or {}
    message = data.get('message', '')
    if not isinstance(message, str) or not message.strip():
        return jsonify({'error': 'Message is required.'}), 400

    history = _normalize_history(data.get('history', []))
    user = _get_optional_user()
    material_context = _build_material_context(user) if user else 'No uploaded study materials are available yet.'

    payload = {
        'contents': _build_gemini_contents(history, message, material_context),
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

    return jsonify({
        'reply': assistant_message.strip(),
    }), 200