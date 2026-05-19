from config import db
from datetime import datetime

class RevisionPlan(db.Model):
    __tablename__ = 'revision_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    subject = db.Column(db.String(100), nullable=True)
    revision_date = db.Column(db.String(10), nullable=False) # e.g., 'YYYY-MM-DD'
    start_time = db.Column(db.String(5), nullable=True)     # e.g., 'HH:MM'
    end_time = db.Column(db.String(5), nullable=True)       # e.g., 'HH:MM'
    priority = db.Column(db.String(20), default='medium')   # 'low', 'medium', 'high'
    status = db.Column(db.String(20), default='pending')    # 'pending', 'completed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'subject': self.subject,
            'revision_date': self.revision_date,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'priority': self.priority,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
