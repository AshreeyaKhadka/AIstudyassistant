"""Quick evaluation check on updated eval_set.json."""
import json
from app import create_app
from services.rag_service import retrieve_context

app = create_app()
with app.app_context():
    with open("eval_set.json") as f:
        eval_set = json.load(f)

    total = len(eval_set)
    hits_k3 = 0
    hits_k5 = 0

    print(f"Evaluating {total} queries against indexed ChromaDB documents...\n")

    for i, item in enumerate(eval_set, 1):
        query = item["query"]
        expected_file = item.get("expected_file", "")
        expected_text = item.get("expected_text", "").lower()

        chunks_k5 = retrieve_context(query=query, top_k=5, filter_metadata=None)
        
        match_k3 = any(
            (expected_file in c["metadata"].get("filename", "")) and (expected_text in c["text"].lower())
            for c in chunks_k5[:3]
        )
        match_k5 = any(
            (expected_file in c["metadata"].get("filename", "")) and (expected_text in c["text"].lower())
            for c in chunks_k5
        )

        if match_k3:
            hits_k3 += 1
        if match_k5:
            hits_k5 += 1

        status = "HIT@3" if match_k3 else ("HIT@5" if match_k5 else "MISS")
        print(f"[{i:02d}/{total}] {status} | Doc: {expected_file} | Query: {query}")

    print("\n" + "="*50)
    print(f"Hit Rate @ k=3: {hits_k3}/{total} ({hits_k3/total*100:.1f}%)")
    print(f"Hit Rate @ k=5: {hits_k5}/{total} ({hits_k5/total*100:.1f}%)")
    print("="*50)
