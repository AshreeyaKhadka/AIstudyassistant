import unittest
from types import SimpleNamespace
from unittest.mock import patch

from flask import Flask

from config import db
from models import ChatMessage, ChatSession, StudentUpload, Subject, User
from routes.chat import _build_citations, _derive_learning_context, chat_bp
from services.rag_service import _build_chroma_where
from services.auth_service import generate_token
from services.syllabus_catalog import find_subject, find_unit, get_catalog, rank_topics


def paging_citation():
    return _build_citations([{
        'text': 'Paging maps virtual pages to physical frames through a page table.',
        'score': 0.88,
        'metadata': {
            'upload_id': 9,
            'filename': 'operating-systems.pdf',
            'doc_type': 'syllabus',
            'chunk_index': 2,
            'topic_id': 'topic:paging',
            'topic_title': 'Paging',
            'unit_title': 'Virtual Memory',
            'chapter_title': 'Memory Management',
        },
    }])


class LearningContextTests(unittest.TestCase):
    def test_official_catalog_normalizes_later_semesters_and_stable_unit_ids(self):
        catalog = get_catalog()
        subject = find_subject(subject_key='sem5-software-engineering')
        unit = find_unit(subject, unit_key='sem5-software-engineering-ch1')

        self.assertGreater(len(catalog['subjects']), 30)
        self.assertEqual(subject['semester'], 5)
        self.assertEqual(unit['title'], 'Software Engineering and Project Management')
        self.assertEqual(unit['topics'][0]['id'], 'sem5-software-engineering-ch1-topic-1')

    def test_topic_ranking_can_identify_another_unit(self):
        subject = find_subject(subject_key='sem5-software-engineering')

        best = rank_topics('Explain Scrum', subject)[0]

        self.assertEqual(best['unit_id'], 'sem5-software-engineering-ch2')
        self.assertGreaterEqual(best['score'], 0.5)

    def test_multiple_metadata_filters_use_explicit_and(self):
        where = _build_chroma_where({
            'user_id': 2,
            'doc_type': 'material',
            'validation_status': 'approved',
        })

        self.assertEqual(where, {
            '$and': [
                {'user_id': 2},
                {'doc_type': 'material'},
                {'validation_status': 'approved'},
            ],
        })

    def test_syllabus_neighbors_become_learning_guidance(self):
        syllabus = SimpleNamespace(structured_syllabus={
            'chapters': [{
                'chapter_name': 'Memory Management',
                'units': [{
                    'unit_name': 'Virtual Memory',
                    'topics': [
                        {'topic_id': 'topic:demand', 'topic_title': 'Demand Paging'},
                        {'topic_id': 'topic:paging', 'topic_title': 'Paging'},
                        {'topic_id': 'topic:replacement', 'topic_title': 'Page Replacement'},
                    ],
                }],
            }],
        })

        placement, prerequisites, next_topics = _derive_learning_context(
            syllabus,
            paging_citation(),
            subject='Operating Systems',
        )

        self.assertEqual(placement['topic'], 'Paging')
        self.assertEqual(prerequisites, ['Demand Paging'])
        self.assertEqual(next_topics, ['Page Replacement'])


class TopicAnswerIndexTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='phase-four-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(chat_bp, url_prefix='/chat')
        with self.app.app_context():
            db.create_all()
            user = User(google_id='phase4-user', email='phase4@example.com', name='Phase Four')
            db.session.add(user)
            db.session.flush()
            subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add(subject)
            db.session.flush()
            session = ChatSession(user_id=user.id, subject_id=subject.id, title='Explain paging')
            db.session.add(session)
            db.session.flush()
            db.session.add_all([
                ChatMessage(session_id=session.id, role='user', content='Explain paging'),
                ChatMessage(
                    session_id=session.id,
                    role='assistant',
                    content='Paging maps virtual pages to physical frames.',
                    message_metadata={
                        'topic_ids': ['topic:paging'],
                        'topic_title': 'Paging',
                        'confidence': 'high',
                        'learning_mode': 'exam',
                    },
                ),
            ])
            db.session.commit()
            self.user_id = user.id
            self.subject_id = subject.id
            self.session_id = session.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_saved_answers_are_grouped_by_topic_for_follow_up(self):
        response = self.client.get(f'/chat/topic-answers?subject_id={self.subject_id}')

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        answer = data['by_topic']['topic:paging'][0]
        self.assertEqual(data['answer_count'], 1)
        self.assertEqual(answer['question'], 'Explain paging')
        self.assertEqual(answer['session_id'], self.session_id)


class StudyContextChatTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SECRET_KEY='study-context-test-key-that-is-long-enough',
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        self.app.register_blueprint(chat_bp, url_prefix='/chat')
        with self.app.app_context():
            db.create_all()
            user = User(google_id='study-context-user', email='context@example.com', name='Context User')
            db.session.add(user)
            db.session.flush()
            subject = Subject(
                user_id=user.id,
                name='Software Engineering',
                semester=5,
                catalog_key='sem5-software-engineering',
            )
            db.session.add(subject)
            db.session.flush()
            upload = StudentUpload(
                user_id=user.id,
                filename='approved-notes.pdf',
                file_url='uploads/approved-notes.pdf',
                parsed_text='Software crisis is caused by growing complexity.',
                size_bytes=100,
                subject='Software Engineering',
                subject_id=subject.id,
                doc_type='material',
                processing_status='ready',
                embedding_status='embedded',
                validation_status='approved',
            )
            db.session.add(upload)
            db.session.commit()
            self.user_id = user.id
            self.upload_id = upload.id

        self.client = self.app.test_client()
        self.client.set_cookie('session_token', generate_token(self.user_id))
        self.common_patches = (
            patch('routes.chat.is_llm_configured', return_value=True),
            patch('routes.chat.configured_provider_name', return_value='Gemini'),
            patch('routes.chat.configured_model_name', return_value='test-model'),
            patch('routes.chat.get_last_call_metadata', return_value=None),
            patch('routes.chat.call_chat', return_value='## Direct Answer\nDetailed grounded answer.'),
        )
        for patcher in self.common_patches:
            patcher.start()
            self.addCleanup(patcher.stop)

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_syllabus_mode_answers_without_uploaded_notes(self):
        with patch('routes.chat._approved_material_upload_ids', return_value=[]):
            response = self.client.post('/chat/message', json={
                'message': 'Explain software crisis and myths',
                'study_context': {
                    'mode': 'syllabus',
                    'subject_key': 'sem5-software-engineering',
                    'unit_key': 'sem5-software-engineering-ch1',
                    'semester': 5,
                },
            })

        self.assertEqual(response.status_code, 200)
        metadata = response.get_json()['metadata']
        self.assertEqual(metadata['retrieval_scope'], 'official_syllabus')
        self.assertTrue(metadata['source_groups']['official_syllabus'])
        self.assertTrue(metadata['source_groups']['general_knowledge_used'])
        self.assertTrue(metadata['topic_ids'])

    def test_out_of_unit_question_is_redirected_without_saving_chat(self):
        response = self.client.post('/chat/message', json={
            'message': 'Explain Scrum',
            'study_context': {
                'mode': 'syllabus',
                'subject_key': 'sem5-software-engineering',
                'unit_key': 'sem5-software-engineering-ch1',
            },
        })

        self.assertEqual(response.status_code, 409)
        data = response.get_json()
        self.assertEqual(data['code'], 'unit_scope_mismatch')
        self.assertEqual(data['details']['suggested_unit_key'], 'sem5-software-engineering-ch2')
        with self.app.app_context():
            self.assertEqual(ChatSession.query.count(), 0)

    def test_question_outside_subject_syllabus_is_rejected(self):
        response = self.client.post('/chat/message', json={
            'message': 'How do I bake sourdough bread?',
            'study_context': {
                'mode': 'syllabus',
                'subject_key': 'sem5-software-engineering',
                'unit_key': 'sem5-software-engineering-ch1',
            },
        })

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.get_json()['code'], 'question_outside_syllabus_scope')

    def test_document_mode_retrieval_is_restricted_to_selected_upload(self):
        chunk = {
            'text': 'Software crisis describes recurring delivery and quality problems.',
            'score': 0.9,
            'metadata': {
                'upload_id': self.upload_id,
                'user_id': self.user_id,
                'filename': 'approved-notes.pdf',
                'doc_type': 'material',
                'chunk_index': 0,
            },
        }
        with patch('routes.chat._multi_query_retrieve', return_value=[chunk]) as retrieve:
            response = self.client.post('/chat/message', json={
                'message': 'What is software crisis?',
                'study_context': {'mode': 'document', 'upload_id': self.upload_id},
            })

        self.assertEqual(response.status_code, 200)
        filters = retrieve.call_args.kwargs['filter_metadata']
        self.assertEqual(filters['upload_id'], self.upload_id)
        self.assertEqual(filters['user_id'], self.user_id)
        self.assertEqual(response.get_json()['metadata']['retrieval_scope'], 'selected_document')


if __name__ == '__main__':
    unittest.main()
