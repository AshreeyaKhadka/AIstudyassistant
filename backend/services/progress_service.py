from datetime import datetime, timedelta
from urllib.parse import quote_plus
from config import db
from models.content import StudentUpload, Subject
from models.progress import ActivityLog, TopicProgress
from models.quiz import QuizSet
from models.revision import RevisionPlan
from services.rag_service import (
    CHAT_MATERIAL_RELEVANCE_THRESHOLD,
    get_subject_syllabus_upload,
    get_syllabus_topic_units,
    retrieve_context,
)

SPACED_REPETITION_DAYS = [1, 3, 7, 14, 30]


def log_activity(user_id, action, subject_id=None, upload_id=None, quiz_set_id=None, topic_id=None, topic_title=None, score=None, metadata=None):
    activity = ActivityLog(
        user_id=user_id,
        subject_id=subject_id,
        upload_id=upload_id,
        quiz_set_id=quiz_set_id,
        topic_id=topic_id,
        topic_title=topic_title,
        action=action,
        score=score,
        activity_metadata=metadata or {},
    )
    db.session.add(activity)
    return activity


def upsert_topic_progress(user_id, subject_id, topic_id, topic_title, **updates):
    if not subject_id or not topic_id:
        return None

    progress = TopicProgress.query.filter_by(
        user_id=user_id,
        subject_id=subject_id,
        topic_id=str(topic_id),
    ).first()
    if not progress:
        progress = TopicProgress(
            user_id=user_id,
            subject_id=subject_id,
            topic_id=str(topic_id),
            topic_title=topic_title or str(topic_id),
        )
        db.session.add(progress)

    progress.topic_title = topic_title or progress.topic_title
    progress.updated_at = datetime.utcnow()
    for key, value in updates.items():
        if hasattr(progress, key) and value is not None:
            setattr(progress, key, value)
    return progress


def _topic_from_chunk(chunk):
    metadata = chunk.get('metadata') or {}
    chunk_index = metadata.get('chunk_index', 'unknown')
    return {
        'topic_id': metadata.get('topic_id') or metadata.get('unit_id') or f"chunk:{chunk_index}",
        'topic_title': metadata.get('topic_title') or metadata.get('unit_title') or metadata.get('heading') or metadata.get('unit') or metadata.get('chapter') or f"Syllabus chunk {chunk_index}",
        'syllabus_upload_id': metadata.get('upload_id'),
    }


def seed_syllabus_topics(user_id, subject_id):
    syllabus = get_subject_syllabus_upload(user_id, subject_id)
    if not syllabus:
        return []

    topic_units = get_syllabus_topic_units(syllabus.id)
    seeded = []
    for unit in topic_units:
        progress = upsert_topic_progress(
            user_id,
            subject_id,
            unit['id'],
            unit['title'],
            syllabus_upload_id=syllabus.id,
        )
        seeded.append(progress)
    db.session.commit()
    return seeded


def map_material_upload_to_topics(upload_id):
    upload = StudentUpload.query.get(upload_id)
    if not upload or upload.doc_type != 'material' or upload.validation_status != 'approved' or not upload.subject_id:
        return []

    syllabus = get_subject_syllabus_upload(upload.user_id, upload.subject_id)
    if not syllabus:
        return []

    topic_units = get_syllabus_topic_units(syllabus.id)
    validated_topics = {
        item.get('topic_id'): item
        for item in (upload.validation_details or {}).get('matched_topics', [])
        if item.get('topic_id')
    }
    mapped = []
    for unit in topic_units:
        validation_match = validated_topics.get(unit['id'])
        if validation_match:
            best_score = float(validation_match.get('best_score', 0) or 0)
        else:
            matches = retrieve_context(
                upload_id=upload.id,
                query=unit['text'],
                top_k=3,
                filter_metadata={'doc_type': 'material'},
            )
            best_score = float(matches[0].get('score', 0) or 0) if matches else 0.0
        if best_score >= CHAT_MATERIAL_RELEVANCE_THRESHOLD:
            upsert_topic_progress(
                upload.user_id,
                upload.subject_id,
                unit['id'],
                unit['title'],
                syllabus_upload_id=syllabus.id,
                covered=True,
                coverage_score=max(best_score, 0.0),
                last_touched_at=datetime.utcnow(),
            )
            log_activity(
                upload.user_id,
                'material_mapped',
                subject_id=upload.subject_id,
                upload_id=upload.id,
                topic_id=unit['id'],
                topic_title=unit['title'],
                score=best_score,
                metadata={'filename': upload.filename},
            )
            mapped.append({'topic_id': unit['id'], 'topic_title': unit['title'], 'score': best_score})

    log_activity(
        upload.user_id,
        'upload_validated',
        subject_id=upload.subject_id,
        upload_id=upload.id,
        score=upload.syllabus_match_coverage,
        metadata={'validation_status': upload.validation_status},
    )
    db.session.commit()
    return mapped


