from flask import Flask, jsonify
from flask_cors import CORS
from config import Config, db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow requests from Vite frontend (usually port 5173)
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

    db.init_app(app)

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "ok", "message": "CE Study Assistant API is running"}), 200

    # Import and register blueprints
    from routes.auth import auth_bp, oauth
    from routes.upload import upload_bp
    from routes.quiz import quiz_bp
    from routes.admin import admin_bp
    from routes.revision import revision_bp
    
    oauth.init_app(app)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(upload_bp, url_prefix='/upload')
    app.register_blueprint(quiz_bp, url_prefix='/quiz')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(revision_bp, url_prefix='/revision-plans')


    # Ensure DB tables are created (useful for dev)
    with app.app_context():
        # Models will be imported here to ensure they are known to SQLAlchemy
        from models.user import User
        from models.content import Subject, SyllabusDoc, StudentUpload
        from models.chat import ChatSession, ChatMessage
        from models.quiz import QuizSet
        from models.embedding import DocEmbedding
        from models.revision import RevisionPlan

        
        # We will set up pgvector later during DB migrations, 
        # but for initial start, this avoids missing table errors.
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
