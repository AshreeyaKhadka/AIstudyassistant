from datetime import datetime
import logging

from flask import Blueprint, current_app, jsonify, request

from config import db
from models.arcade import GameRoom, GameRoomPlayer, GameRound, Question, ScoreboardEntry
from models.user import User
from services.auth_service import decode_token, login_required
from services.arcade_service import (
    ROUND_DIFFICULTY,
    add_point_event,
    answer_study_raid,
    connect_party_player,
    create_party_room,
    create_scoreboard_entry,
    finish_study_raid,
    get_party_questions,
    get_party_room,
    get_leaderboard,
    get_or_create_fff_room,
    get_questions_for_subject,
    get_user_subjects_with_questions,
    join_party_room,
    lock_party_round_timeout,
    party_can_start,
    resolve_subject,
    room_players,
    score_party_answer,
    score_fff_buzz,
    serialize_party_room,
    lock_fff_round_timeout,
    serialize_question,
    set_party_ready,
    start_study_raid,
    upsert_room_player,
)

arcade_bp = Blueprint('arcade', __name__)
logger = logging.getLogger(__name__)
ROUND_TIMEOUT_SECONDS = 10
PARTY_ROUNDS = 6


@arcade_bp.route('/subjects', methods=['GET'])
@login_required
def arcade_subjects(user):
    try:
        return jsonify(get_user_subjects_with_questions(user)), 200
    except Exception as exc:
        logger.error(f"Arcade subjects load failed: {exc}")
        return jsonify({"error": "Failed to load Arcade subjects"}), 500


@arcade_bp.route('/scoreboard/questions', methods=['POST'])
@login_required
def scoreboard_questions(user):
    data = request.get_json(silent=True) or {}
    subject_id = data.get('subject_id')
    subject = data.get('subject')
    try:
        questions = get_questions_for_subject(user, subject_id=subject_id, subject=subject, count=10)
        if not questions:
            return jsonify({"error": "No questions found for this subject."}), 404
        return jsonify({"questions": [serialize_question(q) for q in questions]}), 200
    except Exception as exc:
        logger.error(f"Arcade scoreboard questions failed: {exc}")
        return jsonify({"error": "Failed to load questions"}), 500


@arcade_bp.route('/scoreboard/submit', methods=['POST'])
@login_required
def scoreboard_submit(user):
    data = request.get_json(silent=True) or {}
    answers = data.get('answers') or {}
    if not isinstance(answers, dict) or not answers:
        return jsonify({"error": "answers are required"}), 400

    subject_id, subject = resolve_subject(user, data.get('subject_id'), data.get('subject'))
    try:
        entry = create_scoreboard_entry(user, subject_id, subject, answers)
        return jsonify({
            "message": "Score recorded",
            "entry": {
                "id": entry.id,
                "mode": entry.mode,
                "subject": entry.subject,
                "score": entry.score,
                "total_questions": entry.total_questions,
                "points": entry.points,
                "answers": entry.answers_json,
                "played_at": entry.played_at,
            },
        }), 200
    except Exception as exc:
        db.session.rollback()
        logger.error(f"Scoreboard submit failed: {exc}")
        return jsonify({"error": "Failed to record score"}), 500


@arcade_bp.route('/scoreboard/history', methods=['GET'])
@login_required
def scoreboard_history(user):
    entries = (
        ScoreboardEntry.query.filter_by(user_id=user.id)
        .order_by(ScoreboardEntry.played_at.desc())
        .limit(20)
        .all()
    )
    return jsonify([
        {
            "id": entry.id,
            "mode": entry.mode,
            "subject": entry.subject,
            "score": entry.score,
            "total_questions": entry.total_questions,
            "points": entry.points,
            "played_at": entry.played_at,
        }
        for entry in entries
    ]), 200


@arcade_bp.route('/leaderboard', methods=['GET'])
@login_required
def arcade_leaderboard(user):
    return jsonify({
        "leaders": get_leaderboard(
            subject=request.args.get('subject'),
            mode=request.args.get('mode', 'all'),
            window=request.args.get('window', 'weekly'),
        )
    }), 200


