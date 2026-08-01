import unittest
from unittest.mock import patch

from flask import Flask

from config import db
from models import StudentUpload, Subject, User
from models.ai_usage import AiUsageLog  # noqa: F401 - register metadata
from services.rag_service import (
    get_syllabus_topic_units,
    normalize_syllabus_structure,
    validate_upload_against_syllabus,
)


SAMPLE_STRUCTURE = {
    'syllabus_title': 'Operating Systems',
    'chapters': [{
        'chapter_name': 'Memory Management',
        'units': [{
            'unit_name': 'Virtual Memory',
            'subtopics': ['Paging', 'Page Replacement'],
        }],
    }],
}


class SyllabusStructureTests(unittest.TestCase):
    def test_normalization_produces_stable_hierarchy_ids(self):
        first = normalize_syllabus_structure(SAMPLE_STRUCTURE)
        second = normalize_syllabus_structure(SAMPLE_STRUCTURE)

        self.assertEqual(first, second)
        chapter = first['chapters'][0]
        unit = chapter['units'][0]
        self.assertTrue(chapter['chapter_id'].startswith('chapter:'))
        self.assertTrue(unit['unit_id'].startswith('unit:'))
        self.assertEqual(len(unit['topics']), 2)
        self.assertTrue(unit['topics'][0]['topic_id'].startswith('topic:'))
        self.assertEqual(len(first['structure_hash']), 64)

    @patch('services.rag_service.retrieve_context')
    def test_topic_units_prefer_structured_topic_chunks(self, retrieve):
        retrieve.return_value = [
            {'text': 'raw syllabus page', 'metadata': {'doc_type': 'syllabus', 'chunk_index': 0}},
            {
                'text': 'Chapter: Memory\nUnit: Virtual Memory\nTopic: Paging',
                'metadata': {
                    'doc_type': 'syllabus',
                    'source_type': 'structured_topic',
                    'topic_id': 'topic:paging',
                    'topic_title': 'Paging',
                    'unit_id': 'unit:virtual-memory',
                },
            },
        ]

        topics = get_syllabus_topic_units(10)

        self.assertEqual([topic['id'] for topic in topics], ['topic:paging'])
        self.assertEqual(topics[0]['title'], 'Paging')


class ValidationEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(self.app)
        with self.app.app_context():
            db.create_all()
            user = User(google_id='phase2-user', email='phase2@example.com', name='Phase Two')
            db.session.add(user)
            db.session.flush()
            subject = Subject(user_id=user.id, name='Operating Systems', semester=3)
            db.session.add(subject)
            db.session.flush()
            syllabus = StudentUpload(
                user_id=user.id,
                filename='syllabus.txt',
                file_url='syllabus.txt',
                size_bytes=100,
                subject_id=subject.id,
                subject=subject.name,
                doc_type='syllabus',
                syllabus_kind='personal',
                embedding_status='embedded',
                validation_status='approved',
                syllabus_version=2,
            )
            material = StudentUpload(
                user_id=user.id,
                filename='notes.txt',
                file_url='notes.txt',
                size_bytes=100,
                subject_id=subject.id,
                subject=subject.name,
                doc_type='material',
                embedding_status='embedded',
                validation_status='pending',
            )
            db.session.add_all([syllabus, material])
            db.session.commit()
            self.material_id = material.id

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    @patch('services.rag_service._update_document_chunk_metadata')
    @patch('services.rag_service.retrieve_context')
    def test_partial_match_is_saved_as_needs_review_with_evidence(self, retrieve, _update):
        material_chunks = [
            {'text': 'Paging maps virtual pages to frames.', 'metadata': {'page_number': 1, 'heading': 'Paging'}},
            {'text': 'Unrelated club meeting notes.', 'metadata': {'page_number': 2, 'heading': 'Meeting'}},
            {'text': 'Another unrelated section.', 'metadata': {'page_number': 3}},
        ]
        retrieve.side_effect = [
            material_chunks,
            [{'score': 0.91, 'metadata': {
                'topic_id': 'topic:paging',
                'topic_title': 'Paging',
                'unit_id': 'unit:memory',
                'unit_title': 'Virtual Memory',
            }}],
            [{'score': 0.42, 'metadata': {}}],
            [{'score': 0.10, 'metadata': {}}],
        ]

        with self.app.app_context():
            result = validate_upload_against_syllabus(self.material_id)
            upload = db.session.get(StudentUpload, self.material_id)

            self.assertEqual(result['validation_status'], 'needs_review')
            self.assertEqual(result['matched_chunks'], 1)
            self.assertEqual(result['matched_topics'][0]['topic_id'], 'topic:paging')
            self.assertEqual(len(result['unmatched_sections']), 2)
            self.assertEqual(upload.validation_details['syllabus_version'], 2)


if __name__ == '__main__':
    unittest.main()
