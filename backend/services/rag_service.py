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
            params={"key": api_key},
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

        ids = [f"upload_{upload_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "upload_id": upload_id,
                "user_id": user_id,
                "filename": filename,
                "chunk_index": i,
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
def retrieve_context(upload_id: int, query: str = None, top_k: int = 8) -> list[dict]:
    """
    Retrieve the top-k most relevant chunks for a given upload.
    
    If a query is provided, does semantic similarity search.
    If no query, returns all chunks for the document (up to top_k).
    """
    collection = _get_collection()

    if query:
        # Embed the query
        query_embedding = _embed_texts([query])[0]
        results = collection.query(
            query_embeddings=[query_embedding],
            where={"upload_id": upload_id},
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
    else:
        # Get all chunks for the document (for full-document generation)
        results = collection.get(
            where={"upload_id": upload_id},
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
                "score": 1 - dist,  # Convert distance to similarity
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
