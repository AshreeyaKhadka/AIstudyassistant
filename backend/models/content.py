from config import db
from datetime import datetime
from sqlalchemy import Index, text

class Subject(db.Model):
    __tablename__ = 'subjects'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    catalog_key = db.Column(db.String(255), nullable=True)
    semester = db.Column(db.Integer, nullable=False)
    code = db.Column(db.String(50), nullable=True)
    credits = db.Column(db.Integer, default=3, nullable=True)
    is_current = db.Column(db.Boolean, default=True, nullable=False)
    is_backlog = db.Column(db.Boolean, default=False, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    syllabus_docs = db.relationship('SyllabusDoc', backref='subject', lazy=True)
    uploads = db.relationship('StudentUpload', backref='subject_rel', lazy=True, cascade='all, delete-orphan')

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
    file_url = db.Column(db.String(512), nullable=False)
    parsed_text = db.Column(db.Text, nullable=True)
    size_bytes = db.Column(db.Integer, nullable=False, default=0)
    subject = db.Column(db.String(255), nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    doc_type = db.Column(db.String(50), default='material', nullable=False) # 'material' or 'syllabus'
    syllabus_kind = db.Column(db.String(20), nullable=True)  # 'official' or 'personal'
    is_active_syllabus = db.Column(db.Boolean, default=False, nullable=False)
    embedding_status = db.Column(db.String(50), default='pending')  # pending, indexing, embedded, failed
    embedding_error = db.Column(db.Text, nullable=True)
    extraction_method = db.Column(db.String(50), nullable=True)  # pdf_text, pdf_text_ocr, slide_text, typed_text, ocr
    extraction_quality = db.Column(db.String(50), nullable=True)  # good, partial, low
    native_text_pages = db.Column(db.Integer, default=0, nullable=False)
    ocr_pages = db.Column(db.Integer, default=0, nullable=False)
    processing_status = db.Column(db.String(50), default='uploaded', nullable=False)
    processing_error = db.Column(db.Text, nullable=True)
    processing_warnings = db.Column(db.JSON, nullable=True)
    page_count = db.Column(db.Integer, nullable=True)
    character_count = db.Column(db.Integer, nullable=True)
    content_sha256 = db.Column(db.String(64), nullable=True)
    validation_status = db.Column(db.String(50), default='pending', nullable=False)  # pending, approved, needs_review, rejected, skipped
    validation_error = db.Column(db.Text, nullable=True)
    validation_details = db.Column(db.JSON, nullable=True)
    syllabus_match_score = db.Column(db.Float, nullable=True)
    syllabus_match_coverage = db.Column(db.Float, nullable=True)
    admission_status = db.Column(db.String(50), default='screening', nullable=False)  # screening, admitted, rejected
    admission_error = db.Column(db.Text, nullable=True)
    screening_details = db.Column(db.JSON, nullable=True)
    screened_at = db.Column(db.DateTime, nullable=True)
    mcq_generation_count = db.Column(db.Integer, default=0)
    structured_syllabus = db.Column(db.Text, nullable=True)  # JSON: {syllabus_title, chapters[{chapter_name, units[{unit_name, subtopics[]}]}]}
    syllabus_version = db.Column(db.Integer, default=1, nullable=False)
    syllabus_structure_hash = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('uq_subject_syllabus', 'subject_id', unique=True, sqlite_where=text("doc_type = 'syllabus'")),
        Index('ix_student_upload_content_sha256', 'content_sha256'),
    )
