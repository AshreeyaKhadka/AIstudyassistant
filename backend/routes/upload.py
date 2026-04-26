from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import fitz  # PyMuPDF
from config import db
from models.content import StudentUpload
from services.auth_service import login_required
import os

upload_bp = Blueprint('upload', __name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@upload_bp.route('/', methods=['POST'])
@login_required
def upload_pdf(user):
    # Check limit
    upload_count = StudentUpload.query.filter_by(uploader_id=user.id).count()
    if upload_count >= 10:
        return jsonify({"error": "Upload limit of 10 PDFs reached."}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"{user.id}_{filename}")
        file.save(filepath)
        
        # Parse PDF using PyMuPDF
        text = ""
        try:
            doc = fitz.open(filepath)
            for page in doc:
                text += page.get_text()
            doc.close()
        except Exception as e:
            return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 500
            
        # Create DB record mapping to the user
        upload = StudentUpload(
            title=filename,
            file_url=filepath,  # In real life, might be S3 URL
            parsed_text=text,
            uploader_id=user.id
        )
        db.session.add(upload)
        db.session.commit()
        
        # Truncating parse text for response
        return jsonify({
            "message": "File uploaded and parsed successfully",
            "upload_id": upload.id,
            "parsed_preview": text[:200]
        }), 200
        
    return jsonify({"error": "Invalid file type, only PDF allowed"}), 400

@upload_bp.route('/', methods=['GET'])
@login_required
def get_uploads(user):
    uploads = StudentUpload.query.filter_by(uploader_id=user.id).all()
    return jsonify([{"id": u.id, "title": u.title, "uploaded_at": u.uploaded_at} for u in uploads]), 200
