import logging
import threading

from config import Config


logger = logging.getLogger(__name__)
_model = None
_model_lock = threading.Lock()
_transcription_lock = threading.Lock()


class SpeechServiceError(RuntimeError):
    def __init__(self, message, code='speech_transcription_failed', status_code=500, retryable=False):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.retryable = retryable


def _load_model():
    global _model
    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model
        try:
            from faster_whisper import WhisperModel

            _model = WhisperModel(
                Config.WHISPER_MODEL,
                device=Config.WHISPER_DEVICE,
                compute_type=Config.WHISPER_COMPUTE_TYPE,
                cpu_threads=Config.WHISPER_CPU_THREADS,
                num_workers=1,
                download_root=Config.WHISPER_DOWNLOAD_ROOT or None,
            )
        except Exception as exc:
            logger.exception('Unable to load the Whisper speech model')
            raise SpeechServiceError(
                'The voice transcription model is unavailable. Try again after the model finishes downloading.',
                code='speech_model_unavailable',
                status_code=503,
                retryable=True,
            ) from exc
    return _model


def _audio_duration_seconds(path):
    try:
        import av

        with av.open(path) as container:
            if container.duration is not None:
                return float(container.duration / av.time_base)
            audio_stream = next((stream for stream in container.streams if stream.type == 'audio'), None)
            if audio_stream and audio_stream.duration is not None and audio_stream.time_base is not None:
                return float(audio_stream.duration * audio_stream.time_base)
    except Exception as exc:
        raise SpeechServiceError(
            'The recorded audio could not be decoded.',
            code='invalid_audio',
            status_code=400,
        ) from exc
    return 0.0


def transcribe_audio_file(path):
    duration = _audio_duration_seconds(path)
    if duration > Config.VOICE_MAX_SECONDS + 1:
        raise SpeechServiceError(
            f'Voice recordings must be {Config.VOICE_MAX_SECONDS} seconds or shorter.',
            code='audio_too_long',
            status_code=413,
        )

    try:
        model = _load_model()
        with _transcription_lock:
            segments, info = model.transcribe(
                path,
                task='transcribe',
                beam_size=5,
                vad_filter=True,
                vad_parameters={'min_silence_duration_ms': 500},
                condition_on_previous_text=False,
                multilingual=True,
            )
            transcript = ' '.join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
    except SpeechServiceError:
        raise
    except Exception as exc:
        logger.exception('Whisper transcription failed')
        raise SpeechServiceError(
            'Voice transcription failed. Try a shorter recording or type your question.',
            retryable=True,
        ) from exc

    if not transcript:
        raise SpeechServiceError(
            'No speech was detected. Speak closer to the microphone and try again.',
            code='no_speech_detected',
            status_code=422,
        )

    language_code = getattr(info, 'language', None) or 'unknown'
    language_name = {'en': 'english', 'ne': 'nepali'}.get(language_code, language_code)
    return {
        'transcript': transcript,
        'detected_language': language_name,
        'language_code': language_code,
        'language_probability': round(float(getattr(info, 'language_probability', 0) or 0), 4),
        'duration_seconds': round(duration or float(getattr(info, 'duration', 0) or 0), 2),
    }
