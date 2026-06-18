from config import db
from datetime import datetime

class Exam(db.Model):
    __tablename__ = 'exams'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    exam_type = db.Column(db.String(50), nullable=False)  # 'ut', 'assessment', 'final'
    subject = db.Column(db.String(255), nullable=False)
    exam_date = db.Column(db.String(10), nullable=False)  # 'YYYY-MM-DD'
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'exam_type': self.exam_type,
            'subject': self.subject,
            'exam_date': self.exam_date,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
