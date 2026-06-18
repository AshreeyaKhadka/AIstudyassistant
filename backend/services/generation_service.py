"""
Generation Service – LLM-powered study material generation
============================================================
Takes retrieved context chunks and generates:
  1. Flashcards (front/back Q&A pairs)
  2. MCQs (4-option with correct answer + explanation)
  3. Probable Exam Questions (open-ended with key-point checklists)

All generation is grounded strictly in the provided context.
"""

import json
import logging
import requests
from config import Config

logger = logging.getLogger(__name__)


def _call_gemini(prompt: str, temperature: float = 0.4, max_tokens: int = 4096) -> str:
    """
    Send a prompt to Gemini and return the text response.
    """
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")

    base_url = Config.GEMINI_API_BASE_URL.rstrip('/')
    model = Config.GEMINI_MODEL or 'gemini-2.5-flash'

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "responseMimeType": "application/json",
        },
    }

    try:
        response = requests.post(
            f"{base_url}/models/{model}:generateContent",
            params={"key": api_key},
            json=payload,
            timeout=120,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error(f"Gemini generation request failed: {exc}")
        raise RuntimeError(f"AI service error: {exc}")

    data = response.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("AI returned no candidates")

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    text_parts = [p.get("text", "") for p in parts if isinstance(p, dict)]
    result = "\n".join(t for t in text_parts if t).strip()

    if not result:
        raise RuntimeError("AI returned empty response")

    return result


def _parse_json_response(raw: str) -> any:
    """
    Safely parse a JSON response from the LLM.
    Handles cases where the LLM wraps JSON in markdown code fences.
    """
    cleaned = raw.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first line (```json) and last line (```)
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        elif lines[0].strip().startswith("```"):
            lines = lines[1:]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON output: {e}\nRaw: {raw[:500]}")
        raise RuntimeError(f"AI returned invalid JSON: {e}")


# ---------------------------------------------------------------------------
# FLASHCARD GENERATION
# ---------------------------------------------------------------------------

FLASHCARD_PROMPT = """You are an expert educational content creator. Based STRICTLY on the following study material context, generate exactly {count} high-quality flashcards for active recall practice.

STUDY MATERIAL CONTEXT:
{context}

REQUIREMENTS:
- Each flashcard must have a "front" (question/term) and "back" (answer/definition).
- Cover core definitions, key formulas, foundational concepts, and important relationships.
- Questions should test understanding, not just rote memorization.
- Answers should be concise but complete (2-4 sentences max).
- Do NOT include information that is not present in the provided context.
- Vary the question types: definitions, comparisons, cause-effect, applications.

OUTPUT FORMAT (strict JSON):
{{
  "flashcards": [
    {{"front": "What is...?", "back": "It is..."}},
    ...
  ]
}}

Generate exactly {count} flashcards. Return ONLY valid JSON."""


def generate_flashcards(context: str, count: int = 10) -> list[dict]:
    """Generate flashcards from retrieved context."""
    prompt = FLASHCARD_PROMPT.format(context=context, count=count)
    raw = _call_gemini(prompt, temperature=0.3)
    parsed = _parse_json_response(raw)

    flashcards = parsed.get("flashcards", [])
    if not isinstance(flashcards, list):
        raise RuntimeError("Invalid flashcards format")

    # Validate each flashcard
    validated = []
    for fc in flashcards:
        if isinstance(fc, dict) and "front" in fc and "back" in fc:
            validated.append({
                "front": str(fc["front"]).strip(),
                "back": str(fc["back"]).strip(),
            })

    return validated


# ---------------------------------------------------------------------------
# MCQ GENERATION
# ---------------------------------------------------------------------------

MCQ_PROMPT = """You are an expert exam question designer for university-level computer engineering courses. Based STRICTLY on the following study material context, generate exactly {count} multiple-choice questions.

STUDY MATERIAL CONTEXT:
{context}

REQUIREMENTS:
- Each question must have exactly 4 options labeled A, B, C, D.
- Exactly one option must be correct.
- Include a brief explanation (1-2 sentences) of why the correct answer is right, citing the relevant concept from the text.
- Questions should test conceptual understanding, application, and analysis—not just recall.
- Distractors (wrong answers) should be plausible but clearly incorrect based on the material.
- Do NOT include information not present in the provided context.

OUTPUT FORMAT (strict JSON):
{{
  "mcqs": [
    {{
      "question": "Which of the following...",
      "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "correct": "B",
      "explanation": "B is correct because..."
    }},
    ...
  ]
}}

Generate exactly {count} MCQs. Return ONLY valid JSON."""


def generate_mcqs(context: str, count: int = 10) -> list[dict]:
    """Generate MCQs from retrieved context."""
    prompt = MCQ_PROMPT.format(context=context, count=count)
    raw = _call_gemini(prompt, temperature=0.4)
    parsed = _parse_json_response(raw)

    mcqs = parsed.get("mcqs", [])
    if not isinstance(mcqs, list):
        raise RuntimeError("Invalid MCQ format")

    # Validate each MCQ
    validated = []
    for mcq in mcqs:
        if not isinstance(mcq, dict):
            continue
        if "question" not in mcq or "options" not in mcq or "correct" not in mcq:
            continue

        options = mcq["options"]
        if not isinstance(options, dict) or len(options) < 4:
            continue

        validated.append({
            "question": str(mcq["question"]).strip(),
            "options": {k: str(v).strip() for k, v in options.items()},
            "correct": str(mcq["correct"]).strip().upper(),
            "explanation": str(mcq.get("explanation", "")).strip(),
        })

    return validated


# ---------------------------------------------------------------------------
# PROBABLE EXAM QUESTION GENERATION
# ---------------------------------------------------------------------------

EXAM_PROMPT = """You are a seasoned university professor designing an end-of-semester examination for computer engineering students. Based STRICTLY on the following study material, generate exactly {count} high-yield exam questions that are most likely to appear in a real examination.

STUDY MATERIAL CONTEXT:
{context}

REQUIREMENTS:
- Mix question types: short-answer (5 marks), long-answer/essay (10 marks), and problem-solving/numerical (where applicable).
- For each question, provide:
  - The question text
  - The question type ("short_answer", "long_answer", or "problem_solving")
  - An estimated marks value
  - A checklist of key points required for a perfect-score answer (3-6 bullet points)
- Focus on topics that professors commonly emphasize: core theory, derivations, comparisons, applications, and design questions.
- Do NOT include information not present in the provided context.

OUTPUT FORMAT (strict JSON):
{{
  "exam_questions": [
    {{
      "question": "Explain the concept of...",
      "type": "long_answer",
      "marks": 10,
      "key_points": [
        "Define the core concept clearly",
        "Discuss the relationship with...",
        "Provide a real-world example",
        "Mention advantages and limitations"
      ]
    }},
    ...
  ]
}}

Generate exactly {count} exam questions. Return ONLY valid JSON."""


def generate_exam_questions(context: str, count: int = 8) -> list[dict]:
    """Generate probable exam questions from retrieved context."""
    prompt = EXAM_PROMPT.format(context=context, count=count)
    raw = _call_gemini(prompt, temperature=0.5)
    parsed = _parse_json_response(raw)

    questions = parsed.get("exam_questions", [])
    if not isinstance(questions, list):
        raise RuntimeError("Invalid exam questions format")

    # Validate each question
    validated = []
    for q in questions:
        if not isinstance(q, dict) or "question" not in q:
            continue

        validated.append({
            "question": str(q["question"]).strip(),
            "type": str(q.get("type", "short_answer")).strip(),
            "marks": int(q.get("marks", 5)),
            "key_points": [
                str(kp).strip()
                for kp in q.get("key_points", [])
                if isinstance(kp, str) and kp.strip()
            ],
        })

    return validated
