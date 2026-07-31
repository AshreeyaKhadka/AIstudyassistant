from config import db
from datetime import datetime


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    upload_id = db.Column(db.Integer, db.ForeignKey('student_uploads.id'), nullable=True)
    quiz_set_id = db.Column(db.Integer, db.ForeignKey('quiz_sets.id'), nullable=True)
    topic_id = db.Column(db.String(255), nullable=True)
    topic_title = db.Column(db.String(500), nullable=True)
    action = db.Column(db.String(80), nullable=False)
    score = db.Column(db.Float, nullable=True)
    activity_metadata = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class TopicProgress(db.Model):
    __tablename__ = 'topic_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    topic_id = db.Column(db.String(255), nullable=False)
    topic_title = db.Column(db.String(500), nullable=False)
    syllabus_upload_id = db.Column(db.Integer, db.ForeignKey('student_uploads.id'), nullable=True)
    covered = db.Column(db.Boolean, default=False, nullable=False)
    practiced = db.Column(db.Boolean, default=False, nullable=False)
    reviewed = db.Column(db.Boolean, default=False, nullable=False)
    weak = db.Column(db.Boolean, default=False, nullable=False)
    mastery_score = db.Column(db.Float, default=0.0, nullable=False)
    coverage_score = db.Column(db.Float, default=0.0, nullable=False)
    last_touched_at = db.Column(db.DateTime, nullable=True)
    last_practiced_at = db.Column(db.DateTime, nullable=True)
    next_revision_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'subject_id', 'topic_id', name='uq_topic_progress_user_subject_topic'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'subject_id': self.subject_id,
            'topic_id': self.topic_id,
            'topic_title': self.topic_title,
            'syllabus_upload_id': self.syllabus_upload_id,
            'covered': self.covered,
            'practiced': self.practiced,
            'reviewed': self.reviewed,
            'weak': self.weak,
            'mastery_score': self.mastery_score,
            'coverage_score': self.coverage_score,
            'last_touched_at': self.last_touched_at.isoformat() if self.last_touched_at else None,
            'last_practiced_at': self.last_practiced_at.isoformat() if self.last_practiced_at else None,
            'next_revision_at': self.next_revision_at.isoformat() if self.next_revision_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
