"""
RAG Service – Document Chunking, Embedding & Retrieval Engine
=============================================================
Handles the full pipeline:
  1. Text → semantic chunks  (RecursiveCharacterTextSplitter)
  2. Chunks → vector embeddings  (Gemini text-embedding-004)
  3. Embeddings → ChromaDB upsert
  4. Query → similarity search → top-k context retrieval
"""

import os
import logging
import requests
import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import Config, db
from models.content import StudentUpload
from models.quiz import QuizSet

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ChromaDB client (persistent, SQLite-backed)
# ---------------------------------------------------------------------------
CHROMA_PERSIST_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'chroma_db'
)
os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

_chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

COLLECTION_NAME = 'study_materials'

CHUNK_SYLLABUS_MATCH_THRESHOLD = 0.68
UPLOAD_SYLLABUS_COVERAGE_THRESHOLD = 0.35
CHAT_SYLLABUS_RELEVANCE_THRESHOLD = 0.62
CHAT_MATERIAL_RELEVANCE_THRESHOLD = 0.68

def _get_collection():
    """Get or create the study_materials collection."""
    return _chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )


# ---------------------------------------------------------------------------
# 1. Chunking
# ---------------------------------------------------------------------------
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
    is_separator_regex=False,
)


def chunk_text(text: str) -> list[str]:
    """Split raw document text into overlapping chunks."""
    if not text or not text.strip():
        return []
    chunks = _splitter.split_text(text)
    # Filter out near-empty chunks
    return [c for c in chunks if len(c.strip()) > 30]


# ---------------------------------------------------------------------------
# 2. Embedding via Gemini
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = 'gemini-embedding-2'
EMBEDDING_DIMENSIONS = 768
_BATCH_SIZE = 50  # Gemini allows batching


def _embed_texts(texts: list[str]) -> list[list[float]]:
    """Call Gemini embedding endpoint for a batch of texts."""
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    base_url = Config.GEMINI_API_BASE_URL.rstrip('/')
    url = f"{base_url}/models/{EMBEDDING_MODEL}:batchEmbedContents"

    # Build batch request body
    requests_body = []
    for text in texts:
        # Truncate very long chunks to avoid token limits
        truncated = text[:2048]
        requests_body.append({
            "model": f"models/{EMBEDDING_MODEL}",
            "content": {"parts": [{"text": truncated}]},
            "taskType": "RETRIEVAL_DOCUMENT",
        })

    payload = {"requests": requests_body}

    try:
        response = requests.post(
            url,
            headers={"x-goog-api-key": api_key},
            json=payload,
            timeout=60,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error(f"Gemini embedding request failed: {exc}")
        raise RuntimeError(f"Embedding API error: {exc}")

    data = response.json()
    embeddings = []
    for emb in data.get("embeddings", []):
        values = emb.get("values", [])
        embeddings.append(values)

    if len(embeddings) != len(texts):
        raise RuntimeError(
            f"Embedding count mismatch: expected {len(texts)}, got {len(embeddings)}"
        )

    return embeddings


def embed_texts_batched(texts: list[str]) -> list[list[float]]:
    """Embed texts in batches to respect API limits."""
    all_embeddings = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        batch_embeddings = _embed_texts(batch)
        all_embeddings.extend(batch_embeddings)
    return all_embeddings


# ---------------------------------------------------------------------------
# 3. Full embed-and-store pipeline for a document
# ---------------------------------------------------------------------------
def embed_document(upload_id: int, user_id: int, filename: str, parsed_text: str):
    """
    End-to-end: chunk text → embed → store in ChromaDB.
    Called after a PDF is uploaded and parsed.
    Updates embedding_status in DB on success/failure.
    """
    # Mark as indexing
    upload = StudentUpload.query.get(upload_id)
    if upload:
        upload.embedding_status = 'indexing'
        db.session.commit()

    try:
        chunks = chunk_text(parsed_text)
        if not chunks:
            logger.warning(f"No valid chunks for upload {upload_id}")
            if upload:
                upload.embedding_status = 'failed'
                upload.embedding_error = 'No valid text chunks found in document'
                db.session.commit()
            return 0

        logger.info(f"Embedding {len(chunks)} chunks for upload {upload_id} ({filename})")

        # Embed all chunks
        embeddings = embed_texts_batched(chunks)

        # Prepare ChromaDB upsert data
        collection = _get_collection()

        subject_id = upload.subject_id if upload else None
        doc_type = upload.doc_type if upload else 'material'
        validation_status = (upload.validation_status if upload else None) or 'pending'

        ids = [f"upload_{upload_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "upload_id": upload_id,
                "user_id": user_id,
                "filename": filename,
                "chunk_index": i,
                "subject_id": subject_id,
                "doc_type": doc_type,
                "validation_status": validation_status if doc_type == 'material' else 'approved',
            }
            for i in range(len(chunks))
        ]

        # Upsert in batches of 100 (ChromaDB recommendation)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            end = i + batch_size
            collection.upsert(
                ids=ids[i:end],
                embeddings=embeddings[i:end],
                documents=chunks[i:end],
                metadatas=metadatas[i:end],
            )

        # Mark as embedded
        if upload:
            upload.embedding_status = 'embedded'
            upload.embedding_error = None
            db.session.commit()

        logger.info(f"Successfully embedded {len(chunks)} chunks for upload {upload_id}")
        return len(chunks)

    except Exception as e:
        logger.error(f"Embedding failed for upload {upload_id}: {e}")
        if upload:
            upload.embedding_status = 'failed'
            upload.embedding_error = str(e)[:500]  # Truncate long errors
            db.session.commit()
        raise


