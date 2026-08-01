import unittest
from types import SimpleNamespace
from unittest.mock import patch

from flask import Flask

from config import db
from models import ChatSession, StudentUpload, Subject, User
from models.ai_usage import AiUsageLog  # noqa: F401 - register metadata
from routes.chat import (
    _build_citations,
    _build_retrieval_plan,
    _multi_query_retrieve,
    _select_diverse_context,
    chat_bp,
)
from services.auth_service import generate_token


def syllabus_chunk(score=0.86):
    return {
        'text': 'Paging maps virtual pages to physical frames through a page table.',
        'score': score,
        'metadata': {
            'upload_id': 9,
            'filename': 'operating-systems.pdf',
            'doc_type': 'syllabus',
            'source_type': 'structured_topic',
            'chunk_index': 2,
            'page_number': 4,
            'locator_type': 'page',
            'topic_id': 'topic:paging',
            'topic_title': 'Paging',
            'unit_title': 'Virtual Memory',
            'chapter_title': 'Memory Management',
        },
    }


class RetrievalPlanningTests(unittest.TestCase):
    def test_short_follow_up_is_resolved_with_previous_question(self):
        plan = _build_retrieval_plan(
            'Explain it more simply',
            [{'role': 'user', 'content': 'How does paging translate an address?'}],
            subject='Operating Systems',
            session_context={'last_topic_title': 'Paging'},
        )

        self.assertTrue(plan['is_follow_up'])
        self.assertIn('How does paging translate an address?', plan['resolved_query'])
        self.assertEqual(plan['intent'], 'explain')
        self.assertGreaterEqual(len(plan['queries']), 2)

    def test_short_explicit_topic_starts_a_new_query(self):
        plan = _build_retrieval_plan(
            'Explain deadlock prevention',
            [{'role': 'user', 'content': 'How does paging work?'}],
            subject='Operating Systems',
        )

        self.assertFalse(plan['is_follow_up'])
        self.assertEqual(plan['resolved_query'], 'Explain deadlock prevention')

    @patch('routes.chat.retrieve_context')
    def test_multi_query_fuses_duplicates_and_preserves_best_match(self, retrieve):
        weaker = syllabus_chunk(0.72)
        stronger = syllabus_chunk(0.88)
        retrieve.side_effect = [[weaker], [stronger]]

        results = _multi_query_retrieve(['paging', 'virtual memory paging'], 5, {'doc_type': 'syllabus'})

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['score'], 0.88)

    def test_context_selection_limits_one_upload_and_citations_keep_provenance(self):
        chunks = []
        for index in range(6):
            item = syllabus_chunk(0.9 - index * 0.01)
            item['metadata'] = {**item['metadata'], 'chunk_index': index}
            chunks.append(item)
        selected = _select_diverse_context(chunks, limit=5, per_upload=2)
        citations = _build_citations(selected)

        self.assertEqual(len(selected), 2)
        self.assertEqual(citations[0]['page_number'], 4)
        self.assertEqual(citations[0]['topic_id'], 'topic:paging')
        self.assertTrue(citations[0]['excerpt'])


class ChatContinuityRouteTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-three-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(chat_bp, url_prefix='/chat')
        with self.app.app_context():
            db.create_all()
            user = User(google_id='phase3-user', email='phase3@example.com', name='Phase Three')
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

    @patch('routes.chat.record_chat_topics')
    @patch('routes.chat.get_last_call_metadata', return_value={})
    @patch('routes.chat.configured_model_name', return_value='test-model')
    @patch('routes.chat.configured_provider_name', return_value='TestProvider')
    @patch('routes.chat.is_llm_configured', return_value=True)
    @patch('routes.chat.call_chat', return_value='## Paging\n\n## Direct Answer\nPaging translates addresses [Source 1].')
    @patch('routes.chat._approved_material_upload_ids', return_value=[])
    @patch('routes.chat.get_subject_syllabus_upload', return_value=SimpleNamespace(id=9))
    @patch('routes.chat._multi_query_retrieve', return_value=[syllabus_chunk()])
    def test_answer_metadata_and_follow_up_topic_are_persisted(self, *_mocks):
        first = self.client.post('/chat/message', json={
            'message': 'Explain paging',
            'subject': 'Operating Systems',
            'subject_id': self.subject_id,
            'learning_mode': 'beginner',
        })
        self.assertEqual(first.status_code, 200)
        first_data = first.get_json()
        self.assertEqual(first_data['metadata']['topic_title'], 'Paging')
        self.assertEqual(first_data['metadata']['retrieval_scope'], 'syllabus')
        self.assertEqual(first_data['metadata']['citations'][0]['page_number'], 4)

        follow_up = self.client.post('/chat/message', json={
            'message': 'Why is it needed?',
            'session_id': first_data['session_id'],
            'subject': 'Operating Systems',
            'subject_id': self.subject_id,
        })
        self.assertEqual(follow_up.status_code, 200)
        follow_up_data = follow_up.get_json()
        self.assertTrue(follow_up_data['metadata']['is_follow_up'])
        self.assertIn('Explain paging', follow_up_data['metadata']['retrieval_query'])

        with self.app.app_context():
            session = db.session.get(ChatSession, first_data['session_id'])
            self.assertEqual(session.context_metadata['last_topic_title'], 'Paging')
            self.assertEqual(len(session.messages), 4)



if __name__ == '__main__':
    unittest.main()
