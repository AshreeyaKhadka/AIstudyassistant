import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from config import Config
from models.user import User

def generate_token(user_id):
    """Generates a JWT token for the given user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow()
    }
    encoded_jwt = jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
    return encoded_jwt

def decode_token(token):
    """Decodes a JWT token. Returns payload or None if invalid."""
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.cookies.get('session_token')
        if not token:
            return jsonify({"error": "Unauthorized"}), 401
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        user = User.query.get(payload['user_id'])
        if not user or user.is_banned:
            return jsonify({"error": "User not found or banned"}), 403
            
        return f(user, *args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.cookies.get('session_token')
        if not token:
            return jsonify({"error": "Unauthorized"}), 401
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        user = User.query.get(payload['user_id'])
        if not user or user.is_banned or user.role != 'admin':
            return jsonify({"error": "Forbidden: Admin access required"}), 403
            
        return f(user, *args, **kwargs)
    return decorated_function