# ---------------------------------------------------------------------------
# 4. Retrieval: similarity search
# ---------------------------------------------------------------------------
def retrieve_context(upload_id: int = None, query: str = None, top_k: int = 8, filter_metadata: dict = None) -> list[dict]:
    """
    Retrieve the top-k most relevant chunks.
    
    If a query is provided, does semantic similarity search.
    If no query, returns all chunks matching filters (up to top_k).
    """
    collection = _get_collection()

    where_filter = {}
    if upload_id is not None:
        where_filter["upload_id"] = upload_id
    if filter_metadata:
        for k, v in filter_metadata.items():
            if v is not None:
                where_filter[k] = v

    if query:
        # Embed the query
        query_embedding = _embed_texts([query])[0]
        results = collection.query(
            query_embeddings=[query_embedding],
            where=where_filter,
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
    else:
        # Get chunks
        results = collection.get(
            where=where_filter,
            include=["documents", "metadatas"],
        )

    # Normalize output format
    chunks = []
    if query:
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        for doc, meta, dist in zip(documents, metadatas, distances):
            chunks.append({
                "text": doc,
                "metadata": meta,
                "score": 1 - dist if dist is not None else 1.0,  # Convert distance to similarity
            })
    else:
        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])
        for doc, meta in zip(documents, metadatas):
            chunks.append({
                "text": doc,
                "metadata": meta,
                "score": 1.0,
            })

    # Sort by chunk_index for coherent ordering when no query
    if not query:
        chunks.sort(key=lambda c: c["metadata"].get("chunk_index", 0))
        chunks = chunks[:top_k]

    return chunks


def _update_document_chunk_metadata(upload_id: int, updates: dict):
    """Merge validation metadata into existing Chroma chunks for one upload."""
    collection = _get_collection()
    results = collection.get(
        where={"upload_id": upload_id},
        include=["metadatas"],
    )
    ids = results.get("ids", [])
    metadatas = results.get("metadatas", [])
    if not ids:
        return

    merged = []
    for metadata in metadatas:
        next_metadata = dict(metadata or {})
        next_metadata.update({key: value for key, value in updates.items() if value is not None})
        merged.append({key: value for key, value in next_metadata.items() if value is not None})
    collection.update(ids=ids, metadatas=merged)


def get_subject_syllabus_upload(user_id: int, subject_id: int):
    """Find the syllabus that should validate/chat for this user's subject."""
    if subject_id is None:
        return None

    syllabus = (
        StudentUpload.query.filter_by(
            user_id=user_id,
            subject_id=subject_id,
            doc_type='syllabus',
            embedding_status='embedded',
        )
        .order_by(StudentUpload.created_at.desc())
        .first()
    )
    if syllabus:
        return syllabus

    return (
        StudentUpload.query.filter_by(
            subject_id=subject_id,
            doc_type='syllabus',
            syllabus_kind='official',
            embedding_status='embedded',
        )
        .order_by(StudentUpload.created_at.desc())
        .first()
    )


