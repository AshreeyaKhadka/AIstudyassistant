from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from services.generation_service import generate_blueprint_sheet, _call_gemini, _parse_json_response
from services.rag_service import get_full_context
from config import db
from models.content import StudentUpload, Subject
from models.quiz import QuizSet
from models.progress import TopicProgress, ActivityLog
from models.revision import RevisionPlan
import logging
import json

progress_bp = Blueprint('progress', __name__)
logger = logging.getLogger(__name__)


@progress_bp.route('/overview', methods=['GET'])
@login_required
def get_overview(user):
    """Return aggregated progress data for the dashboard."""
    try:
        uploads = StudentUpload.query.filter_by(
            user_id=user.id, doc_type='material'
        ).order_by(StudentUpload.created_at.desc()).all()
        uploads = [upload for upload in uploads if (upload.admission_status or 'admitted') == 'admitted']

        subjects = Subject.query.filter_by(user_id=user.id).all()

        quiz_sets = QuizSet.query.filter_by(user_id=user.id).order_by(
            QuizSet.created_at.desc()
        ).all()

        revision_plans = RevisionPlan.query.filter_by(user_id=user.id).order_by(
            RevisionPlan.revision_date.asc()
        ).all()

        topic_progress = TopicProgress.query.filter_by(user_id=user.id).all()

        completed_assessments = [
            quiz for quiz in quiz_sets
            if quiz.score is not None and (quiz.assessment_type or 'mcq') == 'mcq'
        ]
        attempted_questions = sum(
            len(quiz.questions_json) if isinstance(quiz.questions_json, list) else 0
            for quiz in completed_assessments
        )
        correct_answers = sum(float(quiz.score or 0) for quiz in completed_assessments)
        completed_quizzes = len(completed_assessments)
        avg_score = round(correct_answers * 100 / attempted_questions, 1) if attempted_questions else 0.0

        upload_data = []
        tracked_topic_keys = set()
        for u in uploads:
            matched_topics = (u.validation_details or {}).get('matched_topics') or []
            matched_topics = [item for item in matched_topics if isinstance(item, dict) and item.get('topic_id')]
            seen_topic_ids = set()
            unique_matched_topics = []
            for item in matched_topics:
                if item['topic_id'] in seen_topic_ids:
                    continue
                seen_topic_ids.add(item['topic_id'])
                unique_matched_topics.append(item)
            matched_topics = unique_matched_topics
            tracked_topic_keys.update((u.subject_id, item['topic_id']) for item in matched_topics)
            progress_by_topic = {
                topic.topic_id: topic for topic in topic_progress
                if topic.subject_id == u.subject_id
            }
            upload_progress = [progress_by_topic[item['topic_id']] for item in matched_topics if item['topic_id'] in progress_by_topic]
            upload_weak = sum(1 for topic in upload_progress if topic.weak)
            upload_covered = sum(1 for topic in upload_progress if topic.covered)
            upload_total = len(matched_topics)
            upload_data.append({
                'id': u.id,
                'filename': u.filename,
                'subject': u.subject,
                'subject_id': u.subject_id,
                'validation_status': u.validation_status or 'pending',
                'embedding_status': u.embedding_status or 'pending',
                'created_at': u.created_at.isoformat() if u.created_at else None,
                'topic_count': upload_total,
                'covered_count': upload_covered,
                'weak_count': upload_weak,
                'coverage_percent': round((upload_covered / upload_total) * 100) if upload_total else 0,
                'mastery_score': round(
                    sum(topic.mastery_score for topic in upload_progress) / len(upload_progress), 1
                ) if upload_progress else 0,
                'topics': matched_topics,
                'admission_status': u.admission_status,
                'warning': u.validation_error if u.validation_status == 'needs_review' else None,
            })

        tracked_progress = [
            topic for topic in topic_progress
            if (topic.subject_id, topic.topic_id) in tracked_topic_keys
        ]
        total_topics = len(tracked_topic_keys)
        covered_topics = sum(1 for topic in tracked_progress if topic.covered)
        weak_topics = sum(1 for topic in tracked_progress if topic.weak)
        practiced_topics = sum(1 for topic in tracked_progress if topic.practiced)

        subject_data = []
        for s in subjects:
            s_uploads = [u for u in uploads if u.subject_id == s.id]
            if not s_uploads:
                continue
            s_topics = [t for t in topic_progress if t.subject_id == s.id]
            s_total = len(s_topics)
            s_covered = sum(1 for t in s_topics if t.covered)
            s_weak = sum(1 for t in s_topics if t.weak)
            s_practiced = sum(1 for t in s_topics if t.practiced)
            subject_data.append({
                'id': s.id,
                'name': s.name,
                'code': s.code,
                'semester': s.semester,
                'total_topics': s_total,
                'covered_topics': s_covered,
                'weak_topics': s_weak,
                'practiced_topics': s_practiced,
                'coverage_percent': round((s_covered / s_total) * 100) if s_total else 0,
                'average_mastery': round(sum(t.mastery_score for t in s_topics) / s_total, 1) if s_total else 0,
                'upload_count': len(s_uploads),
            })

        recent_quizzes = []
        for qs in completed_assessments[:10]:
            q_total = len(qs.questions_json) if isinstance(qs.questions_json, list) else 0
            recent_quizzes.append({
                'id': qs.id,
                'topic': qs.topic,
                'upload_id': qs.upload_id,
                'score': qs.score,
                'total': q_total,
                'percentage': round((qs.score / q_total) * 100) if q_total and qs.score is not None else None,
                'completed_at': qs.completed_at.isoformat() if qs.completed_at else None,
                'created_at': qs.created_at.isoformat() if qs.created_at else None,
            })

        upcoming_revision = []
        from datetime import datetime
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        for plan in revision_plans:
            if plan.revision_date >= today_str and plan.status == 'pending':
                upcoming_revision.append({
                    'id': plan.id,
                    'title': plan.title,
                    'subject': plan.subject,
                    'revision_date': plan.revision_date,
                    'priority': plan.priority,
                    'status': plan.status,
                })
            if len(upcoming_revision) >= 14:
                break

        return jsonify({
            'uploads': upload_data,
            'subjects': subject_data,
            'stats': {
                'total_uploads': len(uploads),
                'total_subjects': len(subject_data),
                'total_quizzes_taken': completed_quizzes,
                'average_score': avg_score,
                'total_topics': total_topics,
                'covered_topics': covered_topics,
                'weak_topics': weak_topics,
                'practiced_topics': practiced_topics,
                'coverage_percent': round((covered_topics / total_topics) * 100) if total_topics else 0,
            },
            'recent_quizzes': recent_quizzes,
            'upcoming_revision': upcoming_revision,
        }), 200

    except Exception as e:
        logger.error(f"Failed to fetch progress overview: {e}")
        return jsonify({"error": "Failed to fetch progress overview"}), 500


