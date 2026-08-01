from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from services.progress_service import create_revision_tasks_from_progress
from config import db
from models.revision import RevisionPlan
import logging
from datetime import datetime
from services.study_planner_service import (
    complete_plan,
    generate_adaptive_plan,
    planner_preferences,
    preview_adaptive_plan,
    skip_plan,
    update_planner_preferences,
)

revision_bp = Blueprint('revision', __name__)
logger = logging.getLogger(__name__)


@revision_bp.route('/preferences', methods=['GET', 'PUT'])
@login_required
def preferences(user):
    if request.method == 'GET':
        return jsonify(planner_preferences(user)), 200
    try:
        return jsonify(update_planner_preferences(user, request.get_json(silent=True) or {})), 200
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400


@revision_bp.route('/generate/preview', methods=['POST'])
@login_required
def preview_plan(user):
    data = request.get_json(silent=True) or {}
    try:
        return jsonify(preview_adaptive_plan(
            user,
            data.get('upload_ids'),
            data.get('horizon_days', 7),
        )), 200
    except (TypeError, ValueError) as exc:
        return jsonify({'error': str(exc)}), 400


@revision_bp.route('/generate', methods=['POST'])
@login_required
def generate_plan(user):
    data = request.get_json(silent=True) or {}
    try:
        result = generate_adaptive_plan(
            user,
            data.get('upload_ids'),
            data.get('horizon_days', 7),
            bool(data.get('replace', False)),
        )
        return jsonify({'created': result['plans'], **{key: value for key, value in result.items() if key != 'plans'}}), 201
    except (TypeError, ValueError) as exc:
        db.session.rollback()
        return jsonify({'error': str(exc)}), 400


@revision_bp.route('/<int:id>/action', methods=['POST'])
@login_required
def plan_action(user, id):
    plan = RevisionPlan.query.get(id)
    if not plan or plan.user_id != user.id:
        return jsonify({'error': 'Revision plan not found'}), 404
    action = str((request.get_json(silent=True) or {}).get('action') or '').lower()
    if action == 'complete':
        return jsonify(complete_plan(user, plan)), 200
    if action == 'skip':
        return jsonify(skip_plan(user, plan)), 200
    return jsonify({'error': 'action must be complete or skip'}), 400


