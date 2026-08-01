from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config, db
from sqlalchemy import inspect, text
from werkzeug.exceptions import HTTPException
from uuid import uuid4
from services.api_response import error_response

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
        if 'extraction_method' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN extraction_method VARCHAR(50)'))
        if 'extraction_quality' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN extraction_quality VARCHAR(50)'))
        if 'native_text_pages' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN native_text_pages INTEGER DEFAULT 0 NOT NULL'))
        if 'ocr_pages' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN ocr_pages INTEGER DEFAULT 0 NOT NULL'))
        if 'processing_status' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN processing_status VARCHAR(50) DEFAULT 'uploaded' NOT NULL"))
        if 'processing_error' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN processing_error TEXT'))
        if 'processing_warnings' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN processing_warnings JSON'))
        if 'page_count' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN page_count INTEGER'))
        if 'character_count' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN character_count INTEGER'))
        if 'content_sha256' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN content_sha256 VARCHAR(64)'))
        if 'subject_id' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN subject_id INTEGER REFERENCES subjects(id)'))
        if 'doc_type' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN doc_type VARCHAR(50) DEFAULT 'material'"))
        if 'syllabus_kind' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN syllabus_kind VARCHAR(20)'))
        if 'is_active_syllabus' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN is_active_syllabus BOOLEAN DEFAULT 0 NOT NULL"))
        if 'validation_status' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN validation_status VARCHAR(50) DEFAULT 'pending' NOT NULL"))
        if 'validation_error' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN validation_error TEXT'))
        if 'validation_details' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN validation_details JSON'))
        if 'syllabus_match_score' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN syllabus_match_score FLOAT'))
        if 'syllabus_match_coverage' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN syllabus_match_coverage FLOAT'))
        if 'admission_status' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN admission_status VARCHAR(50) DEFAULT 'screening' NOT NULL"))
            connection.execute(text("UPDATE student_uploads SET admission_status = CASE WHEN doc_type = 'material' AND validation_status = 'rejected' THEN 'rejected' ELSE 'admitted' END"))
        if 'admission_error' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN admission_error TEXT'))
        if 'screening_details' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN screening_details JSON'))
        if 'screened_at' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN screened_at DATETIME'))
        if 'syllabus_version' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN syllabus_version INTEGER DEFAULT 1 NOT NULL'))
        if 'syllabus_structure_hash' not in columns:
            connection.execute(text('ALTER TABLE student_uploads ADD COLUMN syllabus_structure_hash VARCHAR(64)'))
        
        # Drop old NOT NULL constraint on storage_path if present
        if 'storage_path' in columns:
            try:
                connection.execute(text("ALTER TABLE student_uploads ALTER COLUMN storage_path DROP NOT NULL"))
            except Exception:
                pass  # SQLite doesn't support this; ignore

        # Create unique partial index if index doesn't exist
        try:
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_subject_syllabus ON student_uploads (subject_id) WHERE doc_type = 'syllabus'"))
            connection.execute(text('CREATE INDEX IF NOT EXISTS ix_student_upload_content_sha256 ON student_uploads (content_sha256)'))
        except Exception:
            pass


def _reconcile_personal_syllabus_statuses():
    """Turn legacy never-finished personal syllabi into an explicit retry state."""
    from models.content import StudentUpload

    incomplete = StudentUpload.query.filter_by(
        doc_type='syllabus', syllabus_kind='personal', structured_syllabus=None,
    ).filter(StudentUpload.parsed_text.isnot(None)).all()
    changed = False
    for upload in incomplete:
        if upload.processing_status in {'validating', 'structuring', 'indexing', 'failed'}:
            continue
        upload.processing_status = 'failed'
        upload.processing_error = 'Chapter extraction was not completed. Retry this syllabus to validate and organize it.'
        upload.is_active_syllabus = False
        changed = True
    if changed:
        db.session.commit()


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
        if 'study_daily_minutes' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN study_daily_minutes INTEGER DEFAULT 60 NOT NULL'))
        if 'study_session_minutes' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN study_session_minutes INTEGER DEFAULT 25 NOT NULL'))
        if 'study_start_time' not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN study_start_time VARCHAR(5) DEFAULT '18:00' NOT NULL"))
        if 'study_days' not in columns:
            connection.execute(text('ALTER TABLE users ADD COLUMN study_days JSON'))


def _ensure_focus_session_schema():
    inspector = inspect(db.engine)
    if 'study_sessions' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('study_sessions')}
    additions = {
        'subject_id': 'INTEGER REFERENCES subjects(id)',
        'recall_question': 'TEXT',
        'recall_answer': 'TEXT',
        'recall_feedback': 'TEXT',
        'recall_score': 'FLOAT',
        'recall_metadata': 'JSON',
    }
    with db.engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f'ALTER TABLE study_sessions ADD COLUMN {name} {definition}'))


