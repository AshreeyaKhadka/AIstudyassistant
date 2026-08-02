import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from urllib.parse import urlparse

load_dotenv()

db = SQLAlchemy()


def _positive_int_env(name, default):
    try:
        value = int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


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
        os.environ.get('DATABASE_URL', 'sqlite:///instance/app.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    ALLOWED_EMAIL_DOMAIN = os.environ.get('ALLOWED_EMAIL_DOMAIN') # Can be None/empty

    # Providers
    LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'gemini').strip().lower()
    EMBEDDING_PROVIDER = os.environ.get('EMBEDDING_PROVIDER', 'gemini').strip().lower()
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('Gemini_API_KEY')
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    GEMINI_API_BASE_URL = os.environ.get('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta')
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
    OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'google/gemini-2.5-flash')
    OPENROUTER_EMBEDDING_MODEL = os.environ.get(
        'OPENROUTER_EMBEDDING_MODEL',
        'openai/text-embedding-3-large',
    )
    OPENROUTER_EMBEDDING_DIMENSIONS = _positive_int_env(
        'OPENROUTER_EMBEDDING_DIMENSIONS',
        3072,
    )
    OPENROUTER_API_BASE_URL = os.environ.get('OPENROUTER_API_BASE_URL', 'https://openrouter.ai/api/v1')
    OPENROUTER_SITE_URL = os.environ.get('OPENROUTER_SITE_URL', 'http://localhost:5173')
    OPENROUTER_APP_NAME = os.environ.get('OPENROUTER_APP_NAME', 'AI Study Assistant')
    GEMINI_EMBEDDING_MODEL = os.environ.get('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-2')
    GEMINI_EMBEDDING_DIMENSIONS = _positive_int_env('GEMINI_EMBEDDING_DIMENSIONS', 3072)
    CHROMA_COLLECTION_NAME = os.environ.get('CHROMA_COLLECTION_NAME', 'study_materials_v2')
    RAG_EMBEDDING_BATCH_SIZE = _positive_int_env('RAG_EMBEDDING_BATCH_SIZE', 10)
    RAG_EMBEDDING_BATCH_DELAY_SECONDS = _positive_int_env('RAG_EMBEDDING_BATCH_DELAY_SECONDS', 2)
    RAG_MAX_MATERIAL_CHUNKS = _positive_int_env('RAG_MAX_MATERIAL_CHUNKS', 120)
    RAG_MAX_SYLLABUS_CHUNKS = _positive_int_env('RAG_MAX_SYLLABUS_CHUNKS', 180)
