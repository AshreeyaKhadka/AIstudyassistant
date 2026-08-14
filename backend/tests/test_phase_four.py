import io
import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

from flask import Flask

from config import db
from models import ChatMessage, ChatSession, StudentUpload, Subject, User
from routes.chat import _build_citations, _derive_learning_context, chat_bp
from services.rag_service import _build_chroma_where
from services.auth_service import generate_token
from services.syllabus_catalog import find_subject, find_unit, get_catalog, rank_topics
from services.speech_service import SpeechServiceError
from services import speech_service


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
            patch('routes.chat.last_call_provider_name', return_value='Gemini'),
            patch('routes.chat.last_call_model_name', return_value='test-model'),
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

    def test_invalid_response_language_is_rejected(self):
        response = self.client.post('/chat/message', json={
            'message': 'Explain software crisis',
            'response_language': 'french',
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['code'], 'invalid_response_language')

    def test_nepali_language_is_sent_to_llm_and_persisted(self):
        with (
            patch('routes.chat._approved_material_upload_ids', return_value=[]),
            patch('routes.chat.call_chat', return_value='## उत्तर\n\nसफ्टवेयर संकटको व्याख्या।') as chat_call,
        ):
            response = self.client.post('/chat/message', json={
                'message': 'Explain software crisis and myths',
                'response_language': 'nepali',
                'study_context': {
                    'mode': 'syllabus',
                    'subject_key': 'sem5-software-engineering',
                    'unit_key': 'sem5-software-engineering-ch1',
                },
            })

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['metadata']['response_language'], 'nepali')
        self.assertEqual(data['metadata']['display_language'], 'nepali')
        system_prompt = chat_call.call_args.args[0][0]['content']
        self.assertIn('Respond in natural Nepali using Devanagari script', system_prompt)
        with self.app.app_context():
            assistant = db.session.get(ChatMessage, data['assistant_message_id'])
            self.assertEqual(assistant.message_metadata['response_language'], 'nepali')

    def test_regenerate_replaces_saved_answer_without_duplicating_messages(self):
        request_data = {
            'message': 'Explain software crisis and myths',
            'response_language': 'english',
            'study_context': {
                'mode': 'syllabus',
                'subject_key': 'sem5-software-engineering',
                'unit_key': 'sem5-software-engineering-ch1',
            },
        }
        with (
            patch('routes.chat._approved_material_upload_ids', return_value=[]),
            patch('routes.chat.call_chat', side_effect=['Original answer.', 'Replacement answer.']),
        ):
            first = self.client.post('/chat/message', json=request_data)
            self.assertEqual(first.status_code, 200)
            first_data = first.get_json()
            regenerated = self.client.post('/chat/message', json={
                **request_data,
                'message': 'This value must not replace the saved original prompt.',
                'session_id': first_data['session_id'],
                'regenerate': True,
                'assistant_message_id': first_data['assistant_message_id'],
            })

        self.assertEqual(regenerated.status_code, 200)
        regenerated_data = regenerated.get_json()
        self.assertTrue(regenerated_data['regenerated'])
        self.assertEqual(regenerated_data['assistant_message_id'], first_data['assistant_message_id'])
        with self.app.app_context():
            saved_messages = ChatMessage.query.filter_by(session_id=first_data['session_id']).all()
            self.assertEqual(len(saved_messages), 2)
            self.assertEqual(next(item.content for item in saved_messages if item.role == 'user'), request_data['message'])
            assistant = next(item for item in saved_messages if item.role == 'assistant')
            self.assertEqual(assistant.content, 'Replacement answer.')
            self.assertTrue(assistant.message_metadata['regenerated'])

    def test_voice_transcription_accepts_browser_audio_and_removes_temporary_file(self):
        observed = {}

        def transcribe(path):
            observed['path'] = path
            with open(path, 'rb') as audio_file:
                observed['audio'] = audio_file.read()
            return {
                'transcript': 'Paging के हो?',
                'detected_language': 'nepali',
                'language_code': 'ne',
                'language_probability': 0.94,
                'duration_seconds': 2.1,
            }

        with patch('routes.chat.transcribe_audio_file', side_effect=transcribe):
            response = self.client.post('/chat/transcribe', data={
                'audio': (io.BytesIO(b'webm-audio'), 'question.webm', 'audio/webm'),
            }, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['transcript'], 'Paging के हो?')
        self.assertEqual(observed['audio'], b'webm-audio')
        self.assertFalse(os.path.exists(observed['path']))

    def test_voice_transcription_rejects_unsupported_and_oversized_audio(self):
        unsupported = self.client.post('/chat/transcribe', data={
            'audio': (io.BytesIO(b'audio'), 'question.aac', 'audio/aac'),
        }, content_type='multipart/form-data')
        self.assertEqual(unsupported.status_code, 415)
        self.assertEqual(unsupported.get_json()['code'], 'unsupported_audio_type')

        with patch('routes.chat.Config.VOICE_MAX_BYTES', 4):
            oversized = self.client.post('/chat/transcribe', data={
                'audio': (io.BytesIO(b'too-large'), 'question.webm', 'audio/webm'),
            }, content_type='multipart/form-data')
        self.assertEqual(oversized.status_code, 413)
        self.assertEqual(oversized.get_json()['code'], 'audio_too_large')

    def test_voice_transcription_returns_structured_service_error(self):
        with patch('routes.chat.transcribe_audio_file', side_effect=SpeechServiceError(
            'No speech was detected.', code='no_speech_detected', status_code=422,
        )):
            response = self.client.post('/chat/transcribe', data={
                'audio': (io.BytesIO(b'quiet'), 'question.webm', 'audio/webm'),
            }, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.get_json()['code'], 'no_speech_detected')

    def test_translation_is_cached_and_session_returns_display_content(self):
        with self.app.app_context():
            session = ChatSession(user_id=self.user_id, title='Translation test')
            db.session.add(session)
            db.session.flush()
            message = ChatMessage(
                session_id=session.id,
                role='assistant',
                content='## Paging\n\nPaging uses [Source 1].',
                message_metadata={'response_language': 'english', 'display_language': 'english'},
            )
            db.session.add(message)
            db.session.commit()
            session_id = session.id
            message_id = message.id

        with patch('routes.chat.call_chat', return_value='## पेजिङ\n\nपेजिङले [Source 1] प्रयोग गर्छ।') as chat_call:
            first = self.client.post(f'/chat/messages/{message_id}/translate', json={'target_language': 'nepali'})
            second = self.client.post(f'/chat/messages/{message_id}/translate', json={'target_language': 'nepali'})

        self.assertEqual(first.status_code, 200)
        self.assertFalse(first.get_json()['cached'])
        self.assertTrue(second.get_json()['cached'])
        self.assertEqual(chat_call.call_count, 1)
        self.assertIn('Preserve Markdown headings', chat_call.call_args.args[0][0]['content'])

        loaded = self.client.get(f'/chat/sessions/{session_id}')
        loaded_message = loaded.get_json()['messages'][0]
        self.assertEqual(loaded_message['display_content'], '## पेजिङ\n\nपेजिङले [Source 1] प्रयोग गर्छ।')
        self.assertEqual(loaded_message['metadata']['display_language'], 'nepali')

    def test_translation_rejects_invalid_language_and_foreign_message(self):
        with self.app.app_context():
            other_user = User(google_id='other-translation-user', email='other-translation@example.com', name='Other')
            db.session.add(other_user)
            db.session.flush()
            session = ChatSession(user_id=other_user.id, title='Private')
            db.session.add(session)
            db.session.flush()
            message = ChatMessage(session_id=session.id, role='assistant', content='Private answer')
            db.session.add(message)
            db.session.commit()
            message_id = message.id

        invalid = self.client.post(f'/chat/messages/{message_id}/translate', json={'target_language': 'french'})
        forbidden = self.client.post(f'/chat/messages/{message_id}/translate', json={'target_language': 'nepali'})
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.get_json()['code'], 'invalid_target_language')
        self.assertEqual(forbidden.status_code, 404)