def _ensure_mcq_count_schema():
    inspector = inspect(db.engine)
    if 'student_uploads' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('student_uploads')}
    with db.engine.begin() as connection:
        if 'mcq_generation_count' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN mcq_generation_count INTEGER DEFAULT 0"))
        if 'structured_syllabus' not in columns:
            connection.execute(text("ALTER TABLE student_uploads ADD COLUMN structured_syllabus TEXT"))


def _ensure_quiz_set_upload_schema():
    inspector = inspect(db.engine)
    if 'quiz_sets' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('quiz_sets')}
    with db.engine.begin() as connection:
        if 'upload_id' not in columns:
            connection.execute(text('ALTER TABLE quiz_sets ADD COLUMN upload_id INTEGER'))
        if 'assessment_type' not in columns:
            connection.execute(text("ALTER TABLE quiz_sets ADD COLUMN assessment_type VARCHAR(30) DEFAULT 'mcq' NOT NULL"))
        if 'title' not in columns:
            connection.execute(text('ALTER TABLE quiz_sets ADD COLUMN title VARCHAR(255)'))
        if 'total_marks' not in columns:
            connection.execute(text('ALTER TABLE quiz_sets ADD COLUMN total_marks INTEGER'))
        if 'duration_minutes' not in columns:
            connection.execute(text('ALTER TABLE quiz_sets ADD COLUMN duration_minutes INTEGER'))
        if 'attempt_json' not in columns:
            connection.execute(text('ALTER TABLE quiz_sets ADD COLUMN attempt_json JSON'))
        if 'source_metadata' not in columns:
            connection.execute(text('ALTER TABLE quiz_sets ADD COLUMN source_metadata JSON'))


def _ensure_chat_session_schema():
    inspector = inspect(db.engine)
    with db.engine.begin() as connection:
        if 'chat_sessions' in inspector.get_table_names():
            columns = {column['name'] for column in inspector.get_columns('chat_sessions')}
            if 'subject_id' not in columns:
                connection.execute(text('ALTER TABLE chat_sessions ADD COLUMN subject_id INTEGER REFERENCES subjects(id)'))
            if 'title' not in columns:
                connection.execute(text('ALTER TABLE chat_sessions ADD COLUMN title VARCHAR(255)'))
            if 'updated_at' not in columns:
                connection.execute(text('ALTER TABLE chat_sessions ADD COLUMN updated_at TIMESTAMP'))
            if 'context_metadata' not in columns:
                connection.execute(text('ALTER TABLE chat_sessions ADD COLUMN context_metadata JSON'))

        if 'chat_messages' in inspector.get_table_names():
            columns = {column['name'] for column in inspector.get_columns('chat_messages')}
            if 'message_metadata' not in columns:
                connection.execute(text('ALTER TABLE chat_messages ADD COLUMN message_metadata JSON'))

    _ensure_nullable_chat_subject()


def _ensure_nullable_chat_subject():
    """Bring legacy SQLite chat_sessions in line with the nullable subject model."""
    if db.engine.dialect.name != 'sqlite':
        return
    inspector = inspect(db.engine)
    if 'chat_sessions' not in inspector.get_table_names():
        return
    subject_column = next(
        (column for column in inspector.get_columns('chat_sessions') if column['name'] == 'subject_id'),
        None,
    )
    if not subject_column or subject_column.get('nullable', True):
        return

    raw_connection = db.engine.raw_connection()
    cursor = raw_connection.cursor()
    try:
        cursor.execute('PRAGMA foreign_keys=OFF')
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions_nullable_migration'")
        if cursor.fetchone():
            raise RuntimeError('A previous chat session schema migration requires manual review.')
        cursor.execute('BEGIN IMMEDIATE')
        cursor.execute('''
            CREATE TABLE chat_sessions_nullable_migration (
                id INTEGER NOT NULL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                subject_id INTEGER,
                title VARCHAR(255),
                context_metadata JSON,
                created_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users (id),
                FOREIGN KEY(subject_id) REFERENCES subjects (id)
            )
        ''')
        cursor.execute('''
            INSERT INTO chat_sessions_nullable_migration
                (id, user_id, subject_id, title, context_metadata, created_at, updated_at)
            SELECT id, user_id, subject_id, title, context_metadata, created_at, updated_at
            FROM chat_sessions
        ''')
        cursor.execute('DROP TABLE chat_sessions')
        cursor.execute('ALTER TABLE chat_sessions_nullable_migration RENAME TO chat_sessions')
        cursor.execute('COMMIT')
        cursor.execute('PRAGMA foreign_keys=ON')
        violations = cursor.execute('PRAGMA foreign_key_check').fetchall()
        if violations:
            raise RuntimeError(f'Chat session schema migration created foreign key violations: {violations[:3]}')
    except Exception:
        try:
            cursor.execute('ROLLBACK')
        except Exception:
            pass
        raise
    finally:
        cursor.close()
        raw_connection.close()


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
        if 'catalog_key' not in columns:
            connection.execute(text('ALTER TABLE subjects ADD COLUMN catalog_key VARCHAR(255)'))
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
        connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS uq_user_catalog_subject ON subjects (user_id, catalog_key) WHERE catalog_key IS NOT NULL'))


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
            if 'subject_id' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN subject_id INTEGER REFERENCES subjects(id)'))
            if 'upload_id' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN upload_id INTEGER REFERENCES student_uploads(id)'))
            if 'topic_id' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN topic_id VARCHAR(255)'))
            if 'topic_title' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN topic_title VARCHAR(500)'))
            if 'source_type' not in columns:
                connection.execute(text("ALTER TABLE revision_plans ADD COLUMN source_type VARCHAR(30) DEFAULT 'manual' NOT NULL"))
            if 'scheduling_reason' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN scheduling_reason TEXT'))
            if 'duration_minutes' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN duration_minutes INTEGER DEFAULT 25 NOT NULL'))
            if 'reschedule_count' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN reschedule_count INTEGER DEFAULT 0 NOT NULL'))
            if 'completed_at' not in columns:
                connection.execute(text('ALTER TABLE revision_plans ADD COLUMN completed_at DATETIME'))
        if 'exams' in inspector.get_table_names():
            columns = {column['name'] for column in inspector.get_columns('exams')}
            if 'start_time' not in columns:
                connection.execute(text('ALTER TABLE exams ADD COLUMN start_time VARCHAR(5)'))
            if 'end_time' not in columns:
                connection.execute(text('ALTER TABLE exams ADD COLUMN end_time VARCHAR(5)'))
            if 'reminder' not in columns:
                connection.execute(text("ALTER TABLE exams ADD COLUMN reminder BOOLEAN DEFAULT 0 NOT NULL"))


