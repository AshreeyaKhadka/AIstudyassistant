import os
from time import perf_counter

import requests
from flask import Blueprint, jsonify, request

from services.auth_service import login_required


execute_bp = Blueprint('execute', __name__)

PISTON_URL = os.getenv('PISTON_URL', 'https://emkc.org/api/v2/piston/execute')
PISTON_API_KEY = os.getenv('PISTON_API_KEY')
REQUEST_TIMEOUT_SECONDS = 15
MAX_CODE_LENGTH = 100_000
MAX_STDIN_LENGTH = 10_000

LANGUAGES = {
    'c': {'piston': 'c', 'version': '*', 'file_name': 'solution.c'},
    'cpp': {'piston': 'c++', 'version': '*', 'file_name': 'solution.cpp'},
    'java': {'piston': 'java', 'version': '*', 'file_name': 'Main.java'},
    'python': {'piston': 'python', 'version': '*', 'file_name': 'solution.py'},
}


@execute_bp.route('/execute', methods=['POST'])
@login_required
def execute_code(user):
    """Run whitelisted student code through Piston without exposing its endpoint to clients."""
    data = request.get_json(silent=True) or {}
    language_id = data.get('language')
    code = data.get('code')
    stdin = data.get('stdin', '')

    if language_id not in LANGUAGES:
        return jsonify({'error': 'Unsupported language.'}), 400
    if not isinstance(code, str) or not code.strip():
        return jsonify({'error': 'Code is required.'}), 400
    if not isinstance(stdin, str):
        return jsonify({'error': 'Standard input must be text.'}), 400
    if len(code) > MAX_CODE_LENGTH or len(stdin) > MAX_STDIN_LENGTH:
        return jsonify({'error': 'Code or standard input exceeds the allowed size.'}), 413

    language = LANGUAGES[language_id]
    payload = {
        'language': language['piston'],
        'version': language['version'],
        'files': [{'name': language['file_name'], 'content': code}],
        'stdin': stdin,
    }

    started_at = perf_counter()
    try:
        payload.update({'compile_timeout': 10000, 'run_timeout': 3000, 'compile_cpu_time': 10000, 'run_cpu_time': 3000, 'run_memory_limit': 268435456})
        headers = {'Authorization': PISTON_API_KEY} if PISTON_API_KEY else {}
        response = requests.post(PISTON_URL, json=payload, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code == 401:
            return jsonify({'error': 'Code execution is not configured. Set PISTON_URL to your self-hosted Piston server or PISTON_API_KEY to your approved Piston key.'}), 503
        response.raise_for_status()
        execution = response.json()
    except requests.Timeout:
        return jsonify({'error': 'Execution timed out. Please simplify your program and try again.'}), 504
    except (requests.RequestException, ValueError):
        return jsonify({'error': 'The code runner is temporarily unavailable. Please try again.'}), 502

    compile_result = execution.get('compile') or {}
    run_result = execution.get('run') or {}
    return jsonify({
        'compile': compile_result,
        'run': run_result,
        'durationMs': round((perf_counter() - started_at) * 1000),
        'memory': run_result.get('memory'),
    }), 200
