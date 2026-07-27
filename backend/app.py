from flask import Flask, jsonify
from flask_cors import CORS
from config import Config, db
from sqlalchemy import inspect, text


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

        
        # We will set up pgvector later during DB migrations, 
        # but for initial start, this avoids missing table errors.
        db.create_all()
        _ensure_user_profile_schema()
        _ensure_subject_schema()
        _ensure_student_upload_schema()
        _ensure_mcq_count_schema()
        _ensure_quiz_set_upload_schema()
        _ensure_chat_session_schema()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