def _ensure_user_token_quota_schema():
    inspector = inspect(db.engine)
    if 'users' not in inspector.get_table_names():
        return
    columns = {column['name'] for column in inspector.get_columns('users')}
    with db.engine.begin() as connection:
        if 'token_quota' not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN token_quota INTEGER DEFAULT 100000"))
        if 'token_quota_enabled' not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN token_quota_enabled BOOLEAN DEFAULT 0"))


def _ensure_ai_usage_logs_schema():
    inspector = inspect(db.engine)
    if 'ai_usage_logs' not in inspector.get_table_names():
        return
    # Table exists, check for missing columns
    columns = {column['name'] for column in inspector.get_columns('ai_usage_logs')}
    with db.engine.begin() as connection:
        if 'model_used' not in columns:
            connection.execute(text('ALTER TABLE ai_usage_logs ADD COLUMN model_used VARCHAR(100)'))
        if 'subject' not in columns:
            connection.execute(text('ALTER TABLE ai_usage_logs ADD COLUMN subject VARCHAR(255)'))


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

    @app.before_request
    def attach_request_id():
        g.request_id = request.headers.get('X-Request-ID') or uuid4().hex

    @app.after_request
    def include_request_id(response):
        response.headers['X-Request-ID'] = getattr(g, 'request_id', '')
        return response

    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            "status": "ok",
            "message": "CE Study Assistant API is running",
            "health": "/health",
        }), 200

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "ok", "message": "CE Study Assistant API is running"}), 200

    @app.errorhandler(404)
    def not_found(error):
        return error_response('Not found', 404, code='not_found')

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return error_response('File too large. Maximum size is 10MB.', 413, code='file_too_large')

    @app.errorhandler(500)
    def internal_server_error(error):
        return error_response(
            'An unexpected error occurred. Please try again.',
            500,
            code='internal_error',
            retryable=True,
        )

    @app.errorhandler(Exception)
    def handle_exception(error):
        if isinstance(error, HTTPException):
            return error_response(
                error.description or error.name,
                error.code or 500,
                code=(error.name or 'http_error').lower().replace(' ', '_'),
            )

        import logging
        logging.getLogger(__name__).exception(f"Unhandled exception: {error}")
        return error_response(
            'An unexpected error occurred. Please try again.',
            500,
            code='internal_error',
            retryable=True,
        )

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
    from routes.progress import progress_bp
    from routes.arcade import arcade_bp, register_arcade_socketio
    from routes.search import search_bp
    
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
    app.register_blueprint(progress_bp, url_prefix='/progress')
    app.register_blueprint(execute_bp)
    app.register_blueprint(arcade_bp, url_prefix='/arcade')
    app.register_blueprint(search_bp, url_prefix='/search')
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
        from models.progress import ActivityLog, TopicProgress
        from models.ai_usage import AiUsageLog

        
        # We will set up pgvector later during DB migrations, 
        # but for initial start, this avoids missing table errors.
        db.create_all()
        _ensure_user_profile_schema()
        _ensure_focus_session_schema()
        _ensure_subject_schema()
        _ensure_student_upload_schema()
        _ensure_mcq_count_schema()
        _reconcile_personal_syllabus_statuses()
        _ensure_quiz_set_upload_schema()
        _ensure_chat_session_schema()
        _ensure_arcade_schema()
        _ensure_calendar_schema()
        _ensure_user_token_quota_schema()
        _ensure_ai_usage_logs_schema()

    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
