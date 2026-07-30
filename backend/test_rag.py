from app import create_app
from config import db
from services.rag_service import retrieve_context

import requests
from config import Config

app = create_app()

queries = [
    "What is the syllabus for Big Data?",
    "What is TOC Chapter 3 about?",
    "Tell me about Yeti Airlines flight schedule."
]

with app.app_context():
    for q in queries:
        print(f"QUERY: {q}")
        chunks = retrieve_context(query=q, top_k=3, filter_metadata={"user_id": 1})
        print(f"RETRIEVED CHUNKS: {len(chunks)}")
        
        context_parts = []
        for c in chunks:
            filename = c['metadata'].get('filename', 'Unknown')
            text = c['text']
            context_parts.append(f"[{filename}]\n{text}")
            print(f"  - Chunk from {filename} (score: {c['score']:.2f})")
            print(f"    {text[:100]}...")
            
        material_context = "\n\n".join(context_parts)
        
        # Test generation
        prompt = (
            'You are AiStudy, a precise and supportive study assistant. '
            'Use the provided uploaded study materials when they are relevant. '
            'If the uploaded material does not contain enough information, say so clearly instead of inventing details. '
        )
        payload = {
            'contents': [{
                'role': 'user',
                'parts': [{'text': f"{prompt}\n\nContext:\n{material_context}\n\nQuestion: {q}"}]
            }],
            'generationConfig': {
                'temperature': 0.3,
                'maxOutputTokens': 500,
            }
        }
        try:
            resp = requests.post(
                f"{Config.GEMINI_API_BASE_URL.rstrip('/')}/models/{Config.GEMINI_MODEL}:generateContent",
                headers={'x-goog-api-key': Config.GEMINI_API_KEY},
                json=payload
            )
            data = resp.json()
            answer = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            print(f"ANSWER:\n{answer}\n")
        except Exception as e:
            print(f"ERROR: {e}")
        print("-" * 50)