def validate_upload_against_syllabus(
    upload_id: int,
    chunk_threshold: float = CHUNK_SYLLABUS_MATCH_THRESHOLD,
    coverage_threshold: float = UPLOAD_SYLLABUS_COVERAGE_THRESHOLD,
    top_k: int = 3,
) -> dict:
    """
    Validate a material upload against the syllabus for its tagged subject.

    The subject tag is treated as a claim. The uploaded chunks must semantically
    match existing syllabus chunks for the same subject before chat can use them.
    """
    upload = StudentUpload.query.get(upload_id)
    if not upload:
        raise ValueError("Upload not found")

    if upload.doc_type != 'material':
        upload.validation_status = 'approved'
        upload.validation_error = None
        db.session.commit()
        _update_document_chunk_metadata(upload.id, {"validation_status": "approved"})
        return {
            "validation_status": upload.validation_status,
            "syllabus_match_score": 1.0,
            "syllabus_match_coverage": 1.0,
            "matched_chunks": 0,
            "total_chunks": 0,
        }

    if not upload.subject_id:
        upload.validation_status = 'rejected'
        upload.validation_error = 'Upload must be tagged with a subject before it can be used in chat.'
        upload.syllabus_match_score = 0.0
        upload.syllabus_match_coverage = 0.0
        db.session.commit()
        _update_document_chunk_metadata(upload.id, {"validation_status": "rejected"})
        return {
            "validation_status": upload.validation_status,
            "validation_error": upload.validation_error,
            "syllabus_match_score": upload.syllabus_match_score,
            "syllabus_match_coverage": upload.syllabus_match_coverage,
            "matched_chunks": 0,
            "total_chunks": 0,
        }

    syllabus = get_subject_syllabus_upload(upload.user_id, upload.subject_id)
    if not syllabus:
        upload.validation_status = 'pending'
        upload.validation_error = 'No embedded syllabus is available for this subject yet.'
        upload.syllabus_match_score = None
        upload.syllabus_match_coverage = None
        db.session.commit()
        _update_document_chunk_metadata(upload.id, {"validation_status": "pending"})
        return {
            "validation_status": upload.validation_status,
            "validation_error": upload.validation_error,
            "syllabus_match_score": upload.syllabus_match_score,
            "syllabus_match_coverage": upload.syllabus_match_coverage,
            "matched_chunks": 0,
            "total_chunks": 0,
        }

    material_chunks = retrieve_context(
        upload_id=upload.id,
        top_k=10000,
        filter_metadata={"doc_type": "material"},
    )
    if not material_chunks:
        upload.validation_status = 'rejected'
        upload.validation_error = 'No embedded chunks were found for this upload.'
        upload.syllabus_match_score = 0.0
        upload.syllabus_match_coverage = 0.0
        db.session.commit()
        _update_document_chunk_metadata(upload.id, {"validation_status": "rejected"})
        return {
            "validation_status": upload.validation_status,
            "validation_error": upload.validation_error,
            "syllabus_match_score": upload.syllabus_match_score,
            "syllabus_match_coverage": upload.syllabus_match_coverage,
            "matched_chunks": 0,
            "total_chunks": 0,
        }

    scores = []
    matched = 0
    for chunk in material_chunks:
        text = (chunk.get("text") or "").strip()
        if not text:
            scores.append(0.0)
            continue
        syllabus_matches = retrieve_context(
            query=text,
            top_k=top_k,
            filter_metadata={
                "upload_id": syllabus.id,
                "doc_type": "syllabus",
                "subject_id": upload.subject_id,
            },
        )
        best_score = float(syllabus_matches[0].get("score", 0)) if syllabus_matches else 0.0
        scores.append(best_score)
        if best_score >= chunk_threshold:
            matched += 1

    average_score = sum(scores) / len(scores) if scores else 0.0
    coverage = matched / len(scores) if scores else 0.0
    approved = coverage >= coverage_threshold

    upload.validation_status = 'approved' if approved else 'rejected'
    upload.validation_error = None if approved else 'Document does not match the selected subject syllabus closely enough.'
    upload.syllabus_match_score = average_score
    upload.syllabus_match_coverage = coverage
    db.session.commit()

    _update_document_chunk_metadata(upload.id, {
        "validation_status": upload.validation_status,
        "syllabus_match_score": average_score,
        "syllabus_match_coverage": coverage,
    })

    return {
        "validation_status": upload.validation_status,
        "validation_error": upload.validation_error,
        "syllabus_match_score": average_score,
        "syllabus_match_coverage": coverage,
        "matched_chunks": matched,
        "total_chunks": len(scores),
        "syllabus_upload_id": syllabus.id,
        "chunk_threshold": chunk_threshold,
        "coverage_threshold": coverage_threshold,
    }