@arcade_bp.route('/study-raid/start', methods=['POST'])
@login_required
def study_raid_start(user):
    data = request.get_json(silent=True) or {}
    try:
        raid = start_study_raid(
            user,
            subject_id=data.get('subject_id'),
            subject=data.get('subject'),
            avatar_id=data.get('avatar_id') or 'navigator',
        )
        if not raid:
            return jsonify({"error": "No practice questions found for this subject."}), 404
        return jsonify(raid), 200
    except Exception as exc:
        db.session.rollback()
        logger.error(f"Study Raid start failed: {exc}")
        return jsonify({"error": "Could not start Study Raid"}), 500


@arcade_bp.route('/study-raid/answer', methods=['POST'])
@login_required
def study_raid_answer(user):
    data = request.get_json(silent=True) or {}
    if not data.get('room_id') or not data.get('question_id'):
        return jsonify({"error": "Missing raid or question."}), 400
    try:
        result = answer_study_raid(
            user,
            data.get('room_id'),
            data.get('question_id'),
            data.get('selected_option'),
            data.get('response_time_ms') or 0,
            data.get('streak') or 0,
        )
        if not result:
            return jsonify({"error": "This raid question could not be checked."}), 404
        return jsonify(result), 200
    except Exception as exc:
        db.session.rollback()
        logger.error(f"Study Raid answer failed: {exc}")
        return jsonify({"error": "Could not check your answer"}), 500


@arcade_bp.route('/study-raid/finish', methods=['POST'])
@login_required
def study_raid_finish(user):
    data = request.get_json(silent=True) or {}
    try:
        entry = finish_study_raid(user, data.get('room_id'), data.get('answers') or [])
        if not entry:
            return jsonify({"error": "Raid not found."}), 404
        return jsonify({
            "message": "Raid saved",
            "entry": {
                "id": entry.id,
                "mode": entry.mode,
                "subject": entry.subject,
                "score": entry.score,
                "total_questions": entry.total_questions,
                "points": entry.points,
                "played_at": entry.played_at,
            },
        }), 200
    except Exception as exc:
        db.session.rollback()
        logger.error(f"Study Raid finish failed: {exc}")
        return jsonify({"error": "Could not save this raid"}), 500


@arcade_bp.route('/party/create', methods=['POST'])
@login_required
def party_create(user):
    data = request.get_json(silent=True) or {}
    try:
        room = create_party_room(
            user,
            subject_id=data.get('subject_id'),
            subject=data.get('subject'),
            avatar_id=data.get('avatar_id'),
        )
        return jsonify(serialize_party_room(room, user.id)), 201
    except (ValueError, LookupError) as exc:
        db.session.rollback()
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error(f"Party creation failed: {exc}")
        return jsonify({'error': 'Could not create this party.'}), 500


@arcade_bp.route('/party/join', methods=['POST'])
@login_required
def party_join(user):
    data = request.get_json(silent=True) or {}
    try:
        room = join_party_room(user, data.get('code'), data.get('avatar_id'))
        return jsonify(serialize_party_room(room, user.id)), 200
    except (ValueError, LookupError) as exc:
        db.session.rollback()
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        logger.error(f"Party join failed: {exc}")
        return jsonify({'error': 'Could not join this party.'}), 500


@arcade_bp.route('/party/<string:invite_code>', methods=['GET'])
@login_required
def party_status(user, invite_code):
    room = get_party_room(invite_code)
    if not room:
        return jsonify({'error': 'Party code is invalid or expired.'}), 404
    player = GameRoomPlayer.query.filter_by(room_id=room.id, user_id=user.id).first()
    if not player:
        return jsonify({'error': 'You are not a member of this party.'}), 403
    return jsonify(serialize_party_room(room, user.id)), 200


def _socket_user():
    token = request.cookies.get('session_token')
    payload = decode_token(token) if token else None
    if not payload:
        return None
    user = User.query.get(payload['user_id'])
    return user if user and not user.is_banned else None


