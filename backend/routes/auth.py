from flask import Blueprint, jsonify, request, redirect, make_response
from config import Config
from models import User
from config import db
from services.auth_service import generate_token, decode_token, login_required
from authlib.integrations.flask_client import OAuth

auth_bp = Blueprint('auth', __name__)
oauth = OAuth()

# Setup Google OAuth
google = oauth.register(
    name='google',
    client_id=Config.GOOGLE_CLIENT_ID,
    client_secret=Config.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@auth_bp.route('/login')
def login():
    redirect_uri = request.host_url.rstrip('/') + '/auth/callback'
    return google.authorize_redirect(redirect_uri)

@auth_bp.route('/callback')
def auth_callback():
    token = google.authorize_access_token()
    user_info = token.get('userinfo')
    
    if not user_info:
        return jsonify({"error": "Google auth failed"}), 400

    email = user_info.get('email')
    
    # Optional Domain Restriction
    if Config.ALLOWED_EMAIL_DOMAIN and not email.endswith('@' + Config.ALLOWED_EMAIL_DOMAIN):
        return jsonify({"error": f"Must use an official {Config.ALLOWED_EMAIL_DOMAIN} account"}), 403

    user = User.query.filter_by(google_id=user_info.get('sub')).first()
    
    if not user:
        user = User(
            google_id=user_info.get('sub'),
            email=email,
            name=user_info.get('name'),
            avatar_url=user_info.get('picture')
        )
        db.session.add(user)
        db.session.commit()
    elif user.is_banned:
        return jsonify({"error": "Your account is banned"}), 403

    # Generate JWT
    jwt_token = generate_token(user.id)
    
    # Set as HttpOnly Cookie
    response = make_response(redirect('http://localhost:5173/dashboard')) # redirect to frontend dashboard
    response.set_cookie('session_token', jwt_token, httponly=True, max_age=7*24*3600, samesite='Lax')
    
    return response

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    token = request.cookies.get('session_token')
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    
    payload = decode_token(token)
    if not payload:
        return jsonify({"error": "Invalid or expired token"}), 401
        
    user = User.query.get(payload['user_id'])
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify(user.to_dict()), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({"message": "Logged out"}))
    response.set_cookie('session_token', '', expires=0)
    return response

@auth_bp.route('/onboard', methods=['POST'])
@login_required
def onboard(current_user):
    data = request.json
    name = data.get('name')
    college = data.get('college')
    semester = data.get('semester')

    if not name or not college or not semester:
        return jsonify({"error": "Name, college, and semester are required."}), 400

    user = current_user

    user.name = name
    user.college = college
    
    try:
        user.semester = int(semester)
    except ValueError:
        return jsonify({"error": "Semester must be a number"}), 400
        
    db.session.commit()
    return jsonify({"message": "Onboarding complete", "user": user.to_dict()}), 200