SECTION_METADATA_KEYS = (
    "section_id",
    "section",
    "heading",
    "heading_id",
    "unit",
    "unit_id",
    "chapter",
    "chapter_id",
    "title",
)


def _metadata_group_key(metadata: dict):
    """Return an existing section-like metadata key if chunking already stored one."""
    if not metadata:
        return None
    for key in SECTION_METADATA_KEYS:
        value = metadata.get(key)
        if value not in (None, ""):
            return key, str(value)
    return None


def get_syllabus_topic_units(upload_id: int) -> list[dict]:
    """
    Use already-embedded syllabus chunks as topic units.

    If the stored chunk metadata already has a section/heading/unit-like field,
    chunks are grouped by that metadata. This deliberately avoids a separate
    heading-detection or topic-extraction pass.
    """
    chunks = retrieve_context(
        upload_id=upload_id,
        top_k=10000,
        filter_metadata={"doc_type": "syllabus"},
    )
    if not chunks:
        return []

    grouped = {}
    ordered_units = []
    for chunk in chunks:
        metadata = chunk.get("metadata") or {}
        group_key = _metadata_group_key(metadata)
        if group_key:
            key_name, key_value = group_key
            unit_key = f"{key_name}:{key_value}"
            title = key_value
        else:
            chunk_index = metadata.get("chunk_index", len(ordered_units))
            unit_key = f"chunk:{chunk_index}"
            title = f"Chunk {chunk_index}"

        if unit_key not in grouped:
            grouped[unit_key] = {
                "id": unit_key,
                "title": title,
                "text": "",
                "metadata": metadata,
                "chunk_indices": [],
            }
            ordered_units.append(grouped[unit_key])

        text = (chunk.get("text") or "").strip()
        if text:
            grouped[unit_key]["text"] = (
                f"{grouped[unit_key]['text']}\n\n{text}".strip()
                if grouped[unit_key]["text"]
                else text
            )
        grouped[unit_key]["chunk_indices"].append(metadata.get("chunk_index"))

    return ordered_units


