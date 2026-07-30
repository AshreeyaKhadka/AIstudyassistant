Paste this into your coding agent. Replace bracketed placeholders. Work through phases in order — don't let the agent jump to "improvements" before Phase 1 is complete, since fixing broken plumbing matters more than adding fancy retrieval tricks on top of it.
 
---
 
## Context for the agent
 
This is a custom Python RAG (Retrieval-Augmented Generation) system, no framework (no LangChain/LlamaIndex), using **Chroma/FAISS** as the vector store. The current implementation is early-stage scaffolding — assume core pieces may be missing, half-wired, or silently broken. Do not assume anything works until you've verified it by running it.
 
Repo root: `[YOUR_PATH]`
Entry points / main files: `[LIST THEM, e.g. ingest.py, query.py, embed.py]`
 
---
 
## Phase 1 — Audit (do this first, report before changing anything)
 
Go through the pipeline stage by stage. For each stage, tell me: **does it exist, does it run, is it correct**. Don't fix yet — just report.
 
### 1. Ingestion & chunking
- What file types are ingested? Is parsing correct for each (PDF, HTML, markdown, etc.)?
- What chunking strategy is used — fixed-size, recursive character split, semantic, or none?
- Is there chunk overlap? What size/overlap values, and are they justified for this content type?
- Are chunks losing structure (tables, code blocks, headers) during splitting?
- Is metadata (source file, page number, section, timestamp) attached to each chunk?
### 2. Embedding
- What embedding model is used? Is it appropriate for the domain/language?
- Is the same embedding model used consistently at ingest time and query time? (mismatches here silently destroy retrieval quality)
- Are embeddings normalized if the distance metric requires it?
- Is there batching, or is it embedding one chunk at a time (slow, rate-limit risk)?
- Are embedding calls cached, or recomputed every run?
### 3. Vector store (Chroma/FAISS specifics)
- Which one is actually in use — check for leftover dead code from switching between them.
- **Chroma**: is a persistent client used, or is it recreating an in-memory collection every run (silently losing all data)? Check `persist_directory` / client type.
- **FAISS**: which index type (`IndexFlatL2`, `IndexIVFFlat`, `IndexHNSWFlat`)? Is it being saved/loaded from disk, or rebuilt every run? Is there an id-to-metadata mapping stored alongside the index (FAISS itself stores no metadata)?
- Does the distance metric (cosine, L2, dot product) match what the embedding model expects?
- Is there any duplicate-ingestion protection, or will re-running ingestion double the index every time?
### 4. Retrieval
- What is top-k currently set to, and is it hardcoded or configurable?
- Is retrieval pure vector similarity only, or is there any hybrid/keyword component?
- Is there metadata filtering support (e.g. filter by source, date, doc type)?
- Are retrieved chunks actually relevant? (Manually run 5 test queries and eyeball the results.)
### 5. Context assembly & generation
- How are retrieved chunks joined into the prompt? Is there a token-budget check, or can this silently overflow the context window?
- Is source attribution passed through so the final answer can cite where it came from?
- Is there any handling for "no relevant chunks found" (or does it just hallucinate confidently)?
- What LLM is used for generation, and is the system prompt instructing it to stay grounded in retrieved context?
### 6. End-to-end test
- Run the full pipeline on 3–5 real queries you construct from the actual document set. Show me the retrieved chunks and the final answer for each, not just "it worked."
**Deliverable for Phase 1:** a short report — what exists, what's broken, what's missing, with file/line references. No code changes yet.
 
---
 
## Phase 2 — Fix the fundamentals
 
Once I've reviewed the audit, fix in this priority order:
 
1. **Persistence correctness** — vector store must not silently rebuild/lose data between runs.
2. **Embedding consistency** — ingest-time and query-time embedding must be identical model/settings.
3. **Chunking quality** — move to a strategy appropriate for the content (recursive split with sensible overlap at minimum; consider semantic/structure-aware chunking for anything with headers, tables, or code).
4. **Metadata on every chunk** — source, position, and anything needed for citation or filtering.
5. **Duplicate/idempotent ingestion** — re-running ingestion shouldn't duplicate or corrupt the index.
6. **Context window safety** — token-count the assembled context before sending to the LLM; truncate/prioritize sensibly, don't just crash or silently drop.
7. **No-match handling** — when retrieval confidence is low, the system should say so rather than let the LLM fabricate an answer.
---
 
## Phase 3 — Modern retrieval upgrades
 
After fundamentals are solid, implement these, and explain the tradeoffs of each as you go:
 
- **Tunable top-k with over-fetch + rerank**: retrieve top-N (e.g. 20–30) with vector search, then rerank down to top-k (e.g. 4–6) using a cross-encoder reranker (e.g. `bge-reranker`, `ms-marco-MiniLM` via `sentence-transformers`, or Cohere Rerank). This consistently beats raw vector top-k.
- **Hybrid search**: combine dense vector search with sparse keyword search (BM25 — `rank_bm25` is a lightweight option) and merge results (e.g. reciprocal rank fusion). Pure embedding search misses exact-match terms like IDs, codes, acronyms.
- **Query transformation**: 
  - Query rewriting/expansion for vague user queries.
  - HyDE (Hypothetical Document Embeddings) — generate a hypothetical answer first, embed that, and use it for retrieval — helps when queries are phrased very differently from source docs.
  - Multi-query retrieval — generate a few paraphrased versions of the query, retrieve for each, dedupe/merge.
- **Metadata filtering** — allow queries to be scoped (by doc type, date range, source) before or during vector search.
- **Chunk size experimentation** — test a couple of chunk sizes/overlaps against a small eval set rather than guessing one value.
- **Contextual/parent-child chunking** — retrieve small precise chunks for matching, but expand to the surrounding parent chunk/section when building the context sent to the LLM, for better answer completeness.
- **Caching** — cache embeddings for repeated content and cache retrieval results for repeated queries where appropriate.
---
 
## Phase 4 — Evaluation (don't skip this)
 
Build a small evaluation harness so "better" is measurable, not vibes-based:
 
- Create a test set of ~15–30 (query, expected-relevant-source) pairs from your actual corpus.
- Measure retrieval metrics: **recall@k**, **precision@k**, mean reciprocal rank.
- Measure generation quality: faithfulness (is the answer grounded in retrieved context) and answer relevance. Consider using `ragas` for this if you want an off-the-shelf framework, or a simple LLM-as-judge script if you want to stay dependency-free.
- Re-run this eval before/after Phase 3 changes so we can see what actually helped vs. what just added complexity.
---
 
## How to work with me
 
- After Phase 1, stop and give me the audit report — don't proceed to fixes until I confirm priorities.
- After each subsequent phase, summarize what changed, why, and any tradeoffs (latency, cost, complexity) introduced.
- Flag anywhere you had to make an assumption about my intent (e.g. domain, expected query types, latency budget) instead of silently deciding for me.
- If something in Phase 3 doesn't make sense for my corpus size or use case, tell me instead of implementing it anyway.
 