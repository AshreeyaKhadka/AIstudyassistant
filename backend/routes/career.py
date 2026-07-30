from flask import Blueprint, jsonify, request
from models import CareerProfile, User
from services.auth_service import login_required
from services.career_service import analyze_career_profile, generate_motivational_message
from config import db
import json
import logging

logger = logging.getLogger(__name__)

career_bp = Blueprint('career', __name__)


@career_bp.route('/profile', methods=['GET'])
@login_required
def get_career_profile(user):
    """Retrieve the user's career profile."""
    profile = CareerProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return jsonify({'error': 'No career profile found'}), 404
    
    return jsonify(profile.to_dict()), 200


@career_bp.route('/profile', methods=['POST'])
@login_required
def save_career_profile(user):
    """Save or update the user's career profile and generate AI analysis."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Get or create profile
        profile = CareerProfile.query.filter_by(user_id=user.id).first()
        if not profile:
            profile = CareerProfile(user_id=user.id)
            db.session.add(profile)
        
        # Update profile fields
        if 'interests' in data:
            profile.interests = json.dumps(data.get('interests', []))
        
        if 'skills' in data:
            profile.skills = json.dumps(data.get('skills', []))
        
        if 'career_goal' in data:
            profile.career_goal = data.get('career_goal')
        
        # Update experience flags
        if 'experience' in data:
            exp = data.get('experience', {})
            profile.has_done_hackathons = exp.get('hackathons', False)
            profile.has_done_open_source = exp.get('open_source', False)
            profile.has_done_internships = exp.get('internships', False)
            profile.has_done_research_papers = exp.get('research_papers', False)
            profile.has_done_jobs = exp.get('jobs', False)
        
        # Update experience details
        if 'experience_details' in data:
            details = data.get('experience_details', {})
            profile.hackathon_details = details.get('hackathon_details')
            profile.open_source_details = details.get('open_source_details')
            profile.internship_details = details.get('internship_details')
            profile.research_details = details.get('research_details')
            profile.job_details = details.get('job_details')
        
        db.session.commit()
        
        # Generate AI analysis
        interests = json.loads(profile.interests) if profile.interests else []
        skills = json.loads(profile.skills) if profile.skills else []
        experience = {
            'hackathons': profile.has_done_hackathons,
            'open_source': profile.has_done_open_source,
            'internships': profile.has_done_internships,
            'research_papers': profile.has_done_research_papers,
            'jobs': profile.has_done_jobs,
        }
        
        # Call AI service for analysis
        analysis = analyze_career_profile(
            user_name=user.first_name or user.name.split()[0],
            interests=interests,
            skills=skills,
            career_goal=profile.career_goal or 'exploring',
            experience=experience,
            user_semester=user.semester or 1
        )
        
        # Generate motivational message
        motivational_msg = generate_motivational_message(
            user_name=user.first_name or user.name.split()[0],
            analysis=analysis
        )
        
        # Save analysis and message
        profile.ai_analysis = json.dumps(analysis)
        profile.ai_motivational_message = motivational_msg
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile saved and analyzed',
            'profile': profile.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving career profile: {str(e)}")
        return jsonify({'error': str(e)}), 500


@career_bp.route('/analysis', methods=['GET'])
@login_required
def get_career_analysis(user):
    """Get the AI-generated career analysis for the user."""
    profile = CareerProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return jsonify({'error': 'No career profile found'}), 404
    
    if not profile.ai_analysis:
        return jsonify({'error': 'No analysis available yet'}), 404
    
    analysis = json.loads(profile.ai_analysis)
    
    return jsonify({
        'analysis': analysis,
        'motivational_message': profile.ai_motivational_message,
        'updated_at': profile.updated_at.isoformat()
    }), 200


@career_bp.route('/profile', methods=['DELETE'])
@login_required
def delete_career_profile(user):
    """Delete the user's career profile."""
    profile = CareerProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return jsonify({'error': 'No career profile found'}), 404
    
    try:
        db.session.delete(profile)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Profile deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting career profile: {str(e)}")
        return jsonify({'error': str(e)}), 500
