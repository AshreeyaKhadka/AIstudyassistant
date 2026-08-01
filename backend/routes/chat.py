from flask import Blueprint, jsonify, request
from config import Config, db
from models.content import StudentUpload
from models.chat import ChatSession, ChatMessage
from services.auth_service import login_required
from services.generation_service import _log_ai_usage
from services.rag_service import (
    CHAT_MATERIAL_RELEVANCE_THRESHOLD,
    CHAT_SYLLABUS_RELEVANCE_THRESHOLD,
    get_subject_syllabus_upload,
    retrieve_context,
    validate_upload_against_syllabus,
)
from services.progress_service import record_chat_topics
import logging
import re
import requests

chat_bp = Blueprint('chat', __name__)
logger = logging.getLogger(__name__)


def _build_material_context(user):
    try:
        active_syllabus = (
            StudentUpload.query.filter_by(user_id=user.id, doc_type='syllabus', is_active_syllabus=True)
            .order_by(StudentUpload.created_at.desc())
            .first()
        )
        if not active_syllabus:
            active_syllabus = (
                StudentUpload.query.filter_by(doc_type='syllabus', syllabus_kind='official')
                .order_by(StudentUpload.created_at.desc())
                .first()
            )
        uploads = (
            StudentUpload.query.filter_by(user_id=user.id, validation_status='approved')
            .order_by(StudentUpload.created_at.desc())
            .limit(3)
            .all()
        )
        if active_syllabus and active_syllabus.id not in {u.id for u in uploads}:
            uploads = [active_syllabus] + uploads
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


def _approved_material_upload_ids(user_id, subject_id):
    uploads = (
        StudentUpload.query.filter_by(
            user_id=user_id,
            subject_id=subject_id,
            doc_type='material',
            embedding_status='embedded',
        )
        .order_by(StudentUpload.created_at.desc())
        .all()
    )

    approved_ids = []
    for upload in uploads:
        if upload.validation_status == 'pending':
            try:
                validate_upload_against_syllabus(upload.id)
                db.session.refresh(upload)
            except Exception as exc:
                logger.warning(f'Unable to validate upload {upload.id} during chat: {exc}')
        if upload.validation_status == 'approved':
            approved_ids.append(upload.id)
    return approved_ids


def _format_chunks(chunks):
    formatted_chunks = []
    for index, chunk in enumerate(chunks, start=1):
        metadata = chunk.get("metadata") or {}
        filename = metadata.get("filename", "Unknown Document")
        dtype = metadata.get("doc_type", "document")
        chunk_index = metadata.get("chunk_index", "?")
        try:
            score = float(chunk.get("score", 0) or 0)
        except (TypeError, ValueError):
            score = 0.0
        formatted_chunks.append(
            f"[Source {index}: {dtype.upper()} File: {filename}, chunk={chunk_index}, score={score:.2f}]\n{chunk.get('text', '')}"
        )
    return "\n\n".join(formatted_chunks)


def _build_citations(chunks):
    citations = []
    seen = set()
    for index, chunk in enumerate(chunks, start=1):
        metadata = chunk.get("metadata") or {}
        filename = metadata.get("filename", "Unknown Document")
        chunk_index = metadata.get("chunk_index", "?")
        dtype = metadata.get("doc_type", "document")
        key = (filename, chunk_index, dtype)
        if key in seen:
            continue
        seen.add(key)
        try:
            score = float(chunk.get("score", 0) or 0)
        except (TypeError, ValueError):
            score = 0.0
        citations.append({
            "source": index,
            "filename": filename,
            "chunk_index": chunk_index,
            "doc_type": dtype,
            "score": round(score, 3),
        })
    return citations[:6]


def _format_citation_block(citations):
    if not citations:
        return ""
    lines = ["\n\n**Sources**"]
    for item in citations:
        lines.append(
            f"- Source {item['source']}: {item['filename']} ({item['doc_type']}, chunk {item['chunk_index']}, score {item['score']})"
        )
    return "\n".join(lines)


def _extract_retry_delay(error_body):
    if not isinstance(error_body, dict):
        return None
    details = ((error_body.get('error') or {}).get('details') or [])
    for item in details:
        retry_delay = item.get('retryDelay') if isinstance(item, dict) else None
        if retry_delay:
            return retry_delay
    message = (error_body.get('error') or {}).get('message') or ''
    match = re.search(r'retry in ([0-9.]+s)', message, flags=re.IGNORECASE)
    return match.group(1) if match else None


