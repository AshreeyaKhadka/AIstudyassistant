from config import db
from datetime import datetime

class StudySession(db.Model):
    __tablename__ = 'study_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    topic = db.Column(db.String(255), nullable=True)
    duration_minutes = db.Column(db.Integer, default=0)
    break_duration_minutes = db.Column(db.Integer, default=0)
    completed = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_type = db.Column(db.String(100), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)
