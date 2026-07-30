from config import db
from datetime import datetime
import json

class CareerProfile(db.Model):
    __tablename__ = 'career_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Profile Information
    interests = db.Column(db.Text, nullable=True)  # JSON array of interests (e.g., "AI", "Web Dev", "Research")
    skills = db.Column(db.Text, nullable=True)  # JSON array of technical skills
    career_goal = db.Column(db.String(50), nullable=True)  # internship, job, higher_studies, exploring
    
    # Experience Tracking
    has_done_hackathons = db.Column(db.Boolean, default=False)
    has_done_open_source = db.Column(db.Boolean, default=False)
    has_done_internships = db.Column(db.Boolean, default=False)
    has_done_research_papers = db.Column(db.Boolean, default=False)
    has_done_jobs = db.Column(db.Boolean, default=False)
    
    # Experience Details (optional)
    hackathon_details = db.Column(db.Text, nullable=True)  # Short description
    open_source_details = db.Column(db.Text, nullable=True)
    internship_details = db.Column(db.Text, nullable=True)
    research_details = db.Column(db.Text, nullable=True)
    job_details = db.Column(db.Text, nullable=True)
    
    # AI-Generated Guidance (cached)
    ai_analysis = db.Column(db.Text, nullable=True)  # JSON with analysis and recommendations
    ai_motivational_message = db.Column(db.Text, nullable=True)  # Personalized motivation
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='career_profile', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'interests': json.loads(self.interests) if self.interests else [],
            'skills': json.loads(self.skills) if self.skills else [],
            'career_goal': self.career_goal,
            'experience': {
                'hackathons': self.has_done_hackathons,
                'open_source': self.has_done_open_source,
                'internships': self.has_done_internships,
                'research_papers': self.has_done_research_papers,
                'jobs': self.has_done_jobs,
            },
            'experience_details': {
                'hackathon_details': self.hackathon_details,
                'open_source_details': self.open_source_details,
                'internship_details': self.internship_details,
                'research_details': self.research_details,
                'job_details': self.job_details,
            },
            'ai_analysis': json.loads(self.ai_analysis) if self.ai_analysis else None,
            'ai_motivational_message': self.ai_motivational_message,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