def record_chat_topics(user_id, subject_id, chunks):
    touched = []
    for chunk in chunks[:3]:
        metadata = chunk.get('metadata') or {}
        if metadata.get('doc_type') != 'syllabus':
            continue
        topic = _topic_from_chunk(chunk)
        upsert_topic_progress(
            user_id,
            subject_id,
            topic['topic_id'],
            topic['topic_title'],
            syllabus_upload_id=topic['syllabus_upload_id'],
            last_touched_at=datetime.utcnow(),
        )
        log_activity(
            user_id,
            'asked_ai',
            subject_id=subject_id,
            upload_id=topic['syllabus_upload_id'],
            topic_id=topic['topic_id'],
            topic_title=topic['topic_title'],
            score=chunk.get('score'),
        )
        touched.append(topic)
    db.session.commit()
    return touched


def record_generation(user_id, upload, quiz_set=None, action='generated_mcq'):
    if not upload:
        return
    log_activity(
        user_id,
        action,
        subject_id=upload.subject_id,
        upload_id=upload.id,
        quiz_set_id=quiz_set.id if quiz_set else None,
        metadata={'filename': upload.filename},
    )
    if upload.subject_id and upload.validation_status == 'approved':
        map_material_upload_to_topics(upload.id)
    db.session.commit()


def _assessment_topic(upload, topic_title):
    normalized = str(topic_title or 'General').strip()
    for item in ((upload.validation_details or {}).get('matched_topics') or []) if upload else []:
        if isinstance(item, dict) and str(item.get('topic_title') or '').casefold() == normalized.casefold():
            return str(item.get('topic_id')), str(item.get('topic_title'))
    slug = '-'.join(normalized.casefold().split())[:180] or 'general'
    return f'assessment:{slug}', normalized


def record_quiz_result(user_id, quiz_set, score, results=None):
    upload = StudentUpload.query.get(quiz_set.upload_id) if quiz_set.upload_id else None
    questions = quiz_set.questions_json if isinstance(quiz_set.questions_json, list) else []
    total = max(len(questions), 1)
    accuracy = max(0.0, min(float(score) / total, 1.0))

    subject_id = quiz_set.subject_id or (upload.subject_id if upload else None)
    log_activity(
        user_id,
        'answered_quiz',
        subject_id=subject_id,
        upload_id=upload.id if upload else None,
        quiz_set_id=quiz_set.id,
        score=accuracy,
    )

    if upload and upload.validation_status in {'approved', 'needs_review'}:
        grouped = {}
        for result in results or []:
            title = result.get('topic_title') or quiz_set.topic
            grouped.setdefault(title, []).append(bool(result.get('is_correct')))
        if not grouped:
            grouped = {quiz_set.topic: [accuracy >= 0.6]}
        for title, outcomes in grouped.items():
            topic_accuracy = sum(outcomes) / max(len(outcomes), 1)
            topic_id, topic_title = _assessment_topic(upload, title)
            next_revision = _next_revision_date(topic_accuracy)
            upsert_topic_progress(
                user_id,
                upload.subject_id,
                topic_id,
                topic_title,
                practiced=True,
                weak=topic_accuracy < 0.6,
                mastery_score=round(topic_accuracy * 100, 2),
                last_practiced_at=datetime.utcnow(),
                next_revision_at=next_revision,
            )
    db.session.commit()


def record_flashcard_review(user_id, deck, card, rating, interval_days):
    upload = StudentUpload.query.get(deck.upload_id) if deck.upload_id else None
    if not upload or not upload.subject_id:
        return
    topic_id, topic_title = _assessment_topic(upload, card.get('topic_title'))
    mastery = {'again': 20, 'hard': 45, 'good': 75, 'easy': 95}[rating]
    upsert_topic_progress(
        user_id,
        upload.subject_id,
        topic_id,
        topic_title,
        practiced=True,
        reviewed=True,
        weak=rating in {'again', 'hard'},
        mastery_score=mastery,
        last_practiced_at=datetime.utcnow(),
        next_revision_at=datetime.utcnow() + timedelta(days=interval_days),
    )
    log_activity(
        user_id,
        'reviewed_flashcard',
        subject_id=upload.subject_id,
        upload_id=upload.id,
        quiz_set_id=deck.id,
        topic_id=topic_id,
        topic_title=topic_title,
        score=mastery / 100,
        metadata={'rating': rating, 'interval_days': interval_days},
    )


