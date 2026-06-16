from config import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(120), nullable=True)
    last_name = db.Column(db.String(120), nullable=True)
    avatar_url = db.Column(db.String(512), nullable=True)
    college = db.Column(db.String(255), nullable=True)
    semester = db.Column(db.Integer, nullable=True) # 1-8
    role = db.Column(db.String(20), default='student') # student, admin
    is_banned = db.Column(db.Boolean, default=False)
    ban_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    uploads = db.relationship('StudentUpload', backref='uploader', lazy=True)
    chat_sessions = db.relationship('ChatSession', backref='user', lazy=True)
    quiz_sets = db.relationship('QuizSet', backref='user', lazy=True)
    revision_plans = db.relationship('RevisionPlan', backref='user', lazy=True, cascade='all, delete-orphan')


    def to_dict(self):
        display_name = ' '.join(part for part in [self.first_name, self.last_name] if part) or self.name
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'display_name': display_name,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'avatar_url': self.avatar_url,
            'college': self.college,
            'semester': self.semester,
            'role': self.role,
            'university': 'Pokhara University',
            'course': 'Computer Engineering',
            'profile_complete': bool(self.first_name and self.last_name and self.college and self.semester)
        }