def _split_context_points(text, limit=10):
    cleaned = re.sub(r'\s+', ' ', (text or '').strip())
    if not cleaned:
        return []
    parts = re.split(r'(?<=[.!?])\s+|(?:\s+-\s+)', cleaned)
    points = []
    seen = set()
    for part in parts:
        item = part.strip(' -:\t')
        if len(item) < 45:
            continue
        key = item.lower()[:90]
        if key in seen:
            continue
        seen.add(key)
        points.append(item[:260])
        if len(points) >= limit:
            break
    if not points and cleaned:
        points.append(cleaned[:350])
    return points


def _build_retrieval_fallback(message, chunks, material_context, learning_mode='exam', retry_delay=None):
    citations = _build_citations(chunks)
    source_blocks = []
    if chunks:
        for index, chunk in enumerate(chunks[:8], start=1):
            metadata = chunk.get('metadata') or {}
            filename = metadata.get('filename', 'uploaded material')
            points = _split_context_points(chunk.get('text', ''), limit=3)
            if points:
                source_blocks.append((index, filename, points))
    else:
        points = _split_context_points(material_context, limit=12)
        if points:
            source_blocks.append((1, 'retrieved study context', points))

    if not source_blocks:
        return None

    total_points = []
    for _source_index, _filename, points in source_blocks:
        total_points.extend(points)
    direct_points = total_points[:8 if learning_mode == 'beginner' else 12]

    lines = [
        '**Temporary AI Limit**',
        'Gemini quota/rate limit was reached, so I am answering from the retrieved syllabus/material chunks instead of failing the chat.',
    ]
    if retry_delay:
        lines.append(f'Retry the generative answer after about `{retry_delay}`.')

    lines.extend([
        '',
        '**Short Direct Answer**',
        f'The retrieved material most relevant to your question, "{message.strip()}", points to these exam-useful ideas:',
    ])
    for point in direct_points[:5]:
        lines.append(f'- {point}')

    lines.extend(['', '**Detailed Explanation From Your Notes**'])
    for source_index, filename, points in source_blocks[:5]:
        lines.append(f'- Source {source_index} ({filename}):')
        for point in points[:3]:
            lines.append(f'  - {point}')

    lines.extend([
        '',
        '**Exam Answer Format**',
        '- Start with a clear definition of the main term in the question.',
        '- Explain the main idea in ordered points using the retrieved material above.',
        '- Add one example, application, formula, or process step if your notes include it.',
        '- End with the importance/result of the concept.',
        '',
        '**Marks Guidance**',
        '- For 2 marks: write the definition plus two key points.',
        '- For 5 marks: write definition, explanation, example/process, and importance.',
        '- For 10 marks: add diagram/flow, detailed steps, comparison or limitations, and a short conclusion.',
    ])
    if citations:
        lines.append(_format_citation_block(citations))
    return '\n'.join(lines)


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


