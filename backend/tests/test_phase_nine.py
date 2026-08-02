import unittest

from flask import Flask

from config import db
from models import StudySession, Subject, User
from routes.focus import focus_bp
from routes.syllabus import syllabus_bp
from services.auth_service import generate_token


class FocusAndSemesterTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-nine-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(focus_bp, url_prefix='/focus')
        self.app.register_blueprint(syllabus_bp, url_prefix='/syllabus')
        with self.app.app_context():
            db.create_all()
            user = User(
                google_id='phase9-user', email='phase9@example.com', name='Phase Nine', semester=3,
            )
            db.session.add(user)
            db.session.flush()
            current = Subject(
                user_id=user.id, name='Operating Systems', semester=3,
                catalog_key='sem3-operating-systems', is_current=True,
            )
            hidden = Subject(
                user_id=user.id, name='Artificial Intelligence', semester=5,
                catalog_key='sem5-artificial-intelligence', is_current=False, is_backlog=False,
            )
            db.session.add_all([current, hidden])
            db.session.commit()
            self.user_id = user.id
            self.current_id = current.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_subjects_default_to_current_and_explicit_additions(self):
        active = self.client.get('/syllabus/subjects').get_json()
        self.assertEqual([item['name'] for item in active], ['Operating Systems'])

        response = self.client.post('/syllabus/subjects/additional', json={
            'catalog_key': 'sem5-artificial-intelligence',
        })
        self.assertEqual(response.status_code, 201)
        active = self.client.get('/syllabus/subjects').get_json()
        self.assertEqual({item['name'] for item in active}, {'Operating Systems', 'Artificial Intelligence'})

    def test_additional_subject_limit_is_enforced(self):
        keys = [
            'sem4-computer-architecture', 'sem4-theory-of-computation',
            'sem5-artificial-intelligence', 'sem5-embedded-systems',
        ]
        for key in keys:
            self.assertEqual(self.client.post('/syllabus/subjects/additional', json={'catalog_key': key}).status_code, 201)
        response = self.client.post('/syllabus/subjects/additional', json={'catalog_key': 'sem6-machine-learning'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('4/4', response.get_json()['error'])

    def test_completed_focus_session_gets_safe_fallback_recall(self):
        created = self.client.post('/focus/sessions', json={
            'subject_id': self.current_id, 'topic': 'Deadlocks',
            'duration_minutes': 25, 'completed': True,
        })
        self.assertEqual(created.status_code, 201)
        session_id = created.get_json()['id']

        recall = self.client.post(f'/focus/sessions/{session_id}/recall-question')
        self.assertEqual(recall.status_code, 200)
        self.assertFalse(recall.get_json()['grounded'])
        self.assertIn('Deadlocks', recall.get_json()['question'])
        with self.app.app_context():
            self.assertIsNotNone(db.session.get(StudySession, session_id).recall_question)

    def test_focus_history_includes_saved_recall_answer(self):
        created = self.client.post('/focus/sessions', json={
            'subject_id': self.current_id, 'topic': 'Paging',
            'duration_minutes': 25, 'completed': True,
        })
        self.assertEqual(created.status_code, 201)
        session_id = created.get_json()['id']

        self.assertEqual(self.client.post(f'/focus/sessions/{session_id}/recall-question').status_code, 200)
        answer = self.client.post(f'/focus/sessions/{session_id}/recall-answer', json={
            'answer': 'Paging divides virtual memory into fixed-size pages mapped to frames.',
        })
        self.assertEqual(answer.status_code, 200)

        history = self.client.get('/focus/sessions')
        self.assertEqual(history.status_code, 200)
        saved = history.get_json()[0]
        self.assertEqual(saved['id'], session_id)
        self.assertIn('Paging divides virtual memory', saved['recall_answer'])
        self.assertIsNotNone(saved['recall_question'])
        self.assertIsNotNone(saved['recall_feedback'])
        self.assertNotIn('saved', saved['recall_feedback'].lower())
        self.assertEqual(
            saved['recall_feedback'],
            'Automated scoring is unavailable. Compare your answer with your notes and identify one important point you missed.',
        )
        self.assertEqual(saved['recall_citations'], [])
        self.assertEqual(
            saved['recall_next_step'],
            'Review the relevant section once, then explain it again without looking.',
        )


if __name__ == '__main__':
    unittest.main()