def get_syllabus_coverage(
    syllabus_upload_id: int,
    user_id: int,
    subject_id: int = None,
    top_k: int = 5,
    threshold: float = 0.72,
    same_subject_only: bool = True,
) -> dict:
    """
    Compare syllabus topic units with the user's note chunks using existing retrieval.

    A topic is covered when the best matching material chunk reaches the configured
    similarity threshold. Depth is derived from durable records currently present:
    upload presence for touched, and QuizSet rows for tested.
    """
    topic_units = get_syllabus_topic_units(syllabus_upload_id)

    material_filter = {
        "user_id": user_id,
        "doc_type": "material",
    }
    if same_subject_only and subject_id is not None:
        material_filter["subject_id"] = subject_id

    user_note_uploads_query = StudentUpload.query.filter_by(
        user_id=user_id,
        doc_type="material",
        validation_status="approved",
    )
    if same_subject_only and subject_id is not None:
        user_note_uploads_query = user_note_uploads_query.filter_by(subject_id=subject_id)
    user_note_uploads = user_note_uploads_query.all()
    note_upload_ids = {upload.id for upload in user_note_uploads}

    tested_upload_ids = {
        row[0]
        for row in db.session.query(QuizSet.upload_id)
        .filter(QuizSet.user_id == user_id, QuizSet.upload_id.in_(note_upload_ids))
        .distinct()
        .all()
        if row[0] is not None
    } if note_upload_ids else set()

    covered_count = 0
    topics = []
    for unit in topic_units:
        matches = retrieve_context(
            query=unit["text"],
            top_k=min(max(top_k * 4, top_k), 50),
            filter_metadata=material_filter,
        ) if unit["text"] and note_upload_ids else []
        matches = [
            match for match in matches
            if match.get("metadata", {}).get("upload_id") in note_upload_ids
        ][:top_k]

        best_match = matches[0] if matches else None
        best_score = float(best_match.get("score", 0)) if best_match else 0.0
        is_covered = best_score >= threshold
        if is_covered:
            covered_count += 1

        matched_upload_ids = {
            match.get("metadata", {}).get("upload_id")
            for match in matches
            if float(match.get("score", 0) or 0) >= threshold
        }
        matched_upload_ids.discard(None)
        has_tested_match = bool(matched_upload_ids & tested_upload_ids)

        topics.append({
            "id": unit["id"],
            "title": unit["title"],
            "text": unit["text"],
            "metadata": unit["metadata"],
            "chunk_indices": unit["chunk_indices"],
            "covered": is_covered,
            "best_score": best_score,
            "depth": {
                "level": "tested" if has_tested_match else "touched" if is_covered else "not_covered",
                "touched": is_covered,
                "tested": has_tested_match,
                "reviewed": False,
            },
            "matches": [
                {
                    "text": match.get("text"),
                    "score": match.get("score"),
                    "metadata": match.get("metadata"),
                }
                for match in matches
            ],
        })

    total = len(topic_units)
    return {
        "syllabus_upload_id": syllabus_upload_id,
        "subject_id": subject_id,
        "threshold": threshold,
        "top_k": top_k,
        "same_subject_only": same_subject_only,
        "total_topics": total,
        "covered_topics": covered_count,
        "not_covered_topics": total - covered_count,
        "coverage_ratio": covered_count / total if total else 0,
        "activity_sources": {
            "touched": "matched uploaded material chunks",
            "tested": "quiz_sets rows for matched material uploads",
            "reviewed": None,
        },
        "topics": topics,
    }


def get_full_context(upload_id: int, max_chunks: int = 15) -> str:
    """
    Get all chunks for a document, concatenated into a single context string.
    Used when we want the LLM to have the broadest view of the material.
    """
    collection = _get_collection()

    results = collection.get(
        where={"upload_id": upload_id},
        include=["documents", "metadatas"],
    )

    documents = results.get("documents", [])
    metadatas = results.get("metadatas", [])

    # Sort by chunk_index
    paired = list(zip(documents, metadatas))
    paired.sort(key=lambda p: p[1].get("chunk_index", 0))

    # Take max_chunks
    paired = paired[:max_chunks]

    context_parts = []
    for doc, meta in paired:
        idx = meta.get("chunk_index", "?")
        context_parts.append(f"[Section {idx}]\n{doc}")

    return "\n\n---\n\n".join(context_parts)


def is_document_embedded(upload_id: int) -> bool:
    """Check if a document already has embeddings in ChromaDB."""
    collection = _get_collection()
    results = collection.get(
        where={"upload_id": upload_id},
        include=[],
        limit=1,
    )
    return len(results.get("ids", [])) > 0


def delete_document_embeddings(upload_id: int):
    """Remove all embeddings for a given upload from ChromaDB."""
    collection = _get_collection()
    # Get all IDs for this upload
    results = collection.get(
        where={"upload_id": upload_id},
        include=[],
    )
    ids = results.get("ids", [])
    if ids:
        collection.delete(ids=ids)
        logger.info(f"Deleted {len(ids)} embeddings for upload {upload_id}")


def get_embedding_stats(upload_id: int) -> dict:
    """Get statistics about embeddings for a document."""
    collection = _get_collection()
    results = collection.get(
        where={"upload_id": upload_id},
        include=["metadatas"],
    )
    count = len(results.get("ids", []))
    return {
        "chunk_count": count,
        "is_embedded": count > 0,
    }
