from flask import jsonify


def error_response(message, status_code, code='request_failed', details=None, retryable=False, retry_after=None):
    """Return a consistent error payload while keeping the legacy string field."""
    payload = {
        'error': message,
        'code': code,
        'retryable': bool(retryable),
    }
    if details is not None:
        payload['details'] = details
    if retry_after:
        payload['retry_after'] = retry_after
    return jsonify(payload), status_code


def ai_service_error_response(exc):
    """Translate provider failures into stable, student-safe API errors."""
    from services.llm_service import LLMServiceError

    if not isinstance(exc, LLMServiceError):
        return error_response('AI generation failed. Please try again.', 500, code='ai_generation_failed', retryable=True)
    if exc.status_code == 402:
        return error_response(
            'AI generation is temporarily unavailable because the service quota is exhausted. Contact the administrator.',
            503,
            code='ai_quota_exhausted',
        )
    if exc.status_code in {401, 403}:
        return error_response(
            'AI generation is unavailable because the provider credentials were rejected. Contact the administrator.',
            503,
            code='ai_credentials_rejected',
        )
    if exc.status_code == 429:
        return error_response(
            'The AI service is busy. Wait briefly and try again.',
            503,
            code='ai_rate_limited',
            retryable=True,
            retry_after=exc.retry_delay,
        )
    return error_response(
        'The AI service is currently unavailable. Please try again.',
        503,
        code='ai_provider_unavailable',
        retryable=True,
        retry_after=exc.retry_delay,
    )
