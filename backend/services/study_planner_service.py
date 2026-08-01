from datetime import datetime, timedelta
import os
import re

from config import db
from models.content import StudentUpload, Subject
from models.exam import Exam
from models.focus import StudySession
from models.progress import TopicProgress
from models.revision import RevisionPlan
from services.progress_service import log_activity, upsert_topic_progress
from services.syllabus_catalog import find_subject, rank_topics


DEFAULT_STUDY_DAYS = [0, 1, 2, 3, 4, 5, 6]
MAX_TOPICS_PER_DOCUMENT = 6
MAX_SELECTED_DOCUMENTS = 20


def planner_preferences(user):
    return {
        'daily_minutes': user.study_daily_minutes or 60,
        'session_minutes': user.study_session_minutes or 25,
        'start_time': user.study_start_time or '18:00',
        'study_days': user.study_days or DEFAULT_STUDY_DAYS,
    }


def update_planner_preferences(user, data):
    daily = int(data.get('daily_minutes', user.study_daily_minutes or 60))
    session = int(data.get('session_minutes', user.study_session_minutes or 25))
    start_time = str(data.get('start_time', user.study_start_time or '18:00'))
    days = data.get('study_days', user.study_days or DEFAULT_STUDY_DAYS)
    if daily < 15 or daily > 480:
        raise ValueError('Daily study time must be between 15 and 480 minutes.')
    if session < 10 or session > 120 or session > daily:
        raise ValueError('Session length must be between 10 minutes and the daily study time.')
    try:
        datetime.strptime(start_time, '%H:%M')
    except ValueError as exc:
        raise ValueError('Start time must use HH:MM format.') from exc
    if not isinstance(days, list) or not days or any(not isinstance(day, int) or day < 0 or day > 6 for day in days):
        raise ValueError('Choose at least one valid study day.')
    user.study_daily_minutes = daily
    user.study_session_minutes = session
    user.study_start_time = start_time
    user.study_days = sorted(set(days))
    db.session.commit()
    return planner_preferences(user)


def _exam_days_by_subject(user_id, today):
    result = {}
    for exam in Exam.query.filter_by(user_id=user_id).all():
        try:
            exam_date = datetime.strptime(exam.exam_date, '%Y-%m-%d').date()
        except (TypeError, ValueError):
            continue
        days = (exam_date - today).days
        if days >= 0:
            result[exam.subject.casefold()] = min(days, result.get(exam.subject.casefold(), days))
    return result


def _candidate_reason(progress, due, exam_days, source_filename):
    reasons = []
    if progress and progress.weak:
        reasons.append('weak topic')
    if due:
        reasons.append('spaced repetition due')
    if progress and not progress.covered:
        reasons.append('syllabus gap')
    if exam_days is not None and exam_days <= 14:
        reasons.append(f'exam in {exam_days} days')
    if source_filename:
        reasons.append(f'from {source_filename}')
    return ', '.join(reasons) or 'continue syllabus coverage'


def _document_heading_topics(upload):
    topics = []
    seen = set()
    heading_pattern = re.compile(
        r'^(?:(?:chapter|unit|module|topic)\s+[\divxlcdm]+\s*[:.\-]?\s*|\d+(?:\.\d+)+\s+)(.+)$',
        re.IGNORECASE,
    )
    for raw_line in (upload.parsed_text or '').splitlines():
        line = re.sub(r'\s+', ' ', raw_line).strip(' -:')
        match = heading_pattern.match(line)
        title = (match.group(1) if match else '').strip()
        if not title or len(title) < 4 or len(title) > 140:
            continue
        normalized = title.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        slug = re.sub(r'[^a-z0-9]+', '-', normalized).strip('-')[:100] or str(len(topics) + 1)
        topics.append({
            'topic_id': f'document:{upload.id}:section:{slug}',
            'topic_title': title,
            'mapping_source': 'document_heading',
        })
        if len(topics) >= MAX_TOPICS_PER_DOCUMENT:
            break
    return topics