def register_arcade_socketio(socketio):
    @socketio.on('arcade:party_connect')
    def party_connect(data):
        user = _socket_user()
        if not user:
            socketio.emit('arcade:party_error', {'error': 'Unauthorized'}, to=request.sid)
            return
        room = get_party_room((data or {}).get('code'))
        if not room:
            socketio.emit('arcade:party_error', {'error': 'Party code is invalid or expired.'}, to=request.sid)
            return
        player = connect_party_player(room, user, request.sid)
        if not player:
            socketio.emit('arcade:party_error', {'error': 'You are not a member of this party.'}, to=request.sid)
            return

        from flask_socketio import join_room
        socket_room = f'party:{room.id}'
        join_room(socket_room)
        socketio.emit('arcade:party_state', serialize_party_room(room), room=socket_room)
        if room.status == 'active':
            current_round = (
                GameRound.query
                .filter_by(room_id=room.id, round_number=room.current_round, locked=False)
                .first()
            )
            if current_round:
                question = Question.query.get(current_round.question_id)
                elapsed = max((datetime.utcnow() - current_round.started_at).total_seconds(), 0)
                socketio.emit('arcade:party_round_started', {
                    'room_id': room.id,
                    'round': current_round.round_number,
                    'total_rounds': PARTY_ROUNDS,
                    'round_id': current_round.id,
                    'question': serialize_question(question),
                    'players': _serialized_party_players(room.id),
                    'timeout_seconds': max(1, ROUND_TIMEOUT_SECONDS - int(elapsed)),
                    'reconnected': True,
                }, to=request.sid)

    @socketio.on('arcade:party_ready')
    def party_ready(data):
        user = _socket_user()
        room = get_party_room((data or {}).get('code')) if user else None
        if not user or not room:
            socketio.emit('arcade:party_error', {'error': 'Party not found.'}, to=request.sid)
            return
        player = set_party_ready(room, user, (data or {}).get('ready', True))
        if not player:
            socketio.emit('arcade:party_error', {'error': 'You cannot ready in this party.'}, to=request.sid)
            return
        socket_room = f'party:{room.id}'
        socketio.emit('arcade:party_state', serialize_party_room(room), room=socket_room)
        if party_can_start(room):
            room.status = 'countdown'
            db.session.commit()
            socketio.emit('arcade:party_countdown', {'seconds': 3}, room=socket_room)
            app = current_app._get_current_object()
            socketio.start_background_task(_start_party_game, app, socketio, room.id)

    @socketio.on('arcade:party_answer')
    def party_answer(data):
        user = _socket_user()
        data = data or {}
        game_round = GameRound.query.get(data.get('round_id')) if user else None
        if not user or not game_round:
            socketio.emit('arcade:party_error', {'error': 'Round not found.'}, to=request.sid)
            return
        room = GameRoom.query.get(game_round.room_id)
        player = GameRoomPlayer.query.filter_by(room_id=game_round.room_id, user_id=user.id).first()
        if not room or room.mode != 'party_duel' or not player:
            socketio.emit('arcade:party_error', {'error': 'You are not in this duel.'}, to=request.sid)
            return

        result = score_party_answer(game_round, player, data.get('selected_option'))
        result['round_id'] = game_round.id
        result['player_user_id'] = user.id
        result['players'] = _serialized_party_players(room.id)
        socket_room = f'party:{room.id}'
        socketio.emit('arcade:party_answer_result', result, room=socket_room)
        if result.get('locked'):
            app = current_app._get_current_object()
            socketio.start_background_task(_advance_party_round, app, socketio, room.id)

    @socketio.on('arcade:party_leave')
    def party_leave(data):
        user = _socket_user()
        room = get_party_room((data or {}).get('code')) if user else None
        if not user or not room:
            return
        player = GameRoomPlayer.query.filter_by(room_id=room.id, user_id=user.id).first()
        if not player:
            return
        if room.status == 'waiting' and room.created_by_id == user.id:
            room.status = 'abandoned'
        elif room.status == 'waiting':
            db.session.delete(player)
        elif room.status in {'active', 'countdown'}:
            player.connected = False
            player.sid = None
            room.status = 'completed'
            room.completed_at = datetime.utcnow()
            opponents = [
                opponent
                for opponent in room_players(room.id)
                if opponent.user_id != user.id
            ]
            if opponents:
                opponents[0].score += 100
            db.session.commit()
            _record_party_results(room)
            players = _serialized_party_players(room.id)
            socketio.emit('arcade:party_game_over', {
                'room_id': room.id,
                'players': players,
                'winner_user_id': opponents[0].user_id if opponents else None,
                'reason': 'forfeit',
            }, room=f'party:{room.id}')
            return
        else:
            player.connected = False
            player.sid = None
            player.last_seen_at = datetime.utcnow()
        db.session.commit()
        socketio.emit('arcade:party_state', serialize_party_room(room), room=f'party:{room.id}')

    @socketio.on('disconnect')
    def party_disconnect():
        player = GameRoomPlayer.query.filter_by(sid=request.sid).first()
        if not player:
            return
        room = GameRoom.query.get(player.room_id)
        player.connected = False
        player.sid = None
        player.last_seen_at = datetime.utcnow()
        if room and room.mode == 'party_duel' and room.status == 'waiting':
            player.ready = False
        db.session.commit()
        if room and room.mode == 'party_duel':
            socketio.emit('arcade:party_state', serialize_party_room(room), room=f'party:{room.id}')

    @socketio.on('arcade:join_fff')
    def join_fff(data):
        user = _socket_user()
        if not user:
            socketio.emit('arcade:error', {'error': 'Unauthorized'}, to=request.sid)
            return

        room = get_or_create_fff_room(
            user,
            subject_id=(data or {}).get('subject_id'),
            subject=(data or {}).get('subject'),
        )
        player = upsert_room_player(room, user, request.sid)
        socket_room = f'fff:{room.id}'
        from flask_socketio import join_room
        join_room(socket_room)

        socketio.emit('arcade:room_state', _room_state(room.id), room=socket_room)
        if room.status == 'waiting' and room.current_round == 0:
            app = current_app._get_current_object()
            socketio.start_background_task(_start_fff_game, app, socketio, room.id)

    @socketio.on('arcade:buzz')
    def buzz(data):
        user = _socket_user()
        if not user:
            socketio.emit('arcade:error', {'error': 'Unauthorized'}, to=request.sid)
            return

        data = data or {}
        game_round = GameRound.query.get(data.get('round_id'))
        if not game_round:
            socketio.emit('arcade:buzz_result', {'accepted': False, 'reason': 'round_not_found'}, to=request.sid)
            return

        player = (
            room_players(game_round.room_id)
            and next((p for p in room_players(game_round.room_id) if p.user_id == user.id), None)
        )
        if not player:
            socketio.emit('arcade:buzz_result', {'accepted': False, 'reason': 'player_not_found'}, to=request.sid)
            return

        result = score_fff_buzz(game_round, player, data.get('selected_option'))
        socketio.emit('arcade:buzz_result', result, to=request.sid)
        if result.get('accepted'):
            socketio.emit('arcade:round_locked', {
                **result,
                'round_id': game_round.id,
                'players': _serialized_players(game_round.room_id),
            }, room=f'fff:{game_round.room_id}')
            app = current_app._get_current_object()
            socketio.start_background_task(_advance_fff_round, app, socketio, game_round.room_id)


