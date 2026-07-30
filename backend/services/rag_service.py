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

# For Phase 3: Hybrid Search and Reranking
from rank_bm25 import BM25Okapi
import numpy as np

logger = logging.getLogger(__name__)

# Lazy load reranker to save memory/startup time
_reranker = None
def get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        logger.info("Loading CrossEncoder reranker...")
        _reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', max_length=512)
    return _reranker

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
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
    is_separator_regex=False,
)


def chunk_document_pages(pages: list[dict]) -> list[dict]:
    """Split page texts into chunks, retaining page metadata."""
    chunks_with_metadata = []
    
    for page in pages:
        text = page.get("text", "")
        page_num = page.get("page_num", 1)
        if not text.strip():
            continue
            
        page_chunks = _splitter.split_text(text)
        for chunk in page_chunks:
            if len(chunk.strip()) > 30:
                chunks_with_metadata.append({
                    "text": chunk,
                    "page_num": page_num
                })
    return chunks_with_metadata


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
def embed_document(upload_id: int, user_id: int = None, filename: str = None, parsed_text: str = None):
    """
    End-to-end: parse PDF -> chunk text → embed → store in ChromaDB.
    Called after a PDF is uploaded.
    Updates embedding_status in DB on success/failure.
    """
    import fitz # PyMuPDF
    import os
    
    # Mark as indexing
    upload = StudentUpload.query.get(upload_id)
    if upload:
        upload.embedding_status = 'indexing'
        user_id = user_id or upload.user_id
        filename = filename or upload.filename
        db.session.commit()
    else:
        logger.warning(f"Upload {upload_id} not found in DB.")
        return 0

    # Delete any existing embeddings to prevent orphaned chunks if re-embedding
    delete_document_embeddings(upload_id)

    try:
        pages = []
        filepath = upload.file_url if upload else None
        if filepath and os.path.exists(filepath):
            try:
                doc = fitz.open(filepath)
                for i, page in enumerate(doc):
                    text = page.get_text()
                    if text.strip():
                        pages.append({"text": text, "page_num": i + 1})
                doc.close()
            except Exception as e:
                logger.error(f"Error reading PDF for embedding: {e}")
        
        # Fallback to parsed_text if PDF parsing fails
        if not pages and parsed_text:
            pages = [{"text": parsed_text, "page_num": 1}]

        chunks_data = chunk_document_pages(pages)
        if not chunks_data:
            logger.warning(f"No valid chunks for upload {upload_id}")
            if upload:
                upload.embedding_status = 'failed'
                upload.embedding_error = 'No valid text chunks found in document'
                db.session.commit()
            return 0

        chunks_text = [c["text"] for c in chunks_data]
        logger.info(f"Embedding {len(chunks_text)} chunks for upload {upload_id} ({filename})")

        # Embed all chunks
        embeddings = embed_texts_batched(chunks_text)

        # Prepare ChromaDB upsert data
        collection = _get_collection()

        subject_id = upload.subject_id if upload else None
        doc_type = upload.doc_type if upload else 'material'

        ids = [f"upload_{upload_id}_chunk_{i}" for i in range(len(chunks_text))]
        metadatas = [
            {
                "upload_id": upload_id,
                "user_id": user_id,
                "filename": filename,
                "chunk_index": i,
                "page_num": chunks_data[i]["page_num"],
                "subject_id": subject_id,
                "doc_type": doc_type,
            }
            for i in range(len(chunks_text))
        ]

        # Upsert in batches of 100 (ChromaDB recommendation)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            end = i + batch_size
            collection.upsert(
                ids=ids[i:end],
                embeddings=embeddings[i:end],
                documents=chunks_text[i:end],
                metadatas=metadatas[i:end],
            )

        # Mark as embedded
        if upload:
            upload.embedding_status = 'embedded'
            upload.embedding_error = None
            db.session.commit()

        logger.info(f"Successfully embedded {len(chunks_text)} chunks for upload {upload_id}")
        return len(chunks_text)

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

    if not where_filter:
        where_filter = None

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
            score = 1 - dist if dist is not None else 1.0
            if score >= 0.2:  # Threshold for relevance
                chunks.append({
                    "text": doc,
                    "metadata": meta,
                    "score": score,
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


def retrieve_context_advanced(upload_id: int = None, query: str = None, top_k: int = 8, filter_metadata: dict = None) -> list[dict]:
    """
    Phase 3: Hybrid Search (Dense + BM25 Sparse) + CrossEncoder Reranking
    """
    if not query:
        return retrieve_context(upload_id, None, top_k, filter_metadata)

    # 1. Fetch chunks using Dense Retrieval (over-fetch)
    top_n = top_k * 4
    dense_chunks = retrieve_context(upload_id, query, top_k=top_n, filter_metadata=filter_metadata)

    # 2. Sparse Search (BM25)
    # We fetch up to 300 chunks from this specific scope to build BM25 index
    collection = _get_collection()
    where_filter = {}
    if upload_id is not None:
        where_filter["upload_id"] = upload_id
    if filter_metadata:
        for k, v in filter_metadata.items():
            if v is not None:
                where_filter[k] = v

    if not where_filter:
        where_filter = None

    results = collection.get(where=where_filter, include=["documents", "metadatas"], limit=300)
    all_docs = results.get("documents", [])
    all_metas = results.get("metadatas", [])
    
    sparse_chunks = []
    if all_docs:
        tokenized_corpus = [doc.lower().split() for doc in all_docs]
        bm25 = BM25Okapi(tokenized_corpus)
        tokenized_query = query.lower().split()
        bm25_scores = bm25.get_scores(tokenized_query)
        
        # Get top-N from BM25
        top_bm25_indices = np.argsort(bm25_scores)[::-1][:top_n]
        for idx in top_bm25_indices:
            if bm25_scores[idx] > 0:
                sparse_chunks.append({
                    "text": all_docs[idx],
                    "metadata": all_metas[idx],
                    "score": bm25_scores[idx]
                })

    # 3. Reciprocal Rank Fusion (RRF)
    def compute_rrf(chunks_list, k=60):
        rrf_scores = {}
        chunks_map = {}
        for rank, chunk in enumerate(chunks_list):
            chunk_id = f"{chunk['metadata']['upload_id']}_{chunk['metadata']['chunk_index']}"
            chunks_map[chunk_id] = chunk
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + 1.0 / (k + rank + 1)
        return rrf_scores, chunks_map

    dense_rrf, dense_map = compute_rrf(dense_chunks)
    sparse_rrf, sparse_map = compute_rrf(sparse_chunks)

    # Combine RRF scores
    combined_scores = {}
    combined_map = {**dense_map, **sparse_map}
    for chunk_id in combined_map:
        combined_scores[chunk_id] = dense_rrf.get(chunk_id, 0.0) + sparse_rrf.get(chunk_id, 0.0)

    # Sort by RRF and take top 2*K for reranking
    sorted_fused = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)[:top_k * 2]
    fused_chunks = [combined_map[cid] for cid, score in sorted_fused]

    if not fused_chunks:
        return []

    # 4. Reranking (Cross-Encoder)
    reranker = get_reranker()
    pairs = [[query, chunk["text"]] for chunk in fused_chunks]
    try:
        rerank_scores = reranker.predict(pairs)
        for chunk, r_score in zip(fused_chunks, rerank_scores):
            chunk["score"] = float(r_score)  # Replace score with rerank score
        
        # Sort by rerank score
        fused_chunks.sort(key=lambda c: c["score"], reverse=True)
    except Exception as e:
        logger.error(f"Reranking failed: {e}")

    # Return final top-K
    return fused_chunks[:top_k]


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
    current_length = 0
    MAX_CONTEXT_CHARS = 24000
    for doc, meta in paired:
        idx = meta.get("chunk_index", "?")
        page_num = meta.get("page_num", "?")
        part = f"[Section {idx} | Page {page_num}]\n{doc}"
        
        if current_length + len(part) > MAX_CONTEXT_CHARS:
            break
            
        context_parts.append(part)
        current_length += len(part)

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
