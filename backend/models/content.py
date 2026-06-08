from config import db
from datetime import datetime

class Subject(db.Model):
    __tablename__ = 'subjects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)

    syllabus_docs = db.relationship('SyllabusDoc', backref='subject', lazy=True)

class SyllabusDoc(db.Model):
    __tablename__ = 'syllabus_docs'
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(512), nullable=False)
    embedding_status = db.Column(db.String(50), default='pending') # pending, embedded, placeholder
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    doc_embeddings = db.relationship(
        'DocEmbedding', 
        primaryjoin="and_(SyllabusDoc.id==foreign(DocEmbedding.doc_id), DocEmbedding.doc_type=='syllabus')",
        lazy='dynamic'
    )

class StudentUpload(db.Model):
    __tablename__ = 'student_uploads'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_size = db.Column(db.Integer, nullable=False, default=0) # Size in bytes
    subject = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(512), nullable=False)
    parsed_text = db.Column(db.Text, nullable=True)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'subject': self.subject,
            'storage_path': self.storage_path,
            'upload_date': self.upload_date.isoformat(),
            'created_at': self.created_at.isoformat()
        }

