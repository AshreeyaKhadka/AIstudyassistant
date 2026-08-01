from config import db
from datetime import datetime

class QuizSet(db.Model):
    __tablename__ = 'quiz_sets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('student_uploads.id'), nullable=True)
    topic = db.Column(db.String(255), nullable=False)
    assessment_type = db.Column(db.String(30), default='mcq', nullable=False)
    title = db.Column(db.String(255), nullable=True)
    questions_json = db.Column(db.JSON, nullable=False)  # stores list of MCQ or flashcard pair objects
    score = db.Column(db.Integer, nullable=True) # score could be filled after completion
    total_marks = db.Column(db.Integer, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)
    attempt_json = db.Column(db.JSON, nullable=True)
    source_metadata = db.Column(db.JSON, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
