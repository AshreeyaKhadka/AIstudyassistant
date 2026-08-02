from flask import Blueprint, jsonify, request, redirect, make_response
from config import Config
from models import User
from config import db
from services.auth_service import generate_token, decode_token, login_required
from authlib.integrations.flask_client import OAuth
import logging

auth_bp = Blueprint('auth', __name__)
oauth = OAuth()
logger = logging.getLogger(__name__)


def _split_name(full_name):
    if not full_name:
        return '', ''

    parts = full_name.strip().split()
    if not parts:
        return '', ''

    first_name = parts[0]
    last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
    return first_name, last_name


def _build_redirect_url(path):
    return f'http://localhost:5173{path}'


def _profile_redirect_for_user(user):
    # Force profile setup every time a user logs in
    return _build_redirect_url('/profile-setup')


def _issue_session_response(user, include_user=False):
    if user.is_banned:
        response = make_response(jsonify({
            "error": "Your account has been banned.",
            "code": "account_banned",
            "ban_reason": user.ban_reason,
        }), 403)
        response.set_cookie('session_token', '', expires=0)
        return response

    jwt_token = generate_token(user.id)
    payload = {"message": "Session created"}
    if include_user:
        payload["user"] = user.to_dict()

    response = make_response(jsonify(payload), 200)
    response.set_cookie('session_token', jwt_token, httponly=True, max_age=7*24*3600, samesite='Lax')
    return response

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
    client_id = Config.GOOGLE_CLIENT_ID
    # If GOOGLE_CLIENT_ID is not configured, trigger Developer Bypass mode
    if not client_id or client_id.startswith('your_') or 'placeholder' in client_id.lower() or 'mock' in client_id.lower() or client_id == 'None':
        logger.info("Google Client ID not configured. Triggering Developer Bypass Login...")
        
        # Find or create a test developer user
        email = 'developer@example.com'
        user = User.query.filter_by(email=email).first()
        if not user:
            first_name, last_name = _split_name('Developer User')
            user = User(
                google_id='mock_dev_id_12345',
                email=email,
                name='Developer User',
                first_name=first_name,
                last_name=last_name,
                avatar_url='https://api.dicebear.com/7.x/bottts/svg?seed=dev'
            )
            try:
                db.session.add(user)
                db.session.commit()
                logger.info("Created new mock developer user in database.")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to create dev user: {e}")
                return jsonify({"error": "Failed to create dev user account"}), 500
        elif user.is_banned:
            response = make_response(jsonify({
                "error": "Your account has been banned.",
                "code": "account_banned",
                "ban_reason": user.ban_reason,
            }), 403)
            response.set_cookie('session_token', '', expires=0)
            return response
        
        # Generate JWT
        jwt_token = generate_token(user.id)
        
        # Set HttpOnly cookie and redirect to setup if the profile is incomplete
        response = make_response(redirect(_profile_redirect_for_user(user)))
        response.set_cookie('session_token', jwt_token, httponly=True, max_age=7*24*3600, samesite='Lax')
        return response

    redirect_uri = request.host_url.rstrip('/') + '/auth/callback'
    try:
        return google.authorize_redirect(redirect_uri)
    except Exception as e:
        logger.error(f"OAuth redirect failed: {e}. Falling back to Developer Bypass...")
        # Fallback to dev bypass if Google registration fails
        email = 'developer@example.com'
        user = User.query.filter_by(email=email).first()
        if not user:
            first_name, last_name = _split_name('Developer User')
            user = User(
                google_id='mock_dev_id_12345',
                email=email,
                name='Developer User',
                first_name=first_name,
                last_name=last_name,
                avatar_url='https://api.dicebear.com/7.x/bottts/svg?seed=dev'
            )
            db.session.add(user)
            db.session.commit()
        jwt_token = generate_token(user.id)
        response = make_response(redirect(_profile_redirect_for_user(user)))
        response.set_cookie('session_token', jwt_token, httponly=True, max_age=7*24*3600, samesite='Lax')
        return response

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
        first_name, last_name = _split_name(user_info.get('name'))
        user = User(
            google_id=user_info.get('sub'),
            email=email,
            name=user_info.get('name'),
            first_name=first_name,
            last_name=last_name,
            avatar_url=user_info.get('picture')
        )
        try:
            db.session.add(user)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to create user: {e}")
            return jsonify({"error": "Failed to create user account"}), 500
    elif user.is_banned:
        response = make_response(jsonify({
            "error": "Your account has been banned.",
            "code": "account_banned",
            "ban_reason": user.ban_reason,
        }), 403)
        response.set_cookie('session_token', '', expires=0)
        return response

    # Generate JWT
    jwt_token = generate_token(user.id)
    
    # Set as HttpOnly Cookie
    response = make_response(redirect(_profile_redirect_for_user(user)))
    response.set_cookie('session_token', jwt_token, httponly=True, max_age=7*24*3600, samesite='Lax')
    
    return response

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    token = request.cookies.get('session_token')
    logger.info(f"Cookies received: {request.cookies}")
    logger.info(f"Token received: {token}")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    
    payload = decode_token(token)
    if not payload:
        logger.error("Token decode failed")
        return jsonify({"error": "Invalid or expired token"}), 401
        
    user = User.query.get(payload['user_id'])
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.is_banned:
        response = make_response(jsonify({
            "error": "Your account has been banned.",
            "code": "account_banned",
            "ban_reason": user.ban_reason,
        }), 403)
        response.set_cookie('session_token', '', expires=0)
        return response
        
    user_data = user.to_dict()
    # Use the DB-derived profile_complete (from to_dict) instead of the JWT onboarded flag.
    # The JWT flag can be stale if it was issued before onboarding completed.
    # to_dict() checks: bool(self.first_name and self.last_name and self.college and self.semester)
    
    return jsonify(user_data), 200