def _build_gemini_contents(history, message, material_context, subject=None, unit=None, unit_label=None, learning_mode='exam'):
    topic_hint = ''
    if subject:
        topic_hint = f'The student is currently studying **{subject}**'
        if unit:
            topic_hint += f', specifically the chapter/unit: **{unit_label + ": " if unit_label else ""}{unit}**'
        topic_hint += '. Focus your answers on this topic. '

    mode_guidance = {
        'beginner': (
            'Teach from the ground up. Define every important term, explain prerequisites, '
            'use simple analogies only when helpful, then build toward the exam answer.'
        ),
        'exam': (
            'Write an exam-ready answer. Include the definition, core explanation, step-by-step points, '
            'important formulas/processes, examples, and a final marks-oriented answer outline.'
        ),
        'deep': (
            'Give a deeper technical explanation with assumptions, edge cases, formulas, derivations, '
            'implementation-level detail where relevant, and exam implications.'
        ),
    }.get(learning_mode, 'Write an exam-ready answer with clear explanation and revision value.')

    prompt = (
        'You are AiStudy, a precise and supportive study assistant for engineering students. '
        + topic_hint +
        f'Learning mode: {learning_mode}. {mode_guidance} '
        'Use only the provided syllabus/material context when answering. '
        'If the uploaded material does not contain enough information, say so clearly instead of inventing details. '
        'When using evidence, refer to Source numbers from the context. '
        'Do not give tiny chatbot answers. Students should be able to understand the concept and also write from the answer in an exam. '
        'For conceptual questions, use this structure when possible: '
        '1. Short direct answer, 2. Prerequisites or background, 3. Detailed explanation, '
        '4. Example or application, 5. Exam answer format with marks guidance, 6. Common mistakes. '
        'For definition questions, include a clean definition plus explanation and examples. '
        'For process/architecture questions, describe the flow in ordered steps and mention what to draw in a diagram if useful. '
        'For numerical/formula topics, show variables, formula meaning, and worked steps when context supports it. '
        'Use clear headings and bullet points. Prefer complete but focused answers over short summaries. '
        'IMPORTANT: Format all mathematical expressions and formulas using LaTeX: wrap inline math in single dollar signs like $...$ (e.g. $x^2$), and standalone block/display equations in double dollar signs like $$...$$ (e.g. $$\\int x dx$$). Do not use \\( or \\[ delimiters.'
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
    syllabus_context = data.get('syllabus_context')
    
    subject_id = data.get('subject_id')
    doc_type = data.get('doc_type') # 'syllabus' or 'material'
    subject_id_int = None
    retrieved_chunks_for_progress = []
    if subject_id:
        try:
            subject_id_int = int(subject_id)
        except (ValueError, TypeError):
            subject_id_int = None

    # If subject_id or doc_type scope is set, retrieve from ChromaDB using filters
    if subject_id_int:
        syllabus = get_subject_syllabus_upload(user.id, subject_id_int)
        if not syllabus:
            return jsonify({
                'error': 'No embedded syllabus is available for this subject yet. Upload or select a syllabus before using subject-gated chat.'
            }), 409

        syllabus_chunks = retrieve_context(
            query=message,
            top_k=5,
            filter_metadata={
                "upload_id": syllabus.id,
                "doc_type": "syllabus",
                "subject_id": subject_id_int,
            },
        )
        best_syllabus_score = float(syllabus_chunks[0].get("score", 0)) if syllabus_chunks else 0.0
        if best_syllabus_score < CHAT_SYLLABUS_RELEVANCE_THRESHOLD:
            return jsonify({
                'error': 'This question does not appear to match the selected subject syllabus, so I will not answer from uploaded materials.',
                'syllabus_match_score': best_syllabus_score,
                'threshold': CHAT_SYLLABUS_RELEVANCE_THRESHOLD,
            }), 422

        if doc_type == 'syllabus':
            chunks = syllabus_chunks
        else:
            approved_upload_ids = _approved_material_upload_ids(user.id, subject_id_int)
            if not approved_upload_ids:
                return jsonify({
                    'error': 'No approved study material matches this subject syllabus yet. Upload source material that aligns with the syllabus before asking material-based questions.'
                }), 409

            chunks = retrieve_context(
                query=message,
                top_k=24,
                filter_metadata={
                    "user_id": user.id,
                    "subject_id": subject_id_int,
                    "doc_type": "material",
                },
            )
            chunks = [
                chunk for chunk in chunks
                if chunk.get("metadata", {}).get("upload_id") in approved_upload_ids
                and float(chunk.get("score", 0) or 0) >= CHAT_MATERIAL_RELEVANCE_THRESHOLD
            ]
            if not chunks:
                return jsonify({
                    'error': 'I could not find enough relevant approved material for this syllabus topic. The uploaded files may not cover this part of the syllabus.'
                }), 404
            chunks = syllabus_chunks[:2] + chunks

        material_context = _format_chunks(chunks)
        retrieved_chunks_for_progress = chunks
    elif doc_type:
        filter_metadata = {"user_id": user.id}
        if doc_type and doc_type in ['syllabus', 'material']:
            filter_metadata["doc_type"] = doc_type
        if doc_type == 'material':
            filter_metadata["validation_status"] = "approved"

        if doc_type == 'syllabus' and not subject_id:
            active_syllabus = (
                StudentUpload.query.filter_by(user_id=user.id, doc_type='syllabus', is_active_syllabus=True)
                .order_by(StudentUpload.created_at.desc())
                .first()
            )
            if not active_syllabus:
                active_syllabus = (
                    StudentUpload.query.filter_by(doc_type='syllabus', syllabus_kind='official')
                    .order_by(StudentUpload.created_at.desc())
                    .first()
                )
            if active_syllabus:
                filter_metadata = {"upload_id": active_syllabus.id}
            
        chunks = retrieve_context(query=message, top_k=8, filter_metadata=filter_metadata)
        if chunks:
            material_context = _format_chunks(chunks)
            retrieved_chunks_for_progress = chunks
        else:
            material_context = "No relevant context found from the study documents."
    else:
        material_context = _build_material_context(user)

    if isinstance(syllabus_context, str) and syllabus_context.strip():
        material_context = f"{material_context}\n\nSyllabus focus:\n{syllabus_context.strip()}"

    subject = data.get('subject') or None
    unit = data.get('unit') or None
    unit_label = data.get('unitLabel') or None
    session_id = data.get('session_id')
    learning_mode = (data.get('learning_mode') or 'exam').strip()
    if learning_mode not in {'beginner', 'exam', 'deep'}:
        learning_mode = 'exam'

    payload = {
        'contents': _build_gemini_contents(history, message, material_context, subject, unit, unit_label, learning_mode),
        'generationConfig': {
            'temperature': 0.3,
            'maxOutputTokens': 2200,
        },
    }

    assistant_message = ''
    try:
        response = requests.post(
            f"{Config.GEMINI_API_BASE_URL.rstrip('/')}/models/{Config.GEMINI_MODEL}:generateContent",
            headers={'x-goog-api-key': Config.GEMINI_API_KEY},
            json=payload,
            timeout=60,
        )
    except requests.RequestException as exc:
        logger.error(f'Gemini request failed: {exc}')
        fallback = _build_retrieval_fallback(
            message,
            retrieved_chunks_for_progress,
            material_context,
            learning_mode,
        )
        if fallback:
            assistant_message = fallback
        else:
            return jsonify({'error': 'Unable to reach the AI service right now, and no retrieved study context was available for fallback.'}), 502

    if not assistant_message and response.status_code >= 400:
        error_body = _parse_response_body(response)
        logger.error(f'Gemini API error {response.status_code}: {response.text}')
        if response.status_code in {429, 500, 502, 503, 504}:
            fallback = _build_retrieval_fallback(
                message,
                retrieved_chunks_for_progress,
                material_context,
                learning_mode,
                retry_delay=_extract_retry_delay(error_body),
            )
            if fallback:
                assistant_message = fallback
        if not assistant_message:
            return jsonify({
                'error': 'AI service returned an error.',
                'details': error_body or response.text or response.reason,
            }), 502

    if not assistant_message:
        response_data = _parse_response_body(response)
        if not isinstance(response_data, dict):
            fallback = _build_retrieval_fallback(
                message,
                retrieved_chunks_for_progress,
                material_context,
                learning_mode,
            )
            if fallback:
                assistant_message = fallback
            else:
                return jsonify({'error': 'The AI service returned an invalid response.'}), 502

        candidates = response_data.get('candidates', [])
        if candidates:
            content = candidates[0].get('content', {}) or {}
            parts = content.get('parts', []) or []
            text_parts = [part.get('text', '') for part in parts if isinstance(part, dict)]
            assistant_message = '\n'.join(part for part in text_parts if part).strip()

            usage_metadata = response_data.get('usageMetadata', {})
            if usage_metadata:
                _log_ai_usage(user.id, 'chat', usage_metadata, model_used=Config.GEMINI_MODEL, subject=subject)

    if not assistant_message:
        fallback = _build_retrieval_fallback(
            message,
            retrieved_chunks_for_progress,
            material_context,
            learning_mode,
        )
        if fallback:
            assistant_message = fallback
        else:
            return jsonify({'error': 'The AI service returned an empty response.'}), 502

    citations = _build_citations(retrieved_chunks_for_progress)
    if citations and '**Sources**' not in assistant_message:
        assistant_message = f"{assistant_message.strip()}{_format_citation_block(citations)}"

    if subject_id_int and retrieved_chunks_for_progress:
        try:
            record_chat_topics(user.id, subject_id_int, retrieved_chunks_for_progress)
        except Exception as exc:
            logger.warning(f'Failed to record chat topic progress: {exc}')

    # Persist chat to database
    try:
        # Get or create session
        session = None  # ensure variable is always defined
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


# ---------------------------------------------------------------------------
# GET /chat/suggestions — get dynamic prompt suggestions for user
# ---------------------------------------------------------------------------
@chat_bp.route('/suggestions', methods=['GET'])
@login_required
def get_chat_suggestions(user):
    from models.content import Subject
    
    # 1. Fetch user's recent uploads
    uploads = StudentUpload.query.filter_by(user_id=user.id).order_by(StudentUpload.created_at.desc()).limit(3).all()
    # 2. Fetch user's subjects
    user_subjects = Subject.query.filter_by(user_id=user.id).limit(3).all()

    suggestions = []

    if uploads:
        for u in uploads:
            clean_title = u.filename.rsplit('.', 1)[0].replace('_', ' ')
            suggestions.append(f"Explain key concepts from {clean_title}")
            suggestions.append(f"Turn {clean_title} into 5 revision bullets")
            suggestions.append(f"Quiz me on {clean_title}")

    if user_subjects:
        for s in user_subjects:
            suggestions.append(f"Explain {s.name} core principles")
            suggestions.append(f"Generate 5 exam questions for {s.name}")

    # Fallback to default starters if no uploads or subjects
    if not suggestions:
        suggestions = [
            "Explain the last engineering topic in simple terms",
            "Turn my notes into 5 revision bullets",
            "Quiz me on key concepts from my study materials"
        ]

    # Limit to top 4 unique prompts
    unique_suggestions = list(dict.fromkeys(suggestions))[:4]

    return jsonify(unique_suggestions), 200
