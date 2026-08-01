import json
import io
import tempfile
import unittest
from unittest.mock import patch

import fitz
from flask import Flask

from config import db
from models import StudentUpload, Subject, User
from routes.auth import auth_bp
from routes.search import search_bp
from services.auth_service import generate_token
from services.syllabus_admission import validate_personal_syllabus
from services.generation_service import generate_exam_questions
from routes.exam_prep import _resolve_exact_exam_pdf
from services.exam_prep_service import get_exam_prep_overview
from routes.syllabus import syllabus_bp


class AccountAndSearchRegressionTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-ten-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(auth_bp, url_prefix='/auth')
        self.app.register_blueprint(search_bp, url_prefix='/search')
        with self.app.app_context():
            db.create_all()
            first = User(
                google_id='clerk-first', email='first@example.com', name='Saved Student',
                first_name='Saved', last_name='Student', college='PoU', semester=3,
            )
            second = User(
                google_id='clerk-second', email='second@example.com', name='Other Student',
                first_name='Other', last_name='Student', college='PoU', semester=3,
            )
            db.session.add_all([first, second])
            db.session.flush()
            first_subject = Subject(user_id=first.id, name='Operating Systems', semester=3)
            second_subject = Subject(user_id=second.id, name='Private Robotics', semester=3)
            db.session.add_all([first_subject, second_subject])
            db.session.flush()
            db.session.add(StudentUpload(
                user_id=second.id, subject_id=second_subject.id, subject=second_subject.name,
                filename='private-robotics.pdf', file_url='private.pdf', size_bytes=100,
                doc_type='material', processing_status='ready', embedding_status='embedded',
            ))
            db.session.commit()
            self.first_id = first.id

        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_clerk_sync_does_not_overwrite_completed_profile_name(self):
        response = self.client.post('/auth/sync-clerk', json={
            'clerk_id': 'clerk-first', 'email': 'first@example.com',
            'name': 'Clerk Automatic', 'first_name': 'Clerk', 'last_name': 'Automatic',
        })
        self.assertEqual(response.status_code, 200)
        with self.app.app_context():
            user = db.session.get(User, self.first_id)
            self.assertEqual((user.first_name, user.last_name), ('Saved', 'Student'))

    def test_search_never_returns_another_users_content(self):
        self.client.set_cookie('session_token', generate_token(self.first_id))
        response = self.client.get('/search?q=robotics')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [])


class PersonalSyllabusAdmissionTests(unittest.TestCase):
    def test_ai_rejects_a_project_report_that_mentions_the_subject(self):
        subject = type('SubjectValue', (), {
            'name': 'Software Engineering', 'semester': 5, 'catalog_key': None,
        })()
        answer = {
            'is_syllabus': False, 'subject_relevance': 'relevant', 'confidence': 0.98,
            'detected_subject': 'Software Engineering',
            'reason': 'This is a project proposal, not a course syllabus.',
        }
        with patch('services.syllabus_admission.call_chat', return_value=json.dumps(answer)):
            result = validate_personal_syllabus(
                subject,
                'Software Engineering project proposal. Chapter 1 introduction. '
                'The team will build and evaluate a student assistant application. ' * 5,
            )
        self.assertEqual(result['admission_status'], 'rejected')
        self.assertEqual(result['validation_status'], 'rejected')

    def test_exam_questions_use_only_five_and_eight_marks_with_evidence(self):
        context = '[Page 2]\nVirtual memory maps logical pages to physical frames using page tables.'
        payload = {'exam_questions': [
            {
                'question': f'Question {index}',
                'type': 'long_answer' if index < 2 else 'short_note',
                'marks': 8 if index < 2 else 5,
                'source_page': 2,
                'source_basis': 'logical pages to physical frames using page tables',
                'key_points': ['Explain the mapped concept'],
            }
            for index in range(4)
        ]}
        with patch('services.generation_service._call_llm', return_value=json.dumps(payload)):
            questions = generate_exam_questions(context, subject='Operating Systems')

        self.assertEqual(len(questions), 4)
        self.assertEqual([question['marks'] for question in questions].count(8), 2)
        self.assertEqual([question['marks'] for question in questions].count(5), 2)
        self.assertTrue(all(question['source_page'] == 2 for question in questions))


class StrictExamSourceTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='strict-exam-source-key',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        with self.app.app_context():
            db.create_all()
            user = User(google_id='exam-user', email='exam@example.com', name='Exam User')
            other = User(google_id='other-exam-user', email='other-exam@example.com', name='Other')
            db.session.add_all([user, other])
            db.session.flush()
            subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add(subject)
            db.session.flush()
            valid = StudentUpload(
                user_id=user.id, subject_id=subject.id, subject=subject.name,
                filename='memory.pdf', file_url='memory.pdf', size_bytes=100,
                doc_type='material', admission_status='admitted', validation_status='approved',
                processing_status='ready', embedding_status='embedded',
            )
            syllabus = StudentUpload(
                user_id=user.id, subject_id=None, subject=subject.name,
                filename='syllabus.pdf', file_url='syllabus.pdf', size_bytes=100,
                doc_type='syllabus', syllabus_kind='personal', admission_status='admitted',
                validation_status='approved', processing_status='ready', embedding_status='embedded',
            )
            other_pdf = StudentUpload(
                user_id=other.id, subject='Operating Systems', filename='private.pdf',
                file_url='private.pdf', size_bytes=100, doc_type='material',
                admission_status='admitted', validation_status='approved',
                processing_status='ready', embedding_status='embedded',
            )
            db.session.add_all([valid, syllabus, other_pdf])
            db.session.commit()
            self.user_id = user.id
            self.valid_id = valid.id
            self.syllabus_id = syllabus.id
            self.other_id = other_pdf.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_exact_exam_source_accepts_only_owned_ready_material_pdf(self):
        with self.app.app_context():
            user = db.session.get(User, self.user_id)
            self.assertEqual(_resolve_exact_exam_pdf(user, self.valid_id, 'Operating Systems').id, self.valid_id)
            self.assertIsNone(_resolve_exact_exam_pdf(user, self.syllabus_id, 'Operating Systems'))
            self.assertIsNone(_resolve_exact_exam_pdf(user, self.other_id, 'Operating Systems'))

    def test_overview_uses_ready_pdfs_across_semesters_and_hides_empty_seeded_subjects(self):
        with self.app.app_context():
            user = db.session.get(User, self.user_id)
            user.semester = 4
            db.session.add(Subject(
                user_id=user.id, name='Advanced Programming with Java', semester=4,
            ))
            uploaded_subject = db.session.get(StudentUpload, self.valid_id).subject_rel
            uploaded_subject.semester = 5
            db.session.commit()

            overview = get_exam_prep_overview(user)

        self.assertEqual([item['name'] for item in overview['subjects']], ['Operating Systems'])
        self.assertEqual(overview['subjects'][0]['semester'], 5)
        self.assertEqual(overview['subjects'][0]['primary_upload_id'], self.valid_id)
        self.assertEqual(len(overview['subjects'][0]['eligible_materials']), 1)
        self.assertNotIn('syllabus_coverage', overview['subjects'][0])
        self.assertEqual(overview['subjects'][0]['status_label'], '1 ready PDF')


class AtomicPersonalSyllabusUploadTests(unittest.TestCase):
    def setUp(self):
        self.temp_directory = tempfile.TemporaryDirectory()
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='atomic-syllabus-key',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(syllabus_bp, url_prefix='/syllabus')
        with self.app.app_context():
            db.create_all()
            user = User(
                google_id='syllabus-user', email='syllabus@example.com', name='Syllabus User', semester=3,
            )
            db.session.add(user)
            db.session.commit()
            self.user_id = user.id
        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.temp_directory.cleanup()

    @staticmethod
    def _text_pdf_bytes():
        document = fitz.open()
        page = document.new_page()
        page.insert_text(
            (72, 72),
            'Course Content\nUnit 1 Operating System Structure\nProcesses and scheduling.',
        )
        content = document.tobytes()
        document.close()
        return content

    @staticmethod
    def _scanned_pdf_bytes():
        source = fitz.open()
        source_page = source.new_page()
        source_page.insert_text((72, 72), 'Scanned syllabus page image')
        image = source_page.get_pixmap().tobytes('png')
        source.close()

        document = fitz.open()
        page = document.new_page()
        page.insert_image(page.rect, stream=image)
        content = document.tobytes()
        document.close()
        return content

    def test_non_pdf_file_does_not_create_an_orphan_subject(self):
        with patch('routes.syllabus.UPLOAD_FOLDER', self.temp_directory.name):
            response = self.client.post('/syllabus/workspace/personal', data={
                'semester': '3', 'subject': 'Operating Systems',
                'file': (io.BytesIO(b''), 'empty.txt'),
            }, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['code'], 'pdf_required')
        with self.app.app_context():
            self.assertEqual(Subject.query.count(), 0)

    def test_subject_and_upload_are_created_together_after_extraction(self):
        with patch('routes.syllabus.UPLOAD_FOLDER', self.temp_directory.name), patch(
            'routes.syllabus._start_personal_syllabus_pipeline'
        ):
            response = self.client.post('/syllabus/workspace/personal', data={
                'semester': '3', 'subject': 'Operating Systems', 'credits': '3',
                'file': (io.BytesIO(self._text_pdf_bytes()), 'operating-systems.pdf'),
            }, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 202)
        with self.app.app_context():
            self.assertEqual(Subject.query.count(), 1)
            self.assertEqual(StudentUpload.query.count(), 1)

    def test_scanned_pdf_is_rejected_without_ocr_or_database_records(self):
        with patch('routes.syllabus.UPLOAD_FOLDER', self.temp_directory.name), patch(
            'services.document_parser._ocr_image_bytes',
        ) as ocr:
            response = self.client.post('/syllabus/workspace/personal', data={
                'semester': '3', 'subject': 'Operating Systems',
                'file': (io.BytesIO(self._scanned_pdf_bytes()), 'scanned-syllabus.pdf'),
            }, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['code'], 'scanned_pdf_unsupported')
        ocr.assert_not_called()
        with self.app.app_context():
            self.assertEqual(Subject.query.count(), 0)
            self.assertEqual(StudentUpload.query.count(), 0)


if __name__ == '__main__':
    unittest.main()
