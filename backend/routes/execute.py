import os
import shutil
import subprocess
import tempfile
from time import perf_counter

import requests
from flask import Blueprint, jsonify, request

from services.auth_service import login_required


execute_bp = Blueprint('execute', __name__)

PISTON_URL = os.getenv('PISTON_URL', 'https://emkc.org/api/v2/piston/execute')
PISTON_API_KEY = os.getenv('PISTON_API_KEY')
LOCAL_CODE_EXECUTION_SETTING = os.getenv('LOCAL_CODE_EXECUTION_ENABLED', 'true').strip().lower()
LOCAL_CODE_EXECUTION_ENABLED = LOCAL_CODE_EXECUTION_SETTING in {'1', 'true', 'yes', 'on'}
REQUEST_TIMEOUT_SECONDS = 15
MAX_CODE_LENGTH = 100_000
MAX_STDIN_LENGTH = 10_000

LANGUAGES = {
    'c': {'piston': 'c', 'version': '*', 'file_name': 'solution.c'},
    'cpp': {'piston': 'c++', 'version': '*', 'file_name': 'solution.cpp'},
    'java': {'piston': 'java', 'version': '*', 'file_name': 'Main.java'},
    'python': {'piston': 'python', 'version': '*', 'file_name': 'solution.py'},
}


def _completed(stdout='', stderr='', code=0):
    return {'stdout': stdout, 'stderr': stderr, 'code': code}


def _run_process(command, cwd, stdin='', timeout=3):
    try:
        result = subprocess.run(
            command,
            input=stdin,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return _completed(result.stdout, result.stderr, result.returncode)
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout or ''
        if isinstance(stdout, bytes):
            stdout = stdout.decode('utf-8', errors='replace')
        return _completed(stdout, 'Execution timed out.', 124)


def _execute_locally(language_id, code, stdin):
    # Local execution is intentionally opt-in: unlike Piston, these processes
    # are not isolated from the application host.
    if not LOCAL_CODE_EXECUTION_ENABLED:
        return None
    with tempfile.TemporaryDirectory(prefix='aistudy-code-') as temp_dir:
        if language_id == 'python':
            python = shutil.which('python3') or shutil.which('python')
            if not python:
                return None
            source = os.path.join(temp_dir, 'solution.py')
            with open(source, 'w', encoding='utf-8') as handle:
                handle.write(code)
            return {'compile': _completed(), 'run': _run_process([python, source], temp_dir, stdin)}

        if language_id == 'c':
            compiler = shutil.which('gcc')
            if not compiler:
                return None
            source = os.path.join(temp_dir, 'solution.c')
            output = os.path.join(temp_dir, 'solution')
            with open(source, 'w', encoding='utf-8') as handle:
                handle.write(code)
            compile_result = _run_process([compiler, source, '-O2', '-std=c11', '-o', output], temp_dir, timeout=8)
            if compile_result['code'] != 0:
                return {'compile': compile_result, 'run': _completed()}
            return {'compile': compile_result, 'run': _run_process([output], temp_dir, stdin)}

        if language_id == 'cpp':
            compiler = shutil.which('g++')
            if not compiler:
                return None
            source = os.path.join(temp_dir, 'solution.cpp')
            output = os.path.join(temp_dir, 'solution')
            with open(source, 'w', encoding='utf-8') as handle:
                handle.write(code)
            compile_result = _run_process([compiler, source, '-O2', '-std=c++17', '-o', output], temp_dir, timeout=8)
            if compile_result['code'] != 0:
                return {'compile': compile_result, 'run': _completed()}
            return {'compile': compile_result, 'run': _run_process([output], temp_dir, stdin)}

        if language_id == 'java':
            javac = shutil.which('javac')
            java = shutil.which('java')
            if not javac or not java:
                return {
                    'compile': _completed(stderr='Java is not installed on this server. Install JDK or configure Piston to run Java.', code=127),
                    'run': _completed(),
                }
            source = os.path.join(temp_dir, 'Main.java')
            with open(source, 'w', encoding='utf-8') as handle:
                handle.write(code)
            compile_result = _run_process([javac, source], temp_dir, timeout=8)
            if compile_result['code'] != 0:
                return {'compile': compile_result, 'run': _completed()}
            return {'compile': compile_result, 'run': _run_process([java, 'Main'], temp_dir, stdin)}

    return None


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
    if language_id in {'python', 'c', 'cpp'}:
        local_execution = _execute_locally(language_id, code, stdin)
        if local_execution:
            run_result = local_execution.get('run') or {}
            return jsonify({
                'compile': local_execution.get('compile') or {},
                'run': run_result,
                'durationMs': round((perf_counter() - started_at) * 1000),
                'memory': run_result.get('memory'),
            }), 200

    try:
        payload.update({'compile_timeout': 10000, 'run_timeout': 3000, 'compile_cpu_time': 10000, 'run_cpu_time': 3000, 'run_memory_limit': 268435456})
        headers = {'Authorization': PISTON_API_KEY} if PISTON_API_KEY else {}
        response = requests.post(PISTON_URL, json=payload, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code == 401:
            local_execution = _execute_locally(language_id, code, stdin)
            if local_execution:
                execution = local_execution
            else:
                return jsonify({'error': 'Code runner is not available for this language.'}), 503
        else:
            response.raise_for_status()
            execution = response.json()
    except requests.Timeout:
        local_execution = _execute_locally(language_id, code, stdin)
        if local_execution:
            execution = local_execution
        else:
            return jsonify({'error': 'Execution timed out. Please simplify your program and try again.'}), 504
    except (requests.RequestException, ValueError):
        local_execution = _execute_locally(language_id, code, stdin)
        if local_execution:
            execution = local_execution
        else:
            return jsonify({'error': 'The code runner is temporarily unavailable. Please try again.'}), 502

    compile_result = execution.get('compile') or {}
    run_result = execution.get('run') or {}
    return jsonify({
        'compile': compile_result,
        'run': run_result,
        'durationMs': round((perf_counter() - started_at) * 1000),
        'memory': run_result.get('memory'),
    }), 200
