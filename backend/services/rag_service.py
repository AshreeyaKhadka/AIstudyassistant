"""
RAG Service – Document Chunking, Embedding & Retrieval Engine
=============================================================
Handles the full pipeline:
  1. Text → semantic chunks  (RecursiveCharacterTextSplitter)
  2. Chunks → vector embeddings  (configured Gemini or OpenRouter model)
  3. Embeddings → ChromaDB upsert
  4. Query → similarity search → top-k context retrieval
"""

import hashlib
import json
import os
import re
import time
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

COLLECTION_NAME = Config.CHROMA_COLLECTION_NAME

CHUNK_SYLLABUS_MATCH_THRESHOLD = 0.68
UPLOAD_SYLLABUS_COVERAGE_THRESHOLD = 0.35
CHAT_SYLLABUS_RELEVANCE_THRESHOLD = 0.62
CHAT_MATERIAL_RELEVANCE_THRESHOLD = 0.68
UPLOAD_SYLLABUS_REVIEW_COVERAGE_THRESHOLD = 0.20

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
    chunk_size=900,
    chunk_overlap=120,
    length_function=len,
    separators=["\n\n", "\n", ". ", "; ", " ", ""],
    is_separator_regex=False,
)


def chunk_text(text: str) -> list[str]:
    """Split raw document text into overlapping chunks."""
    if not text or not text.strip():
        return []
    chunks = _splitter.split_text(text)
    # Filter out near-empty chunks
    return [c for c in chunks if len(c.strip()) > 30]


_DOCUMENT_MARKER_RE = re.compile(r'\[(Page|OCR Page|Slide)\s+(\d+)\]\s*\n')
_NUMBERED_HEADING_RE = re.compile(r'^(?:unit|chapter|module|topic|section)?\s*\d+(?:\.\d+)*[.):\s-]+\S+', re.IGNORECASE)


def _is_heading(line: str) -> bool:
    candidate = re.sub(r'\s+', ' ', line or '').strip()
    if not candidate or len(candidate) > 140:
        return False
    if _NUMBERED_HEADING_RE.match(candidate):
        return True
    if re.match(r'^(unit|chapter|module|topic|section)\b', candidate, re.IGNORECASE):
        return True
    letters = [char for char in candidate if char.isalpha()]
    return len(letters) >= 4 and candidate == candidate.upper()


def _semantic_sections(page_text: str) -> list[tuple[str, str]]:
    sections = []
    current_heading = ''
    current_lines = []

    def flush():
        body = '\n'.join(current_lines).strip()
        if body:
            sections.append((current_heading, body))

    for raw_line in page_text.splitlines():
        line = raw_line.strip()
        if not line:
            if current_lines and current_lines[-1] != '':
                current_lines.append('')
            continue
        if _is_heading(line):
            flush()
            current_heading = line
            current_lines = [line]
        else:
            current_lines.append(line)
    flush()
    return sections or [('', page_text.strip())]


def chunk_document(text: str) -> list[dict]:
    """Create heading-aware chunks while preserving page or slide provenance."""
    if not text or not text.strip():
        return []

    parts = _DOCUMENT_MARKER_RE.split(text)
    pages = []
    if len(parts) >= 4:
        for index in range(1, len(parts), 3):
            marker = parts[index]
            number = int(parts[index + 1])
            content = parts[index + 2] if index + 2 < len(parts) else ''
            if content.strip():
                pages.append((marker, number, content.strip()))
    else:
        pages.append(('Page', 1, text.strip()))

    chunks = []
    for marker, page_number, page_text in pages:
        for heading, section_text in _semantic_sections(page_text):
            for chunk in _splitter.split_text(section_text):
                cleaned = chunk.strip()
                if len(cleaned) <= 30:
                    continue
                if heading and heading not in cleaned[: len(heading) + 10]:
                    cleaned = f'{heading}\n{cleaned}'
                chunks.append({
                    'text': cleaned,
                    'page_number': page_number,
                    'locator_type': 'slide' if marker == 'Slide' else 'page',
                    'heading': heading,
                })

    if not chunks:
        return [
            {'text': chunk, 'page_number': 0, 'locator_type': 'document', 'heading': ''}
            for chunk in chunk_text(text)
        ]
    return chunks


