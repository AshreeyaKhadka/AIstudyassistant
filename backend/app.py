from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config, db
from sqlalchemy import inspect, text

socketio = SocketIO(cors_allowed_origins=["http://localhost:5173", "http://localhost:5174"], async_mode='threading')


def _ensure_student_upload_schema():
    inspector = inspect(db.engine)
    if 'student_uploads' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('student_uploads')}
    with db.engine.begin() as connection:
        if 'file_url' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN file_url VARCHAR(512)'))
        if 'parsed_text' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN parsed_text TEXT'))
        if 'subject' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN subject VARCHAR(255)'))
        if 'embedding_status' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN embedding_status VARCHAR(50) DEFAULT 'pending'"))
        if 'embedding_error' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN embedding_error TEXT'))
        if 'subject_id' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN subject_id INTEGER REFERENCES subjects(id)'))
        if 'doc_type' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN doc_type VARCHAR(50) DEFAULT 'material'"))
        if 'syllabus_kind' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN syllabus_kind VARCHAR(20)'))
        if 'is_active_syllabus' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN is_active_syllabus BOOLEAN DEFAULT 0 NOT NULL"))
        
        # Drop old NOT NULL constraint on storage_path if present
        if 'storage_path' in columns:
            try:
                connection.execute(text("ALTER TABLE student_uploads ALTER COLUMN storage_path DROP NOT NULL"))
            except Exception:
                pass  # SQLite doesn't support this; ignore

        # Create unique partial index if index doesn't exist
        try:
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_subject_syllabus ON student_uploads (subject_id) WHERE doc_type = 'syllabus'"))
        except Exception as e:
            pass


def _ensure_user_profile_schema():
    inspector = inspect(db.engine)
    if 'users' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('users')}
    with db.engine.begin() as connection:
        if 'first_name' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN first_name VARCHAR(120)'))
        if 'last_name' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN last_name VARCHAR(120)'))


def _ensure_mcq_count_schema():
    inspector = inspect(db.engine)
    if 'student_uploads' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('student_uploads')}
    with db.engine.begin() as connection:
        if 'mcq_generation_count' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN mcq_generation_count INTEGER DEFAULT 0"))


def _ensure_quiz_set_upload_schema():
    inspector = inspect(db.engine)
    if 'quiz_sets' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('quiz_sets')}
    with db.engine.begin() as connection:
        if 'upload_id' not in columns:
            connection.execute(text('ALTER TABLE quiz_sets ADD COLUMN upload_id INTEGER'))


def _ensure_chat_session_schema():
    inspector = inspect(db.engine)
    if 'chat_sessions' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('chat_sessions')}
    with db.engine.begin() as connection:
        if 'title' not in columns:
            connection.execute(text('ALTER TABLE chat_sessions ADD COLUMN title VARCHAR(255)'))
        if 'updated_at' not in columns:
            connection.execute(text('ALTER TABLE chat_sessions ADD COLUMN updated_at TIMESTAMP'))


def _ensure_subject_schema():
    inspector = inspect(db.engine)
    if 'subjects' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('subjects')}
    with db.engine.begin() as connection:
        if 'user_id' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN user_id INTEGER REFERENCES users(id)'))
        if 'name' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN name VARCHAR(255)'))
        if 'semester' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN semester INTEGER'))
        if 'code' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN code VARCHAR(50)'))
        if 'credits' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN credits INTEGER DEFAULT 3'))
        if 'is_current' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN is_current BOOLEAN DEFAULT 1'))
        if 'is_backlog' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN is_backlog BOOLEAN DEFAULT 0'))
        if 'description' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN description TEXT'))
        if 'created_at' not in columns:
                connection.execute(text('ALTER TABLE subjects ADD COLUMN created_at DATETIME'))


def _ensure_arcade_schema():
    inspector = inspect(db.engine)
    if 'game_rooms' not in inspector.get_table_names():
        return

    with db.engine.begin() as connection:
        room_columns = {column['name'] for column in inspector.get_columns('game_rooms')}
        if 'created_by_id' not in room_columns:
            connection.execute(text('ALTER TABLE game_rooms ADD COLUMN created_by_id INTEGER REFERENCES users(id) DEFAULT 1 NOT NULL'))
        if 'invite_code' not in room_columns:
            connection.execute(text('ALTER TABLE game_rooms ADD COLUMN invite_code VARCHAR(10)'))
        if 'expires_at' not in room_columns:
            connection.execute(text('ALTER TABLE game_rooms ADD COLUMN expires_at TIMESTAMP'))
        connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS uq_game_rooms_invite_code ON game_rooms (invite_code)'))

        if 'game_room_players' not in inspector.get_table_names():
            return
        player_columns = {column['name'] for column in inspector.get_columns('game_room_players')}
        if 'avatar_id' not in player_columns:
            connection.execute(text('ALTER TABLE game_room_players ADD COLUMN avatar_id VARCHAR(50)'))
        if 'ready' not in player_columns:
            connection.execute(text('ALTER TABLE game_room_players ADD COLUMN ready BOOLEAN DEFAULT 0 NOT NULL'))
        if 'connected' not in player_columns:
            connection.execute(text('ALTER TABLE game_room_players ADD COLUMN connected BOOLEAN DEFAULT 0 NOT NULL'))
        if 'last_seen_at' not in player_columns:
            connection.execute(text('ALTER TABLE game_room_players ADD COLUMN last_seen_at TIMESTAMP'))
        connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS uq_game_room_user ON game_room_players (room_id, user_id)'))


