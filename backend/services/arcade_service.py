from datetime import datetime, timedelta
from threading import Lock
import random

from config import db
from models.arcade import (
    ArcadePointEvent,
    GameRoom,
    GameRoomPlayer,
    GameRound,
    Question,
    ScoreboardEntry,
)
from models.content import Subject, StudentUpload
from models.quiz import QuizSet

DEFAULT_ARCADE_QUESTION_BANK = {
    'Software Engineering': [
        {
            'question': 'Which model delivers software in short, iterative releases with frequent feedback?',
            'options': {'A': 'Waterfall', 'B': 'Agile', 'C': 'Spiral', 'D': 'V-Model'},
            'correct': 'B',
            'difficulty': 'easy',
            'explanation': 'Agile focuses on iterative delivery and regular stakeholder feedback.',
        },
        {
            'question': 'In requirement engineering, what does SRS stand for?',
            'options': {
                'A': 'Software Reliability Standard',
                'B': 'System Resource Sheet',
                'C': 'Software Requirements Specification',
                'D': 'Structured Review Strategy',
            },
            'correct': 'C',
            'difficulty': 'easy',
            'explanation': 'SRS is the formal document that captures system requirements.',
        },
        {
            'question': 'What is the primary goal of software testing?',
            'options': {
                'A': 'To prove there are no bugs',
                'B': 'To find defects and validate expected behavior',
                'C': 'To increase development speed only',
                'D': 'To replace design reviews',
            },
            'correct': 'B',
            'difficulty': 'easy',
            'explanation': 'Testing is used to reveal defects and verify software behavior against requirements.',
        },
        {
            'question': 'Which metric is commonly used to estimate software size for effort planning?',
            'options': {'A': 'Cyclomatic Complexity', 'B': 'Function Points', 'C': 'Latency', 'D': 'CPU Usage'},
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'Function Points estimate software size based on user-visible functionality.',
        },
        {
            'question': 'Why are code reviews effective in software quality assurance?',
            'options': {
                'A': 'They eliminate the need for testing',
                'B': 'They help detect defects early and share knowledge',
                'C': 'They only improve UI consistency',
                'D': 'They are mainly for deployment automation',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'Peer reviews catch issues early and spread project understanding.',
        },
        {
            'question': 'What is the key difference between verification and validation?',
            'options': {
                'A': 'No difference',
                'B': 'Verification checks if product is built right; validation checks if right product is built',
                'C': 'Validation happens before requirements',
                'D': 'Verification is only manual',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'Verification focuses on conformance; validation focuses on user needs.',
        },
        {
            'question': 'Which risk mitigation strategy reduces impact by building fallback capabilities?',
            'options': {'A': 'Avoidance', 'B': 'Transfer', 'C': 'Acceptance', 'D': 'Contingency planning'},
            'correct': 'D',
            'difficulty': 'medium',
            'explanation': 'Contingency planning prepares fallback actions when risks occur.',
        },
        {
            'question': 'In CI/CD, why is trunk-based development beneficial?',
            'options': {
                'A': 'It delays integration until release',
                'B': 'It keeps changes small and reduces merge conflicts',
                'C': 'It removes need for automated tests',
                'D': 'It requires monthly merges',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Frequent integration to a shared trunk keeps diffs small and merge friction low.',
        },
        {
            'question': 'Which design principle is most directly violated by a class that changes for many unrelated reasons?',
            'options': {
                'A': 'Open/Closed Principle',
                'B': 'Liskov Substitution Principle',
                'C': 'Single Responsibility Principle',
                'D': 'Dependency Inversion Principle',
            },
            'correct': 'C',
            'difficulty': 'hard',
            'explanation': 'SRP states a class should have one reason to change.',
        },
        {
            'question': 'Why is non-functional requirement analysis critical during architecture design?',
            'options': {
                'A': 'It only affects documentation',
                'B': 'It determines architecture tradeoffs like scalability, security, and latency',
                'C': 'It replaces functional requirements',
                'D': 'It is only needed after deployment',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Architecture is largely shaped by quality attributes and their tradeoffs.',
        },
    ],
    'Python Programming': [
        {
            'question': 'Which data type is immutable in Python?',
            'options': {'A': 'list', 'B': 'dict', 'C': 'set', 'D': 'tuple'},
            'correct': 'D',
            'difficulty': 'easy',
            'explanation': 'Tuples cannot be modified after creation.',
        },
        {
            'question': 'What does len([1, 2, 3]) return?',
            'options': {'A': '2', 'B': '3', 'C': '4', 'D': 'Error'},
            'correct': 'B',
            'difficulty': 'easy',
            'explanation': 'len returns the number of items in a sequence.',
        },
        {
            'question': 'Which keyword is used to define a function in Python?',
            'options': {'A': 'func', 'B': 'define', 'C': 'def', 'D': 'lambda'},
            'correct': 'C',
            'difficulty': 'easy',
            'explanation': 'Python functions are defined with the def keyword.',
        },
        {
            'question': 'What is the output type of {"a": 1, "b": 2}.keys() in modern Python?',
            'options': {'A': 'list', 'B': 'tuple', 'C': 'dict_keys view', 'D': 'set'},
            'correct': 'C',
            'difficulty': 'medium',
            'explanation': 'dict.keys() returns a dynamic view object.',
        },
        {
            'question': 'Why use list comprehensions over loops in many cases?',
            'options': {
                'A': 'They always use less memory than generators',
                'B': 'They can be more concise and readable for simple transformations',
                'C': 'They are required for filtering',
                'D': 'They bypass Python interpreter overhead completely',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'List comprehensions are often more expressive for straightforward map/filter operations.',
        },
        {
            'question': 'What does *args allow in a function signature?',
            'options': {
                'A': 'Only keyword arguments',
                'B': 'Only one positional argument',
                'C': 'Variable number of positional arguments',
                'D': 'Variable number of return values',
            },
            'correct': 'C',
            'difficulty': 'medium',
            'explanation': '*args collects extra positional arguments into a tuple.',
        },
        {
            'question': 'Which statement about Python exceptions is correct?',
            'options': {
                'A': 'except must always catch BaseException directly',
                'B': 'finally block executes whether exception occurs or not',
                'C': 'try cannot contain return statements',
                'D': 'raise can only be used inside except',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'finally is guaranteed to run after try/except flow.',
        },
        {
            'question': 'Why might using mutable default arguments be dangerous?',
            'options': {
                'A': 'They are re-created on every call',
                'B': 'They persist between calls and can keep unintended state',
                'C': 'Python forbids them in classes',
                'D': 'They make function calls slower than recursion',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Default argument objects are evaluated once at definition time.',
        },
        {
            'question': 'What is a key benefit of generators in Python?',
            'options': {
                'A': 'They evaluate eagerly for speed',
                'B': 'They support lazy iteration and reduce memory usage',
                'C': 'They can only yield integers',
                'D': 'They replace all loops',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Generators produce items on demand, which is memory efficient.',
        },
        {
            'question': 'In asynchronous Python, when is async/await most useful?',
            'options': {
                'A': 'CPU-bound tight loops',
                'B': 'Blocking I/O tasks like network or file waits',
                'C': 'Simple arithmetic operations',
                'D': 'Replacing data classes',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Async shines when waiting on I/O while other tasks can progress.',
        },
    ],
    'Engineering Management': [
        {
            'question': 'What is the primary purpose of a project scope statement?',
            'options': {
                'A': 'Define team holidays',
                'B': 'Specify project boundaries and deliverables',
                'C': 'Replace the budget document',
                'D': 'List coding standards only',
            },
            'correct': 'B',
            'difficulty': 'easy',
            'explanation': 'Scope defines what is included and excluded in the project.',
        },
        {
            'question': 'Which chart is commonly used to track project schedule over time?',
            'options': {'A': 'Pie chart', 'B': 'Gantt chart', 'C': 'Scatter plot', 'D': 'Heatmap'},
            'correct': 'B',
            'difficulty': 'easy',
            'explanation': 'Gantt charts visualize tasks across timelines.',
        },
        {
            'question': 'A stakeholder matrix is mainly used to:',
            'options': {
                'A': 'Measure code complexity',
                'B': 'Map influence/interest and communication priorities',
                'C': 'Estimate server capacity',
                'D': 'Define API contracts',
            },
            'correct': 'B',
            'difficulty': 'easy',
            'explanation': 'It helps prioritize stakeholder engagement strategies.',
        },
        {
            'question': 'What does CPI < 1 indicate in earned value management?',
            'options': {
                'A': 'Under budget',
                'B': 'Exactly on budget',
                'C': 'Over budget',
                'D': 'Schedule is ahead',
            },
            'correct': 'C',
            'difficulty': 'medium',
            'explanation': 'Cost Performance Index below 1 means cost overrun.',
        },
        {
            'question': 'Why is a risk register important in project management?',
            'options': {
                'A': 'It stores only approved leave requests',
                'B': 'It tracks identified risks, impacts, owners, and responses',
                'C': 'It replaces sprint backlogs',
                'D': 'It is only needed after project closure',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'A risk register enables proactive risk monitoring and mitigation.',
        },
        {
            'question': 'What is the likely effect of poor requirement baseline control?',
            'options': {
                'A': 'Clearer scope',
                'B': 'Reduced change requests',
                'C': 'Scope creep and planning instability',
                'D': 'Higher test automation by default',
            },
            'correct': 'C',
            'difficulty': 'medium',
            'explanation': 'Uncontrolled changes create scope creep and schedule disruption.',
        },
        {
            'question': 'When choosing between in-house and outsourced execution, what is a key strategic factor?',
            'options': {
                'A': 'Color of vendor logo',
                'B': 'Core competency alignment and long-term capability building',
                'C': 'Random team preference',
                'D': 'Only short-term travel cost',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'Strategic sourcing should align with core capabilities and future goals.',
        },
        {
            'question': 'Which leadership style best fits high-skill teams needing autonomy and accountability?',
            'options': {
                'A': 'Micromanagement-only',
                'B': 'Laissez-faire without goals',
                'C': 'Situational/coaching leadership with clear outcomes',
                'D': 'Authoritarian command with no feedback',
            },
            'correct': 'C',
            'difficulty': 'hard',
            'explanation': 'Skilled teams benefit from autonomy plus aligned goals and coaching.',
        },
        {
            'question': 'What is the management advantage of using leading indicators over lagging indicators?',
            'options': {
                'A': 'They describe only past failures',
                'B': 'They enable earlier intervention before outcomes degrade',
                'C': 'They remove uncertainty completely',
                'D': 'They are easier to fake',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Leading indicators provide early signals for corrective action.',
        },
        {
            'question': 'Why is post-project retrospective analysis valuable?',
            'options': {
                'A': 'It is a compliance formality only',
                'B': 'It captures lessons learned and improves future execution',
                'C': 'It reduces delivered value',
                'D': 'It replaces project planning',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Retrospectives turn project outcomes into actionable organizational learning.',
        },
    ],
    'Data Structures': [
        {
            'question': 'Which data structure follows FIFO order?',
            'options': {'A': 'Stack', 'B': 'Queue', 'C': 'Tree', 'D': 'Heap'},
            'correct': 'B',
            'difficulty': 'easy',
            'explanation': 'Queue operations process first-in elements first.',
        },
        {
            'question': 'Which operation is typically O(1) for a hash table (average case)?',
            'options': {'A': 'Search', 'B': 'Traversal', 'C': 'Sorting', 'D': 'Merge'},
            'correct': 'A',
            'difficulty': 'easy',
            'explanation': 'Average-case hash lookups are constant time with good hashing.',
        },
        {
            'question': 'A binary tree where left < root < right is called:',
            'options': {'A': 'AVL Tree', 'B': 'Binary Heap', 'C': 'Binary Search Tree', 'D': 'B-Tree'},
            'correct': 'C',
            'difficulty': 'easy',
            'explanation': 'That ordering rule defines a BST.',
        },
        {
            'question': 'Why does an AVL tree rebalance after updates?',
            'options': {
                'A': 'To increase memory usage',
                'B': 'To maintain logarithmic height for efficient operations',
                'C': 'To remove all duplicates',
                'D': 'To convert into a graph',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'Balancing keeps operations near O(log n).',
        },
        {
            'question': 'What is the worst-case search complexity in an unbalanced BST?',
            'options': {'A': 'O(1)', 'B': 'O(log n)', 'C': 'O(n)', 'D': 'O(n log n)'},
            'correct': 'C',
            'difficulty': 'medium',
            'explanation': 'It can degrade to a linked-list shape.',
        },
        {
            'question': 'In a max-heap, which element is always at the root?',
            'options': {'A': 'Smallest', 'B': 'Median', 'C': 'Largest', 'D': 'Random'},
            'correct': 'C',
            'difficulty': 'medium',
            'explanation': 'Heap property places the maximum at root.',
        },
        {
            'question': 'When is adjacency list preferred over adjacency matrix for graphs?',
            'options': {
                'A': 'Dense graphs with near-complete edges',
                'B': 'Sparse graphs to save space',
                'C': 'When no traversal is needed',
                'D': 'Only for directed graphs',
            },
            'correct': 'B',
            'difficulty': 'medium',
            'explanation': 'Adjacency lists are space-efficient for sparse graphs.',
        },
        {
            'question': 'Why is amortized analysis used with dynamic arrays?',
            'options': {
                'A': 'To ignore expensive operations',
                'B': 'To average occasional resize cost across many inserts',
                'C': 'To force worst-case to O(1)',
                'D': 'To avoid memory allocation',
            },
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'Resizing is occasional, so average insertion remains constant time.',
        },
        {
            'question': 'Which structure best supports efficient range minimum queries after preprocessing?',
            'options': {'A': 'Segment Tree', 'B': 'Queue', 'C': 'Stack', 'D': 'Hash Set'},
            'correct': 'A',
            'difficulty': 'hard',
            'explanation': 'Segment trees answer range queries efficiently after building.',
        },
        {
            'question': 'In union-find with path compression and union by rank, operations are:',
            'options': {'A': 'Strict O(1)', 'B': 'Near constant amortized', 'C': 'O(n)', 'D': 'O(log n!)'},
            'correct': 'B',
            'difficulty': 'hard',
            'explanation': 'They run in inverse-Ackermann amortized time, effectively near constant.',
        },
    ],
}


VALID_DIFFICULTIES = {'easy', 'medium', 'hard'}
DIFFICULTY_POINTS = {'easy': 50, 'medium': 100, 'hard': 150}
ROUND_DIFFICULTY = {
    1: 'easy',
    2: 'easy',
    3: 'easy',
    4: 'medium',
    5: 'medium',
    6: 'medium',
    7: 'medium',
    8: 'hard',
    9: 'hard',
    10: 'hard',
}

_round_locks = {}
_round_locks_guard = Lock()


def clean_difficulty(value):
    difficulty = str(value or 'medium').strip().lower()
    return difficulty if difficulty in VALID_DIFFICULTIES else 'medium'


def serialize_question(question, include_answer=False):
    data = {
        'id': question.id,
        'subject_id': question.subject_id,
        'subject': question.subject,
        'difficulty': question.difficulty,
        'question': question.text,
        'options': question.options,
        'explanation': question.explanation,
    }
    if include_answer:
        data['correct_option'] = question.correct_option
    return data


def sync_questions_from_mcqs(user_id, upload, mcqs):
    created = []
    subject = upload.subject or upload.filename or 'General'
    for mcq in mcqs:
        options = mcq.get('options')
        correct = str(mcq.get('correct') or mcq.get('correct_option') or '').strip().upper()
        if not mcq.get('question') or not isinstance(options, dict) or correct not in options:
            continue

        existing = Question.query.filter_by(
            user_id=user_id,
            source_doc_id=upload.id,
            text=str(mcq['question']).strip(),
        ).first()
        if existing:
            existing.difficulty = clean_difficulty(mcq.get('difficulty'))
            existing.options = options
            existing.correct_option = correct
            existing.explanation = mcq.get('explanation')
            created.append(existing)
            continue

        question = Question(
            user_id=user_id,
            subject_id=upload.subject_id,
            subject=subject,
            difficulty=clean_difficulty(mcq.get('difficulty')),
            text=str(mcq['question']).strip(),
            options=options,
            correct_option=correct,
            explanation=mcq.get('explanation'),
            source_doc_id=upload.id,
        )
        db.session.add(question)
        created.append(question)
    return created


def backfill_questions_from_quiz_sets(user):
    uploads = {
        upload.id: upload
        for upload in StudentUpload.query.filter_by(user_id=user.id).all()
    }
    created_count = 0
    quiz_sets = QuizSet.query.filter_by(user_id=user.id).all()
    for quiz_set in quiz_sets:
        upload = uploads.get(quiz_set.upload_id)
        if not upload or not quiz_set.questions_json:
            continue
        before = len(sync_questions_from_mcqs(user.id, upload, quiz_set.questions_json))
        created_count += before
    if created_count:
        db.session.commit()
    return created_count


def ensure_default_arcade_questions(user):
    added = 0
    for subject, question_set in DEFAULT_ARCADE_QUESTION_BANK.items():
        existing_texts = {
            row[0]
            for row in db.session.query(Question.text)
            .filter(Question.user_id == user.id, Question.subject == subject)
            .all()
        }
        for item in question_set:
            text = str(item.get('question') or '').strip()
            options = item.get('options')
            correct = str(item.get('correct') or '').strip().upper()
            if not text or not isinstance(options, dict) or correct not in options:
                continue
            if text in existing_texts:
                continue
            db.session.add(Question(
                user_id=user.id,
                subject_id=None,
                subject=subject,
                difficulty=clean_difficulty(item.get('difficulty')),
                text=text,
                options=options,
                correct_option=correct,
                explanation=item.get('explanation'),
                source_doc_id=None,
            ))
            added += 1
    if added:
        db.session.commit()
    return added


def get_user_subjects_with_questions(user):
    backfill_questions_from_quiz_sets(user)
    ensure_default_arcade_questions(user)
    rows = (
        db.session.query(Question.subject_id, Question.subject)
        .filter(Question.user_id == user.id)
        .group_by(Question.subject_id, Question.subject)
        .order_by(Question.subject.asc())
        .all()
    )
    return [
        {'subject_id': subject_id, 'name': subject, 'question_count': _question_count(user.id, subject_id, subject)}
        for subject_id, subject in rows
    ]


def _question_count(user_id, subject_id, subject):
    query = Question.query.filter_by(user_id=user_id, subject=subject)
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    return query.count()


def get_questions_for_subject(user, subject_id=None, subject=None, count=10, difficulty=None):
    backfill_questions_from_quiz_sets(user)
    ensure_default_arcade_questions(user)
    query = Question.query.filter(Question.user_id == user.id)
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    elif subject:
        query = query.filter(Question.subject == subject)
    if difficulty:
        query = query.filter(Question.difficulty == clean_difficulty(difficulty))

    questions = query.all()
    random.shuffle(questions)
    return questions[:count]


def resolve_subject(user, subject_id=None, subject=None):
    if subject_id:
        found = Subject.query.filter_by(id=subject_id, user_id=user.id).first()
        if found:
            return found.id, found.name
    if subject:
        return subject_id, subject
    return None, 'General'


def create_scoreboard_entry(user, subject_id, subject, answers):
    question_ids = [int(qid) for qid in answers.keys() if str(qid).isdigit()]
    questions = Question.query.filter(Question.id.in_(question_ids), Question.user_id == user.id).all()
    by_id = {question.id: question for question in questions}

    score = 0
    normalized_answers = {}
    for qid in question_ids:
        selected = str(answers.get(str(qid)) or answers.get(qid) or '').strip().upper()
        question = by_id.get(qid)
        if not question:
            continue
        correct = selected == question.correct_option
        if correct:
            score += 1
        normalized_answers[str(qid)] = {
            'selected': selected,
            'correct': correct,
            'correct_option': question.correct_option,
        }

    points = score * 100
    entry = ScoreboardEntry(
        user_id=user.id,
        subject_id=subject_id,
        subject=subject,
        mode='scoreboard',
        score=score,
        total_questions=len(questions),
        points=points,
        answers_json=normalized_answers,
    )
    db.session.add(entry)
    db.session.flush()
    add_point_event(user.id, subject_id, subject, 'scoreboard', points, 'scoreboard_entry', entry.id)
    db.session.commit()
    return entry


def add_point_event(user_id, subject_id, subject, mode, points, source_type, source_id):
    event = ArcadePointEvent(
        user_id=user_id,
        subject_id=subject_id,
        subject=subject,
        mode=mode,
        points=points,
        source_type=source_type,
        source_id=source_id,
    )
    db.session.add(event)
    return event


def get_leaderboard(subject=None, mode=None, window='weekly', limit=25):
    if window == 'weekly':
        start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.session.query(
            ArcadePointEvent.user_id,
            db.func.sum(ArcadePointEvent.points).label('points'),
            db.func.count(ArcadePointEvent.id).label('plays'),
        )
        .select_from(ArcadePointEvent)
    )
    if subject and subject != 'ALL':
        rows = rows.filter(ArcadePointEvent.subject == subject)
    if mode and mode != 'all':
        rows = rows.filter(ArcadePointEvent.mode == mode)
    if window == 'weekly':
        rows = rows.filter(ArcadePointEvent.created_at >= start)

    from models.user import User
    rows = (
        rows.join(User, User.id == ArcadePointEvent.user_id)
        .add_columns(User.name, User.first_name, User.last_name, User.avatar_url)
        .group_by(ArcadePointEvent.user_id, User.name, User.first_name, User.last_name, User.avatar_url)
        .order_by(db.desc('points'))
        .limit(limit)
        .all()
    )

    return [
        {
            'rank': index + 1,
            'user_id': row.user_id,
            'name': ' '.join(part for part in [row.first_name, row.last_name] if part) or row.name,
            'avatar_url': row.avatar_url,
            'points': int(row.points or 0),
            'plays': int(row.plays or 0),
        }
        for index, row in enumerate(rows)
    ]


def get_or_create_fff_room(user, subject_id=None, subject=None):
    subject_id, subject_name = resolve_subject(user, subject_id, subject)
    room = GameRoom.query.filter_by(subject_id=subject_id, subject=subject_name, mode='fff', status='waiting').first()
    if not room:
        room = GameRoom(
            subject_id=subject_id,
            created_by_id=user.id,
            subject=subject_name,
            mode='fff',
            status='waiting',
        )
        db.session.add(room)
        db.session.commit()
    return room


def upsert_room_player(room, user, sid):
    display_name = ' '.join(part for part in [user.first_name, user.last_name] if part) or user.name
    player = GameRoomPlayer.query.filter_by(room_id=room.id, user_id=user.id).first()
    if not player:
        player = GameRoomPlayer(room_id=room.id, user_id=user.id, display_name=display_name, sid=sid)
        db.session.add(player)
    else:
        player.sid = sid
    db.session.commit()
    return player


def room_players(room_id):
    return GameRoomPlayer.query.filter_by(room_id=room_id).order_by(GameRoomPlayer.score.desc()).all()


def get_round_lock(round_id):
    with _round_locks_guard:
        if round_id not in _round_locks:
            _round_locks[round_id] = Lock()
        return _round_locks[round_id]


def score_fff_buzz(game_round, player, selected_option):
    # This lock is the server-side source of truth for buzz ordering. The first
    # correct answer to enter this critical section locks the round.
    lock = get_round_lock(game_round.id)
    with lock:
        db.session.refresh(game_round)
        arrival_time = datetime.utcnow()
        buzz_entry = {
            'user_id': player.user_id,
            'sid': player.sid,
            'selected_option': selected_option,
            'server_received_at': arrival_time.isoformat(),
        }

        if game_round.locked:
            buzz_entry['accepted'] = False
            buzz_entry['reason'] = 'round_locked'
            game_round.buzz_log = [*(game_round.buzz_log or []), buzz_entry]
            db.session.commit()
            return {'accepted': False, 'reason': 'round_locked'}

        question = Question.query.get(game_round.question_id)
        is_correct = str(selected_option).strip().upper() == question.correct_option
        buzz_entry['accepted'] = is_correct
        buzz_entry['correct'] = is_correct

        if not is_correct:
            game_round.buzz_log = [*(game_round.buzz_log or []), buzz_entry]
            db.session.commit()
            return {'accepted': False, 'reason': 'incorrect'}

        elapsed = max((arrival_time - game_round.started_at).total_seconds(), 0)
        speed_bonus = max(0, 30 - int(elapsed * 2))
        points = DIFFICULTY_POINTS.get(game_round.difficulty, 150) + speed_bonus
        game_round.locked = True
        game_round.locked_at = arrival_time
        game_round.winner_user_id = player.user_id
        game_round.winner_sid = player.sid
        game_round.awarded_points = points
        game_round.buzz_log = [*(game_round.buzz_log or []), buzz_entry]
        player.score += points
        db.session.commit()
        return {'accepted': True, 'points': points, 'winner_user_id': player.user_id}


def lock_fff_round_timeout(game_round):
    lock = get_round_lock(game_round.id)
    with lock:
        db.session.refresh(game_round)
        if game_round.locked:
            return None

        arrival_time = datetime.utcnow()
        timeout_entry = {
            'user_id': None,
            'sid': None,
            'selected_option': None,
            'server_received_at': arrival_time.isoformat(),
            'accepted': False,
            'reason': 'timeout',
        }
        game_round.locked = True
        game_round.locked_at = arrival_time
        game_round.awarded_points = 0
        game_round.buzz_log = [*(game_round.buzz_log or []), timeout_entry]
        db.session.commit()
        return {'accepted': False, 'reason': 'timeout', 'points': 0, 'winner_user_id': None}
