"""
Generation Routes – REST API for study material generation
============================================================
Endpoints:
  POST /generate/flashcards   – Generate flashcards from an uploaded document
  POST /generate/mcqs         – Generate MCQs from an uploaded document
  POST /generate/exam-questions – Generate probable exam questions
  GET  /generate/status/<upload_id> – Check embedding status of a document
  POST /generate/embed/<upload_id>  – Manually trigger embedding for a document
"""

from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from services.rag_service import (
    embed_document,
    get_full_context,
    is_document_embedded,
    get_embedding_stats,
)
from services.generation_service import (
    generate_flashcards,
    generate_mcqs,
    generate_exam_questions,
)
from models.content import StudentUpload
from config import db
import logging
import traceback

generate_bp = Blueprint('generate', __name__)
logger = logging.getLogger(__name__)


def _get_user_upload(user, upload_id):
    """Validate that the upload belongs to the user and return it."""
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        return None, (jsonify({"error": "Document not found"}), 404)
    if upload.user_id != user.id:
        return None, (jsonify({"error": "You don't have access to this document"}), 403)
    return upload, None


def _ensure_embedded(upload):
    """Ensure the document is embedded, embedding it if needed."""
    if not is_document_embedded(upload.id):
        if not upload.parsed_text:
            return False, "Document has no parsed text. Please re-upload."
        try:
            count = embed_document(
                upload_id=upload.id,
                user_id=upload.user_id,
                filename=upload.filename,
                parsed_text=upload.parsed_text,
            )
            if count == 0:
                return False, "Document text could not be chunked (may be too short or empty)."
        except Exception as e:
            logger.error(f"Embedding failed for upload {upload.id}: {e}")
            return False, f"Embedding failed: {str(e)}"
    return True, None


# ---------------------------------------------------------------------------
# POST /generate/embed/<upload_id>
# ---------------------------------------------------------------------------
@generate_bp.route('/embed/<int:upload_id>', methods=['POST'])
@login_required
def trigger_embedding(user, upload_id):
    """Manually trigger embedding for a document."""
    upload, error = _get_user_upload(user, upload_id)
    if error:
        return error

    if not upload.parsed_text:
        return jsonify({"error": "Document has no parsed text"}), 400

    try:
        chunk_count = embed_document(
            upload_id=upload.id,
            user_id=upload.user_id,
            filename=upload.filename,
            parsed_text=upload.parsed_text,
        )
        return jsonify({
            "message": "Document embedded successfully",
            "chunks": chunk_count,
        }), 200
    except Exception as e:
        logger.error(f"Embedding failed: {e}\n{traceback.format_exc()}")
        return jsonify({"error": f"Embedding failed: {str(e)}"}), 500


# ---------------------------------------------------------------------------
# GET /generate/status/<upload_id>
# ---------------------------------------------------------------------------
@generate_bp.route('/status/<int:upload_id>', methods=['GET'])
@login_required
def embedding_status(user, upload_id):
    """Check the embedding status of a document."""
    upload, error = _get_user_upload(user, upload_id)
    if error:
        return error

    stats = get_embedding_stats(upload.id)
    return jsonify({
        "upload_id": upload.id,
        "filename": upload.filename,
        **stats,
    }), 200


# ---------------------------------------------------------------------------
# POST /generate/flashcards
# ---------------------------------------------------------------------------
@generate_bp.route('/flashcards', methods=['POST'])
@login_required
def gen_flashcards(user):
    """Generate flashcards from an uploaded document."""
    data = request.get_json(silent=True) or {}
    upload_id = data.get('upload_id')
    count = min(int(data.get('count', 10)), 20)  # Cap at 20

    if not upload_id:
        return jsonify({"error": "upload_id is required"}), 400

    upload, error = _get_user_upload(user, upload_id)
    if error:
        return error

    # Ensure document is embedded
    ok, err_msg = _ensure_embedded(upload)
    if not ok:
        return jsonify({"error": err_msg}), 400

    try:
        context = get_full_context(upload.id, max_chunks=15)
        if not context:
            return jsonify({"error": "No content found for this document"}), 400

        flashcards = generate_flashcards(context, count=count)

        return jsonify({
            "flashcards": flashcards,
            "source_doc": upload.filename,
            "count": len(flashcards),
            "chunks_used": len(context.split("---")),
        }), 200

    except Exception as e:
        logger.error(f"Flashcard generation failed: {e}\n{traceback.format_exc()}")
        return jsonify({"error": f"Generation failed: {str(e)}"}), 500


# ---------------------------------------------------------------------------
# POST /generate/mcqs
# ---------------------------------------------------------------------------
@generate_bp.route('/mcqs', methods=['POST'])
@login_required
def gen_mcqs(user):
    """Generate MCQs from an uploaded document."""
    data = request.get_json(silent=True) or {}
    upload_id = data.get('upload_id')
    count = min(int(data.get('count', 10)), 20)

    if not upload_id:
        return jsonify({"error": "upload_id is required"}), 400

    upload, error = _get_user_upload(user, upload_id)
    if error:
        return error

    ok, err_msg = _ensure_embedded(upload)
    if not ok:
        return jsonify({"error": err_msg}), 400

    try:
        context = get_full_context(upload.id, max_chunks=15)
        if not context:
            return jsonify({"error": "No content found for this document"}), 400

        mcqs = generate_mcqs(context, count=count)

        return jsonify({
            "mcqs": mcqs,
            "source_doc": upload.filename,
            "count": len(mcqs),
            "chunks_used": len(context.split("---")),
        }), 200

    except Exception as e:
        logger.error(f"MCQ generation failed: {e}\n{traceback.format_exc()}")
        return jsonify({"error": f"Generation failed: {str(e)}"}), 500


# ---------------------------------------------------------------------------
# POST /generate/exam-questions
# ---------------------------------------------------------------------------
@generate_bp.route('/exam-questions', methods=['POST'])
@login_required
def gen_exam_questions(user):
    """Generate probable exam questions from an uploaded document."""
    data = request.get_json(silent=True) or {}
    upload_id = data.get('upload_id')
    count = min(int(data.get('count', 8)), 15)

    if not upload_id:
        return jsonify({"error": "upload_id is required"}), 400

    upload, error = _get_user_upload(user, upload_id)
    if error:
        return error

    ok, err_msg = _ensure_embedded(upload)
    if not ok:
        return jsonify({"error": err_msg}), 400

    try:
        context = get_full_context(upload.id, max_chunks=15)
        if not context:
            return jsonify({"error": "No content found for this document"}), 400

        questions = generate_exam_questions(context, count=count)

        return jsonify({
            "exam_questions": questions,
            "source_doc": upload.filename,
            "count": len(questions),
            "chunks_used": len(context.split("---")),
        }), 200

    except Exception as e:
        logger.error(f"Exam question generation failed: {e}\n{traceback.format_exc()}")
        return jsonify({"error": f"Generation failed: {str(e)}"}), 500