class SpeechServiceTests(unittest.TestCase):
    def test_audio_duration_converts_pyav_microseconds_to_seconds(self):
        container = MagicMock()
        container.duration = 1_500_000
        container.streams = []
        container.__enter__.return_value = container
        fake_av = SimpleNamespace(open=Mock(return_value=container), time_base=1_000_000)
        with patch.dict('sys.modules', {'av': fake_av}):
            duration = speech_service._audio_duration_seconds('/tmp/audio.webm')

        self.assertEqual(duration, 1.5)

    def test_transcription_uses_multilingual_vad_and_returns_detected_language(self):
        model = SimpleNamespace()
        model.transcribe = Mock(return_value=(
            iter([SimpleNamespace(text=' नमस्ते '), SimpleNamespace(text='world')]),
            SimpleNamespace(language='ne', language_probability=0.91, duration=3.2),
        ))
        with (
            patch('services.speech_service._audio_duration_seconds', return_value=3.2),
            patch('services.speech_service._load_model', return_value=model),
        ):
            result = speech_service.transcribe_audio_file('/tmp/test.webm')

        self.assertEqual(result['transcript'], 'नमस्ते world')
        self.assertEqual(result['detected_language'], 'nepali')
        options = model.transcribe.call_args.kwargs
        self.assertTrue(options['multilingual'])
        self.assertTrue(options['vad_filter'])
        self.assertFalse(options['condition_on_previous_text'])

    def test_transcription_rejects_long_or_silent_recordings(self):
        with (
            patch('services.speech_service.Config.VOICE_MAX_SECONDS', 45),
            patch('services.speech_service._audio_duration_seconds', return_value=47),
        ):
            with self.assertRaises(SpeechServiceError) as long_error:
                speech_service.transcribe_audio_file('/tmp/long.webm')
        self.assertEqual(long_error.exception.code, 'audio_too_long')

        model = SimpleNamespace(transcribe=lambda *_args, **_kwargs: (
            iter([SimpleNamespace(text='   ')]),
            SimpleNamespace(language='en', language_probability=0.1, duration=1),
        ))
        with (
            patch('services.speech_service._audio_duration_seconds', return_value=1),
            patch('services.speech_service._load_model', return_value=model),
        ):
            with self.assertRaises(SpeechServiceError) as silent_error:
                speech_service.transcribe_audio_file('/tmp/silent.webm')
        self.assertEqual(silent_error.exception.code, 'no_speech_detected')


if __name__ == '__main__':
    unittest.main()
