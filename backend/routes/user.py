from flask import Blueprint, jsonify, request
from models import User, StudentUpload, ChatSession, QuizSet, RevisionPlan
from services.auth_service import login_required
from config import db
from datetime import datetime, timedelta

user_bp = Blueprint('user', __name__)

@user_bp.route('/dashboard', methods=['GET'])
@login_required
def get_dashboard_data(user):
    user_id = user.id

    # 1. Student Profile & Stats
    uploads_count = StudentUpload.query.filter_by(user_id=user_id).count()
    quizzes_count = QuizSet.query.filter_by(user_id=user_id).count()
    chats_count = ChatSession.query.filter_by(user_id=user_id).count()
    revisions_count = RevisionPlan.query.filter_by(user_id=user_id).count()

    # Calculate mock study hours and streak (for now, can be improved later)
    # Simple logic: streak based on daily activity (last_active)
    # This is just to have something dynamic
    
    student_data = {
        'name': user.name,
        'semester': f"{user.semester}th Semester" if user.semester else "N/A",
        'department': 'Computer Engineering',
        'streak': 0, # Placeholder or simple logic
        'stats': {
            'totalNotes': chats_count, # Using chats as proxy for notes for now
            'flashcardsCompleted': 0, 
            'uploadedPDFs': uploads_count,
            'weeklyStudyHours': 0,
            'quizAccuracy': 0,
            'pendingRevision': revisions_count
        }
    }

    # 2. Recent Queries (from ChatSession)
    recent_sessions = ChatSession.query.filter_by(user_id=user_id).order_by(ChatSession.updated_at.desc()).limit(3).all()
    recent_queries = []
    for s in recent_sessions:
        recent_queries.append({
            'id': s.id,
            'title': s.title or "New Conversation",
            'subject': 'AI Tutor',
            'time': s.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        })

    # 3. Uploaded Materials
    recent_uploads = StudentUpload.query.filter_by(user_id=user_id).order_by(StudentUpload.created_at.desc()).limit(3).all()
    uploaded_materials = []
    for u in recent_uploads:
        uploaded_materials.append({
            'id': u.id,
            'filename': u.filename,
            'subject': u.subject or 'General',
            'date': u.created_at.strftime('%b %d, %Y'),
            'size': f"{round(u.size_bytes / 1024 / 1024, 2)} MB" if u.size_bytes else "0 MB",
            'type': u.filename.split('.')[-1] if '.' in u.filename else 'file'
        })

    # 4. Flashcards (from QuizSets where topic contains 'flashcard' or similar, or just recent quiz sets)
    # For now, let's pull recent quiz sets
    recent_quizzes = QuizSet.query.filter_by(user_id=user_id).order_by(QuizSet.created_at.desc()).limit(3).all()
    flashcards = []
    for q in recent_quizzes:
        # q.questions_json might contain flashcards or MCQs
        # Taking first item as preview if it's a flashcard-like structure
        if isinstance(q.questions_json, list) and len(q.questions_json) > 0:
            item = q.questions_json[0]
            if 'front' in item and 'back' in item:
                flashcards.append({
                    'id': q.id,
                    'question': item['front'],
                    'answer': item['back'],
                    'subject': q.topic
                })
            elif 'question' in item and 'options' in item:
                flashcards.append({
                    'id': q.id,
                    'question': item['question'],
                    'answer': item.get('correct_answer', 'Check details'),
                    'subject': q.topic
                })

    # 5. Generated Notes (Proxy using recent chat session content if needed, but let's see if there's a Notes model)
    # Looking at front-end, Notes were removed from sidebar, but they might still exist in dashboard
    # Let's keep it simple for now as 'recent_queries' covers AI interaction
    
    return jsonify({
        'studentData': student_data,
        'recentQueries': recent_queries,
        'uploadedMaterials': uploaded_materials,
        'sharedResources': [], # Global resources can be added here
        'flashcards': flashcards,
        'generatedNotes': [] # Or map from elsewhere
    }), 200
