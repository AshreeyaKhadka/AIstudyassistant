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
import re
from services.llm_service import LLMServiceError, call_prompt, configured_model_name, get_last_call_metadata

logger = logging.getLogger(__name__)


def _log_ai_usage(user_id, action_type, usage_metadata, model_used=None, subject=None):
    """Log AI token usage to the database. Non-blocking — failures are silently logged."""
    if not usage_metadata:
        return
    try:
        from models.ai_usage import AiUsageLog
        from config import db

        log = AiUsageLog(
            user_id=user_id,
            action_type=action_type,
            prompt_tokens=usage_metadata.get('promptTokenCount', 0) or usage_metadata.get('prompt_token_count', 0),
            completion_tokens=usage_metadata.get('candidatesTokenCount', 0) or usage_metadata.get('completion_token_count', 0),
            total_tokens=usage_metadata.get('totalTokenCount', 0) or usage_metadata.get('total_token_count', 0),
            model_used=model_used,
            subject=subject,
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        logger.warning(f"Failed to log AI usage: {e}")
        try:
            from config import db
            db.session.rollback()
        except Exception:
            pass


def _call_llm(prompt: str, temperature: float = 0.4, max_tokens: int = 32768) -> str:
    """Generate a JSON response through the configured provider."""
    return call_prompt(prompt, temperature=temperature, max_tokens=max_tokens, json_mode=True)


def _call_gemini(prompt: str, temperature: float = 0.4, max_tokens: int = 32768) -> str:
    """Compatibility alias; calls the provider selected by LLM_PROVIDER."""
    return _call_llm(prompt, temperature=temperature, max_tokens=max_tokens)


def _log_usage(action_type, subject=None):
    """Log usage from the most recent configured-provider call."""
    try:
        from flask import g
        user_id = getattr(g, 'user_id', None)
        usage = get_last_call_metadata()
        if user_id and usage:
            _log_ai_usage(user_id, action_type, usage, model_used=configured_model_name(), subject=subject)
    except Exception:
        pass


def _parse_json_response(raw: str) -> any:
    """
    Safely parse a JSON response from the LLM.
    Handles cases where the LLM wraps JSON in markdown code fences
    or returns truncated JSON.
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
        logger.warning(f"Initial JSON parse failed: {e}. Attempting repair...")

    # Attempt repair: try to fix truncated JSON
    repaired = _repair_truncated_json(cleaned)
    if repaired is not None:
        return repaired

    logger.error(f"Failed to parse LLM JSON output after repair attempts\nRaw: {raw[:500]}")
    raise RuntimeError(f"AI returned invalid JSON that could not be repaired")


def _repair_truncated_json(text: str) -> any:
    """
    Attempt to repair truncated JSON by closing open brackets/braces
    and removing incomplete trailing entries.
    """
    try:
        # Strategy 1: Try parsing with progressively fewer characters
        # to find a valid JSON prefix
        for i in range(len(text) - 1, max(0, len(text) - 500), -1):
            candidate = text[:i]
            # Try closing any open structures
            for suffix in ['"}]}', '"}]}', '"]}', '"}', '"', '']:
                attempt = candidate + suffix
                try:
                    result = json.loads(attempt)
                    if isinstance(result, dict):
                        logger.info(f"Repaired truncated JSON by trimming {len(text) - i} chars + suffix '{suffix}'")
                        return result
                except json.JSONDecodeError:
                    continue

        # Strategy 2: Find the last complete object in any array
        # Look for the last complete "}" that could end an object
        import re
        # Find all complete {...} objects
        objects = list(re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL))
        if objects:
            last_complete = objects[-1].end()
            # Try to find what key this belongs to and close the structure
            prefix = text[:last_complete]
            # Count open brackets
            open_brackets = prefix.count('[') - prefix.count(']')
            open_braces = prefix.count('{') - prefix.count('}')
            close = ']' * open_brackets + '}' * open_braces

            # Find what top-level key we're in
            key_match = re.search(r'"(\w+)"\s*:\s*\[', text)
            if key_match:
                key = key_match.group(1)
                attempt = text[:last_complete] + close
                try:
                    result = json.loads(attempt)
                    if isinstance(result, dict) and key in result:
                        logger.info(f"Repaired truncated JSON by keeping {len(objects)} complete objects")
                        return result
                except json.JSONDecodeError:
                    pass

            # Simpler approach: just close everything
            attempt = prefix + close
            try:
                result = json.loads(attempt)
                if isinstance(result, dict):
                    logger.info(f"Repaired truncated JSON by closing brackets")
                    return result
            except json.JSONDecodeError:
                pass

        return None

    except Exception as e:
        logger.error(f"JSON repair failed: {e}")
        return None


# ---------------------------------------------------------------------------
# FLASHCARD GENERATION
# ---------------------------------------------------------------------------

FLASHCARD_PROMPT = """You are an expert educational content creator. Based STRICTLY on the following study material context, generate exactly {count} high-quality flashcards for active recall practice.

STUDY MATERIAL CONTEXT:
{context}

REQUIREMENTS:
- Each flashcard must have a "front" (question/term) and "back" (answer/definition).
- Include "topic_title", "difficulty" (easy, medium, or hard), and the supporting "page_number".
- Cover core definitions, key formulas, foundational concepts, and important relationships.
- Questions should test understanding, not just rote memorization.
- Answers should be concise but complete (2-4 sentences max).
- Do NOT include information that is not present in the provided context.
- Vary the question types: definitions, comparisons, cause-effect, applications.

OUTPUT FORMAT (strict JSON):
{{
  "flashcards": [
    {{"front": "What is...?", "back": "It is...", "topic_title": "Topic", "difficulty": "medium", "page_number": 3}},
    ...
  ]
}}

Generate exactly {count} flashcards. Return ONLY valid JSON."""


def generate_flashcards(context: str, count: int = 10) -> list[dict]:
    """Generate flashcards from retrieved context."""
    prompt = FLASHCARD_PROMPT.format(context=context, count=count)
    raw = _call_llm(prompt, temperature=0.3)
    _log_usage('flashcard_generate')
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
                "topic_title": str(fc.get("topic_title", "General")).strip() or "General",
                "difficulty": str(fc.get("difficulty", "medium")).strip().lower()
                if str(fc.get("difficulty", "medium")).strip().lower() in {"easy", "medium", "hard"}
                else "medium",
                "page_number": int(fc.get("page_number", 0)) if str(fc.get("page_number", "0")).isdigit() else 0,
            })

    return validated


# ---------------------------------------------------------------------------
# MCQ GENERATION
# ---------------------------------------------------------------------------

MCQ_PROMPT = """You are an expert exam question designer for university-level computer engineering courses. Based STRICTLY on the following study material context, generate exactly {count} multiple-choice questions.

The context is labeled with [Page N] markers indicating which page each section came from. Use these page references when citing sources.

STUDY MATERIAL CONTEXT:
{context}

REQUIREMENTS:
- Each question must have exactly 4 options labeled A, B, C, D.
- Exactly one option must be correct.
- Include a brief explanation (1-2 sentences) of why the correct answer is right, citing the relevant concept from the text.
- Include a difficulty rating of "easy", "medium", or "hard" based on how much inference vs. direct recall the question requires.
- Include a concise "topic_title" naming the specific concept being assessed.
- IMPORTANT: Include a "page_number" field with the page number where the answer can be found in the source material. Use the [Page N] markers from the context to determine this. If the page is not identifiable, use 0.
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
      "difficulty": "medium",
      "topic_title": "Specific topic",
      "explanation": "B is correct because...",
      "page_number": 3
    }},
    ...
  ]
}}

