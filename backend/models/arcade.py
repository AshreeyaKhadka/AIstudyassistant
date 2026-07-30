from config import db
from datetime import datetime


class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    subject = db.Column(db.String(255), nullable=False)
    difficulty = db.Column(db.String(20), default='medium', nullable=False)
    text = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False)
    correct_option = db.Column(db.String(10), nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    source_doc_id = db.Column(db.Integer, db.ForeignKey('student_uploads.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class GameRoom(db.Model):
    __tablename__ = 'game_rooms'

    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    mode = db.Column(db.String(50), default='fff', nullable=False)
    status = db.Column(db.String(30), default='waiting', nullable=False)
    current_round = db.Column(db.Integer, default=0, nullable=False)
    invite_code = db.Column(db.String(10), unique=True, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)


class GameRoomPlayer(db.Model):
    __tablename__ = 'game_room_players'

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('game_rooms.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    display_name = db.Column(db.String(255), nullable=False)
    sid = db.Column(db.String(255), nullable=True)
    avatar_id = db.Column(db.String(50), nullable=True)
    ready = db.Column(db.Boolean, default=False, nullable=False)
    connected = db.Column(db.Boolean, default=False, nullable=False)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    score = db.Column(db.Integer, default=0, nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)


class GameRound(db.Model):
    __tablename__ = 'game_rounds'

    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('game_rooms.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)
    winner_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    winner_sid = db.Column(db.String(255), nullable=True)
    awarded_points = db.Column(db.Integer, default=0, nullable=False)
    locked = db.Column(db.Boolean, default=False, nullable=False)
    buzz_log = db.Column(db.JSON, default=list, nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    locked_at = db.Column(db.DateTime, nullable=True)


class ScoreboardEntry(db.Model):
    __tablename__ = 'scoreboard_entries'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    subject = db.Column(db.String(255), nullable=False)
    mode = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, default=0, nullable=False)
    points = db.Column(db.Integer, default=0, nullable=False)
    answers_json = db.Column(db.JSON, nullable=True)
    played_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ArcadePointEvent(db.Model):
    __tablename__ = 'arcade_point_events'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    subject = db.Column(db.String(255), nullable=False)
    mode = db.Column(db.String(50), nullable=False)
    points = db.Column(db.Integer, nullable=False)
    source_type = db.Column(db.String(50), nullable=False)
    source_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ArcadeTopicMastery(db.Model):
    __tablename__ = 'arcade_topic_mastery'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'subject_id', 'subject', 'topic', name='uq_arcade_topic_mastery_scope'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    subject = db.Column(db.String(255), nullable=False)
    topic = db.Column(db.String(255), nullable=False)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    correct = db.Column(db.Integer, default=0, nullable=False)
    streak = db.Column(db.Integer, default=0, nullable=False)
    mastery_score = db.Column(db.Integer, default=40, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
