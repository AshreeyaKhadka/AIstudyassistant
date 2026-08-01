import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from urllib.parse import urlparse

load_dotenv()

db = SQLAlchemy()


def _resolve_sqlite_database_url(database_url):
    if not database_url or not database_url.startswith('sqlite:///'):
        return database_url

    # sqlite:////abs/path.db is already absolute; sqlite:///path.db is relative.
    if database_url.startswith('sqlite:////'):
        return database_url

    parsed = urlparse(database_url)
    database_path = parsed.path.lstrip('/')

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    resolved_path = os.path.join(backend_dir, database_path)
    return f'sqlite:///{resolved_path}'

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-default-key')
    SQLALCHEMY_DATABASE_URI = _resolve_sqlite_database_url(
        os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    ALLOWED_EMAIL_DOMAIN = os.environ.get('ALLOWED_EMAIL_DOMAIN') # Can be None/empty

    # Providers
    LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'placeholder')
    EMBEDDING_PROVIDER = os.environ.get('EMBEDDING_PROVIDER', 'placeholder')
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('Gemini_API_KEY')
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    GEMINI_API_BASE_URL = os.environ.get('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta')
