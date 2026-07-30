import os
import json
import time
import random
import logging
import sqlite3
import hashlib
import requests
from typing import Optional
from config import Config

logger = logging.getLogger(__name__)

CACHE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "llm_cache.db")

class LLMClient:
    def __init__(self):
        self.keys = Config.GEMINI_API_KEYS
        if not self.keys:
            raise RuntimeError("GEMINI_API_KEYS not configured")
        
        self.key_status = {k: 0 for k in self.keys}  # key -> expiry time (0 means available)
        self.last_request_time = 0.0
        self.min_interval = 60.0 / max(1, Config.REQUESTS_PER_MINUTE)
        
        if Config.LLM_CACHE_ENABLED:
            self._init_cache()
            
    def _init_cache(self):
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS cache (
                        key TEXT PRIMARY KEY,
                        response TEXT
                    )
                """)
        except Exception as e:
            logger.error(f"Failed to initialize LLM cache: {e}")
            
    def _get_cache_key(self, prompt: str, temperature: float, max_tokens: int, model: str) -> str:
        data = f"{prompt}|{temperature}|{max_tokens}|{model}"
        return hashlib.sha256(data.encode('utf-8')).hexdigest()
        
    def _get_cached(self, cache_key: str) -> Optional[str]:
        if not Config.LLM_CACHE_ENABLED:
            return None
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT response FROM cache WHERE key = ?", (cache_key,))
                row = cursor.fetchone()
                if row:
                    logger.info(f"Cache hit for key {cache_key[:8]}")
                    return row[0]
        except Exception as e:
            logger.error(f"Cache read error: {e}")
        return None
        
    def _set_cache(self, cache_key: str, response: str):
        if not Config.LLM_CACHE_ENABLED:
            return
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                conn.execute("INSERT OR REPLACE INTO cache (key, response) VALUES (?, ?)", (cache_key, response))
        except Exception as e:
            logger.error(f"Cache write error: {e}")

    def _get_active_key(self) -> str:
        now = time.time()
        # Find first available key
        for key in self.keys:
            if now >= self.key_status[key]:
                return key
        
        # All keys exhausted, wait for the one that unlocks first
        earliest_key = min(self.keys, key=lambda k: self.key_status[k])
        wait_time = self.key_status[earliest_key] - now
        if wait_time > 0:
            logger.warning(f"All API keys exhausted. Waiting {wait_time:.1f}s for key to reset.")
            time.sleep(wait_time)
        return earliest_key

    def _mark_key_exhausted(self, key: str, wait_seconds: float):
        self.key_status[key] = time.time() + wait_seconds
        
    def _apply_rate_limit(self):
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.min_interval:
            sleep_time = self.min_interval - elapsed
            time.sleep(sleep_time)
        self.last_request_time = time.time()

    def generate_content(self, prompt: str, temperature: float = 0.4, max_tokens: int = 32768) -> str:
        model = Config.GEMINI_MODEL or 'gemini-2.5-flash'
        base_url = Config.GEMINI_API_BASE_URL.rstrip('/')
        
        cache_key = self._get_cache_key(prompt, temperature, max_tokens, model)
        cached_response = self._get_cached(cache_key)
        if cached_response is not None:
            return cached_response
            
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
        }

        retries = 0
        backoff = Config.INITIAL_BACKOFF
        
        while retries <= Config.MAX_RETRIES:
            api_key = self._get_active_key()
            self._apply_rate_limit()
            
            # Mask API key for logging
            masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****"
            
            try:
                logger.info(f"LLM Request (Attempt {retries+1}/{Config.MAX_RETRIES+1}) via {masked_key}")
                response = requests.post(
                    f"{base_url}/models/{model}:generateContent",
                    headers={"x-goog-api-key": api_key},
                    json=payload,
                    timeout=120,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise ValueError("AI returned no candidates")

                    content = candidates[0].get("content", {})
                    parts = content.get("parts", [])
                    text_parts = [p.get("text", "") for p in parts if isinstance(p, dict)]
                    result = "\n".join(t for t in text_parts if t).strip()

                    if not result:
                        raise ValueError("AI returned empty response")
                        
                    self._set_cache(cache_key, result)
                    return result
                
                # Handle error responses
                if response.status_code in (429, 500, 502, 503, 504):
                    retry_after = response.headers.get("Retry-After")
                    sleep_time = int(retry_after) if retry_after and retry_after.isdigit() else backoff
                    
                    if response.status_code == 429:
                        logger.warning(f"Key {masked_key} received 429 Too Many Requests.")
                        # Mark this key as temporarily exhausted so we rotate to the next
                        self._mark_key_exhausted(api_key, sleep_time)
                        
                    # Calculate jitter for sleep
                    jitter = random.uniform(0, 0.1 * sleep_time)
                    total_sleep = sleep_time + jitter
                    
                    logger.warning(f"API Error {response.status_code}. Retrying in {total_sleep:.2f}s...")
                    time.sleep(total_sleep)
                    backoff = min(backoff * 2, Config.MAX_BACKOFF)
                    retries += 1
                    continue
                else:
                    # Non-retryable error
                    logger.error(f"Non-retryable API error: {response.status_code} - {response.text}")
                    response.raise_for_status()

            except requests.RequestException as exc:
                logger.warning(f"Request exception: {exc}")
                jitter = random.uniform(0, 0.1 * backoff)
                total_sleep = backoff + jitter
                logger.warning(f"Retrying in {total_sleep:.2f}s...")
                time.sleep(total_sleep)
                backoff = min(backoff * 2, Config.MAX_BACKOFF)
                retries += 1

        logger.error(f"Failed to get LLM response after {Config.MAX_RETRIES} retries.")
        raise RuntimeError("LLM service exhausted max retries")

# Lazy singleton – initialized on first use to avoid import-time crashes
_llm_client_instance = None

def _get_llm_client() -> LLMClient:
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient()
    return _llm_client_instance

class _LazyProxy:
    """Thin proxy that defers LLMClient construction until first attribute access."""
    def __getattr__(self, name):
        return getattr(_get_llm_client(), name)

llm_client = _LazyProxy()