@progress_bp.route('/summary/<int:upload_id>', methods=['GET'])
@login_required
def get_pdf_summary(user, upload_id):
    """Generate an AI summary for a specific uploaded PDF."""
    try:
        upload = StudentUpload.query.get(upload_id)
        if not upload:
            return jsonify({"error": "Document not found"}), 404
        if upload.user_id != user.id:
            return jsonify({"error": "Unauthorized"}), 403

        context = get_full_context(upload.id, max_chunks=100)
        if not context:
            return jsonify({"error": "No content available for summary"}), 400

        truncated = context[:40000]
        prompt = f"""You are an expert academic tutor. Based on the following study material, provide a concise but comprehensive summary.

The context is labeled with [Page N] markers. Reference these page numbers when summarizing.

STUDY MATERIAL:
{truncated}

OUTPUT FORMAT (strict JSON):
{{
  "title": "Brief title for this material",
  "summary": "A 3-5 sentence overview of the key content",
  "paragraphs": [
    {{"text": "First paragraph of the summary...", "page_number": 1}},
    {{"text": "Second paragraph covering the next section...", "page_number": 3}},
    {{"text": "Third paragraph for another key area...", "page_number": 5}}
  ],
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4", "takeaway 5"],
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_study_hours": 2,
  "prerequisites": ["prerequisite concept 1", "prerequisite concept 2"]
}}

IMPORTANT: The "paragraphs" array should contain 3-5 paragraphs, each with a "page_number" indicating which page that content primarily comes from. If a paragraph covers multiple pages, use the first relevant page.

Return ONLY valid JSON."""

        raw = _call_gemini(prompt, temperature=0.3)
        parsed = _parse_json_response(raw)

        return jsonify({
            'upload_id': upload.id,
            'filename': upload.filename,
            'subject': upload.subject,
            'summary': parsed.get('summary', ''),
            'paragraphs': parsed.get('paragraphs', []),
            'key_takeaways': parsed.get('key_takeaways', []),
            'difficulty_level': parsed.get('difficulty_level', 'intermediate'),
            'estimated_study_hours': parsed.get('estimated_study_hours', 2),
            'prerequisites': parsed.get('prerequisites', []),
        }), 200

    except Exception as e:
        logger.error(f"Failed to generate summary for upload {upload_id}: {e}")
        return jsonify({"error": "Failed to generate summary"}), 500


