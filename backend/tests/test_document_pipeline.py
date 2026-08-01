import io
import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import fitz
from flask import Flask

from config import db
from models import User, Subject, StudentUpload
from models.ai_usage import AiUsageLog  # noqa: F401 - register model metadata
from routes.upload import _file_sha256, _legacy_processing_status, upload_bp
from services.auth_service import generate_token
from services.document_parser import extract_material_from_path
from services.rag_service import chunk_document, chunk_text_by_page


class DocumentExtractionTests(unittest.TestCase):
    def test_text_extraction_returns_page_marker_and_diagnostics(self):
        with tempfile.TemporaryDirectory() as directory:
            filepath = os.path.join(directory, 'notes.txt')
            with open(filepath, 'w', encoding='utf-8') as output:
                output.write('Operating systems coordinate hardware and software resources. ' * 8)

            text, metadata = extract_material_from_path(filepath, 'notes.txt')

        self.assertTrue(text.startswith('[Page 1]\n'))
        self.assertEqual(metadata['page_count'], 1)
        self.assertEqual(metadata['extraction_method'], 'typed_text')
        self.assertEqual(metadata['extraction_quality'], 'good')
        self.assertGreater(metadata['character_count'], 400)

    def test_empty_pdf_reports_page_warning_without_requiring_ocr(self):
        with tempfile.TemporaryDirectory() as directory:
            filepath = os.path.join(directory, 'empty.pdf')
            document = fitz.open()
            document.new_page()
            document.save(filepath)
            document.close()

            with patch('services.document_parser.Config.GEMINI_API_KEY', None):
                text, metadata = extract_material_from_path(filepath, 'empty.pdf')

        self.assertEqual(text, '')
        self.assertEqual(metadata['page_count'], 1)
        self.assertEqual(metadata['extraction_quality'], 'low')
        self.assertTrue(any('No readable text' in warning for warning in metadata['warnings']))

    def test_content_hash_is_stable(self):
        with tempfile.TemporaryDirectory() as directory:
            first = os.path.join(directory, 'first.txt')
            second = os.path.join(directory, 'second.txt')
            for filepath in (first, second):
                with open(filepath, 'wb') as output:
                    output.write(b'same study material')
            self.assertEqual(_file_sha256(first), _file_sha256(second))


class SemanticChunkingTests(unittest.TestCase):
    def test_chunks_preserve_page_slide_and_heading_metadata(self):
        text = (
            '[Page 2]\n1.2 Virtual Memory\nVirtual memory gives each process a logical address space. '
            'Pages are mapped to frames using page tables.\n\n'
            '[Slide 3]\nPAGE REPLACEMENT\nFIFO and LRU choose different victim pages when memory is full.'
        )

        chunks = chunk_document(text)

        self.assertEqual({chunk['page_number'] for chunk in chunks}, {2, 3})
        self.assertEqual({chunk['locator_type'] for chunk in chunks}, {'page', 'slide'})
        self.assertTrue(any(chunk['heading'] == '1.2 Virtual Memory' for chunk in chunks))
        self.assertTrue(any(chunk['heading'] == 'PAGE REPLACEMENT' for chunk in chunks))
        self.assertEqual(chunk_text_by_page(text), [(chunk['text'], chunk['page_number']) for chunk in chunks])

    def test_legacy_processing_status_remains_compatible(self):
        self.assertEqual(_legacy_processing_status(SimpleNamespace(embedding_status='embedded')), 'ready')
        self.assertEqual(_legacy_processing_status(SimpleNamespace(embedding_status='failed')), 'failed')


class UploadRouteTests(unittest.TestCase):
    def setUp(self):
        self.temp_directory = tempfile.TemporaryDirectory()
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-one-test-key',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(upload_bp, url_prefix='/upload')

        with self.app.app_context():
            db.create_all()
            user = User(google_id='phase1-user', email='phase1@example.com', name='Phase One')
            db.session.add(user)
            db.session.flush()
            subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add(subject)
            db.session.commit()
            self.user_id = user.id
            self.subject_id = subject.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.temp_directory.cleanup()

    @patch('routes.upload.UPLOAD_FOLDER', new_callable=lambda: tempfile.mkdtemp())
    @patch('routes.upload._queue_document_pipeline')
    def test_upload_is_queued_and_duplicate_is_rejected(self, queue_pipeline, temporary_upload_folder):
        self.addCleanup(lambda: os.rmdir(temporary_upload_folder) if os.path.isdir(temporary_upload_folder) and not os.listdir(temporary_upload_folder) else None)
        payload = b'Virtual memory and page replacement study notes.'
        first = self.client.post(
            '/upload/',
            data={
                'subject_id': str(self.subject_id),
                'file': (io.BytesIO(payload), 'memory.txt'),
            },
            content_type='multipart/form-data',
        )

        self.assertEqual(first.status_code, 202)
        self.assertEqual(first.get_json()['upload']['processing_status'], 'screening')
        queue_pipeline.assert_called_once()

        upload_id = first.get_json()['upload']['id']
        with patch('routes.upload.update_document_filename') as update_filename:
            renamed = self.client.patch(
                f'/upload/{upload_id}/name',
                json={'filename': 'virtual-memory.txt'},
            )
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.get_json()['upload']['filename'], 'virtual-memory.txt')
        update_filename.assert_called_once_with(upload_id, 'virtual-memory.txt')

        second = self.client.post(
            '/upload/',
            data={
                'subject_id': str(self.subject_id),
                'file': (io.BytesIO(payload), 'copy.txt'),
            },
            content_type='multipart/form-data',
        )
        self.assertEqual(second.status_code, 409)
        self.assertEqual(second.get_json()['code'], 'duplicate_document')
        with self.app.app_context():
            self.assertEqual(StudentUpload.query.count(), 1)

        with self.app.app_context():
            stored_path = db.session.get(StudentUpload, upload_id).file_url
        if os.path.isfile(stored_path):
            os.remove(stored_path)


if __name__ == '__main__':
    unittest.main()
