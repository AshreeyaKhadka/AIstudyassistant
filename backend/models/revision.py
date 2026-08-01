from config import db
from datetime import datetime

class RevisionPlan(db.Model):
    __tablename__ = 'revision_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('student_uploads.id'), nullable=True)
    topic_id = db.Column(db.String(255), nullable=True)
    topic_title = db.Column(db.String(500), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    subject = db.Column(db.String(100), nullable=True)
    event_type = db.Column(db.String(30), default='Study Session')
    revision_date = db.Column(db.String(10), nullable=False) # e.g., 'YYYY-MM-DD'
    start_time = db.Column(db.String(5), nullable=True)     # e.g., 'HH:MM'
    end_time = db.Column(db.String(5), nullable=True)       # e.g., 'HH:MM'
    reminder = db.Column(db.Boolean, default=False, nullable=False)
    priority = db.Column(db.String(20), default='medium')   # 'low', 'medium', 'high'
    status = db.Column(db.String(20), default='pending')    # 'pending', 'completed'
    source_type = db.Column(db.String(30), default='manual', nullable=False)
    scheduling_reason = db.Column(db.Text, nullable=True)
    duration_minutes = db.Column(db.Integer, default=25, nullable=False)
    reschedule_count = db.Column(db.Integer, default=0, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'subject_id': self.subject_id,
            'upload_id': self.upload_id,
            'topic_id': self.topic_id,
            'topic_title': self.topic_title,
            'title': self.title,
            'description': self.description,
            'subject': self.subject,
            'event_type': self.event_type,
            'revision_date': self.revision_date,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'reminder': self.reminder,
            'priority': self.priority,
            'status': self.status,
            'source_type': self.source_type,
            'scheduling_reason': self.scheduling_reason,
            'duration_minutes': self.duration_minutes,
            'reschedule_count': self.reschedule_count,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
