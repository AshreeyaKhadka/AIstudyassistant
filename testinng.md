Build a standalone eval script (evaluate_rag.py or similar) that computes:

Precision@k

Of the top-k chunks retrieved, what fraction are actually relevant (per the gold set)? Precision@k = (relevant chunks in top-k) / k

Recall@k

Of all relevant chunks that exist for a query, what fraction were retrieved in the top-k? Recall@k = (relevant chunks in top-k) / (total relevant chunks for that query)

Hit Rate

Binary per query: did at least one relevant chunk appear in the top-k? Report the fraction of queries in the eval set that hit. Hit Rate = (# queries with ≥1 relevant chunk in top-k) / (total queries)

Context Relevance

This one needs an LLM-as-judge since it's not a simple set-overlap calculation. For each retrieved chunk (not the final answer — the raw retrieved context), prompt a judge model to score how relevant that chunk is to the query on a fixed scale (e.g. 0–2: irrelevant / partially relevant / directly relevant). Average across retrieved chunks per query, then across the eval set.

Use a strict, academically-rigorous rubric — the judge prompt should explicitly penalize tangential or superficially-keyword-matching chunks that don't substantively address the query, not just reward topical overlap.
Keep the judge prompt and scoring deterministic (low/zero temperature, fixed rubric) so repeated runs are comparable.
Log the judge's reasoning per chunk, not just the score, so failures are inspectable rather than opaque numbers.

Run all four metrics at the k value(s) currently used in production (and optionally one or two others for comparison, e.g. k=3, k=5, k=10).

Output format: a results table (per-query and averaged) plus the raw judge reasoning for Context Relevance, saved to a file (e.g. eval_results/run_001.json) so results are comparable across iterations.

Step 3 — Diagnose before fixing

Do not jump to fixes. First, analyze the results and report:

Which specific queries scored worst on each metric, and why (inspect the actual retrieved chunks for those queries).
Whether failures cluster around a specific cause: e.g. wrong chunk boundaries splitting relevant info across chunks, embedding model missing semantic matches, k too small/large, duplicate/near-duplicate chunks crowding out the actually relevant one, metadata missing, or the gold set itself being wrong.
Whether Precision and Recall are trading off against each other (e.g. high recall but low precision suggests k is too large or chunks are noisy; low recall suggests real misses in embedding/chunking).
Whether Context Relevance is low even when Precision/Recall look fine — this usually points to chunks that are topically adjacent but not substantively useful (e.g. chunk boundaries cutting off the key sentence).

Deliverable: a short diagnosis report per problem area, with evidence (actual query + actual retrieved chunks + actual judge reasoning), before touching any code.

Step 4 — Fix

Based on the diagnosis (not before), apply targeted fixes. Common ones, only apply what the diagnosis actually supports:

Adjust chunk size/overlap if relevant content is being split across chunk boundaries.
Adjust k if precision/recall tradeoff points that way.
Add reranking (cross-encoder) if Context Relevance is low despite reasonable Recall — this usually means the right chunk is in the retrieved set but not ranked high enough or crowded out by noise.
Deduplicate near-identical chunks in the index if they're crowding out distinct relevant content.
Fix metadata/embedding mismatches if specific document types are consistently failing.
If the diagnosis points to the gold set being wrong rather than the system, fix the gold set instead of the code, and say so explicitly.

Explain each fix and which specific diagnosed problem it addresses — no speculative changes unrelated to what Step 3 found.

Step 5 — Re-evaluate and compare
Re-run the exact same eval script against the exact same gold set.
Present a before/after comparison table for all four metrics.
If a metric got worse, say so plainly and explain the likely tradeoff (e.g. "Recall improved but Precision dropped because k was increased") rather than only highlighting the improvements.