from flask import Blueprint, request, jsonify
from services.auth_service import login_required
from config import db
from models.revision import RevisionPlan
import logging
from datetime import datetime

revision_bp = Blueprint('revision', __name__)
logger = logging.getLogger(__name__)

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
    priority = data.get('priority', 'medium')
    status = data.get('status', 'pending')
    
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
        revision_date=revision_date,
        start_time=start_time,
        end_time=end_time,
        priority=priority,
        status=status
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
    if 'start_time' in data:
        plan.start_time = data['start_time']
    if 'end_time' in data:
        plan.end_time = data['end_time']
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
        
    plan.status = status
    plan.updated_at = datetime.utcnow()
    
    try:
        db.session.commit()
        return jsonify(plan.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to patch revision plan {id} status: {e}")
        return jsonify({"error": "Failed to update status"}), 500