def _ensure_calendar_schema():
    inspector = inspect(db.engine)
    with db.engine.begin() as connection:
        if 'revision_plans' in inspector.get_table_names():
            columns = {column['name'] for column in inspector.get_columns('revision_plans')}
            if 'event_type' not in columns:
                connection.execute(text("ALTER TABLE revision_plans ADD COLUMN event_type VARCHAR(30) DEFAULT 'Study Session'"))
            if 'reminder' not in columns:
                connection.execute(text("ALTER TABLE revision_plans ADD COLUMN reminder BOOLEAN DEFAULT 0 NOT NULL"))
        if 'exams' in inspector.get_table_names():
            columns = {column['name'] for column in inspector.get_columns('exams')}
            if 'start_time' not in columns:
                connection.execute(text('ALTER TABLE exams ADD COLUMN start_time VARCHAR(5)'))
            if 'end_time' not in columns:
                connection.execute(text('ALTER TABLE exams ADD COLUMN end_time VARCHAR(5)'))
            if 'reminder' not in columns:
                connection.execute(text("ALTER TABLE exams ADD COLUMN reminder BOOLEAN DEFAULT 0 NOT NULL"))


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow requests from Vite frontend (usually port 5173)
    CORS(
        app,
        resources={r"/*": {"origins": ["http://localhost:5173", "http://localhost:5174"]}},
        supports_credentials=True,
    )

    db.init_app(app)
    socketio.init_app(app)

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "ok", "message": "CE Study Assistant API is running"}), 200

    # Import and register blueprints
    from routes.auth import auth_bp, oauth
    from routes.chat import chat_bp
    from routes.upload import upload_bp
    from routes.quiz import quiz_bp
    from routes.admin import admin_bp
    from routes.revision import revision_bp
    from routes.generate import generate_bp
    from routes.exam import exam_bp
    from routes.user import user_bp
    from routes.syllabus import syllabus_bp
    from routes.exam_prep import exam_prep_bp
    from routes.focus import focus_bp
    from routes.career import career_bp
    from routes.execute import execute_bp
    from routes.arcade import arcade_bp, register_arcade_socketio
    
    oauth.init_app(app)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(chat_bp, url_prefix='/chat')
    app.register_blueprint(upload_bp, url_prefix='/upload')
    app.register_blueprint(quiz_bp, url_prefix='/quiz')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(revision_bp, url_prefix='/revision-plans')
    app.register_blueprint(generate_bp, url_prefix='/generate')
    app.register_blueprint(exam_bp, url_prefix='/exams')
    app.register_blueprint(user_bp, url_prefix='/user')
    app.register_blueprint(syllabus_bp, url_prefix='/syllabus')
    app.register_blueprint(exam_prep_bp, url_prefix='/exam-prep')
    app.register_blueprint(focus_bp, url_prefix='/focus')
    app.register_blueprint(career_bp, url_prefix='/career')
    app.register_blueprint(execute_bp)
    app.register_blueprint(arcade_bp, url_prefix='/arcade')
    register_arcade_socketio(socketio)


    # Ensure DB tables are created (useful for dev)
    with app.app_context():
        # Models will be imported here to ensure they are known to SQLAlchemy
        from models.user import User
        from models.content import Subject, SyllabusDoc, StudentUpload
        from models.chat import ChatSession, ChatMessage
        from models.quiz import QuizSet
        from models.embedding import DocEmbedding
        from models.revision import RevisionPlan
        from models.exam import Exam
        from models.focus import StudySession, UserAchievement
        from models.career import CareerProfile
        from models.arcade import Question, GameRoom, GameRoomPlayer, GameRound, ScoreboardEntry, ArcadePointEvent, ArcadeTopicMastery

        
        # We will set up pgvector later during DB migrations, 
        # but for initial start, this avoids missing table errors.
        db.create_all()
        _ensure_user_profile_schema()
        _ensure_subject_schema()
        _ensure_student_upload_schema()
        _ensure_mcq_count_schema()
        _ensure_quiz_set_upload_schema()
        _ensure_chat_session_schema()
        _ensure_arcade_schema()
        _ensure_calendar_schema()

    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
