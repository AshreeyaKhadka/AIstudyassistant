"""
RAG Evaluation Script – Production-Ready (Two-Phase)
=====================================================
Phase 1: Precision@k, Recall@k, Hit Rate — pure retrieval, no API calls.
Phase 2: Context Relevance (LLM-as-judge) — optional, uses Gemini API.

Phase 1 always completes instantly. Phase 2 only runs if the API is available.
"""

import json
import logging
import numpy as np
import datetime
import os
import sys

from app import create_app
from services.rag_service import retrieve_context, retrieve_context_advanced
from config import Config

# ──────────────────────────────────────────────
# Logging setup
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("rag_eval")

# ──────────────────────────────────────────────
# Stats tracking
# ──────────────────────────────────────────────
class EvalStats:
    def __init__(self):
        self.api_calls = 0
        self.api_successes = 0
        self.api_failures = 0
        self.cache_hits = 0
        self.chunks_evaluated = 0

    def summary(self) -> dict:
        return {
            "total_api_calls": self.api_calls,
            "successful_api_calls": self.api_successes,
            "failed_api_calls": self.api_failures,
            "cache_hits": self.cache_hits,
            "total_chunks_evaluated": self.chunks_evaluated,
        }

stats = EvalStats()

# ──────────────────────────────────────────────
# Batch judge prompt (Phase 2 only)
# ──────────────────────────────────────────────
BATCH_JUDGE_PROMPT = """You are an expert, strict, and academically-rigorous evaluator.
Evaluate the relevance of EACH of the following text chunks to the given query,
independently of each other. Score each chunk on a scale of 0 to 2.

Rubric:
0: Irrelevant. The chunk is tangential, superficially matches keywords, or does not substantively address the query at all.
1: Partially relevant. The chunk contains some related information but does not fully answer the query, or the key sentence is cut off.
2: Directly relevant. The chunk directly and substantively answers the query.

QUERY: {query}

{chunks_block}

OUTPUT FORMAT (strict JSON array, one entry per chunk, in the same order as provided):
{{
  "evaluations": [
    {{"chunk_index": 0, "score": <0, 1, or 2>, "reasoning": "<short explanation>"}},
    {{"chunk_index": 1, "score": <0, 1, or 2>, "reasoning": "<short explanation>"}},
    ...
  ]
}}

Return ONLY valid JSON. You MUST return exactly {chunk_count} evaluations."""


def _build_chunks_block(chunks_texts: list[str]) -> str:
    parts = []
    for i, text in enumerate(chunks_texts):
        parts.append(f"--- CHUNK {i} ---\n{text}\n--- END CHUNK {i} ---")
    return "\n\n".join(parts)


def evaluate_batch_relevance(query: str, chunks_texts: list[str]) -> list[dict]:
    """Evaluate chunk relevance using LLM judge. Only called in Phase 2."""
    # Lazy import so Phase 1 never touches the LLM client
    from services.llm_client import llm_client
    from services.generation_service import _parse_json_response

    if not chunks_texts:
        return []

    batch_size = Config.EVAL_BATCH_SIZE
    all_results = []

    for batch_start in range(0, len(chunks_texts), batch_size):
        batch = chunks_texts[batch_start:batch_start + batch_size]
        chunks_block = _build_chunks_block(batch)
        prompt = BATCH_JUDGE_PROMPT.format(
            query=query,
            chunks_block=chunks_block,
            chunk_count=len(batch),
        )

        stats.api_calls += 1

        try:
            raw = llm_client.generate_content(prompt, temperature=0.0)
            stats.api_successes += 1
        except RuntimeError as e:
            logger.error(f"API failure for batch at chunk {batch_start}: {e}")
            stats.api_failures += 1
            for _ in batch:
                all_results.append({
                    "score": None,
                    "reasoning": f"API failure: {e}",
                    "status": "api_failure",
                })
            continue

        try:
            parsed = _parse_json_response(raw)
            evaluations = parsed.get("evaluations", [])
            if not isinstance(evaluations, list) or len(evaluations) != len(batch):
                raise ValueError(
                    f"Expected {len(batch)} evaluations, got "
                    f"{len(evaluations) if isinstance(evaluations, list) else 'non-list'}"
                )

            for eval_item in evaluations:
                score = eval_item.get("score")
                reasoning = eval_item.get("reasoning", "No reasoning provided")
                if score not in (0, 1, 2):
                    all_results.append({
                        "score": None,
                        "reasoning": f"Invalid score '{score}': {reasoning}",
                        "status": "invalid_response",
                    })
                else:
                    all_results.append({
                        "score": int(score),
                        "reasoning": reasoning,
                        "status": "success",
                    })

        except Exception as e:
            logger.error(f"Parse failure for batch at chunk {batch_start}: {e}")
            stats.api_failures += 1
            for _ in batch:
                all_results.append({
                    "score": None,
                    "reasoning": f"Parse failure: {e}",
                    "status": "invalid_response",
                })

    stats.chunks_evaluated += len(chunks_texts)
    return all_results