def _start_party_game(app, socketio, room_id):
    socketio.sleep(3)
    with app.app_context():
        room = GameRoom.query.get(room_id)
        if not room or room.status != 'countdown':
            return
        players = room_players(room.id)
        if len(players) != 2 or not all(player.connected for player in players):
            room.status = 'waiting'
            for player in players:
                player.ready = False
            db.session.commit()
            socketio.emit('arcade:party_state', serialize_party_room(room), room=f'party:{room.id}')
            return
        room.status = 'active'
        db.session.commit()
    _emit_next_party_round(app, socketio, room_id)


def _advance_party_round(app, socketio, room_id):
    socketio.sleep(2.4)
    _emit_next_party_round(app, socketio, room_id)


def _emit_next_party_round(app, socketio, room_id):
    with app.app_context():
        room = GameRoom.query.get(room_id)
        if not room or room.mode != 'party_duel' or room.status != 'active':
            return
        next_round = room.current_round + 1
        if next_round > PARTY_ROUNDS:
            room.status = 'completed'
            room.completed_at = datetime.utcnow()
            db.session.commit()
            _record_party_results(room)
            players = _serialized_party_players(room.id)
            winner_user_id = (
                players[0]['user_id']
                if players and (len(players) == 1 or players[0]['score'] > players[1]['score'])
                else None
            )
            socketio.emit('arcade:party_game_over', {
                'room_id': room.id,
                'players': players,
                'winner_user_id': winner_user_id,
            }, room=f'party:{room.id}')
            return

        used_ids = [
            row.question_id
            for row in GameRound.query.filter_by(room_id=room.id).all()
        ]
        owner = User.query.get(room.created_by_id)
        questions = get_party_questions(owner, room.subject, count=PARTY_ROUNDS, exclude_ids=used_ids)
        if not questions:
            room.status = 'completed'
            db.session.commit()
            socketio.emit('arcade:party_error', {'error': 'No more curated questions are available.'}, room=f'party:{room.id}')
            return

        question = questions[0]
        game_round = GameRound(
            room_id=room.id,
            round_number=next_round,
            question_id=question.id,
            difficulty=question.difficulty,
            started_at=datetime.utcnow(),
        )
        room.current_round = next_round
        db.session.add(game_round)
        db.session.commit()
        socketio.emit('arcade:party_round_started', {
            'room_id': room.id,
            'round': next_round,
            'total_rounds': PARTY_ROUNDS,
            'round_id': game_round.id,
            'question': serialize_question(question),
            'players': _serialized_party_players(room.id),
            'timeout_seconds': ROUND_TIMEOUT_SECONDS,
        }, room=f'party:{room.id}')
        socketio.start_background_task(_party_round_timeout_guard, app, socketio, room.id, game_round.id)


