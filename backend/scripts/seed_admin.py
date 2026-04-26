import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from config import db
from models.user import User

def seed_admin(email):
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if user:
            user.role = 'admin'
            db.session.commit()
            print(f"User {email} successfully promoted to admin.")
        else:
            print(f"User {email} not found. They must login once via Google OAuth to create an account.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python seed_admin.py <user_email>")
        sys.exit(1)
    
    email_to_promote = sys.argv[1]
    seed_admin(email_to_promote)