@progress_bp.route('/mistakes', methods=['GET'])
@login_required
def get_mistake_ledger(user):
    """Return MCQ mistake ledger with analysis of incorrect answers."""
    try:
        subject_filter = request.args.get('subject', '').strip()
        quiz_sets = QuizSet.query.filter_by(user_id=user.id, assessment_type='mcq').filter(
            QuizSet.score.isnot(None)
        ).order_by(QuizSet.created_at.desc()).all()

        subjects = {subject.id: subject for subject in Subject.query.filter_by(user_id=user.id).all()}

        if subject_filter:
            quiz_sets = [
                quiz for quiz in quiz_sets
                if (
                    (subjects.get(quiz.subject_id).name if subjects.get(quiz.subject_id) else quiz.topic or '')
                    .casefold() == subject_filter.casefold()
                )
            ]

        mistakes = []
        topic_errors = {}

        for qs in quiz_sets:
            questions = qs.questions_json if isinstance(qs.questions_json, list) else []
            if not questions or qs.score is None:
                continue

            results = (qs.attempt_json or {}).get('results') if isinstance(qs.attempt_json, dict) else []
            for result in results or []:
                if not isinstance(result, dict) or result.get('is_correct'):
                    continue
                index = result.get('index')
                if not isinstance(index, int) or index < 0 or index >= len(questions):
                    continue
                question = questions[index]
                if not isinstance(question, dict):
                    continue
                topic_title = result.get('topic_title') or question.get('topic_title') or qs.topic or 'General'
                mistakes.append({
                    'quiz_set_id': qs.id,
                    'question_index': index,
                    'topic': topic_title,
                    'upload_id': qs.upload_id,
                    'question': question.get('question', ''),
                    'selected_answer': result.get('selected'),
                    'correct_answer': result.get('correct') or question.get('correct', ''),
                    'difficulty': question.get('difficulty', 'medium'),
                    'explanation': question.get('explanation', ''),
                    'page_number': question.get('page_number', 0),
                    'created_at': qs.completed_at.isoformat() if qs.completed_at else (qs.created_at.isoformat() if qs.created_at else None),
                })

                difficulty = question.get('difficulty', 'medium')
                topic_errors.setdefault(topic_title, {'total_errors': 0, 'easy': 0, 'medium': 0, 'hard': 0})
                topic_errors[topic_title]['total_errors'] += 1
                if difficulty in topic_errors[topic_title]:
                    topic_errors[topic_title][difficulty] += 1

        total_attempted = sum(
            len(qs.questions_json) if isinstance(qs.questions_json, list) else 0
            for qs in quiz_sets
        )
        total_correct = sum(qs.score for qs in quiz_sets if qs.score is not None)
        total_incorrect = total_attempted - total_correct

        weak_areas = sorted(topic_errors.items(), key=lambda x: x[1]['total_errors'], reverse=True)

        return jsonify({
            'total_mistakes': len(mistakes),
            'total_attempted': total_attempted,
            'total_correct': total_correct,
            'total_incorrect': total_incorrect,
            'accuracy_percent': round((total_correct / total_attempted) * 100, 1) if total_attempted else 0,
            'recent_mistakes': mistakes[:30],
            'weak_areas': [
                {'topic': topic, **data} for topic, data in weak_areas[:10]
            ],
        }), 200

    except Exception as e:
        logger.error(f"Failed to fetch mistake ledger: {e}")
        return jsonify({"error": "Failed to fetch mistake ledger"}), 500


