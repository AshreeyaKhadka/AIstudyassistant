from config import db
from datetime import datetime


class AiUsageLog(db.Model):
    __tablename__ = 'ai_usage_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)  # chat, flashcard, mcq, exam_question, blueprint, rapid_revision, mock_test, learning_path, focus_coach
    prompt_tokens = db.Column(db.Integer, default=0, nullable=False)
    completion_tokens = db.Column(db.Integer, default=0, nullable=False)
    total_tokens = db.Column(db.Integer, default=0, nullable=False)
    model_used = db.Column(db.String(100), nullable=True)
    subject = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='ai_usage_logs')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action_type': self.action_type,
            'prompt_tokens': self.prompt_tokens,
            'completion_tokens': self.completion_tokens,
            'total_tokens': self.total_tokens,
            'model_used': self.model_used,
            'subject': self.subject,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
