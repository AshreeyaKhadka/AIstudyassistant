"""Canonical, read-only syllabus catalog used by syllabus study mode."""

from functools import lru_cache
import json
import os
import re


CATALOG_VERSION = 1
PROGRAM_NAME = 'Pokhara University - Bachelor in Computer Engineering'
CATALOG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'syllabusparser',
    'unitwise.json',
)


def _slug(value):
    value = (value or '').strip().lower()
    value = re.sub(r'\b(i{1,3}|iv|v|vi{0,3}|ix|x)\b', lambda match: str({
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
        'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    }[match.group(1)]), value)
    return re.sub(r'[^a-z0-9]+', '-', value).strip('-') or 'subject'


def _clean_subject_name(value):
    return re.sub(r'\s*\(\d+-\d+-\d+\)\s*$', '', value or '').strip()


def _subject_records(raw):
    """Yield both nested first-semester entries and top-level later entries."""
    seen = set()
    nested = raw.get(PROGRAM_NAME) or {}
    for name, value in list(nested.items()) + list(raw.items()):
        if name == PROGRAM_NAME or not isinstance(value, dict) or not isinstance(value.get('units'), list):
            continue
        clean_name = _clean_subject_name(name)
        semester = int(value.get('Semester') or value.get('semester') or 1)
        key = (clean_name.casefold(), semester)
        if key in seen:
            continue
        seen.add(key)
        yield clean_name, semester, value


@lru_cache(maxsize=1)
def get_catalog():
    with open(CATALOG_PATH, 'r', encoding='utf-8') as catalog_file:
        raw = json.load(catalog_file)

    subjects = []
    for name, semester, value in _subject_records(raw):
        subject_key = f'sem{semester}-{_slug(name)}'
        units = []
        for unit_index, raw_unit in enumerate(value.get('units') or [], start=1):
            title = (raw_unit.get('title') or raw_unit.get('unit') or f'Unit {unit_index}').strip()
            unit_key = f'{subject_key}-ch{unit_index}'
            topics = []
            raw_topics = raw_unit.get('sub_topics') or raw_unit.get('topics') or []
            for topic_index, raw_topic in enumerate(raw_topics, start=1):
                topic_title = raw_topic.get('title') if isinstance(raw_topic, dict) else str(raw_topic)
                topic_title = (topic_title or '').strip()
                if not topic_title:
                    continue
                topics.append({
                    'id': f'{unit_key}-topic-{topic_index}',
                    'title': topic_title,
                    'position': topic_index,
                })
            units.append({
                'id': unit_key,
                'label': (raw_unit.get('unit') or f'Unit {unit_index}').strip(),
                'title': title,
                'hours': raw_unit.get('hours'),
                'position': unit_index,
                'topics': topics,
            })
        subjects.append({
            'id': subject_key,
            'name': name,
            'semester': semester,
            'credits': value.get('credits'),
            'units': units,
        })
    subjects.sort(key=lambda item: (item['semester'], item['name'].casefold()))
    return {'version': CATALOG_VERSION, 'program': PROGRAM_NAME, 'subjects': subjects}


def find_subject(subject_key=None, name=None, semester=None):
    candidates = get_catalog()['subjects']
    if subject_key:
        found = next((item for item in candidates if item['id'] == subject_key), None)
        if found:
            return found
    clean_name = _clean_subject_name(name or '').casefold()
    return next((item for item in candidates if (
        clean_name and item['name'].casefold() == clean_name
        and (semester is None or item['semester'] == int(semester))
    )), None)


def find_unit(subject, unit_key=None, title=None):
    if not subject:
        return None
    if unit_key:
        found = next((item for item in subject['units'] if item['id'] == unit_key), None)
        if found:
            return found
    clean_title = (title or '').strip().casefold()
    return next((item for item in subject['units'] if clean_title and (
        item['title'].casefold() == clean_title or item['label'].casefold() == clean_title
    )), None)


def is_broad_unit_request(message):
    text = re.sub(r'\s+', ' ', message or '').strip().casefold()
    broad_phrases = (
        'key concept', 'core concept', 'whole unit', 'entire unit', 'this unit',
        'this chapter', 'revision note', 'summarize', 'summary', 'overview',
        'everything', 'all topic', 'teach me',
    )
    return len(text.split()) <= 12 and any(phrase in text for phrase in broad_phrases)


def _tokens(value):
    ignored = {'the', 'and', 'for', 'with', 'from', 'this', 'that', 'what', 'how', 'why', 'explain'}
    return {token for token in re.findall(r'[a-z0-9]+', (value or '').casefold()) if len(token) > 2 and token not in ignored}


def rank_topics(message, subject):
    """Rank official topics lexically; deterministic and available without an embedding provider."""
    query_tokens = _tokens(message)
    ranked = []
    for unit in subject.get('units') or []:
        for topic in unit.get('topics') or []:
            topic_tokens = _tokens(topic['title'])
            overlap = query_tokens & topic_tokens
            score = len(overlap) / max(1, min(len(query_tokens), len(topic_tokens)))
            phrase_bonus = 0.25 if topic['title'].casefold() in (message or '').casefold() else 0
            ranked.append({**topic, 'unit_id': unit['id'], 'unit_title': unit['title'], 'score': min(1.0, score + phrase_bonus)})
    return sorted(ranked, key=lambda item: (-item['score'], item['unit_id'], item['position']))


def syllabus_chunks(subject, unit, matched_topics=None):
    topics = matched_topics or unit.get('topics') or []
    chunks = []
    for index, topic in enumerate(topics):
        chunks.append({
            'text': (
                f"Official syllabus scope for {subject['name']}, {unit['label']}: "
                f"{topic['title']}. Explain this topic at university engineering level."
            ),
            'score': float(topic.get('score', 1.0) or 1.0),
            'metadata': {
                'filename': 'Official Pokhara University Syllabus',
                'doc_type': 'syllabus_catalog',
                'source_type': 'official_catalog',
                'chunk_index': index,
                'subject_key': subject['id'],
                'unit_key': unit['id'],
                'chapter_title': unit['label'],
                'unit_title': unit['title'],
                'topic_id': topic['id'],
                'topic_title': topic['title'],
                'catalog_version': CATALOG_VERSION,
            },
        })
    return chunks
