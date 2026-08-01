import json
import unittest
from datetime import datetime
from unittest.mock import patch

from flask import Flask

from config import db
from models import StudentUpload, Subject, User
from models.progress import TopicProgress
from models.quiz import QuizSet
from routes.quiz import quiz_bp
from services.auth_service import generate_token
from services.generation_service import generate_flashcards, generate_mcqs, generate_mock_test


class AssessmentGenerationTests(unittest.TestCase):
    def test_generated_cards_and_mcqs_keep_learning_evidence(self):
        flashcard_payload = {'flashcards': [{
            'front': 'What is paging?', 'back': 'A memory management technique.',
            'topic_title': 'Paging', 'difficulty': 'easy', 'page_number': 4,
        }]}
        mcq_payload = {'mcqs': [{
            'question': 'What does paging divide?',
            'options': {'A': 'Memory', 'B': 'CPU', 'C': 'Files', 'D': 'Threads'},
            'correct': 'A', 'topic_title': 'Paging', 'difficulty': 'medium',
            'explanation': 'Paging divides memory.', 'page_number': 4,
        }]}
        with patch('services.generation_service._call_llm', side_effect=[json.dumps(flashcard_payload), json.dumps(mcq_payload)]):
            cards = generate_flashcards('[Page 4] Paging', count=1)
            mcqs = generate_mcqs('[Page 4] Paging', count=1)

        self.assertEqual(cards[0]['topic_title'], 'Paging')
        self.assertEqual(cards[0]['page_number'], 4)
        self.assertEqual(mcqs[0]['marks'], 1)
        self.assertEqual(mcqs[0]['topic_title'], 'Paging')

    def test_mock_test_requires_and_calculates_exact_marks_blueprint(self):
        sections = []
        for name, marks, count in [('A', 1, 5), ('B', 2, 5), ('C', 5, 3), ('D', 10, 2)]:
            sections.append({
                'name': f'Section {name}', 'marks_each': marks,
                'questions': [{
                    'question': f'{name} question {index}', 'marks': marks,
                    'topic_title': 'Paging', 'page_number': 2,
                    'answer_points': ['Required point'],
                } for index in range(count)],
            })
        with patch('services.generation_service._call_llm', return_value=json.dumps({'sections': sections, 'total_marks': 999})):
            result = generate_mock_test('[Page 2] Paging', 'Operating Systems')

        self.assertEqual(result['total_marks'], 50)
        self.assertEqual(sum(len(section['questions']) for section in result['sections']), 15)


class AssessmentRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-six-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(quiz_bp, url_prefix='/quiz')
        with self.app.app_context():
            db.create_all()
            user = User(google_id='phase6-user', email='phase6@example.com', name='Phase Six')
            db.session.add(user)
            db.session.flush()
            subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add(subject)
            db.session.flush()
            upload = StudentUpload(
                user_id=user.id, filename='memory.pdf', file_url='memory.pdf', size_bytes=100,
                subject='Operating Systems', subject_id=subject.id, doc_type='material',
                admission_status='admitted', processing_status='ready', embedding_status='embedded',
                validation_status='approved', validation_details={'matched_topics': [{
                    'topic_id': 'topic:paging', 'topic_title': 'Paging',
                }]},
            )
            db.session.add(upload)
            db.session.flush()
            mcq = QuizSet(
                user_id=user.id, subject_id=subject.id, upload_id=upload.id, topic='Paging',
                assessment_type='mcq', questions_json=[
                    {'question': 'Q1', 'correct': 'A', 'topic_title': 'Paging'},
                    {'question': 'Q2', 'correct': 'B', 'topic_title': 'Paging'},
                ],
            )
            deck = QuizSet(
                user_id=user.id, subject_id=subject.id, upload_id=upload.id, topic='Paging',
                assessment_type='flashcard', title='Paging Deck', source_metadata={'filename': 'memory.pdf'},
                questions_json=[{'front': 'Define paging', 'back': 'Memory pages', 'topic_title': 'Paging'}],
            )
            db.session.add_all([mcq, deck])
            db.session.commit()
            self.user_id = user.id
            self.mcq_id = mcq.id
            self.deck_id = deck.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_quiz_score_is_computed_from_stored_answers(self):
        response = self.client.post('/quiz/submit', json={
            'quiz_set_id': self.mcq_id,
            'score': 99,
            'answers': {'0': 'A', '1': 'A'},
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['score'], 1)
        with self.app.app_context():
            quiz = db.session.get(QuizSet, self.mcq_id)
            self.assertEqual(quiz.score, 1)
            progress = TopicProgress.query.filter_by(topic_id='topic:paging').one()
            self.assertEqual(progress.mastery_score, 50)

    def test_flashcard_rating_persists_due_date_and_topic_progress(self):
        response = self.client.post(f'/quiz/flashcards/{self.deck_id}/review', json={
            'card_index': 0, 'rating': 'good',
        })

        self.assertEqual(response.status_code, 200)
        review = response.get_json()['card']['review']
        self.assertEqual(review['interval_days'], 3)
        self.assertGreater(datetime.fromisoformat(review['due_at']), datetime.utcnow())
        with self.app.app_context():
            progress = TopicProgress.query.filter_by(topic_id='topic:paging').one()
            self.assertTrue(progress.reviewed)
            self.assertEqual(progress.mastery_score, 75)


if __name__ == '__main__':
    unittest.main()