def chunk_text_by_page(text: str) -> list[tuple[str, int]]:
    """
    Split parsed text into page sections using [Page N] markers,
    then chunk each page section individually.

    Returns list of (chunk_text, page_number) tuples.
    """
    if not text or not text.strip():
        return []

    return [(chunk['text'], chunk['page_number']) for chunk in chunk_document(text)]


# ---------------------------------------------------------------------------
# 2. Provider-neutral embeddings
# ---------------------------------------------------------------------------
_BATCH_SIZE = Config.RAG_EMBEDDING_BATCH_SIZE
_BATCH_DELAY = Config.RAG_EMBEDDING_BATCH_DELAY_SECONDS


_EMBED_MAX_RETRIES = 4
_EMBED_BACKOFF_BASE = 3  # seconds


def _embedding_provider():
    provider = (Config.EMBEDDING_PROVIDER or 'gemini').strip().lower()
    if provider not in {'gemini', 'openrouter'}:
        raise RuntimeError(
            f'Unsupported embedding provider: {provider}. '
            'Supported providers: gemini, openrouter'
        )
    return provider


def _validate_embeddings(embeddings, expected_count, expected_dimensions):
    if len(embeddings) != expected_count:
        raise RuntimeError(
            f'Embedding count mismatch: expected {expected_count}, got {len(embeddings)}'
        )
    invalid = [len(vector) for vector in embeddings if len(vector) != expected_dimensions]
    if invalid:
        raise RuntimeError(
            f'Embedding dimension mismatch: expected {expected_dimensions}, got {invalid[0]}'
        )
    return embeddings


def _request_embeddings(url, headers, payload, provider_name):
    last_error = None
    for attempt in range(_EMBED_MAX_RETRIES):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
        except requests.RequestException as exc:
            last_error = exc
            if attempt == _EMBED_MAX_RETRIES - 1:
                break
            wait = _EMBED_BACKOFF_BASE * (2 ** attempt)
            logger.warning(
                '%s embedding request failed, retrying in %ss (attempt %s/%s)',
                provider_name,
                wait,
                attempt + 1,
                _EMBED_MAX_RETRIES,
            )
            time.sleep(wait)
            continue

        if response.status_code == 429:
            wait = _EMBED_BACKOFF_BASE * (2 ** attempt)
            logger.warning(
                '%s embeddings rate-limited, retrying in %ss (attempt %s/%s)',
                provider_name,
                wait,
                attempt + 1,
                _EMBED_MAX_RETRIES,
            )
            time.sleep(wait)
            continue
        if response.status_code >= 400:
            detail = ''
            try:
                detail = response.json().get('error', {}).get('message', '')
            except Exception:
                detail = response.text[:200]
            suffix = f': {detail}' if detail else ''
            raise RuntimeError(f'{provider_name} embedding API error {response.status_code}{suffix}')
        try:
            return response.json()
        except ValueError as exc:
            raise RuntimeError(f'{provider_name} returned invalid embedding JSON') from exc

    if last_error:
        raise RuntimeError(f'Unable to reach {provider_name} embedding API: {last_error}')
    raise RuntimeError(
        f'{provider_name} embedding rate limit was reached while indexing this document. '
        'The document may be too large for the current quota; try again later or upload a smaller split of the material.'
    )


