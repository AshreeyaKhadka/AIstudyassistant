import logging
import base64
import requests
from config import Config

logger = logging.getLogger(__name__)
SUPPORTED_PROVIDERS = {'gemini', 'openrouter'}
_last_call_metadata = {}


class LLMServiceError(RuntimeError):
    def __init__(self, message, status_code=None, details=None, retry_delay=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details
        self.retry_delay = retry_delay


def _provider():
    provider = (Config.LLM_PROVIDER or 'gemini').strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise LLMServiceError(
            f'Unsupported LLM provider: {provider}',
            details={'supported_providers': sorted(SUPPORTED_PROVIDERS)},
        )
    return provider


def configured_provider_name():
    return 'OpenRouter' if _provider() == 'openrouter' else 'Gemini'


def configured_model_name():
    if _provider() == 'openrouter':
        return Config.OPENROUTER_MODEL
    return Config.GEMINI_MODEL


def get_last_call_metadata():
    return dict(_last_call_metadata)


def _has_real_value(value):
    if not value:
        return False
    normalized = value.strip().lower()
    return bool(normalized) and not normalized.startswith('replace_with_')


def is_llm_configured():
    if _provider() == 'openrouter':
        return _has_real_value(Config.OPENROUTER_API_KEY)
    return _has_real_value(Config.GEMINI_API_KEY)


def _extract_openrouter_retry_delay(error_body):
    if not isinstance(error_body, dict):
        return None
    metadata = (error_body.get('error') or {}).get('metadata') or {}
    return metadata.get('retry_after') or metadata.get('retryDelay')


def _extract_gemini_retry_delay(error_body):
    if not isinstance(error_body, dict):
        return None
    details = ((error_body.get('error') or {}).get('details') or [])
    for item in details:
        retry_delay = item.get('retryDelay') if isinstance(item, dict) else None
        if retry_delay:
            return retry_delay
    return None


def _parse_error_response(response, provider_name):
    try:
        details = response.json()
    except ValueError:
        details = response.text or response.reason

    retry_delay = (
        _extract_openrouter_retry_delay(details)
        if provider_name == 'OpenRouter'
        else _extract_gemini_retry_delay(details)
    )
    return LLMServiceError(
        f'{provider_name} API error {response.status_code}',
        status_code=response.status_code,
        details=details,
        retry_delay=retry_delay,
    )


def _openrouter_headers():
    return {
        'Authorization': f'Bearer {Config.OPENROUTER_API_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': Config.OPENROUTER_SITE_URL,
        'X-OpenRouter-Title': Config.OPENROUTER_APP_NAME,
    }


def openrouter_headers():
    return _openrouter_headers()


def _call_openrouter(messages, temperature=0.4, max_tokens=2000, json_mode=False):
    global _last_call_metadata
    if not _has_real_value(Config.OPENROUTER_API_KEY):
        raise LLMServiceError('OPENROUTER_API_KEY is not configured')

    payload = {
        'model': Config.OPENROUTER_MODEL or 'google/gemini-2.5-flash',
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens,
    }
    if json_mode:
        payload['response_format'] = {'type': 'json_object'}

    try:
        response = requests.post(
            f"{Config.OPENROUTER_API_BASE_URL.rstrip('/')}/chat/completions",
            headers=_openrouter_headers(),
            json=payload,
            timeout=120,
        )
    except requests.RequestException as exc:
        logger.error(f'OpenRouter request failed: {exc}')
        raise LLMServiceError(f'Unable to reach OpenRouter: {exc}') from exc

    if response.status_code >= 400:
        raise _parse_error_response(response, 'OpenRouter')

    try:
        data = response.json()
    except ValueError as exc:
        raise LLMServiceError('OpenRouter returned an invalid JSON response') from exc

    choices = data.get('choices') or []
    if not choices:
        raise LLMServiceError('OpenRouter returned no choices')

    message = (choices[0] or {}).get('message') or {}
    content = message.get('content')
    if isinstance(content, list):
        text = '\n'.join(
            part.get('text', '')
            for part in content
            if isinstance(part, dict) and part.get('text')
        ).strip()
    else:
        text = str(content or '').strip()

    if not text:
        raise LLMServiceError('OpenRouter returned an empty response')
    _last_call_metadata = data.get('usage') or {}
    return text


def _gemini_part_from_content_part(part):
    if not isinstance(part, dict):
        return {'text': str(part)}

    part_type = part.get('type')
    if part_type == 'text':
        return {'text': str(part.get('text') or '')}
    if part_type == 'image_url':
        image_url = (part.get('image_url') or {}).get('url') or ''
        if image_url.startswith('data:') and ';base64,' in image_url:
            header, data = image_url.split(';base64,', 1)
            mime_type = header.replace('data:', '', 1) or 'image/png'
            return {'inline_data': {'mime_type': mime_type, 'data': data}}
    return {'text': str(part)}


def _message_content_to_text(content):
    if isinstance(content, list):
        return '\n'.join(
            str(part.get('text') or '')
            for part in content
            if isinstance(part, dict) and part.get('type') == 'text'
        ).strip()
    return str(content or '').strip()


def _gemini_contents_from_messages(messages):
    contents = []
    system_parts = []

    for message in messages:
        role = message.get('role')
        content = message.get('content')
        if not content:
            continue
        if role == 'system':
            system_text = _message_content_to_text(content)
            if system_text:
                system_parts.append(system_text)
            continue
        parts = (
            [_gemini_part_from_content_part(part) for part in content]
            if isinstance(content, list)
            else [{'text': str(content).strip()}]
        )
        parts = [part for part in parts if part.get('text') or part.get('inline_data')]
        if not parts:
            continue
        contents.append({
            'role': 'model' if role == 'assistant' else 'user',
            'parts': parts,
        })

    if system_parts:
        system_text = '\n\n'.join(system_parts)
        if contents and contents[0]['role'] == 'user':
            contents[0]['parts'][0]['text'] = f"{system_text}\n\n{contents[0]['parts'][0]['text']}"
        else:
            contents.insert(0, {'role': 'user', 'parts': [{'text': system_text}]})

    return contents


def _call_gemini(messages, temperature=0.4, max_tokens=2000, json_mode=False):
    global _last_call_metadata
    if not _has_real_value(Config.GEMINI_API_KEY):
        raise LLMServiceError('GEMINI_API_KEY is not configured')

    payload = {
        'contents': _gemini_contents_from_messages(messages),
        'generationConfig': {
            'temperature': temperature,
            'maxOutputTokens': max_tokens,
        },
    }
    if json_mode:
        payload['generationConfig']['responseMimeType'] = 'application/json'

    try:
        response = requests.post(
            f"{Config.GEMINI_API_BASE_URL.rstrip('/')}/models/{Config.GEMINI_MODEL}:generateContent",
            headers={'x-goog-api-key': Config.GEMINI_API_KEY},
            json=payload,
            timeout=120,
        )
    except requests.RequestException as exc:
        logger.error(f'Gemini request failed: {exc}')
        raise LLMServiceError(f'Unable to reach Gemini: {exc}') from exc

    if response.status_code >= 400:
        raise _parse_error_response(response, 'Gemini')

    try:
        data = response.json()
    except ValueError as exc:
        raise LLMServiceError('Gemini returned an invalid JSON response') from exc

    candidates = data.get('candidates') or []
    if not candidates:
        raise LLMServiceError('Gemini returned no candidates')

    content = (candidates[0] or {}).get('content') or {}
    parts = content.get('parts') or []
    text = '\n'.join(
        part.get('text', '')
        for part in parts
        if isinstance(part, dict) and part.get('text')
    ).strip()

    if not text:
        raise LLMServiceError('Gemini returned an empty response')
    _last_call_metadata = data.get('usageMetadata') or {}
    return text


def call_chat(messages, temperature=0.4, max_tokens=2000, json_mode=False):
    if _provider() == 'openrouter':
        return _call_openrouter(messages, temperature, max_tokens, json_mode)
    return _call_gemini(messages, temperature, max_tokens, json_mode)


def call_prompt(prompt, temperature=0.4, max_tokens=2000, json_mode=False):
    return call_chat(
        [{'role': 'user', 'content': prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=json_mode,
    )


def call_vision_prompt(prompt, image_bytes, mime_type='image/png', temperature=0.0, max_tokens=4096):
    image_data = base64.b64encode(image_bytes).decode('ascii')
    return call_chat(
        [
            {
                'role': 'user',
                'content': [
                    {'type': 'text', 'text': prompt},
                    {
                        'type': 'image_url',
                        'image_url': {'url': f'data:{mime_type};base64,{image_data}'},
                    },
                ],
            }
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