@revision_bp.route('/auto/<int:subject_id>', methods=['POST'])
@login_required
def auto_revision_from_progress(user, subject_id):
    data = request.json or {}
    limit = min(max(int(data.get('limit', 5)), 1), 10)
    try:
        plans = create_revision_tasks_from_progress(user.id, subject_id, limit=limit)
        if plans is None:
            return jsonify({"error": "Subject not found"}), 404
        return jsonify({"created": plans, "count": len(plans)}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to auto-create revision plans: {e}")
        return jsonify({"error": "Failed to create revision plan from progress"}), 500

# B. Get User Revision Plans
# GET /revision-plans
@revision_bp.route('', methods=['GET'])
@login_required
def get_revision_plans(user):
    try:
        plans = RevisionPlan.query.filter_by(user_id=user.id).order_by(RevisionPlan.revision_date.asc(), RevisionPlan.start_time.asc()).all()
        return jsonify([p.to_dict() for p in plans]), 200
    except Exception as e:
        logger.error(f"Failed to fetch revision plans: {e}")
        return jsonify({"error": "Failed to fetch revision plans"}), 500

# A. Create Revision Plan
# POST /revision-plans
@revision_bp.route('', methods=['POST'])
@login_required
def create_revision_plan(user):
    data = request.json or {}
    title = data.get('title')
    revision_date = data.get('revision_date')
    
    # Validation
    if not title or not revision_date:
        return jsonify({"error": "Title and revision date are required"}), 400
        
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    description = data.get('description', '')
    subject = data.get('subject', 'General')
    event_type = data.get('event_type', 'Study Session')
    priority = data.get('priority', 'medium')
    status = data.get('status', 'pending')
    reminder = bool(data.get('reminder', False))
    
    # Priority & Status limits
    if priority not in ['low', 'medium', 'high']:
        priority = 'medium'
    if status not in ['pending', 'completed']:
        status = 'pending'

    plan = RevisionPlan(
        user_id=user.id,
        title=title,
        description=description,
        subject=subject,
        event_type=event_type,
        revision_date=revision_date,
        start_time=start_time,
        end_time=end_time,
        reminder=reminder,
        priority=priority,
        status=status,
        source_type='manual',
        duration_minutes=25,
    )
    
    try:
        db.session.add(plan)
        db.session.commit()
        return jsonify(plan.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create revision plan: {e}")
        return jsonify({"error": "Failed to create revision plan"}), 500

# C. Update Revision Plan
# PUT /revision-plans/<int:id>
@revision_bp.route('/<int:id>', methods=['PUT'])
@login_required
def update_revision_plan(user, id):
    plan = RevisionPlan.query.get(id)
    if not plan:
        return jsonify({"error": "Revision plan not found"}), 404
        
    # Authorization Check
    if plan.user_id != user.id:
        return jsonify({"error": "Forbidden: You do not own this revision plan"}), 403
        
    data = request.json or {}
    
    title = data.get('title')
    revision_date = data.get('revision_date')
    
    if title is not None:
        if not title:
            return jsonify({"error": "Title cannot be empty"}), 400
        plan.title = title
        
    if revision_date is not None:
        if not revision_date:
            return jsonify({"error": "Revision date cannot be empty"}), 400
        plan.revision_date = revision_date

    if 'description' in data:
        plan.description = data['description']
    if 'subject' in data:
        plan.subject = data['subject']
    if 'event_type' in data:
        plan.event_type = data['event_type'] or 'Study Session'
    if 'start_time' in data:
        plan.start_time = data['start_time']
    if 'end_time' in data:
        plan.end_time = data['end_time']
    if 'reminder' in data:
        plan.reminder = bool(data['reminder'])
    if 'priority' in data:
        priority = data['priority']
        if priority in ['low', 'medium', 'high']:
            plan.priority = priority
    if 'status' in data:
        status = data['status']
        if status in ['pending', 'completed']:
            plan.status = status

    plan.updated_at = datetime.utcnow()

    try:
        db.session.commit()
        return jsonify(plan.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to update revision plan {id}: {e}")
        return jsonify({"error": "Failed to update revision plan"}), 500

# D. Delete Revision Plan
# DELETE /revision-plans/<int:id>
@revision_bp.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_revision_plan(user, id):
    plan = RevisionPlan.query.get(id)
    if not plan:
        return jsonify({"error": "Revision plan not found"}), 404
        
    # Authorization Check
    if plan.user_id != user.id:
        return jsonify({"error": "Forbidden: You do not own this revision plan"}), 403
        
    try:
        db.session.delete(plan)
        db.session.commit()
        return jsonify({"message": "Revision plan deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete revision plan {id}: {e}")
        return jsonify({"error": "Failed to delete revision plan"}), 500

# E. Mark Revision Completed
# PATCH /revision-plans/<int:id>/status
@revision_bp.route('/<int:id>/status', methods=['PATCH'])
@login_required
def patch_revision_status(user, id):
    plan = RevisionPlan.query.get(id)
    if not plan:
        return jsonify({"error": "Revision plan not found"}), 404
        
    # Authorization Check
    if plan.user_id != user.id:
        return jsonify({"error": "Forbidden: You do not own this revision plan"}), 403
        
    data = request.json or {}
    status = data.get('status')
    
    if not status or status not in ['pending', 'completed']:
        return jsonify({"error": "Invalid status value"}), 400
        
    if status == 'completed':
        return jsonify(complete_plan(user, plan)), 200
    plan.status = status
    plan.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify(plan.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to patch revision plan {id} status: {e}")
        return jsonify({"error": "Failed to update status"}), 500