@progress_bp.route('/recommendations', methods=['GET'])
@login_required
def get_study_recommendations(user):
    """Return AI-powered study coaching based on current progress."""
    try:
        subject_filter = request.args.get('subject', '').strip()

        topic_progress = TopicProgress.query.filter_by(user_id=user.id).all()
        uploads = StudentUpload.query.filter_by(
            user_id=user.id, doc_type='material'
        ).all()
        quiz_sets = QuizSet.query.filter_by(user_id=user.id, assessment_type='mcq').filter(
            QuizSet.score.isnot(None)
        ).order_by(QuizSet.created_at.desc()).all()

        subjects = {subject.id: subject for subject in Subject.query.filter_by(user_id=user.id).all()}

        if subject_filter:
            subject_ids = {
                subject.id for subject in subjects.values()
                if subject.name.casefold() == subject_filter.casefold()
            }
            topic_progress = [topic for topic in topic_progress if topic.subject_id in subject_ids]
            uploads = [u for u in uploads if (u.subject or '').lower() == subject_filter.lower()]
            quiz_sets = [quiz for quiz in quiz_sets if quiz.subject_id in subject_ids]

        weak_topics = [t for t in topic_progress if t.weak]
        covered = [t for t in topic_progress if t.covered]
        practiced = [t for t in topic_progress if t.practiced]
        uncovered = [t for t in topic_progress if not t.covered]
        needs_revision = [t for t in topic_progress if t.next_revision_at]

        from datetime import datetime
        overdue = [t for t in needs_revision if t.next_revision_at and t.next_revision_at <= datetime.utcnow()]

        # Calculate performance metrics
        total_attempted = sum(
            len(qs.questions_json) if isinstance(qs.questions_json, list) else 0
            for qs in quiz_sets
        )
        total_correct = sum(qs.score for qs in quiz_sets if qs.score is not None)
        accuracy = round((total_correct / total_attempted) * 100, 1) if total_attempted else 0

        # Difficulty breakdown
        difficulty_stats = {'easy': 0, 'medium': 0, 'hard': 0}
        for qs in quiz_sets:
            questions = qs.questions_json if isinstance(qs.questions_json, list) else []
            for q in questions:
                if isinstance(q, dict):
                    diff = q.get('difficulty', 'medium')
                    if diff in difficulty_stats:
                        difficulty_stats[diff] += 1

        # Subject performance
        subject_perf = {}
        for qs in quiz_sets:
            topic = qs.topic or 'General'
            if topic not in subject_perf:
                subject_perf[topic] = {'total': 0, 'correct': 0, 'count': 0}
            q_count = len(qs.questions_json) if isinstance(qs.questions_json, list) else 0
            subject_perf[topic]['total'] += q_count
            subject_perf[topic]['correct'] += qs.score or 0
            subject_perf[topic]['count'] += 1

        # Build context for AI coaching
        progress_summary = f"""
Student Progress Report:
- Total materials uploaded: {len(uploads)}
- Topics covered: {len(covered)}/{len(topic_progress)} ({round(len(covered)/max(len(topic_progress),1)*100)}%)
- Topics practiced: {len(practiced)}
- Weak topics: {len(weak_topics)}
- Uncovered topics: {len(uncovered)}
- Overdue revisions: {len(overdue)}
- Quizzes taken: {len(quiz_sets)}
- Overall accuracy: {accuracy}%
- Total questions attempted: {total_attempted}

Weak topics: {', '.join(t.topic_title for t in weak_topics[:8]) or 'None'}
Uncovered topics: {', '.join(t.topic_title for t in uncovered[:8]) or 'None'}
Overdue revisions: {', '.join(t.topic_title for t in overdue[:5]) or 'None'}

Difficulty distribution: Easy={difficulty_stats['easy']}, Medium={difficulty_stats['medium']}, Hard={difficulty_stats['hard']}

Subject performance:
"""
        for subj, perf in list(subject_perf.items())[:5]:
            subj_acc = round(perf['correct'] / max(perf['total'], 1) * 100, 1)
            progress_summary += f"- {subj}: {subj_acc}% accuracy ({perf['count']} quizzes)\n"

        # Get AI coaching
        coaching = _generate_ai_coaching(progress_summary)

        # Build recommendations list
        recommendations = []

        if overdue:
            recommendations.append({
                'type': 'urgent',
                'title': 'Spaced Repetition Overdue',
                'description': f'{len(overdue)} topics are past their scheduled revision date.',
                'action': 'Review these topics now to maintain retention.',
                'topics': [t.topic_title for t in overdue[:5]],
            })

        if weak_topics:
            recommendations.append({
                'type': 'weak_spot',
                'title': 'Weak Areas Detected',
                'description': f'{len(weak_topics)} topics have low mastery scores.',
                'action': 'Focus practice on these areas before your exam.',
                'topics': [t.topic_title for t in weak_topics[:5]],
            })

        if uncovered:
            recommendations.append({
                'type': 'uncovered',
                'title': 'Uncovered Syllabus Topics',
                'description': f'{len(uncovered)} syllabus topics have not been studied yet.',
                'action': 'Upload relevant materials or use AI chat to explore these topics.',
                'topics': [t.topic_title for t in uncovered[:5]],
            })

        if not recommendations:
            recommendations.append({
                'type': 'on_track',
                'title': 'Great Progress!',
                'description': 'You are covering your syllabus well. Keep it up!',
                'action': 'Try generating a mock test to challenge yourself.',
                'topics': [],
            })

        return jsonify({
            'recommendations': recommendations,
            'coaching': coaching,
            'stats': {
                'weak_count': len(weak_topics),
                'uncovered_count': len(uncovered),
                'overdue_count': len(overdue),
                'accuracy': accuracy,
                'total_quizzes': len(quiz_sets),
                'topics_covered': len(covered),
                'total_topics': len(topic_progress),
            },
            'performance': {
                'accuracy': accuracy,
                'difficulty_breakdown': difficulty_stats,
                'subject_performance': {
                    k: {
                        'accuracy': round(v['correct'] / max(v['total'], 1) * 100, 1),
                        'quizzes': v['count'],
                        'questions': v['total'],
                    }
                    for k, v in subject_perf.items()
                },
            },
        }), 200

    except Exception as e:
        logger.error(f"Failed to fetch recommendations: {e}")
        return jsonify({"error": "Failed to fetch recommendations"}), 500