def _fallback_upload_topics(upload, subject):
    catalog = find_subject(
        subject_key=subject.catalog_key,
        name=subject.name,
        semester=subject.semester,
    ) if subject else None
    if catalog and upload.parsed_text:
        ranked = [item for item in rank_topics(upload.parsed_text, catalog) if item.get('score', 0) >= 0.5]
        scope_text = f"{upload.filename}\n{upload.parsed_text[:2000]}".casefold()
        scoped_unit_ids = {
            unit['id'] for unit in catalog.get('units') or []
            if len(unit.get('title') or '') >= 8 and unit['title'].casefold() in scope_text
        }
        if scoped_unit_ids:
            scoped = [item for item in ranked if item.get('unit_id') in scoped_unit_ids]
            if scoped:
                ranked = scoped
        if ranked:
            return [{
                'topic_id': item['id'],
                'topic_title': re.sub(r'^\d+(?:\.\d+)*\s*', '', item['title']).split(' - ', 1)[0].strip(),
                'mapping_source': 'official_catalog',
                'match_score': item.get('score', 0),
            } for item in ranked[:MAX_TOPICS_PER_DOCUMENT]]

    headings = _document_heading_topics(upload)
    if headings:
        return headings

    base_name = os.path.splitext(upload.filename or 'study material')[0].replace('_', ' ').strip()
    return [{
        'topic_id': f'document:{upload.id}:review',
        'topic_title': f'Review {base_name[:120]}',
        'mapping_source': 'document_review',
    }]


def _validate_selected_uploads(user, upload_ids):
    if not isinstance(upload_ids, list) or not upload_ids:
        raise ValueError('Choose at least one study document.')
    if len(upload_ids) > MAX_SELECTED_DOCUMENTS:
        raise ValueError(f'Choose no more than {MAX_SELECTED_DOCUMENTS} documents.')
    if any(isinstance(value, bool) or not isinstance(value, int) for value in upload_ids):
        raise ValueError('Document IDs must be integers.')
    if len(set(upload_ids)) != len(upload_ids):
        raise ValueError('Each study document can only be selected once.')

    uploads = StudentUpload.query.filter(
        StudentUpload.user_id == user.id,
        StudentUpload.id.in_(upload_ids),
    ).all()
    by_id = {upload.id: upload for upload in uploads}
    missing = [upload_id for upload_id in upload_ids if upload_id not in by_id]
    if missing:
        raise ValueError(f'Documents are unavailable or do not belong to you: {missing}.')

    ineligible = [
        upload.id for upload in uploads
        if upload.doc_type != 'material'
        or (upload.admission_status or 'admitted') != 'admitted'
        or upload.processing_status != 'ready'
        or upload.validation_status not in {'approved', 'needs_review'}
    ]
    if ineligible:
        raise ValueError(f'Documents are not ready for planning: {sorted(ineligible)}.')
    return [by_id[upload_id] for upload_id in upload_ids]


