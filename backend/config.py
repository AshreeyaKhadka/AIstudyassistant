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
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('Gemini_API_KEY')
    GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    GEMINI_API_BASE_URL = os.environ.get('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com/v1')