def _party_round_timeout_guard(app, socketio, room_id, round_id):
    socketio.sleep(ROUND_TIMEOUT_SECONDS)
    with app.app_context():
        room = GameRoom.query.get(room_id)
        game_round = GameRound.query.get(round_id)
        if not room or room.status != 'active' or not game_round or game_round.room_id != room.id:
            return
        result = lock_party_round_timeout(game_round)
        if not result:
            return
        result['round_id'] = game_round.id
        result['players'] = _serialized_party_players(room.id)
        socketio.emit('arcade:party_answer_result', result, room=f'party:{room.id}')
        socketio.start_background_task(_advance_party_round, app, socketio, room.id)


def _start_fff_game(app, socketio, room_id):
    socketio.sleep(2)
    with app.app_context():
        room = GameRoom.query.get(room_id)
        if not room or room.status != 'waiting':
            return
        room.status = 'active'
        db.session.commit()
    _emit_next_round(app, socketio, room_id)


def _advance_fff_round(app, socketio, room_id):
    socketio.sleep(2.5)
    _emit_next_round(app, socketio, room_id)


def _emit_next_round(app, socketio, room_id):
    with app.app_context():
        room = GameRoom.query.get(room_id)
        if not room or room.status not in {'waiting', 'active'}:
            return

        next_round = room.current_round + 1
        if next_round > 10:
            room.status = 'completed'
            room.completed_at = datetime.utcnow()
            db.session.commit()
            _record_fff_results(room)
            socketio.emit('arcade:game_over', {
                'room_id': room.id,
                'players': _serialized_players(room.id),
            }, room=f'fff:{room.id}')
            return

        owner = User.query.get(room.created_by_id)
        difficulty = ROUND_DIFFICULTY[next_round]
        questions = get_questions_for_subject(
            owner,
            subject_id=room.subject_id,
            subject=room.subject,
            count=1,
            difficulty=difficulty,
        )
        if not questions:
            questions = get_questions_for_subject(owner, subject_id=room.subject_id, subject=room.subject, count=1)
        if not questions:
            room.status = 'completed'
            room.completed_at = datetime.utcnow()
            db.session.commit()
            socketio.emit('arcade:error', {'error': 'Not enough generated questions for this subject.'}, room=f'fff:{room.id}')
            return

        question = questions[0]
        game_round = GameRound(
            room_id=room.id,
            round_number=next_round,
            question_id=question.id,
            difficulty=difficulty,
        )
        room.current_round = next_round
        room.status = 'active'
        db.session.add(game_round)
        db.session.commit()

        socketio.emit('arcade:round_started', {
            'room_id': room.id,
            'round': next_round,
            'round_id': game_round.id,
            'question': serialize_question(question),
            'players': _serialized_players(room.id),
        }, room=f'fff:{room.id}')
        socketio.start_background_task(_round_timeout_guard, app, socketio, room.id, game_round.id)


