import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from flask import Flask

from config import db
from models import QuizSet, StudentUpload, Subject, User
from models.progress import TopicProgress
from models.revision import RevisionPlan
from routes.progress import progress_bp
from routes.quiz import quiz_bp
from services.auth_service import generate_token


class ProgressTruthTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-eight-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(progress_bp, url_prefix='/progress')
        self.app.register_blueprint(quiz_bp, url_prefix='/quiz')
        with self.app.app_context():
            db.create_all()
            user = User(google_id='phase8-user', email='phase8@example.com', name='Phase Eight')
            db.session.add(user)
            db.session.flush()
            ai = Subject(user_id=user.id, name='Artificial Intelligence', semester=5)
            os_subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add_all([ai, os_subject])
            db.session.flush()
            upload = StudentUpload(
                user_id=user.id, filename='ai-notes.pdf', file_url='ai-notes.pdf', size_bytes=100,
                subject=ai.name, subject_id=ai.id, doc_type='material', admission_status='admitted',
                processing_status='ready', embedding_status='embedded', validation_status='approved',
                validation_details={'matched_topics': [
                    {'topic_id': 'ai:search', 'topic_title': 'Search'},
                    {'topic_id': 'ai:logic', 'topic_title': 'Predicate Logic'},
                ]},
            )
            db.session.add(upload)
            db.session.flush()
            db.session.add_all([
                TopicProgress(
                    user_id=user.id, subject_id=ai.id, topic_id='ai:search', topic_title='Search',
                    covered=True, practiced=True, mastery_score=75,
                ),
                TopicProgress(
                    user_id=user.id, subject_id=ai.id, topic_id='ai:logic', topic_title='Predicate Logic',
                    covered=False, weak=True, mastery_score=30,
                ),
                TopicProgress(
                    user_id=user.id, subject_id=os_subject.id, topic_id='os:paging', topic_title='Paging',
                    covered=False, weak=True, mastery_score=20,
                ),
            ])
            questions = [
                {'question': f'Question {index}', 'correct': 'A', 'difficulty': 'medium', 'topic_title': 'Search'}
                for index in range(4)
            ]
            db.session.add(QuizSet(
                user_id=user.id, subject_id=ai.id, upload_id=upload.id, topic=ai.name,
                assessment_type='mcq', questions_json=questions, score=3,
                completed_at=datetime.utcnow(), attempt_json={'results': [
                    {'index': 0, 'selected': 'A', 'correct': 'A', 'is_correct': True, 'topic_title': 'Search'},
                    {'index': 1, 'selected': 'B', 'correct': 'A', 'is_correct': False, 'topic_title': 'Search'},
                    {'index': 2, 'selected': 'A', 'correct': 'A', 'is_correct': True, 'topic_title': 'Search'},
                    {'index': 3, 'selected': 'A', 'correct': 'A', 'is_correct': True, 'topic_title': 'Search'},
                ]},
            ))
            db.session.add(RevisionPlan(
                user_id=user.id, subject_id=ai.id, upload_id=upload.id,
                topic_id='ai:logic', topic_title='Predicate Logic', title='Revise: Predicate Logic',
                subject=ai.name, revision_date=datetime.utcnow().date().isoformat(),
                start_time='18:00', end_time='18:25', source_type='adaptive', status='pending',
                duration_minutes=25,
            ))
            db.session.commit()
            self.user_id = user.id
            self.upload_id = upload.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_overview_reports_actual_coverage_and_weighted_accuracy(self):
        response = self.client.get('/progress/overview')

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['stats']['average_score'], 75.0)
        self.assertEqual(payload['stats']['total_quizzes_taken'], 1)
        self.assertEqual(payload['uploads'][0]['covered_count'], 1)
        self.assertEqual(payload['uploads'][0]['coverage_percent'], 50)
        self.assertEqual(payload['stats']['total_topics'], 2)
        self.assertEqual(payload['stats']['weak_topics'], 1)
        self.assertEqual(len(payload['subjects']), 1)

    def test_mistake_ledger_contains_only_incorrect_attempts(self):
        response = self.client.get('/progress/mistakes?subject=Artificial%20Intelligence')

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['total_mistakes'], 1)
        self.assertEqual(payload['recent_mistakes'][0]['question_index'], 1)
        self.assertEqual(payload['recent_mistakes'][0]['selected_answer'], 'B')

    def test_weekly_plan_is_the_persisted_rolling_planner_schedule(self):
        response = self.client.get('/progress/weekly-plan')

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['source'], 'study_planner')
        self.assertEqual(payload['stats']['topics_scheduled'], 1)
        self.assertEqual(len(payload['weekly_plan']), 7)
        task = payload['weekly_plan'][0]['tasks'][0]
        self.assertEqual(task['upload_id'], self.upload_id)
        self.assertEqual(task['filename'], 'ai-notes.pdf')
        self.assertEqual(task['start_time'], '18:00')
        self.assertEqual(task['type'], 'scheduled')

    @patch('routes.progress._generate_ai_coaching', return_value={})
    def test_subject_recommendations_filter_uses_subject_relation(self, _coaching):
        response = self.client.get('/progress/recommendations?subject=Artificial%20Intelligence')

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['stats']['total_topics'], 2)
        self.assertEqual(payload['stats']['weak_count'], 1)
        self.assertEqual(payload['stats']['total_quizzes'], 1)

    def test_legacy_quiz_generation_cannot_create_mock_questions(self):
        response = self.client.post('/quiz/generate', json={'topic': 'Artificial Intelligence'})

        self.assertEqual(response.status_code, 400)
        self.assertIn('selected study document', response.get_json()['error'])
        with self.app.app_context():
            self.assertEqual(QuizSet.query.count(), 1)


if __name__ == '__main__':
    unittest.main()