@auth_bp.route('/sync-clerk', methods=['POST'])
def sync_clerk_session():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    clerk_id = (data.get('clerk_id') or data.get('external_id') or data.get('externalId') or '').strip()
    name = (data.get('name') or '').strip()
    first_name = (data.get('first_name') or data.get('firstName') or '').strip()
    last_name = (data.get('last_name') or data.get('lastName') or '').strip()
    avatar_url = (data.get('avatar_url') or data.get('avatarUrl') or '').strip()
    requested_role = (data.get('role') or '').strip().lower()

    if not email:
        return jsonify({"error": "Email is required."}), 400

    if not name:
        name = ' '.join(part for part in [first_name, last_name] if part).strip() or email.split('@')[0]

    if not first_name and not last_name:
        first_name, last_name = _split_name(name)

    user = User.query.filter_by(email=email).first()
    if not user and clerk_id:
        user = User.query.filter_by(google_id=clerk_id).first()

    if not user:
        user = User(
            google_id=clerk_id or email,
            email=email,
            name=name,
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url or None,
            role=requested_role if requested_role in ('admin', 'student') else 'student',
        )
        db.session.add(user)
    else:
        if user.is_banned:
            response = make_response(jsonify({
                "error": "Your account has been banned.",
                "code": "account_banned",
                "ban_reason": user.ban_reason,
            }), 403)
            response.set_cookie('session_token', '', expires=0)
            return response
        user.google_id = clerk_id or user.google_id or email
        user.email = email
        # Clerk initializes identity, but the profile form is authoritative once
        # the student has supplied their own name.
        if not user.first_name:
            user.first_name = first_name
        if not user.last_name:
            user.last_name = last_name
        if not user.name:
            user.name = name
        if avatar_url:
            user.avatar_url = avatar_url
        if requested_role == 'admin':
            user.role = 'admin'

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to sync Clerk session: {e}")
        return jsonify({"error": "Failed to sync session"}), 500

    return _issue_session_response(user, include_user=True)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({"message": "Logged out"}))
    response.set_cookie('session_token', '', expires=0)
    return response

@auth_bp.route('/onboard', methods=['POST'])
def onboard():
    data = request.get_json(silent=True) or {}
    first_name = (data.get('first_name') or data.get('firstName') or '').strip()
    last_name = (data.get('last_name') or data.get('lastName') or '').strip()
    college = data.get('college')
    semester = data.get('semester')
    email = (data.get('email') or '').strip().lower()
    external_id = (data.get('external_id') or data.get('externalId') or data.get('clerk_id') or '').strip()
    # Accept role from frontend (Clerk metadata sync)
    requested_role = (data.get('role') or '').strip().lower()

    if not first_name or not last_name or not college or not semester:
        return jsonify({"error": "First name, last name, college, and semester are required."}), 400

    token = request.cookies.get('session_token')
    user = None

    if token:
        payload = decode_token(token)
        if payload:
            user = User.query.get(payload['user_id'])

    if user is None:
        if email:
            user = User.query.filter_by(email=email).first()

    if user is None:
        if not email:
            return jsonify({"error": "Email is required when no session is available."}), 400
        user = User(
            google_id=external_id or email,
            email=email,
            name=f'{first_name} {last_name}'.strip(),
            first_name=first_name,
            last_name=last_name,
            avatar_url=data.get('avatar_url') or data.get('avatarUrl'),
            role=requested_role if requested_role in ('admin', 'student') else 'student',
        )
        db.session.add(user)
    else:
        if user.is_banned:
            response = make_response(jsonify({
                "error": "Your account has been banned.",
                "code": "account_banned",
                "ban_reason": user.ban_reason,
            }), 403)
            response.set_cookie('session_token', '', expires=0)
            return response
        user.name = f'{first_name} {last_name}'.strip()
        user.first_name = first_name
        user.last_name = last_name
        if college:
            user.college = college
        if data.get('avatar_url') or data.get('avatarUrl'):
            user.avatar_url = data.get('avatar_url') or data.get('avatarUrl')
        # Sync role from Clerk metadata (allow promotion, not demotion by self)
        if requested_role == 'admin':
            user.role = 'admin'

    if college:
        user.college = college
    try:
        user.semester = int(semester)
    except (ValueError, TypeError):
        return jsonify({"error": "Semester must be a number"}), 400

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to onboard user: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

    jwt_token = generate_token(user.id, onboarded=True)
    response = make_response(jsonify({"message": "Profile updated", "user": user.to_dict()}), 200)
    response.set_cookie('session_token', jwt_token, httponly=True, max_age=7*24*3600, samesite='Lax')
    return response