Generate exactly {count} MCQs. Return ONLY valid JSON."""


def generate_mcqs(context: str, count: int = 10) -> list[dict]:
    """Generate MCQs from retrieved context."""
    prompt = MCQ_PROMPT.format(context=context, count=count)
    last_error = None
    parsed = None
    for _ in range(2):
        try:
            raw = _call_llm(prompt, temperature=0.4)
            _log_usage('mcq_generate')
            parsed = _parse_json_response(raw)
            break
        except Exception as exc:
            if isinstance(exc, LLMServiceError):
                raise
            last_error = exc
            logger.warning(f"MCQ generation parse attempt failed: {exc}")

    if parsed is None:
        raise RuntimeError(f"AI returned malformed MCQ JSON: {last_error}")

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
            "difficulty": str(mcq.get("difficulty", "medium")).strip().lower()
            if str(mcq.get("difficulty", "medium")).strip().lower() in {"easy", "medium", "hard"}
            else "medium",
            "explanation": str(mcq.get("explanation", "")).strip(),
            "topic_title": str(mcq.get("topic_title", "General")).strip() or "General",
            "marks": 1,
            "page_number": int(mcq.get("page_number", 0)) if str(mcq.get("page_number", "0")).isdigit() else 0,
        })

    return validated


# ---------------------------------------------------------------------------
# PROBABLE EXAM QUESTION GENERATION
# ---------------------------------------------------------------------------

EXAM_PROMPT = """You are designing practice questions in the style commonly used for Pokhara University engineering examinations. These are AI suggestions, not predictions. Based STRICTLY on the selected PDF context, generate exactly {count} questions for {subject}.