def _generate_ai_coaching(progress_summary: str) -> dict:
    """Generate personalized AI coaching using Gemini."""
    try:
        from services.generation_service import _call_gemini, _parse_json_response

        prompt = f"""You are an expert academic coach and study strategist. Based on the following student progress data, provide personalized coaching advice.

{progress_summary}

Generate actionable, specific coaching advice. Be direct and practical.

OUTPUT FORMAT (strict JSON):
{{
  "coaching_summary": "A 2-3 sentence personalized coaching message addressing this student directly",
  "study_strategy": {{
    "title": "Recommended Study Strategy",
    "steps": [
      "Step 1: specific actionable advice",
      "Step 2: specific actionable advice",
      "Step 3: specific actionable advice"
    ]
  }},
  "time_management": {{
    "title": "Time Management Tips",
    "tips": [
      "Tip 1 with specific time recommendations",
      "Tip 2",
      "Tip 3"
    ]
  }},
  "focus_areas": [
    {{"topic": "topic name", "priority": "high|medium|low", "reason": "why this needs focus", "suggested_action": "what to do about it"}}
  ],
  "study_techniques": [
    {{"name": "technique name", "description": "how to apply it", "best_for": "what situation"}}
  ],
  "daily_goal": "A specific, measurable daily study goal for this student",
  "motivation": "A personalized motivational message based on their current progress"
}}

Be specific to THIS student's data. Reference their actual weak topics, accuracy, and progress. Return ONLY valid JSON."""

        raw = _call_gemini(prompt, temperature=0.4)
        parsed = _parse_json_response(raw)
        return parsed

    except Exception as e:
        logger.error(f"AI coaching generation failed: {e}")
        return {
            'coaching_summary': 'Review your weak areas and maintain consistent practice.',
            'study_strategy': {
                'title': 'Recommended Study Strategy',
                'steps': [
                    'Start with topics you find most difficult',
                    'Use active recall by testing yourself regularly',
                    'Review and revise using spaced repetition'
                ]
            },
            'time_management': {
                'title': 'Time Management Tips',
                'tips': [
                    'Study in 25-minute Pomodoro sessions',
                    'Take 5-minute breaks between sessions',
                    'Review before sleep for better retention'
                ]
            },
            'focus_areas': [],
            'study_techniques': [],
            'daily_goal': 'Complete at least one study session and one quiz today.',
            'motivation': 'Every step forward counts. Keep going!'
        }


