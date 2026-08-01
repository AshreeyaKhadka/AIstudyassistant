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

        subjects = Subject.query.filter_by(user_id=user.id).all()

        quiz_sets = QuizSet.query.filter_by(user_id=user.id).order_by(
            QuizSet.created_at.desc()
        ).all()

        revision_plans = RevisionPlan.query.filter_by(user_id=user.id).order_by(
            RevisionPlan.revision_date.asc()
        ).all()

        topic_progress = TopicProgress.query.filter_by(user_id=user.id).all()

        total_quizzes = len(quiz_sets)
        completed_quizzes = sum(1 for qs in quiz_sets if qs.score is not None)
        avg_score = 0.0
        if completed_quizzes:
            avg_score = round(
                sum(qs.score for qs in quiz_sets if qs.score is not None)
                / completed_quizzes
                * 100 / max(1, len(QuizSet.query.get(quiz_sets[0].id).questions_json) if quiz_sets and quiz_sets[0].questions_json else 10),
                1
            )

        total_topics = len(topic_progress)
        covered_topics = sum(1 for t in topic_progress if t.covered)
        weak_topics = sum(1 for t in topic_progress if t.weak)
        practiced_topics = sum(1 for t in topic_progress if t.practiced)

        upload_data = []
        for u in uploads:
            subject_topics = [t for t in topic_progress if t.subject_id == u.subject_id] if u.subject_id else []
            upload_weak = sum(1 for t in subject_topics if t.weak)
            upload_covered = sum(1 for t in subject_topics if t.covered)
            upload_total = len(subject_topics)
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
                    sum(t.mastery_score for t in subject_topics) / upload_total, 1
                ) if upload_total else 0,
            })

        subject_data = []
        for s in subjects:
            s_topics = [t for t in topic_progress if t.subject_id == s.id]
            s_total = len(s_topics)
            s_covered = sum(1 for t in s_topics if t.covered)
            s_weak = sum(1 for t in s_topics if t.weak)
            s_practiced = sum(1 for t in s_topics if t.practiced)
            s_uploads = [u for u in uploads if u.subject_id == s.id]
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
        for qs in quiz_sets[:10]:
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
                'total_subjects': len(subjects),
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
        quiz_sets = QuizSet.query.filter_by(user_id=user.id).filter(
            QuizSet.score.isnot(None)
        ).order_by(QuizSet.created_at.desc()).all()

        if subject_filter:
            quiz_sets = [qs for qs in quiz_sets if (qs.topic or '').lower() == subject_filter.lower()]

        mistakes = []
        topic_errors = {}

        for qs in quiz_sets:
            questions = qs.questions_json if isinstance(qs.questions_json, list) else []
            if not questions or qs.score is None:
                continue

            total = len(questions)
            correct_count = qs.score
            incorrect_count = total - correct_count

            if incorrect_count > 0:
                for q in questions:
                    if isinstance(q, dict):
                        mistakes.append({
                            'quiz_set_id': qs.id,
                            'topic': qs.topic,
                            'upload_id': qs.upload_id,
                            'question': q.get('question', ''),
                            'correct_answer': q.get('correct', ''),
                            'difficulty': q.get('difficulty', 'medium'),
                            'explanation': q.get('explanation', ''),
                            'page_number': q.get('page_number', 0),
                            'created_at': qs.completed_at.isoformat() if qs.completed_at else (qs.created_at.isoformat() if qs.created_at else None),
                        })

                        diff = q.get('difficulty', 'medium')
                        topic_key = qs.topic or 'General'
                        if topic_key not in topic_errors:
                            topic_errors[topic_key] = {'total_errors': 0, 'easy': 0, 'medium': 0, 'hard': 0}
                        topic_errors[topic_key]['total_errors'] += 1
                        if diff in topic_errors[topic_key]:
                            topic_errors[topic_key][diff] += 1

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
        quiz_sets = QuizSet.query.filter_by(user_id=user.id).filter(
            QuizSet.score.isnot(None)
        ).order_by(QuizSet.created_at.desc()).all()

        if subject_filter:
            topic_progress = [t for t in topic_progress if (t.subject or '').lower() == subject_filter.lower()]
            uploads = [u for u in uploads if (u.subject or '').lower() == subject_filter.lower()]
            quiz_sets = [qs for qs in quiz_sets if (qs.topic or '').lower() == subject_filter.lower()]

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
    """Generate a personalized weekly revision plan based on performance."""
    try:
        from datetime import datetime, timedelta

        topic_progress = TopicProgress.query.filter_by(user_id=user.id).all()
        revision_plans = RevisionPlan.query.filter_by(user_id=user.id).all()

        today = datetime.utcnow()
        start_of_week = today - timedelta(days=today.weekday())
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        weak_topics = sorted(
            [t for t in topic_progress if t.weak],
            key=lambda t: t.mastery_score or 0
        )
        needs_revision = sorted(
            [t for t in topic_progress if t.next_revision_at and t.next_revision_at <= today + timedelta(days=7)],
            key=lambda t: t.next_revision_at or today
        )
        uncovered = [t for t in topic_progress if not t.covered]

        weekly_plan = []
        topic_pool = weak_topics + needs_revision + uncovered
        topic_idx = 0

        for day_offset, day_name in enumerate(days):
            day_date = (start_of_week + timedelta(days=day_offset)).strftime('%Y-%m-%d')
            is_weekend = day_offset >= 5

            existing = [
                p for p in revision_plans
                if p.revision_date == day_date and p.status == 'pending'
            ]

            tasks = []
            for p in existing[:3]:
                tasks.append({
                    'title': p.title,
                    'subject': p.subject,
                    'type': 'scheduled',
                    'priority': p.priority,
                })

            if not is_weekend and topic_idx < len(topic_pool):
                t = topic_pool[topic_idx]
                tasks.append({
                    'title': f"Revise: {t.topic_title}",
                    'subject': '',
                    'type': 'recommended',
                    'priority': 'high' if t.weak else 'medium',
                    'mastery': t.mastery_score,
                })
                topic_idx += 1

            if is_weekend and topic_idx < len(topic_pool):
                t = topic_pool[topic_idx]
                tasks.append({
                    'title': f"Deep dive: {t.topic_title}",
                    'subject': '',
                    'type': 'recommended',
                    'priority': 'medium',
                    'mastery': t.mastery_score,
                })
                topic_idx += 1

            weekly_plan.append({
                'day': day_name,
                'date': day_date,
                'is_today': day_date == today.strftime('%Y-%m-%d'),
                'is_weekend': is_weekend,
                'tasks': tasks,
            })

        return jsonify({
            'weekly_plan': weekly_plan,
            'stats': {
                'topics_scheduled': min(topic_idx, len(topic_pool)),
                'total_weak': len(weak_topics),
                'total_needs_revision': len(needs_revision),
                'total_uncovered': len(uncovered),
            },
        }), 200

    except Exception as e:
        logger.error(f"Failed to generate weekly plan: {e}")
        return jsonify({"error": "Failed to generate weekly plan"}), 500