STUDY MATERIAL CONTEXT:
{context}

REQUIREMENTS:
- Generate exactly {long_count} long-answer questions worth 8 marks each.
- Generate exactly {short_count} short-note questions worth 5 marks each.
- Use long answers for broad explanations, derivations, comparisons, designs, or numerical work.
- Use short notes for focused concepts that can reasonably be answered for 5 marks.
- For each question, provide:
  - The question text
  - The exact type ("short_note" or "long_answer") and required marks (5 or 8)
  - A checklist of key points required for a perfect-score answer (3-6 bullet points)
  - A source_page that exists in the context
  - A source_basis phrase copied exactly from that page (6-20 words)
- Focus on topics that professors commonly emphasize: core theory, derivations, comparisons, applications, and design questions.
- Do NOT include information not present in the provided context.

OUTPUT FORMAT (strict JSON):
{{
  "exam_questions": [
    {{
      "question": "Explain the concept of...",
      "type": "long_answer",
      "marks": 8,
      "source_page": 2,
      "source_basis": "an exact phrase copied from the selected PDF",
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


def _exam_question_count(context: str) -> int:
    headings = set()
    for raw_line in context.splitlines():
        line = re.sub(r'\s+', ' ', raw_line).strip()
        if re.match(r'^(?:unit|chapter|module|topic|section)\s+[\divxlc]+\b', line, re.I):
            headings.add(line.casefold())
        elif re.match(r'^\d+(?:\.\d+)*[.):\s-]+[A-Za-z]', line):
            headings.add(line.casefold())
    pages = set(re.findall(r'\[Page\s+(\d+)\]', context, flags=re.I))
    coverage_units = len(headings) or max(1, (len(pages) + 2) // 3)
    return max(4, min(12, coverage_units))


def _normalized_evidence(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', value.casefold()).strip()


def generate_exam_questions(context: str, count: int = None, subject: str = '') -> list[dict]:
    """Generate and verify PDF-grounded Pokhara University-style practice questions."""
    target_count = max(4, min(12, int(count))) if count is not None else _exam_question_count(context)
    long_count = target_count // 2
    short_count = target_count - long_count
    available_pages = {int(page) for page in re.findall(r'\[Page\s+(\d+)\]', context, flags=re.I)}
    normalized_context = _normalized_evidence(context)
    prompt = EXAM_PROMPT.format(
        context=context,
        count=target_count,
        subject=subject or 'the selected subject',
        long_count=long_count,
        short_count=short_count,
    )

    last_error = 'invalid output'
    for _attempt in range(2):
        raw = _call_llm(prompt, temperature=0.25)
        _log_usage('exam_generate', subject=subject)
        parsed = _parse_json_response(raw)
        questions = parsed.get('exam_questions', [])
        validated = []
        for question in questions if isinstance(questions, list) else []:
            if not isinstance(question, dict) or not str(question.get('question') or '').strip():
                continue
            try:
                marks = int(question.get('marks'))
                page = int(question.get('source_page'))
            except (TypeError, ValueError):
                continue
            question_type = str(question.get('type') or '').strip().lower()
            evidence = re.sub(r'\s+', ' ', str(question.get('source_basis') or '')).strip()
            evidence_normalized = _normalized_evidence(evidence)
            expected_type = 'long_answer' if marks == 8 else 'short_note' if marks == 5 else None
            if (
                not expected_type or question_type != expected_type or page not in available_pages
                or len(evidence_normalized) < 12 or evidence_normalized not in normalized_context
            ):
                continue
            validated.append({
                'question': str(question['question']).strip(),
                'type': question_type,
                'marks': marks,
                'key_points': [str(point).strip() for point in question.get('key_points', []) if str(point).strip()],
                'source_page': page,
                'source_basis': evidence,
            })
        distribution = {5: sum(item['marks'] == 5 for item in validated), 8: sum(item['marks'] == 8 for item in validated)}
        if len(validated) == target_count and distribution == {5: short_count, 8: long_count}:
            return validated
        last_error = f'expected {target_count} grounded questions with distribution 5x{short_count}, 8x{long_count}'

    raise RuntimeError(f'AI returned an invalid exam question set: {last_error}')


BLUEPRINT_PROMPT = """You are creating a one-page exam revision blueprint for university students. Based STRICTLY on the study material below for {subject}, produce a concise visual-ready summary.

STUDY MATERIAL CONTEXT:
{context}

OUTPUT FORMAT (strict JSON):
{{
  "title": "Subject Blueprint",
  "sections": [
    {{
      "heading": "Core Formulas / Rules",
      "items": ["item 1", "item 2"]
    }},
    {{
      "heading": "Key Terms",
      "items": ["term: definition", "..."]
    }},
    {{
      "heading": "Must-Know Diagrams / Processes",
      "items": ["description"]
    }},
    {{
      "heading": "High-Yield Exam Tips",
      "items": ["tip 1", "tip 2"]
    }}
  ]
}}

Return ONLY valid JSON with 4-6 sections and 3-6 items each."""


RAPID_REVISION_PROMPT = """You are building a rapid revision deck for last-minute exam prep. Based STRICTLY on the study material below, generate exactly {count} flash-style key term cards.

STUDY MATERIAL CONTEXT:
{context}

OUTPUT FORMAT (strict JSON):
{{
  "cards": [
    {{ "term": "Short term or concept", "definition": "One-line definition" }}
  ]
}}

Generate exactly {count} cards. Return ONLY valid JSON."""


def generate_blueprint_sheet(context: str, subject: str = 'Subject') -> dict:
    prompt = BLUEPRINT_PROMPT.format(context=context, subject=subject)
    raw = _call_llm(prompt, temperature=0.4)
    _log_usage('blueprint_generate', subject=subject)
    parsed = _parse_json_response(raw)
    sections = parsed.get('sections', [])
    if not isinstance(sections, list) or not sections:
        raise RuntimeError('Invalid blueprint format')
    return {
        'title': parsed.get('title', f'{subject} Blueprint'),
        'subject': subject,
        'sections': sections,
    }


def generate_rapid_revision(context: str, count: int = 15) -> list[dict]:
    prompt = RAPID_REVISION_PROMPT.format(context=context, count=count)
    raw = _call_llm(prompt, temperature=0.5)
    _log_usage('rapid_revision_generate')
    parsed = _parse_json_response(raw)
    cards = parsed.get('cards', [])
    if not isinstance(cards, list):
        raise RuntimeError('Invalid rapid revision format')
    validated = []
    for card in cards:
        if isinstance(card, dict) and card.get('term') and card.get('definition'):
            validated.append({
                'term': str(card['term']).strip(),
                'definition': str(card['definition']).strip(),
            })
    return validated


MOCK_TEST_PROMPT = """You are creating a university-style mock exam from the provided study material.

STUDY MATERIAL CONTEXT:
{context}

Build a realistic exam paper for {subject}. Follow this marks distribution:
- 5 one-mark definition/recall questions
- 5 two-mark short-answer questions
- 3 five-mark explanation/application questions
- 2 ten-mark long-answer/problem-solving questions

Requirements:
- Questions must be answerable from the context.
- Include expected answer points or marking guidance for each question.
- Include the specific topic_title and supporting page_number for each question.
- Include a difficulty: easy, medium, or hard.
- Include a question_style: definition, short_answer, explanation, numerical, long_answer, or problem_solving.
- If numerical questions are not supported by the material, use conceptual problem-solving instead.

OUTPUT FORMAT (strict JSON):
{{
  "title": "{subject} Mock Test",
  "duration_minutes": 120,
  "total_marks": 50,
  "sections": [
    {{
      "name": "Section A",
      "marks_each": 1,
      "questions": [
        {{
          "question": "...",
          "marks": 1,
          "question_style": "definition",
          "difficulty": "easy",
          "topic_title": "Specific topic",
          "page_number": 1,
          "answer_points": ["..."]
        }}
      ]
    }}
  ]
}}

Return ONLY valid JSON."""


def generate_mock_test(context: str, subject: str = 'Subject') -> dict:
    prompt = MOCK_TEST_PROMPT.format(context=context, subject=subject)
    raw = _call_llm(prompt, temperature=0.35)
    _log_usage('mock_test_generate', subject=subject)
    parsed = _parse_json_response(raw)
    sections = parsed.get('sections', [])
    if not isinstance(sections, list) or not sections:
        raise RuntimeError('Invalid mock test format')
    normalized_sections = []
    total_marks = 0
    for section in sections:
        if not isinstance(section, dict):
            continue
        questions = []
        default_marks = int(section.get('marks_each', 1) or 1)
        for question in section.get('questions') or []:
            if not isinstance(question, dict) or not str(question.get('question') or '').strip():
                continue
            marks = int(question.get('marks', default_marks) or default_marks)
            total_marks += marks
            questions.append({
                **question,
                'question': str(question['question']).strip(),
                'marks': marks,
                'topic_title': str(question.get('topic_title') or 'General').strip(),
                'page_number': int(question.get('page_number', 0)) if str(question.get('page_number', '0')).isdigit() else 0,
                'answer_points': [str(point).strip() for point in question.get('answer_points', []) if str(point).strip()],
            })
        if questions:
            normalized_sections.append({**section, 'marks_each': default_marks, 'questions': questions})
    if not normalized_sections:
        raise RuntimeError('AI returned no valid mock-test questions')
    marks_distribution = {}
    for section in normalized_sections:
        for question in section['questions']:
            marks_distribution[question['marks']] = marks_distribution.get(question['marks'], 0) + 1
    expected_distribution = {1: 5, 2: 5, 5: 3, 10: 2}
    if marks_distribution != expected_distribution:
        raise RuntimeError(
            f'AI returned an invalid marks distribution: {marks_distribution}; expected {expected_distribution}'
        )
    return {
        'title': parsed.get('title', f'{subject} Mock Test'),
        'subject': subject,
        'duration_minutes': int(parsed.get('duration_minutes', 120)),
        'total_marks': total_marks,
        'sections': normalized_sections,
    }


LEARNING_PATH_PROMPT = """Create a practical learning path for a student based on syllabus progress.

SUBJECT: {subject}

WEAK OR UNCOVERED TOPICS:
{topics}

Return a concise plan with prerequisites, ordered study steps, and daily tasks.

OUTPUT FORMAT (strict JSON):
{{
  "subject": "{subject}",
  "prerequisites": ["..."],
  "steps": [
    {{
      "order": 1,
      "topic": "...",
      "why": "...",
      "task": "...",
      "practice": "..."
    }}
  ],
  "daily_plan": [
    {{
      "day": 1,
      "focus": "...",
      "tasks": ["..."]
    }}
  ]
}}

Return ONLY valid JSON."""


def generate_learning_path(subject: str, topics: list[dict]) -> dict:
    topic_text = "\n".join(
        f"- {item.get('topic_title')}: {'weak' if item.get('weak') else 'uncovered'}"
        for item in topics[:12]
    ) or "- No weak/uncovered topics yet; create a balanced revision path."
    prompt = LEARNING_PATH_PROMPT.format(subject=subject, topics=topic_text)
    raw = _call_llm(prompt, temperature=0.35)
    _log_usage('learning_path_generate', subject=subject)
    parsed = _parse_json_response(raw)
    return {
        'subject': parsed.get('subject', subject),
        'prerequisites': parsed.get('prerequisites', []),
        'steps': parsed.get('steps', []),
        'daily_plan': parsed.get('daily_plan', []),
    }


# ---------------------------------------------------------------------------
# SYLLABUS HIERARCHY EXTRACTION
# ---------------------------------------------------------------------------

SYLLABUS_HIERARCHY_PROMPT = """You are an expert academic syllabus parser. Given the raw text of a university course syllabus, extract its structured hierarchy.

The syllabus may use different naming conventions: "Chapters", "Units", "Modules", "Topics", "Sections", etc. Normalize them all into this hierarchy:
- **Chapters** are the top-level divisions (e.g., "Unit I", "Module 1", "Chapter 1")
- **Units** are sub-divisions within a chapter (if present). If the syllabus has no sub-divisions, treat the chapter itself as a single unit.
- **Subtopics** are the individual topics listed under each unit/chapter.

RULES:
1. Preserve the original ordering of chapters and topics from the document.
2. If the syllabus does not explicitly have units/sub-divisions, create one unit per chapter with the same name as the chapter, and list the topics as subtopics.
3. Each subtopic should be a concise string (the topic name/title only).
4. Do NOT fabricate topics that are not in the original text.
5. If you cannot determine a chapter name, use "Chapter N" where N is the sequence number.
6. The `syllabus_title` should be the document title or the course name if found, otherwise "Untitled Syllabus".
7. "Course Content", "Course Contents", "Detailed Course Content", "Syllabus", and similar labels are containers, never chapter names.
8. If "Course Content" contains Unit I, Unit II, Chapter 1, Module 1, or equivalent headings, return each of those headings as a separate chapter.
9. Exclude course objectives, teaching methods, evaluation/grading schemes, textbooks, references, and bibliographies unless they are explicitly listed as teachable course-content topics.
10. Preserve topic numbering and stated hours when they are part of a topic title. A heading may appear as "UNIT I - Title", "Chapter 1: Title", or a heading followed by its title on the next line.

SYLLABUS TEXT:
{syllabus_text}

OUTPUT FORMAT (strict JSON):
{{
  "syllabus_title": "string",
  "chapters": [
    {
      "chapter_name": "string",
      "units": [
        {
          "unit_name": "string",
          "subtopics": ["string"]
        }
      ]
    }
  ]
}}

Return ONLY valid JSON. Do NOT wrap in markdown code fences."""


_CONTENT_CONTAINER_RE = re.compile(
    r'^(?:detailed\s+)?course\s+contents?|^syllabus$|^course\s+outline$',
    re.IGNORECASE,
)
_EXPLICIT_DIVISION_RE = re.compile(
    r'^(chapter|unit|module)\s+([ivxlcdm]+|\d+)\s*(?:[:.\-–—]\s*)?(.*)$',
    re.IGNORECASE,
)
_NON_CONTENT_HEADING_RE = re.compile(
    r'^(course\s+objectives?|learning\s+outcomes?|evaluation|grading|assessment|textbooks?|references?|bibliography|teaching\s+methods?)\b',
    re.IGNORECASE,
)


def _deterministic_syllabus_hierarchy(syllabus_text: str):
    lines = [re.sub(r'\s+', ' ', line).strip() for line in syllabus_text.splitlines()]
    lines = [line for line in lines if line and not re.match(r'^\[(?:Page|Slide)\s+\d+\]$', line, re.IGNORECASE)]
    heading_positions = [
        (index, _EXPLICIT_DIVISION_RE.match(line))
        for index, line in enumerate(lines)
        if _EXPLICIT_DIVISION_RE.match(line)
    ]
    if len(heading_positions) < 2:
        return None

    syllabus_title = next(
        (
            line for line in lines[:heading_positions[0][0]]
            if not _CONTENT_CONTAINER_RE.match(line)
            and not _NON_CONTENT_HEADING_RE.match(line)
        ),
        'Syllabus',
    )

    chapters = []
    for heading_index, (line_index, match) in enumerate(heading_positions):
        end = heading_positions[heading_index + 1][0] if heading_index + 1 < len(heading_positions) else len(lines)
        division_label = f'{match.group(1).title()} {match.group(2).upper()}'
        title = (match.group(3) or '').strip()
        if not title and line_index + 1 < end:
            candidate = lines[line_index + 1]
            if (
                not _NON_CONTENT_HEADING_RE.match(candidate)
                and not _CONTENT_CONTAINER_RE.match(candidate)
                and not re.match(r'^\d+(?:\.\d+)+\b', candidate)
            ):
                title = candidate
                line_index += 1
        chapter_name = title or division_label
        topic_lines = []
        for line in lines[line_index + 1:end]:
            if _NON_CONTENT_HEADING_RE.match(line):
                break
            if _CONTENT_CONTAINER_RE.match(line):
                continue
            if len(line) > 500:
                line = line[:500]
            if line.casefold() not in {item.casefold() for item in topic_lines}:
                topic_lines.append(line)
        chapters.append({
            'chapter_name': chapter_name,
            'units': [{'unit_name': division_label, 'subtopics': topic_lines}],
        })
    return {'syllabus_title': syllabus_title, 'chapters': chapters}


def _repair_syllabus_hierarchy(parsed):
    chapters = parsed.get('chapters') if isinstance(parsed, dict) else None
    if not isinstance(chapters, list):
        return parsed
    repaired = []
    for chapter in chapters:
        if not isinstance(chapter, dict):
            continue
        chapter_name = str(chapter.get('chapter_name') or '').strip()
        units = chapter.get('units') if isinstance(chapter.get('units'), list) else []
        if _CONTENT_CONTAINER_RE.match(chapter_name) and units:
            for unit in units:
                if not isinstance(unit, dict):
                    continue
                unit_name = str(unit.get('unit_name') or '').strip()
                if not unit_name or _CONTENT_CONTAINER_RE.match(unit_name):
                    continue
                repaired.append({
                    'chapter_name': re.sub(r'^(?:chapter|unit|module)\s+(?:[ivxlcdm]+|\d+)\s*[:.\-–—]?\s*', '', unit_name, flags=re.IGNORECASE) or unit_name,
                    'units': [{'unit_name': unit_name, 'subtopics': unit.get('subtopics') or []}],
                })
        elif chapter_name and not _NON_CONTENT_HEADING_RE.match(chapter_name):
            repaired.append(chapter)
    return {**parsed, 'chapters': repaired}


def parse_syllabus_hierarchy(syllabus_text: str) -> dict:
    """
    Parse raw syllabus text into a structured hierarchy of chapters, units, and subtopics.
    Uses Gemini LLM to extract the structure.
    """
    if not syllabus_text or not syllabus_text.strip():
        raise ValueError("Empty syllabus text")

    parsed = _deterministic_syllabus_hierarchy(syllabus_text)
    if not parsed:
        truncated = syllabus_text[:15000]
        prompt = SYLLABUS_HIERARCHY_PROMPT.format(syllabus_text=truncated)
        raw = _call_llm(prompt, temperature=0.1)
        _log_usage('syllabus_parse')
        parsed = _parse_json_response(raw)
    parsed = _repair_syllabus_hierarchy(parsed)

    syllabus_title = str(parsed.get("syllabus_title", "Untitled Syllabus")).strip()
    raw_chapters = parsed.get("chapters", [])

    if not isinstance(raw_chapters, list) or not raw_chapters:
        raise RuntimeError("AI returned no chapters from syllabus")

    chapters = []
    for ch in raw_chapters:
        if not isinstance(ch, dict):
            continue
        chapter_name = str(ch.get("chapter_name", "Untitled Chapter")).strip()
        raw_units = ch.get("units", [])
        if not isinstance(raw_units, list) or not raw_units:
            raw_units = [{"unit_name": chapter_name, "subtopics": []}]

        units = []
        for unit in raw_units:
            if not isinstance(unit, dict):
                continue
            unit_name = str(unit.get("unit_name", chapter_name)).strip()
            subtopics = [
                str(s).strip()
                for s in unit.get("subtopics", [])
                if isinstance(s, str) and s.strip()
            ]
            units.append({"unit_name": unit_name, "subtopics": subtopics})

        chapters.append({"chapter_name": chapter_name, "units": units})

    return {"syllabus_title": syllabus_title, "chapters": chapters}