def _next_revision_date(accuracy):
    if accuracy < 0.4:
        days = SPACED_REPETITION_DAYS[0]
    elif accuracy < 0.6:
        days = SPACED_REPETITION_DAYS[1]
    elif accuracy < 0.8:
        days = SPACED_REPETITION_DAYS[2]
    else:
        days = SPACED_REPETITION_DAYS[3]
    return datetime.utcnow() + timedelta(days=days)


def get_subject_mastery(user_id, subject_id):
    subject = Subject.query.filter_by(id=subject_id, user_id=user_id).first()
    if not subject:
        return None

    seed_syllabus_topics(user_id, subject_id)
    rows = TopicProgress.query.filter_by(user_id=user_id, subject_id=subject_id).order_by(TopicProgress.topic_id.asc()).all()
    total = len(rows)
    covered = sum(1 for row in rows if row.covered)
    practiced = sum(1 for row in rows if row.practiced)
    weak = sum(1 for row in rows if row.weak)
    reviewed = sum(1 for row in rows if row.reviewed)
    avg_mastery = round(sum(row.mastery_score or 0 for row in rows) / total, 2) if total else 0

    uploads = StudentUpload.query.filter_by(user_id=user_id, subject_id=subject_id).order_by(StudentUpload.created_at.desc()).all()
    return {
        'subject': {
            'id': subject.id,
            'name': subject.name,
            'semester': subject.semester,
            'code': subject.code,
        },
        'summary': {
            'total_topics': total,
            'covered_topics': covered,
            'coverage_percent': round((covered / total) * 100) if total else 0,
            'practiced_topics': practiced,
            'reviewed_topics': reviewed,
            'weak_topics': weak,
            'average_mastery': avg_mastery,
            'approved_materials': sum(1 for upload in uploads if upload.doc_type == 'material' and upload.validation_status == 'approved'),
            'rejected_materials': sum(1 for upload in uploads if upload.doc_type == 'material' and upload.validation_status == 'rejected'),
            'review_materials': sum(1 for upload in uploads if upload.doc_type == 'material' and upload.validation_status == 'needs_review'),
            'pending_materials': sum(1 for upload in uploads if upload.doc_type == 'material' and upload.validation_status == 'pending'),
        },
        'topics': [row.to_dict() for row in rows],
        'recommended_resources': _recommended_resources(subject.name, rows),
        'materials': [
            {
                'id': upload.id,
                'filename': upload.filename,
                'doc_type': upload.doc_type,
                'validation_status': upload.validation_status,
                'syllabus_match_coverage': upload.syllabus_match_coverage,
                'embedding_status': upload.embedding_status,
            }
            for upload in uploads
        ],
    }


def _recommended_resources(subject_name, rows):
    targets = [row for row in rows if row.weak or not row.covered][:5]
    resources = []
    for row in targets:
        query = quote_plus(f"{subject_name} {row.topic_title} tutorial")
        resources.append({
            'topic_id': row.topic_id,
            'topic_title': row.topic_title,
            'reason': 'weak' if row.weak else 'uncovered',
            'links': [
                {'label': 'YouTube', 'url': f'https://www.youtube.com/results?search_query={query}'},
                {'label': 'Google', 'url': f'https://www.google.com/search?q={query}'},
            ],
        })
    return resources


def create_revision_tasks_from_progress(user_id, subject_id, limit=5):
    mastery = get_subject_mastery(user_id, subject_id)
    if not mastery:
        return None

    subject_name = mastery['subject']['name']
    rows = TopicProgress.query.filter_by(user_id=user_id, subject_id=subject_id).all()
    candidates = sorted(
        rows,
        key=lambda row: (
            0 if row.weak else 1,
            0 if not row.covered else 1,
            row.next_revision_at or datetime.utcnow(),
        ),
    )[:limit]

    created = []
    for index, row in enumerate(candidates):
        revision_date = (datetime.utcnow() + timedelta(days=index)).strftime('%Y-%m-%d')
        exists = RevisionPlan.query.filter_by(
            user_id=user_id,
            subject=subject_name,
            title=f"Revise: {row.topic_title[:180]}",
            revision_date=revision_date,
        ).first()
        if exists:
            continue
        plan = RevisionPlan(
            user_id=user_id,
            title=f"Revise: {row.topic_title[:180]}",
            description='Auto-scheduled from syllabus progress and quiz performance.',
            subject=subject_name,
            event_type='Revision',
            revision_date=revision_date,
            priority='high' if row.weak else 'medium',
            status='pending',
            reminder=True,
        )
        db.session.add(plan)
        log_activity(
            user_id,
            'scheduled_revision',
            subject_id=subject_id,
            topic_id=row.topic_id,
            topic_title=row.topic_title,
        )
        created.append(plan)
    db.session.commit()
    return [plan.to_dict() for plan in created]
