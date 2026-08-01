import json
import os
import tempfile
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

import fitz
from flask import Flask

from config import db
from models import StudentUpload, Subject, User
from models.progress import TopicProgress
from models.revision import RevisionPlan
from routes.progress import progress_bp
from services.auth_service import generate_token
from services.document_admission import screen_document_content
from services.document_parser import _should_ocr_pdf_page, extract_material_from_path
from services.generation_service import parse_syllabus_hierarchy


class SelectiveOcrTests(unittest.TestCase):
    def test_short_native_text_page_without_scan_image_does_not_call_ocr(self):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, 'short.pdf')
            document = fitz.open()
            page = document.new_page()
            page.insert_text((72, 72), 'Unit I')
            document.save(path)
            document.close()

            with patch('services.document_parser.Config.GEMINI_API_KEY', 'configured'), \
                    patch('services.document_parser._ocr_image_bytes') as ocr:
                text, metadata = extract_material_from_path(path, 'short.pdf')

        ocr.assert_not_called()
        self.assertIn('Unit I', text)
        self.assertEqual(metadata['extraction_method'], 'pdf_text')
        self.assertEqual(metadata['native_text_pages'], 1)
        self.assertEqual(metadata['ocr_pages'], 0)

    def test_image_backed_page_without_text_is_selected_for_ocr(self):
        page = SimpleNamespace(
            rect=SimpleNamespace(width=100, height=100),
            get_image_info=lambda xrefs=False: [{'bbox': (0, 0, 100, 100)}],
        )

        self.assertTrue(_should_ocr_pdf_page(page, ''))
        self.assertFalse(_should_ocr_pdf_page(page, 'This page already has enough native searchable text.'))


class AdmissionClassifierTests(unittest.TestCase):
    subject = SimpleNamespace(
        name='Software Engineering',
        semester=5,
        catalog_key='sem5-software-engineering',
    )

    def classify(self, payload):
        with patch('services.document_admission.call_chat', return_value=json.dumps(payload)):
            return screen_document_content(self.subject, 'Software project notes about process models and requirements.')

    def test_relevant_content_is_admitted_and_mapped_to_catalog_topics(self):
        result = self.classify({
            'relevance': 'relevant',
            'confidence': 0.92,
            'academic_content': True,
            'detected_subject': 'Software Engineering',
            'matched_topics': ['Software Development Lifecycle'],
            'reason': 'The notes discuss a core software engineering process.',
            'warning': '',
        })

        self.assertEqual(result['admission_status'], 'admitted')
        self.assertEqual(result['validation_status'], 'approved')
        self.assertTrue(result['matched_topics'][0]['topic_id'].startswith('sem5-software-engineering-ch2'))

    def test_partial_content_is_admitted_with_warning(self):
        result = self.classify({
            'relevance': 'partial',
            'confidence': 0.74,
            'academic_content': True,
            'detected_subject': 'Project Management',
            'matched_topics': ['Project estimation'],
            'reason': 'Only part of the document is relevant.',
            'warning': 'Mixed-subject document.',
        })

        self.assertEqual(result['admission_status'], 'admitted')
        self.assertEqual(result['validation_status'], 'needs_review')
        self.assertEqual(result['warning'], 'Mixed-subject document.')

    def test_confident_irrelevant_content_is_rejected(self):
        result = self.classify({
            'relevance': 'irrelevant',
            'confidence': 0.98,
            'academic_content': False,
            'detected_subject': 'Cooking',
            'matched_topics': [],
            'reason': 'The document contains recipes.',
            'warning': '',
        })

        self.assertEqual(result['admission_status'], 'rejected')
        self.assertEqual(result['validation_status'], 'rejected')


class PersonalSyllabusParsingTests(unittest.TestCase):
    def test_course_content_container_becomes_chapter_wise_units(self):
        structured = parse_syllabus_hierarchy('''
        SOFTWARE ENGINEERING
        Course Content
        Unit I: Software Process Models
        1.1 Waterfall model
        1.2 Spiral model
        Unit II - Requirements Engineering
        2.1 Requirements elicitation
        2.2 Requirements validation
        References
        Example textbook
        ''')

        self.assertEqual([chapter['chapter_name'] for chapter in structured['chapters']], [
            'Software Process Models',
            'Requirements Engineering',
        ])
        self.assertEqual(structured['syllabus_title'], 'SOFTWARE ENGINEERING')
        self.assertIn('1.1 Waterfall model', structured['chapters'][0]['units'][0]['subtopics'])
        self.assertNotIn('Example textbook', structured['chapters'][1]['units'][0]['subtopics'])


class WeeklyPlanUploadTopicTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-five-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(progress_bp, url_prefix='/progress')
        with self.app.app_context():
            db.create_all()
            user = User(google_id='phase5-user', email='phase5@example.com', name='Phase Five')
            db.session.add(user)
            db.session.flush()
            subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add(subject)
            db.session.flush()
            upload = StudentUpload(
                user_id=user.id,
                filename='memory.pdf',
                file_url='uploads/memory.pdf',
                size_bytes=100,
                subject='Operating Systems',
                subject_id=subject.id,
                doc_type='material',
                admission_status='admitted',
                processing_status='ready',
                embedding_status='embedded',
                validation_status='approved',
                validation_details={'matched_topics': [{
                    'topic_id': 'topic:paging',
                    'topic_title': 'Paging',
                }]},
            )
            db.session.add(upload)
            db.session.flush()
            db.session.add_all([
                TopicProgress(
                    user_id=user.id, subject_id=subject.id, topic_id='topic:paging',
                    topic_title='Paging', covered=True, weak=True, mastery_score=30,
                ),
                TopicProgress(
                    user_id=user.id, subject_id=subject.id, topic_id='topic:deadlock',
                    topic_title='Deadlocks', covered=False, mastery_score=0,
                ),
                RevisionPlan(
                    user_id=user.id, subject_id=subject.id, upload_id=upload.id,
                    topic_id='topic:paging', topic_title='Paging', title='Revise: Paging',
                    subject='Operating Systems', revision_date=datetime.utcnow().date().isoformat(),
                    start_time='17:00', end_time='17:25', source_type='adaptive', status='pending',
                ),
            ])
            db.session.commit()
            self.user_id = user.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_weekly_plan_only_returns_persisted_document_sessions(self):
        response = self.client.get('/progress/weekly-plan')

        self.assertEqual(response.status_code, 200)
        tasks = [task for day in response.get_json()['weekly_plan'] for task in day['tasks']]
        paging = next(task for task in tasks if task.get('topic_id') == 'topic:paging')
        self.assertEqual(paging['filename'], 'memory.pdf')
        self.assertEqual(paging['source_type'], 'adaptive')
        self.assertFalse(any(task.get('topic_id') == 'topic:deadlock' for task in tasks))


if __name__ == '__main__':
    unittest.main()