def _planner_candidates(user, horizon_days, upload_ids):
    now = datetime.utcnow()
    today = now.date()
    subjects = {subject.id: subject for subject in Subject.query.filter_by(user_id=user.id).all()}
    progress_rows = TopicProgress.query.filter_by(user_id=user.id).all()
    progress_by_key = {(row.subject_id, row.topic_id): row for row in progress_rows}
    exams = _exam_days_by_subject(user.id, today)
    selected_uploads = _validate_selected_uploads(user, upload_ids)
    topic_sources = []
    for upload in selected_uploads:
        subject = subjects.get(upload.subject_id)
        if not subject:
            raise ValueError(f'Document {upload.id} is not assigned to a valid subject.')
        matched_topics = (upload.validation_details or {}).get('matched_topics') or []
        topics = [item for item in matched_topics if isinstance(item, dict) and item.get('topic_id')]
        if not topics:
            topics = _fallback_upload_topics(upload, subject)
        for item in topics:
            if not isinstance(item, dict) or not item.get('topic_id'):
                continue
            topic_sources.append((
                upload.subject_id,
                str(item['topic_id']),
                upload,
                item.get('topic_title'),
                item.get('mapping_source') or 'admission',
                item.get('match_score', 1),
            ))

    candidates = []
    horizon = now + timedelta(days=horizon_days)
    for subject_id, topic_id, upload, source_title, mapping_source, match_score in topic_sources:
        subject = subjects.get(subject_id)
        progress = progress_by_key.get((subject_id, topic_id))
        due = bool(progress and progress.next_revision_at and progress.next_revision_at <= horizon)
        exam_days = exams.get(subject.name.casefold())
        weak = bool(progress and progress.weak)
        uncovered = bool(progress and not progress.covered)
        if not any((due, weak, uncovered, not progress)):
            continue
        score = 0
        score += 120 if weak else 0
        score += 100 if due else 0
        score += 55 if uncovered else 0
        score += max(0, 90 - exam_days * 5) if exam_days is not None else 0
        score += max(0, 50 - int(progress.mastery_score or 0) / 2) if progress else 50
        score += float(match_score or 0) * 40
        title = (progress.topic_title if progress else source_title) or 'Matched topic'
        candidates.append({
            'subject_id': subject_id,
            'subject': subject.name,
            'topic_id': topic_id,
            'topic_title': title,
            'upload_id': upload.id,
            'filename': upload.filename,
            'mapping_source': mapping_source,
            'priority_score': score,
            'priority': 'high' if weak or (exam_days is not None and exam_days <= 7) else 'medium',
            'reason': _candidate_reason(progress, due, exam_days, upload.filename),
        })
    return sorted(candidates, key=lambda item: (-item['priority_score'], item['subject'], item['topic_title']))


def _balanced_candidates(candidates):
    by_upload = {}
    for candidate in candidates:
        by_upload.setdefault(candidate['upload_id'], []).append(candidate)

    representatives = sorted(
        (items[0] for items in by_upload.values() if items),
        key=lambda item: (-item['priority_score'], item['subject'], item['topic_title']),
    )
    ordered = []
    seen_topics = set()
    used_ids = set()
    for representative in representatives:
        source_candidates = by_upload[representative['upload_id']]
        candidate = next(
            (item for item in source_candidates if (item['subject_id'], item['topic_id']) not in seen_topics),
            None,
        )
        if candidate:
            ordered.append(candidate)
            seen_topics.add((candidate['subject_id'], candidate['topic_id']))
            used_ids.add(id(candidate))

    for candidate in candidates:
        topic_key = (candidate['subject_id'], candidate['topic_id'])
        if id(candidate) in used_ids or topic_key in seen_topics:
            continue
        ordered.append(candidate)
        seen_topics.add(topic_key)
    return ordered


def _time_after(start_time, minutes):
    value = datetime.strptime(start_time, '%H:%M') + timedelta(minutes=minutes)
    return value.strftime('%H:%M')


def _overlaps(start, end, occupied_start, occupied_end):
    return start < occupied_end and end > occupied_start


