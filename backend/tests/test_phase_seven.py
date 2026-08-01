import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace

from flask import Flask

from config import db
from models import StudentUpload, Subject, User
from models.exam import Exam
from models.focus import StudySession
from models.progress import TopicProgress
from models.revision import RevisionPlan
from routes.revision import revision_bp
from services.auth_service import generate_token
from services.study_planner_service import _fallback_upload_topics, generate_adaptive_plan, preview_adaptive_plan


class PlannerTopicFallbackTests(unittest.TestCase):
    def test_unmapped_pdf_uses_official_catalog_topics(self):
        subject = SimpleNamespace(
            name='Artificial Intelligence', semester=5,
            catalog_key='sem5-artificial-intelligence',
        )
        upload = SimpleNamespace(
            id=99, filename='knowledge-representation.pdf',
            parsed_text='Chapter 3 Knowledge Representation and Reasoning. Predicate Logic syntax semantics resolution.',
        )

        topics = _fallback_upload_topics(upload, subject)

        self.assertTrue(topics)
        self.assertEqual(topics[0]['mapping_source'], 'official_catalog')
        self.assertTrue(any('Predicate Logic' in topic['topic_title'] for topic in topics))


class AdaptivePlannerTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-seven-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(revision_bp, url_prefix='/revision-plans')
        with self.app.app_context():
            db.create_all()
            user = User(
                google_id='phase7-user', email='phase7@example.com', name='Phase Seven',
                study_daily_minutes=50, study_session_minutes=25, study_start_time='17:00',
                study_days=[0, 1, 2, 3, 4, 5, 6],
            )
            db.session.add(user)
            db.session.flush()
            subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add(subject)
            db.session.flush()
            upload = StudentUpload(
                user_id=user.id, filename='memory.pdf', file_url='memory.pdf', size_bytes=100,
                subject='Operating Systems', subject_id=subject.id, doc_type='material',
                admission_status='admitted', processing_status='ready', embedding_status='embedded',
                validation_status='approved', validation_details={'matched_topics': [
                    {'topic_id': 'topic:paging', 'topic_title': 'Paging'},
                    {'topic_id': 'topic:deadlock', 'topic_title': 'Deadlocks'},
                ]},
            )
            db.session.add(upload)
            db.session.flush()
            second_upload = StudentUpload(
                user_id=user.id, filename='processes.pdf', file_url='processes.pdf', size_bytes=100,
                subject='Operating Systems', subject_id=subject.id, doc_type='material',
                admission_status='admitted', processing_status='ready', embedding_status='embedded',
                validation_status='approved', validation_details={'matched_topics': [
                    {'topic_id': 'topic:scheduling', 'topic_title': 'CPU Scheduling'},
                ]},
            )
            db.session.add(second_upload)
            db.session.flush()
            db.session.add_all([
                TopicProgress(
                    user_id=user.id, subject_id=subject.id, topic_id='topic:paging', topic_title='Paging',
                    covered=True, weak=True, mastery_score=30,
                    next_revision_at=datetime.utcnow() - timedelta(days=1),
                ),
                TopicProgress(
                    user_id=user.id, subject_id=subject.id, topic_id='topic:deadlock', topic_title='Deadlocks',
                    covered=False, weak=False, mastery_score=0,
                ),
                Exam(
                    user_id=user.id, title='OS Final', exam_type='final', subject='Operating Systems',
                    exam_date=(datetime.utcnow().date() + timedelta(days=5)).isoformat(),
                ),
                RevisionPlan(
                    user_id=user.id, title='Manual commitment', subject='Personal', event_type='Personal',
                    revision_date=datetime.utcnow().date().isoformat(), source_type='manual',
                ),
            ])
            db.session.commit()
            self.user_id = user.id
            self.upload_id = upload.id
            self.second_upload_id = second_upload.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_generation_prioritizes_due_weak_topic_and_preserves_manual_plan(self):
        with self.app.app_context():
            user = db.session.get(User, self.user_id)
            result = generate_adaptive_plan(
                user, [self.upload_id, self.second_upload_id], horizon_days=7, replace=True,
            )
            created = result['plans']

            self.assertGreaterEqual(len(created), 3)
            self.assertEqual(created[0]['topic_id'], 'topic:paging')
            self.assertIn('weak topic', created[0]['scheduling_reason'])
            self.assertEqual(created[0]['start_time'], '17:00')
            self.assertIsNotNone(created[0]['upload_id'])
            self.assertEqual({created[0]['upload_id'], created[1]['upload_id']}, {self.upload_id, self.second_upload_id})
            self.assertIsNotNone(RevisionPlan.query.filter_by(title='Manual commitment').first())

    def test_complete_and_skip_actions_update_persistent_learning_state(self):
        with self.app.app_context():
            user = db.session.get(User, self.user_id)
            plans = generate_adaptive_plan(
                user, [self.upload_id, self.second_upload_id], horizon_days=7, replace=True,
            )['plans']
            complete_id = plans[0]['id']
            skip_id = plans[1]['id']
            original_skip_date = plans[1]['revision_date']

        complete_response = self.client.post(f'/revision-plans/{complete_id}/action', json={'action': 'complete'})
        skip_response = self.client.post(f'/revision-plans/{skip_id}/action', json={'action': 'skip'})

        self.assertEqual(complete_response.status_code, 200)
        self.assertEqual(complete_response.get_json()['status'], 'completed')
        self.assertEqual(skip_response.status_code, 200)
        self.assertGreater(skip_response.get_json()['revision_date'], original_skip_date)
        self.assertEqual(skip_response.get_json()['reschedule_count'], 1)
        with self.app.app_context():
            progress = TopicProgress.query.filter_by(topic_id='topic:paging').one()
            self.assertTrue(progress.reviewed)
            self.assertEqual(StudySession.query.filter_by(user_id=self.user_id, completed=True).count(), 1)

    def test_preference_validation_rejects_impossible_session_length(self):
        response = self.client.put('/revision-plans/preferences', json={
            'daily_minutes': 30, 'session_minutes': 60,
        })
        self.assertEqual(response.status_code, 400)

    def test_preview_requires_explicit_owned_ready_documents(self):
        missing = self.client.post('/revision-plans/generate/preview', json={'horizon_days': 7})
        unknown = self.client.post('/revision-plans/generate/preview', json={
            'horizon_days': 7, 'upload_ids': [9999],
        })

        self.assertEqual(missing.status_code, 400)
        self.assertIn('Choose at least one', missing.get_json()['error'])
        self.assertEqual(unknown.status_code, 400)
        self.assertIn('do not belong to you', unknown.get_json()['error'])

    def test_preview_and_generation_are_scoped_to_selected_document(self):
        preview_response = self.client.post('/revision-plans/generate/preview', json={
            'horizon_days': 7, 'upload_ids': [self.second_upload_id],
        })
        self.assertEqual(preview_response.status_code, 200)
        preview = preview_response.get_json()
        self.assertEqual(preview['candidate_count'], 1)
        self.assertEqual(preview['selected_sources'][0]['id'], self.second_upload_id)
        self.assertEqual(preview['modes']['replace']['session_count'], 1)

        response = self.client.post('/revision-plans/generate', json={
            'horizon_days': 7, 'upload_ids': [self.second_upload_id], 'replace': True,
        })
        self.assertEqual(response.status_code, 201)
        created = response.get_json()['created']
        self.assertEqual(len(created), 1)
        self.assertEqual(created[0]['upload_id'], self.second_upload_id)
        self.assertEqual(created[0]['topic_id'], 'topic:scheduling')

    def test_available_slots_skip_timed_manual_conflicts(self):
        with self.app.app_context():
            today = datetime.utcnow().date().isoformat()
            db.session.add(RevisionPlan(
                user_id=self.user_id, title='Existing class', subject='Operating Systems',
                event_type='Study Session', revision_date=today, start_time='17:00', end_time='17:25',
                source_type='manual', status='pending',
            ))
            db.session.commit()
            user = db.session.get(User, self.user_id)
            preview = preview_adaptive_plan(user, [self.upload_id], horizon_days=7)
            plans = generate_adaptive_plan(user, [self.upload_id], horizon_days=7, replace=True)['plans']

        self.assertGreater(preview['modes']['replace']['available_slots'], 0)
        self.assertNotEqual(plans[0]['start_time'], '17:00')


if __name__ == '__main__':
    unittest.main()