def _round_timeout_guard(app, socketio, room_id, round_id):
    socketio.sleep(ROUND_TIMEOUT_SECONDS)
    with app.app_context():
        game_round = GameRound.query.get(round_id)
        room = GameRoom.query.get(room_id)
        if not room or room.status != 'active' or not game_round:
            return
        if game_round.room_id != room_id:
            return

        result = lock_fff_round_timeout(game_round)
        if not result:
            return

        socketio.emit('arcade:round_locked', {
            **result,
            'round_id': game_round.id,
            'players': _serialized_players(room_id),
        }, room=f'fff:{room_id}')
        socketio.start_background_task(_advance_fff_round, app, socketio, room_id)


def _record_fff_results(room):
    rounds = GameRound.query.filter_by(room_id=room.id).all()
    wins_by_user = {}
    for played_round in rounds:
        if played_round.winner_user_id:
            wins_by_user[played_round.winner_user_id] = wins_by_user.get(played_round.winner_user_id, 0) + 1

    players = room_players(room.id)
    for player in players:
        entry = ScoreboardEntry(
            user_id=player.user_id,
            subject_id=room.subject_id,
            subject=room.subject,
            mode='fff',
            score=wins_by_user.get(player.user_id, 0),
            total_questions=10,
            points=player.score,
            answers_json=None,
        )
        db.session.add(entry)

        if player.score <= 0:
            continue
        add_point_event(
            player.user_id,
            room.subject_id,
            room.subject,
            'fff',
            player.score,
            'game_room',
            room.id,
        )
    db.session.commit()


def _record_party_results(room):
    rounds = GameRound.query.filter_by(room_id=room.id).all()
    wins = {}
    for played_round in rounds:
        if played_round.winner_user_id:
            wins[played_round.winner_user_id] = wins.get(played_round.winner_user_id, 0) + 1
    for player in room_players(room.id):
        entry = ScoreboardEntry(
            user_id=player.user_id,
            subject_id=room.subject_id,
            subject=room.subject,
            mode='party_duel',
            score=wins.get(player.user_id, 0),
            total_questions=PARTY_ROUNDS,
            points=player.score,
            answers_json={'room_id': room.id},
        )
        db.session.add(entry)
        db.session.flush()
        if player.score > 0:
            add_point_event(
                player.user_id,
                room.subject_id,
                room.subject,
                'party_duel',
                player.score,
                'game_room',
                room.id,
            )
    db.session.commit()


def _serialized_party_players(room_id):
    return [
        {
            'user_id': player.user_id,
            'display_name': player.display_name,
            'avatar_id': player.avatar_id,
            'score': player.score,
            'ready': bool(player.ready),
            'connected': bool(player.connected),
        }
        for player in room_players(room_id)
    ]


def _serialized_players(room_id):
    return [
        {
            'user_id': player.user_id,
            'display_name': player.display_name,
            'score': player.score,
        }
        for player in room_players(room_id)
    ]


def _room_state(room_id):
    room = GameRoom.query.get(room_id)
    return {
        'room_id': room.id,
        'subject': room.subject,
        'status': room.status,
        'current_round': room.current_round,
        'players': _serialized_players(room.id),
    }
    join_party_room,
    lock_party_round_timeout,
    party_can_start,
    score_party_answer,
    serialize_party_room,
    set_party_ready,
