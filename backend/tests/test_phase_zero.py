import unittest
import os
from types import SimpleNamespace
from unittest.mock import patch

from routes.chat import _build_chat_messages
from routes.generate import _ensure_embedded
from services import llm_service
from services import rag_service
from config import _resolve_sqlite_database_url


class FakeResponse:
    status_code = 200

    def __init__(self, payload):
        self._payload = payload
        self.text = ''
        self.reason = 'OK'

    def json(self):
        return self._payload


class LLMServiceTests(unittest.TestCase):
    def test_openrouter_provider_returns_text_and_usage(self):
        response = FakeResponse({
            'choices': [{'message': {'content': 'Grounded answer'}}],
            'usage': {'prompt_tokens': 12, 'completion_tokens': 5, 'total_tokens': 17},
        })
        with patch.object(llm_service.Config, 'LLM_PROVIDER', 'openrouter'), \
                patch.object(llm_service.Config, 'OPENROUTER_API_KEY', 'test-key'), \
                patch.object(llm_service.requests, 'post', return_value=response) as post:
            result = llm_service.call_prompt('Explain paging')

        self.assertEqual(result, 'Grounded answer')
        self.assertEqual(llm_service.get_last_call_metadata()['total_tokens'], 17)
        self.assertIn('/chat/completions', post.call_args.args[0])

    def test_gemini_message_conversion_preserves_system_and_roles(self):
        messages = [
            {'role': 'system', 'content': 'Use only supplied evidence.'},
            {'role': 'user', 'content': 'What is paging?'},
            {'role': 'assistant', 'content': 'Paging divides memory.'},
        ]
        contents = llm_service._gemini_contents_from_messages(messages)

        self.assertEqual(contents[0]['role'], 'user')
        self.assertIn('Use only supplied evidence.', contents[0]['parts'][0]['text'])
        self.assertEqual(contents[1]['role'], 'model')

    def test_unknown_provider_is_rejected(self):
        with patch.object(llm_service.Config, 'LLM_PROVIDER', 'unknown'):
            with self.assertRaises(llm_service.LLMServiceError):
                llm_service.configured_provider_name()


class EmbeddingProviderTests(unittest.TestCase):
    def test_openrouter_embedding_provider_is_used(self):
        response = FakeResponse({
            'data': [
                {'index': 1, 'embedding': [0.3, 0.4]},
                {'index': 0, 'embedding': [0.1, 0.2]},
            ],
        })
        with patch.object(rag_service.Config, 'EMBEDDING_PROVIDER', 'openrouter'), \
                patch.object(rag_service.Config, 'OPENROUTER_API_KEY', 'test-key'), \
                patch.object(rag_service.Config, 'OPENROUTER_EMBEDDING_DIMENSIONS', 2), \
                patch.object(rag_service.requests, 'post', return_value=response) as post:
            result = rag_service._embed_texts(['first', 'second'])

        self.assertEqual(result, [[0.1, 0.2], [0.3, 0.4]])
        self.assertIn('/embeddings', post.call_args.args[0])
        self.assertEqual(post.call_args.kwargs['json']['input'], ['first', 'second'])

    def test_gemini_embedding_provider_is_used(self):
        response = FakeResponse({
            'embeddings': [{'values': [0.1, 0.2]}],
        })
        with patch.object(rag_service.Config, 'EMBEDDING_PROVIDER', 'gemini'), \
                patch.object(rag_service.Config, 'GEMINI_API_KEY', 'test-key'), \
                patch.object(rag_service.Config, 'GEMINI_EMBEDDING_DIMENSIONS', 2), \
                patch.object(rag_service.requests, 'post', return_value=response) as post:
            result = rag_service._embed_texts(['topic'])

        self.assertEqual(result, [[0.1, 0.2]])
        self.assertIn(':batchEmbedContents', post.call_args.args[0])

    def test_unknown_embedding_provider_is_rejected(self):
        with patch.object(rag_service.Config, 'EMBEDDING_PROVIDER', 'unknown'):
            with self.assertRaises(RuntimeError):
                rag_service._embed_texts(['topic'])


class BackendConfigTests(unittest.TestCase):
    def test_sqlite_path_resolves_from_backend_directory(self):
        resolved = _resolve_sqlite_database_url('sqlite:///instance/app.db')

        self.assertEqual(
            resolved,
            f"sqlite:///{os.path.dirname(os.path.dirname(__file__))}/instance/app.db",
        )


class ChatFoundationTests(unittest.TestCase):
    def test_chat_messages_use_provider_neutral_shape(self):
        messages = _build_chat_messages(
            [{'role': 'user', 'content': 'First question'}],
            'Follow-up question',
            'Source 1 context',
            subject='Operating Systems',
            unit='Memory Management',
        )

        self.assertEqual(messages[0]['role'], 'system')
        self.assertIn('Source 1 context', messages[0]['content'])
        self.assertEqual(messages[-1], {'role': 'user', 'content': 'Follow-up question'})
        self.assertNotIn('parts', messages[-1])

    @patch('routes.generate.is_document_embedded', return_value=True)
    def test_pending_material_cannot_generate(self, _embedded):
        upload = SimpleNamespace(
            id=12,
            user_id=4,
            filename='notes.pdf',
            parsed_text='notes',
            doc_type='material',
            validation_status='pending',
        )

        ready, message = _ensure_embedded(upload)

        self.assertFalse(ready)
        self.assertIn('must pass syllabus validation', message)
        self.assertEqual(upload.validation_status, 'pending')

    @patch('routes.generate.is_document_embedded', return_value=True)
    def test_approved_material_can_generate(self, _embedded):
        upload = SimpleNamespace(
            id=12,
            user_id=4,
            filename='notes.pdf',
            parsed_text='notes',
            doc_type='material',
            validation_status='approved',
        )

        self.assertEqual(_ensure_embedded(upload), (True, None))


if __name__ == '__main__':
    unittest.main()