def _embed_texts_gemini(texts: list[str]) -> list[list[float]]:
    if not Config.GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY is not configured')

    model = Config.GEMINI_EMBEDDING_MODEL
    requests_body = []
    for text in texts:
        truncated = text[:2048]
        requests_body.append({
            "model": f"models/{model}",
            "content": {"parts": [{"text": truncated}]},
            "taskType": "RETRIEVAL_DOCUMENT",
        })
    payload = {"requests": requests_body}
    data = _request_embeddings(
        f"{Config.GEMINI_API_BASE_URL.rstrip('/')}/models/{model}:batchEmbedContents",
        {'x-goog-api-key': Config.GEMINI_API_KEY},
        payload,
        'Gemini',
    )
    embeddings = [item.get('values', []) for item in data.get('embeddings', [])]
    return _validate_embeddings(
        embeddings,
        len(texts),
        Config.GEMINI_EMBEDDING_DIMENSIONS,
    )


def _embed_texts_openrouter(texts: list[str]) -> list[list[float]]:
    if not Config.OPENROUTER_API_KEY:
        raise RuntimeError('OPENROUTER_API_KEY is not configured')

    data = _request_embeddings(
        f"{Config.OPENROUTER_API_BASE_URL.rstrip('/')}/embeddings",
        {
            'Authorization': f'Bearer {Config.OPENROUTER_API_KEY}',
            'Content-Type': 'application/json',
            'HTTP-Referer': Config.OPENROUTER_SITE_URL,
            'X-OpenRouter-Title': Config.OPENROUTER_APP_NAME,
        },
        {
            'model': Config.OPENROUTER_EMBEDDING_MODEL,
            'input': [text[:8192] for text in texts],
        },
        'OpenRouter',
    )
    ordered = sorted(data.get('data', []), key=lambda item: item.get('index', 0))
    embeddings = [item.get('embedding', []) for item in ordered]
    return _validate_embeddings(
        embeddings,
        len(texts),
        Config.OPENROUTER_EMBEDDING_DIMENSIONS,
    )


