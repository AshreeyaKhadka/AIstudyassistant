import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

db = SQLAlchemy()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-default-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///ce_study_assistant.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    ALLOWED_EMAIL_DOMAIN = os.environ.get('ALLOWED_EMAIL_DOMAIN') # Can be None/empty

    # Providers
    LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'placeholder')
    EMBEDDING_PROVIDER = os.environ.get('EMBEDDING_PROVIDER', 'placeholder')
    
    # Support multiple keys for rotation (comma-separated)
    keys_env = os.environ.get('GEMINI_API_KEYS') or os.environ.get('GEMINI_API_KEY') or os.environ.get('Gemini_API_KEY')
    GEMINI_API_KEYS = [k.strip() for k in keys_env.split(',')] if keys_env else []
    
    # Fallback to the first key if needed by older parts of code
    GEMINI_API_KEY = GEMINI_API_KEYS[0] if GEMINI_API_KEYS else None
    
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    GEMINI_API_BASE_URL = os.environ.get('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta')

    # Robustness Configurations
    MAX_RETRIES = int(os.environ.get('MAX_RETRIES', 5))
    INITIAL_BACKOFF = float(os.environ.get('INITIAL_BACKOFF', 2.0))
    MAX_BACKOFF = float(os.environ.get('MAX_BACKOFF', 32.0))
    REQUESTS_PER_MINUTE = int(os.environ.get('REQUESTS_PER_MINUTE', 15))
    EVAL_BATCH_SIZE = int(os.environ.get('EVAL_BATCH_SIZE', 5))
    LLM_CACHE_ENABLED = os.environ.get('LLM_CACHE_ENABLED', 'True').lower() in ('true', '1', 't')
