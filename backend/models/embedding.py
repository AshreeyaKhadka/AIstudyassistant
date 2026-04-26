from config import db
from pgvector.sqlalchemy import Vector

class DocEmbedding(db.Model):
    __tablename__ = 'doc_embeddings'
    
    id = db.Column(db.Integer, primary_key=True)
    doc_id = db.Column(db.Integer, nullable=False) 
    doc_type = db.Column(db.String(50), nullable=False) # 'syllabus' or 'upload'
    chunk_text = db.Column(db.Text, nullable=False)
    
    # Needs: `CREATE EXTENSION IF NOT EXISTS vector;` in DB
    # 1536 is OpenAI output dims. Use 384 for sentence_transformers.
    embedding = db.Column(Vector(1536), nullable=True) 

    # Note: doc_id links to either subjects.id OR student_uploads.id depending on doc_type, 
    # hence we didn't enforce a strict DB ForeignKey here constraint to allow polymophic-like behavior.