def _embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed text using the provider selected by EMBEDDING_PROVIDER."""
    if not texts:
        return []
    if _embedding_provider() == 'openrouter':
        return _embed_texts_openrouter(texts)
    return _embed_texts_gemini(texts)


def embed_texts_batched(texts: list[str]) -> list[list[float]]:
    """Embed texts in batches to respect API limits."""
    all_embeddings = []
    total_batches = (len(texts) + _BATCH_SIZE - 1) // _BATCH_SIZE
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        batch_num = (i // _BATCH_SIZE) + 1
        if batch_num > 1:
            time.sleep(_BATCH_DELAY)
        logger.info(f"Embedding batch {batch_num}/{total_batches} ({len(batch)} chunks)")
        batch_embeddings = _embed_texts(batch)
        all_embeddings.extend(batch_embeddings)
    return all_embeddings


def _chunk_score(chunk: dict, index: int) -> tuple[int, int, int]:
    text = chunk.get('text') or ''
    heading = chunk.get('heading') or ''
    has_heading = 1 if heading else 0
    length_score = min(len(text), 1200)
    early_bonus = max(0, 500 - index)
    return (has_heading, length_score, early_bonus)


def _limit_document_chunks(document_chunks: list[dict], doc_type: str) -> tuple[list[dict], list[str]]:
    """Keep indexing bounded for large documents while preserving useful coverage."""
    limit = Config.RAG_MAX_SYLLABUS_CHUNKS if doc_type == 'syllabus' else Config.RAG_MAX_MATERIAL_CHUNKS
    if not limit or len(document_chunks) <= limit:
        return document_chunks, []

    # Preserve the front matter, then fill the remaining budget with longer or headed chunks.
    front_count = min(max(10, limit // 5), limit)
    selected_indexes = set(range(front_count))
    ranked = sorted(
        range(front_count, len(document_chunks)),
        key=lambda idx: _chunk_score(document_chunks[idx], idx),
        reverse=True,
    )
    selected_indexes.update(ranked[: max(0, limit - front_count)])
    limited = [chunk for idx, chunk in enumerate(document_chunks) if idx in selected_indexes]
    warning = (
        f'Large document indexing limit applied: indexed {len(limited)} of '
        f'{len(document_chunks)} extracted sections. Split the document by unit or chapter '
        'if you need every page searchable.'
    )
    return limited, [warning]


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
        upload.processing_status = 'indexing'
        upload.processing_error = None
        db.session.commit()

    try:
        document_chunks = chunk_document(parsed_text)
        if not document_chunks:
            logger.warning(f"No valid chunks for upload {upload_id}")
            if upload:
                upload.embedding_status = 'failed'
                upload.embedding_error = 'No valid text chunks found in document'
                upload.processing_status = 'failed'
                upload.processing_error = upload.embedding_error
                db.session.commit()
            return 0

        doc_type = upload.doc_type if upload else 'material'
        document_chunks, limit_warnings = _limit_document_chunks(document_chunks, doc_type)
        if upload and limit_warnings:
            current_warnings = upload.processing_warnings or []
            upload.processing_warnings = list(dict.fromkeys([*current_warnings, *limit_warnings]))
            db.session.commit()

        chunks = [chunk['text'] for chunk in document_chunks]

        logger.info(f"Embedding {len(chunks)} chunks for upload {upload_id} ({filename})")

        # Embed all chunks
        embeddings = embed_texts_batched(chunks)

        # Prepare ChromaDB upsert data
        collection = _get_collection()

        subject_id = upload.subject_id if upload else None
        validation_status = (upload.validation_status if upload else None) or 'pending'

        ids = [f"upload_{upload_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "upload_id": upload_id,
                "user_id": user_id,
                "filename": filename,
                "chunk_index": i,
                "page_number": document_chunks[i]['page_number'],
                "locator_type": document_chunks[i]['locator_type'],
                "heading": document_chunks[i]['heading'],
                "subject_id": subject_id,
                "doc_type": doc_type,
                "source_type": "raw_page",
                "syllabus_version": int(upload.syllabus_version or 1) if upload and doc_type == 'syllabus' else 0,
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
            upload.processing_status = 'ready'
            upload.processing_error = None
            db.session.commit()

        logger.info(f"Successfully embedded {len(chunks)} chunks for upload {upload_id}")
        return len(chunks)

    except Exception as e:
        logger.error(f"Embedding failed for upload {upload_id}: {e}")
        if upload:
            upload.embedding_status = 'failed'
            upload.embedding_error = str(e)[:500]  # Truncate long errors
            upload.processing_status = 'failed'
            upload.processing_error = str(e)[:1000]
            db.session.commit()
        raise


# ---------------------------------------------------------------------------
# 4. Retrieval: similarity search
# ---------------------------------------------------------------------------
def _build_chroma_where(filters):
    """Convert application filters to Chroma's explicit logical-filter shape."""
    clauses = [
        {key: value}
        for key, value in (filters or {}).items()
        if value is not None
    ]
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


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

    chroma_where = _build_chroma_where(where_filter)
    if query:
        # Embed the query
        query_embedding = _embed_texts([query])[0]
        query_kwargs = dict(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
        if chroma_where:
            query_kwargs['where'] = chroma_where
        results = collection.query(**query_kwargs)
    else:
        # Get chunks
        get_kwargs = {"include": ["documents", "metadatas"]}
        if chroma_where:
            get_kwargs['where'] = chroma_where
        results = collection.get(**get_kwargs)

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


def update_document_filename(upload_id: int, filename: str):
    """Keep citation metadata synchronized when a document is renamed."""
    _update_document_chunk_metadata(upload_id, {'filename': filename})


def update_document_metadata(upload_id: int, updates: dict):
    """Keep retrieval metadata synchronized with durable upload state."""
    _update_document_chunk_metadata(upload_id, updates)


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

    def finish(status, error, score, coverage, details):
        upload.validation_status = status
        upload.validation_error = error
        upload.validation_details = details
        upload.syllabus_match_score = score
        upload.syllabus_match_coverage = coverage
        db.session.commit()
        metadata = {"validation_status": status}
        if score is not None:
            metadata["syllabus_match_score"] = float(score)
        if coverage is not None:
            metadata["syllabus_match_coverage"] = float(coverage)
        _update_document_chunk_metadata(upload.id, metadata)
        return {
            "validation_status": status,
            "validation_error": error,
            "syllabus_match_score": score,
            "syllabus_match_coverage": coverage,
            **details,
        }

    if upload.doc_type != 'material':
        upload.validation_status = 'approved'
        upload.validation_error = None
        upload.validation_details = {}
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
        return finish('rejected', 'Upload must be tagged with a subject before it can be used in chat.', 0.0, 0.0, {
            "matched_chunks": 0,
            "total_chunks": 0,
            "matched_topics": [],
            "unmatched_sections": [],
        })

    syllabus = get_subject_syllabus_upload(upload.user_id, upload.subject_id)
    if not syllabus:
        return finish('pending', 'No embedded syllabus is available for this subject yet.', None, None, {
            "matched_chunks": 0,
            "total_chunks": 0,
            "matched_topics": [],
            "unmatched_sections": [],
        })

    material_chunks = retrieve_context(
        upload_id=upload.id,
        top_k=10000,
        filter_metadata={"doc_type": "material"},
    )
    if not material_chunks:
        return finish('rejected', 'No embedded chunks were found for this upload.', 0.0, 0.0, {
            "matched_chunks": 0,
            "total_chunks": 0,
            "matched_topics": [],
            "unmatched_sections": [],
        })

    scores = []
    matched = 0
    matched_topics = {}
    matched_sections = []
    unmatched_sections = []
    for chunk in material_chunks:
        text = (chunk.get("text") or "").strip()
        material_metadata = chunk.get("metadata") or {}
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
            topic_match = next(
                (match for match in syllabus_matches if (match.get('metadata') or {}).get('topic_id')),
                syllabus_matches[0] if syllabus_matches else {},
            )
            best_metadata = topic_match.get("metadata") or {}
            topic_id = best_metadata.get("topic_id")
            evidence = {
                "page_number": material_metadata.get("page_number"),
                "heading": material_metadata.get("heading") or "",
                "excerpt": text[:220],
                "score": round(best_score, 4),
                "topic_id": topic_id,
                "topic_title": best_metadata.get("topic_title") or best_metadata.get("unit_title") or best_metadata.get("heading") or "Syllabus section",
            }
            if len(matched_sections) < 12:
                matched_sections.append(evidence)
            if topic_id:
                current = matched_topics.setdefault(topic_id, {
                    "topic_id": topic_id,
                    "topic_title": best_metadata.get("topic_title") or "Topic",
                    "unit_id": best_metadata.get("unit_id"),
                    "unit_title": best_metadata.get("unit_title"),
                    "chapter_id": best_metadata.get("chapter_id"),
                    "chapter_title": best_metadata.get("chapter_title"),
                    "matched_sections": 0,
                    "best_score": 0.0,
                })
                current["matched_sections"] += 1
                current["best_score"] = round(max(current["best_score"], best_score), 4)
        elif len(unmatched_sections) < 12:
            unmatched_sections.append({
                "page_number": material_metadata.get("page_number"),
                "heading": material_metadata.get("heading") or "",
                "excerpt": text[:220],
                "best_score": round(best_score, 4),
            })

    average_score = sum(scores) / len(scores) if scores else 0.0
    coverage = matched / len(scores) if scores else 0.0
    review_threshold = min(coverage_threshold, UPLOAD_SYLLABUS_REVIEW_COVERAGE_THRESHOLD)
    if coverage >= coverage_threshold:
        status = 'approved'
        error = None
    elif coverage >= review_threshold:
        status = 'needs_review'
        error = 'Some sections match the syllabus, but the document needs review before it can be used for answers.'
    else:
        status = 'rejected'
        error = 'Document does not match the selected subject syllabus closely enough.'

    details = {
        "matched_chunks": matched,
        "total_chunks": len(scores),
        "syllabus_upload_id": syllabus.id,
        "syllabus_version": syllabus.syllabus_version or 1,
        "syllabus_structure_hash": syllabus.syllabus_structure_hash,
        "chunk_threshold": chunk_threshold,
        "coverage_threshold": coverage_threshold,
        "review_threshold": review_threshold,
        "matched_topics": sorted(matched_topics.values(), key=lambda item: item["best_score"], reverse=True),
        "matched_sections": matched_sections,
        "unmatched_sections": unmatched_sections,
    }
    return finish(status, error, average_score, coverage, details)


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

    structured_topics = []
    seen_topic_ids = set()
    for chunk in chunks:
        metadata = chunk.get('metadata') or {}
        topic_id = metadata.get('topic_id')
        if metadata.get('source_type') != 'structured_topic' or not topic_id or topic_id in seen_topic_ids:
            continue
        seen_topic_ids.add(topic_id)
        structured_topics.append({
            'id': topic_id,
            'title': metadata.get('topic_title') or 'Topic',
            'text': (chunk.get('text') or '').strip(),
            'metadata': metadata,
            'chunk_indices': [metadata.get('chunk_index')],
        })
    if structured_topics:
        return structured_topics

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
        page_num = meta.get("page_number", 0)
        if page_num and page_num > 0:
            context_parts.append(f"[Page {page_num}]\n{doc}")
        else:
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


# ---------------------------------------------------------------------------
# 6. Structured syllabus embedding
# ---------------------------------------------------------------------------
def _stable_hierarchy_id(kind: str, *parts: str) -> str:
    normalized = '|'.join(re.sub(r'\s+', ' ', str(part or '')).strip().casefold() for part in parts)
    return f"{kind}:{hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:16]}"


def normalize_syllabus_structure(structured: dict) -> dict:
    """Add deterministic hierarchy IDs while preserving the parser's public shape."""
    source = structured if isinstance(structured, dict) else {}
    title = str(source.get('syllabus_title') or 'Syllabus').strip()
    normalized = {'syllabus_title': title, 'chapters': []}
    for chapter_index, chapter in enumerate(source.get('chapters') or []):
        if not isinstance(chapter, dict):
            continue
        chapter_name = str(chapter.get('chapter_name') or f'Chapter {chapter_index + 1}').strip()
        chapter_id = _stable_hierarchy_id('chapter', title, chapter_name)
        normalized_chapter = {
            **chapter,
            'chapter_id': chapter_id,
            'chapter_name': chapter_name,
            'position': chapter_index + 1,
            'units': [],
        }
        for unit_index, unit in enumerate(chapter.get('units') or []):
            if not isinstance(unit, dict):
                continue
            unit_name = str(unit.get('unit_name') or f'Unit {unit_index + 1}').strip()
            unit_id = _stable_hierarchy_id('unit', title, chapter_name, unit_name)
            topics = []
            for topic_index, topic in enumerate(unit.get('subtopics') or []):
                topic_title = str(topic.get('topic_title') if isinstance(topic, dict) else topic or '').strip()
                if not topic_title:
                    continue
                topic_id = _stable_hierarchy_id('topic', title, chapter_name, unit_name, topic_title)
                topics.append({
                    'topic_id': topic_id,
                    'topic_title': topic_title,
                    'position': topic_index + 1,
                })
            if not topics:
                topics.append({
                    'topic_id': _stable_hierarchy_id('topic', title, chapter_name, unit_name, unit_name),
                    'topic_title': unit_name,
                    'position': 1,
                })
            normalized_chapter['units'].append({
                **unit,
                'unit_id': unit_id,
                'unit_name': unit_name,
                'position': unit_index + 1,
                'topics': topics,
                'subtopics': [topic['topic_title'] for topic in topics],
            })
        if not normalized_chapter['units']:
            unit_id = _stable_hierarchy_id('unit', title, chapter_name, chapter_name)
            normalized_chapter['units'].append({
                'unit_id': unit_id,
                'unit_name': chapter_name,
                'position': 1,
                'topics': [{
                    'topic_id': _stable_hierarchy_id('topic', title, chapter_name, chapter_name, chapter_name),
                    'topic_title': chapter_name,
                    'position': 1,
                }],
                'subtopics': [chapter_name],
            })
        normalized['chapters'].append(normalized_chapter)
    canonical = json.dumps(normalized, sort_keys=True, separators=(',', ':'))
    normalized['structure_hash'] = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    return normalized


def _structured_topic_records(structured: dict) -> list[dict]:
    normalized = normalize_syllabus_structure(structured)
    records = []
    title = normalized['syllabus_title']
    for chapter in normalized['chapters']:
        for unit in chapter['units']:
            for topic in unit['topics']:
                records.append({
                    'text': f"Syllabus: {title}\nChapter: {chapter['chapter_name']}\nUnit: {unit['unit_name']}\nTopic: {topic['topic_title']}",
                    'chapter_id': chapter['chapter_id'],
                    'chapter_title': chapter['chapter_name'],
                    'unit_id': unit['unit_id'],
                    'unit_title': unit['unit_name'],
                    'topic_id': topic['topic_id'],
                    'topic_title': topic['topic_title'],
                })
    return records


def _structured_to_chunks(structured: dict) -> list[str]:
    return [record['text'] for record in _structured_topic_records(structured)]


def embed_structured_syllabus(upload_id: int, user_id: int, filename: str, structured: dict):
    """
    Embed the structured syllabus hierarchy into ChromaDB.
    Each chapter becomes a chunk with chapter/unit/topic metadata.
    Uses the same Gemini embedding pipeline as document embedding.
    """
    normalized = normalize_syllabus_structure(structured)
    records = _structured_topic_records(normalized)
    chunks = [record['text'] for record in records]
    if not records:
        logger.warning(f"No structured chunks for upload {upload_id}")
        return 0

    upload = StudentUpload.query.get(upload_id)
    subject_id = upload.subject_id if upload else None

    logger.info(f"Embedding {len(chunks)} structured syllabus chunks for upload {upload_id}")

    embeddings = embed_texts_batched(chunks)
    collection = _get_collection()

    existing = collection.get(where={"upload_id": upload_id}, include=["metadatas"])
    stale_ids = [
        chunk_id for chunk_id, metadata in zip(existing.get('ids', []), existing.get('metadatas', []))
        if (metadata or {}).get('doc_type') == 'syllabus_structure' or (metadata or {}).get('source_type') == 'structured_topic'
    ]
    if stale_ids:
        collection.delete(ids=stale_ids)

    version = int(upload.syllabus_version or 1) if upload else 1
    ids = [f"upload_{upload_id}_topic_{record['topic_id'].split(':')[-1]}" for record in records]
    metadatas = [
        {
            "upload_id": upload_id,
            "user_id": user_id,
            "filename": filename,
            "chunk_index": i,
            "subject_id": subject_id,
            "doc_type": "syllabus",
            "source_type": "structured_topic",
            "syllabus_version": version,
            "validation_status": "approved",
            **{key: value for key, value in records[i].items() if key != 'text'},
        }
        for i in range(len(chunks))
    ]

    batch_size = 100
    for i in range(0, len(ids), batch_size):
        end = i + batch_size
        collection.upsert(
            ids=ids[i:end],
            embeddings=embeddings[i:end],
            documents=chunks[i:end],
            metadatas=metadatas[i:end],
        )

    logger.info(f"Successfully embedded {len(chunks)} structured syllabus chunks for upload {upload_id}")
    return len(chunks)