# ──────────────────────────────────────────────
# Main evaluation
# ──────────────────────────────────────────────
def evaluate():
    app = create_app()
    with app.app_context():
        try:
            with open("eval_set.json", "r") as f:
                eval_set = json.load(f)
        except FileNotFoundError:
            logger.error("eval_set.json not found.")
            return

        k_values = [3, 5, 10]
        methods = [
            ("Dense Vector Search", retrieve_context),
            ("Hybrid + Rerank Search", retrieve_context_advanced),
        ]

        run_results = {
            "timestamp": datetime.datetime.now().isoformat(),
            "queries_count": len(eval_set),
            "config": {
                "max_retries": Config.MAX_RETRIES,
                "requests_per_minute": Config.REQUESTS_PER_MINUTE,
                "batch_size": Config.EVAL_BATCH_SIZE,
                "cache_enabled": Config.LLM_CACHE_ENABLED,
            },
            "results": {},
        }

        # ============================================================
        # PHASE 1: Retrieval Metrics (no API calls needed)
        # ============================================================
        logger.info("=" * 60)
        logger.info("PHASE 1: Retrieval Metrics (Precision, Recall, Hit Rate)")
        logger.info("  → No Gemini API calls. This runs instantly.")
        logger.info("=" * 60)

        # Store retrieved data so Phase 2 can reuse it without re-querying
        retrieval_cache = {}  # (method_name, k, query) -> (chunks, chunk_meta)

        for method_name, retrieve_fn in methods:
            logger.info(f"\n{'─'*50}")
            logger.info(f"Method: {method_name}")
            logger.info(f"{'─'*50}")

            run_results["results"][method_name] = {}

            for k in k_values:
                method_k_results = {"queries": [], "summary": {}}

                total_hits = 0
                precisions = []
                recalls = []

                for item in eval_set:
                    query = item["query"]
                    expected_file = item.get("expected_file")
                    expected_text = item.get("expected_text", "").lower()

                    chunks = retrieve_fn(query=query, top_k=k, filter_metadata=None)

                    relevant_count = 0
                    chunk_texts = []
                    chunk_meta = []

                    for c in chunks:
                        filename = c["metadata"].get("filename", "")
                        text = c["text"]
                        text_lower = text.lower()

                        file_match = expected_file in filename if expected_file else True
                        text_match = expected_text in text_lower if expected_text else True
                        is_relevant = file_match and text_match

                        if is_relevant:
                            relevant_count += 1

                        chunk_texts.append(text)
                        chunk_meta.append({
                            "filename": filename,
                            "is_relevant_ground_truth": is_relevant,
                        })

                    # Cache for Phase 2
                    retrieval_cache[(method_name, k, query)] = (chunk_texts, chunk_meta)

                    hit = relevant_count > 0
                    if hit:
                        total_hits += 1

                    precision = relevant_count / k if k > 0 else 0
                    recall = min(relevant_count / 1.0, 1.0)

                    precisions.append(precision)
                    recalls.append(recall)

                    query_result = {
                        "query": query,
                        "hit": hit,
                        "relevant_count": relevant_count,
                        "precision": precision,
                        "recall": recall,
                        "retrieved_chunks": [
                            {
                                "text": chunk_texts[i],
                                "filename": chunk_meta[i]["filename"],
                                "is_relevant_ground_truth": chunk_meta[i]["is_relevant_ground_truth"],
                            }
                            for i in range(len(chunk_texts))
                        ],
                    }
                    method_k_results["queries"].append(query_result)

                hit_rate = total_hits / len(eval_set)
                avg_precision = float(np.mean(precisions))
                avg_recall = float(np.mean(recalls))

                method_k_results["summary"] = {
                    "hit_rate": hit_rate,
                    "precision_at_k": avg_precision,
                    "recall_at_k": avg_recall,
                    "context_relevance": None,  # Filled in Phase 2
                }

                run_results["results"][method_name][f"k={k}"] = method_k_results

                logger.info(f"  k={k}:  Hit Rate={hit_rate:.2f}  "
                             f"Precision={avg_precision:.2f}  "
                             f"Recall={avg_recall:.2f}")

        # ============================================================
        # PHASE 2: Context Relevance (LLM Judge — needs Gemini API)
        # ============================================================
        logger.info("")
        logger.info("=" * 60)
        logger.info("PHASE 2: Context Relevance (LLM-as-Judge)")
        logger.info("  → Requires Gemini API. Will retry on rate limits.")
        logger.info("=" * 60)

        for method_name, _ in methods:
            logger.info(f"\n{'─'*50}")
            logger.info(f"Method: {method_name}")
            logger.info(f"{'─'*50}")

            for k in k_values:
                logger.info(f"  Evaluating context relevance at k={k}...")
                method_k_results = run_results["results"][method_name][f"k={k}"]
                context_relevance_scores = []

                for qi, item in enumerate(eval_set):
                    query = item["query"]
                    chunk_texts, chunk_meta = retrieval_cache[(method_name, k, query)]

                    judge_results = evaluate_batch_relevance(query, chunk_texts)

                    chunk_relevance_sum = 0
                    successful_count = 0
                    api_failure_count = 0

                    for i, judge_eval in enumerate(judge_results):
                        # Attach judge results to the query's chunk entries
                        method_k_results["queries"][qi]["retrieved_chunks"][i]["judge_score"] = judge_eval["score"]
                        method_k_results["queries"][qi]["retrieved_chunks"][i]["judge_reasoning"] = judge_eval["reasoning"]
                        method_k_results["queries"][qi]["retrieved_chunks"][i]["judge_status"] = judge_eval["status"]

                        if judge_eval["status"] == "success" and judge_eval["score"] is not None:
                            chunk_relevance_sum += judge_eval["score"]
                            successful_count += 1
                        elif judge_eval["status"] == "api_failure":
                            api_failure_count += 1

                    avg_relevance = chunk_relevance_sum / successful_count if successful_count > 0 else None
                    method_k_results["queries"][qi]["avg_relevance_score"] = avg_relevance
                    method_k_results["queries"][qi]["api_failures"] = api_failure_count

                    if avg_relevance is not None:
                        context_relevance_scores.append(avg_relevance)

                avg_context_relevance = (
                    float(np.mean(context_relevance_scores))
                    if context_relevance_scores
                    else None
                )
                method_k_results["summary"]["context_relevance"] = avg_context_relevance
                method_k_results["summary"]["queries_with_judge_failures"] = sum(
                    1 for q in method_k_results["queries"] if q.get("api_failures", 0) > 0
                )

                relevance_str = f"{avg_context_relevance:.2f}/2.0" if avg_context_relevance is not None else "N/A (all failed)"
                logger.info(f"  k={k}:  Context Relevance = {relevance_str}")

        # ============================================================
        # Save results
        # ============================================================
        run_results["eval_stats"] = stats.summary()

        os.makedirs("eval_results", exist_ok=True)
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"eval_results/run_{timestamp_str}.json"

        with open(filename, "w") as f:
            json.dump(run_results, f, indent=2, default=str)

        logger.info(f"\n{'='*60}")
        logger.info(f"Evaluation complete. Results saved to {filename}")
        logger.info(f"Stats: {json.dumps(stats.summary(), indent=2)}")


if __name__ == "__main__":
    evaluate()