@progress_bp.route('/weekly-plan', methods=['GET'])
@login_required
def get_weekly_plan(user):
    """Return the same rolling seven-day schedule shown by Study Planner."""
    try:
        from datetime import datetime, timedelta

        topic_progress = TopicProgress.query.filter_by(user_id=user.id).all()
        today = datetime.utcnow().date()
        end_date = today + timedelta(days=6)
        revision_plans = RevisionPlan.query.filter(
            RevisionPlan.user_id == user.id,
            RevisionPlan.status == 'pending',
            RevisionPlan.revision_date >= today.isoformat(),
            RevisionPlan.revision_date <= end_date.isoformat(),
        ).order_by(RevisionPlan.revision_date.asc(), RevisionPlan.start_time.asc()).all()
        uploads = {
            upload.id: upload for upload in StudentUpload.query.filter(
                StudentUpload.user_id == user.id,
                StudentUpload.id.in_({plan.upload_id for plan in revision_plans if plan.upload_id}),
            ).all()
        } if any(plan.upload_id for plan in revision_plans) else {}
        progress_by_topic = {
            (topic.subject_id, topic.topic_id): topic for topic in topic_progress
        }
        weekly_plan = []
        for day_offset in range(7):
            day = today + timedelta(days=day_offset)
            day_date = day.isoformat()
            tasks = []
            for plan in (item for item in revision_plans if item.revision_date == day_date):
                upload = uploads.get(plan.upload_id)
                progress = progress_by_topic.get((plan.subject_id, plan.topic_id))
                tasks.append({
                    'plan_id': plan.id,
                    'title': plan.title,
                    'subject': plan.subject,
                    'type': 'scheduled',
                    'priority': plan.priority,
                    'topic_id': plan.topic_id,
                    'topic_title': plan.topic_title,
                    'upload_id': plan.upload_id,
                    'filename': upload.filename if upload else None,
                    'source_type': plan.source_type,
                    'reason': plan.scheduling_reason,
                    'start_time': plan.start_time,
                    'end_time': plan.end_time,
                    'duration_minutes': plan.duration_minutes,
                    'mastery': progress.mastery_score if progress else None,
                    'warning': bool(upload and upload.validation_status == 'needs_review'),
                })
            weekly_plan.append({
                'day': day.strftime('%A'),
                'date': day_date,
                'is_today': day_offset == 0,
                'is_weekend': day.weekday() >= 5,
                'tasks': tasks,
            })

        scheduled_topic_keys = {
            (plan.subject_id, plan.topic_id) for plan in revision_plans if plan.topic_id
        }
        now = datetime.utcnow()
        return jsonify({
            'weekly_plan': weekly_plan,
            'stats': {
                'topics_scheduled': len(revision_plans),
                'total_weak': sum(1 for topic in topic_progress if topic.weak),
                'total_needs_revision': sum(
                    1 for topic in topic_progress
                    if topic.next_revision_at and topic.next_revision_at <= now
                    and (topic.subject_id, topic.topic_id) not in scheduled_topic_keys
                ),
                'total_uncovered': sum(1 for topic in topic_progress if not topic.covered),
            },
            'source': 'study_planner',
            'horizon': {'start': today.isoformat(), 'end': end_date.isoformat()},
        }), 200

    except Exception as e:
        logger.error(f"Failed to generate weekly plan: {e}")
        return jsonify({"error": "Failed to generate weekly plan"}), 500