def _available_slots(user, preferences, horizon_days, replace):
    today = datetime.utcnow().date()
    end_date = today + timedelta(days=horizon_days - 1)
    occupied = {}
    plans = RevisionPlan.query.filter(
        RevisionPlan.user_id == user.id,
        RevisionPlan.status == 'pending',
        RevisionPlan.revision_date >= today.isoformat(),
        RevisionPlan.revision_date <= end_date.isoformat(),
    ).all()
    for plan in plans:
        if replace and plan.source_type == 'adaptive':
            continue
        if not plan.start_time:
            continue
        end_time = plan.end_time or _time_after(plan.start_time, plan.duration_minutes or 25)
        occupied.setdefault(plan.revision_date, []).append((plan.start_time, end_time))

    for exam in Exam.query.filter(
        Exam.user_id == user.id,
        Exam.exam_date >= today.isoformat(),
        Exam.exam_date <= end_date.isoformat(),
    ).all():
        if exam.start_time:
            occupied.setdefault(exam.exam_date, []).append((exam.start_time, exam.end_time or _time_after(exam.start_time, 60)))
        else:
            occupied.setdefault(exam.exam_date, []).append(('00:00', '23:59'))

    slots = []
    sessions_per_day = max(1, preferences['daily_minutes'] // preferences['session_minutes'])
    for offset in range(horizon_days):
        day = today + timedelta(days=offset)
        if day.weekday() not in preferences['study_days']:
            continue
        date_key = day.isoformat()
        for slot_index in range(sessions_per_day):
            start = _time_after(preferences['start_time'], slot_index * (preferences['session_minutes'] + 5))
            end = _time_after(start, preferences['session_minutes'])
            if any(_overlaps(start, end, busy_start, busy_end) for busy_start, busy_end in occupied.get(date_key, [])):
                continue
            slots.append((date_key, start, end))
    return slots


def _existing_topic_ids(user, today, end_date, replace):
    topic_ids = set()
    for plan in RevisionPlan.query.filter(
        RevisionPlan.user_id == user.id,
        RevisionPlan.status == 'pending',
        RevisionPlan.revision_date >= today.isoformat(),
    ).all():
        if replace and plan.source_type == 'adaptive' and plan.revision_date <= end_date.isoformat():
            continue
        if plan.topic_id:
            topic_ids.add((plan.subject_id, plan.topic_id))
    return topic_ids


def preview_adaptive_plan(user, upload_ids, horizon_days=7):
    horizon_days = min(max(int(horizon_days), 1), 28)
    preferences = planner_preferences(user)
    today = datetime.utcnow().date()
    end_date = today + timedelta(days=horizon_days - 1)
    selected_uploads = _validate_selected_uploads(user, upload_ids)
    all_candidates = _balanced_candidates(_planner_candidates(user, horizon_days, upload_ids))
    existing_adaptive_count = RevisionPlan.query.filter(
        RevisionPlan.user_id == user.id,
        RevisionPlan.source_type == 'adaptive',
        RevisionPlan.status == 'pending',
        RevisionPlan.revision_date >= today.isoformat(),
        RevisionPlan.revision_date <= end_date.isoformat(),
    ).count()

    mode_summary = {}
    for mode, replace in (('replace', True), ('merge', False)):
        existing_topics = _existing_topic_ids(user, today, end_date, replace)
        candidates = [
            item for item in all_candidates
            if (item['subject_id'], item['topic_id']) not in existing_topics
        ]
        slots = _available_slots(user, preferences, horizon_days, replace)
        mode_summary[mode] = {
            'available_slots': len(slots),
            'schedulable_topics': len(candidates),
            'session_count': min(len(candidates), len(slots)),
        }

    candidate_counts = {}
    for candidate in all_candidates:
        candidate_counts[candidate['upload_id']] = candidate_counts.get(candidate['upload_id'], 0) + 1
    return {
        'selected_sources': [{
            'id': upload.id,
            'filename': upload.filename,
            'subject': upload.subject,
            'page_count': upload.page_count,
            'candidate_count': candidate_counts.get(upload.id, 0),
        } for upload in selected_uploads],
        'candidate_count': len(all_candidates),
        'existing_adaptive_count': existing_adaptive_count,
        'modes': mode_summary,
        'horizon_days': horizon_days,
    }


def generate_adaptive_plan(user, upload_ids, horizon_days=7, replace=False):
    horizon_days = min(max(int(horizon_days), 1), 28)
    preview = preview_adaptive_plan(user, upload_ids, horizon_days)
    preferences = planner_preferences(user)
    today = datetime.utcnow().date()
    end_date = today + timedelta(days=horizon_days - 1)
    if replace:
        RevisionPlan.query.filter(
            RevisionPlan.user_id == user.id,
            RevisionPlan.source_type == 'adaptive',
            RevisionPlan.status == 'pending',
            RevisionPlan.revision_date >= today.isoformat(),
            RevisionPlan.revision_date <= end_date.isoformat(),
        ).delete(synchronize_session=False)

    existing_topic_ids = _existing_topic_ids(user, today, end_date, replace)
    all_candidates = _balanced_candidates(_planner_candidates(user, horizon_days, upload_ids))
    candidates = [
        item for item in all_candidates
        if (item['subject_id'], item['topic_id']) not in existing_topic_ids
    ]
    slots = _available_slots(user, preferences, horizon_days, replace)

    created = []
    for candidate, (date, start, end) in zip(candidates, slots):
        plan = RevisionPlan(
            user_id=user.id,
            subject_id=candidate['subject_id'],
            upload_id=candidate['upload_id'],
            topic_id=candidate['topic_id'],
            topic_title=candidate['topic_title'],
            title=f"Revise: {candidate['topic_title'][:180]}",
            description='Adaptive session generated from current learning progress.',
            subject=candidate['subject'],
            event_type='Study Session',
            revision_date=date,
            start_time=start,
            end_time=end,
            reminder=True,
            priority=candidate['priority'],
            status='pending',
            source_type='adaptive',
            scheduling_reason=candidate['reason'],
            duration_minutes=preferences['session_minutes'],
        )
        db.session.add(plan)
        created.append(plan)
        log_activity(
            user.id, 'scheduled_revision', subject_id=candidate['subject_id'],
            upload_id=candidate['upload_id'], topic_id=candidate['topic_id'], topic_title=candidate['topic_title'],
            metadata={'reason': candidate['reason'], 'date': date},
        )
    db.session.commit()
    if created:
        status = 'scheduled'
    elif not all_candidates:
        status = 'no_topics'
    elif not slots:
        status = 'no_available_days'
    else:
        status = 'already_scheduled'
    return {
        'plans': [plan.to_dict() for plan in created],
        'count': len(created),
        'candidate_count': len(all_candidates),
        'slot_count': len(slots),
        'status': status,
        'selected_sources': preview['selected_sources'],
    }


def complete_plan(user, plan):
    plan.status = 'completed'
    plan.completed_at = datetime.utcnow()
    plan.updated_at = datetime.utcnow()
    if plan.topic_id and plan.subject_id:
        progress = TopicProgress.query.filter_by(
            user_id=user.id, subject_id=plan.subject_id, topic_id=plan.topic_id,
        ).first()
        if not progress:
            progress = upsert_topic_progress(
                user.id, plan.subject_id, plan.topic_id, plan.topic_title or plan.title,
                covered=True, mastery_score=50,
            )
        progress.reviewed = True
        progress.last_practiced_at = datetime.utcnow()
        progress.next_revision_at = datetime.utcnow() + timedelta(days=3 if progress.weak else 7)
    db.session.add(StudySession(
        user_id=user.id,
        subject=plan.subject or 'General',
        topic=plan.topic_title or plan.title,
        duration_minutes=plan.duration_minutes or 25,
        completed=True,
        notes=f'Completed from planner #{plan.id}',
    ))
    log_activity(
        user.id, 'completed_revision', subject_id=plan.subject_id, upload_id=plan.upload_id,
        topic_id=plan.topic_id, topic_title=plan.topic_title,
    )
    db.session.commit()
    return plan.to_dict()


def skip_plan(user, plan):
    preferences = planner_preferences(user)
    current = datetime.strptime(plan.revision_date, '%Y-%m-%d').date()
    for offset in range(1, 15):
        candidate = current + timedelta(days=offset)
        if candidate.weekday() in preferences['study_days']:
            plan.revision_date = candidate.isoformat()
            break
    plan.reschedule_count = (plan.reschedule_count or 0) + 1
    plan.scheduling_reason = f"Rescheduled after skip. {plan.scheduling_reason or ''}".strip()
    plan.updated_at = datetime.utcnow()
    db.session.commit()
    return plan.to_dict()
