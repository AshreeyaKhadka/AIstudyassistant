/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_PREFIX = 'aistudy-focus-session-v3';
const FocusContext = createContext(null);

const initialState = {
  subject: null,
  topic: '',
  focusMinutes: 25,
  remainingSeconds: 25 * 60,
  running: false,
  endAt: null,
  status: 'idle',
  sessionId: null,
  recall: null,
  feedback: null,
  error: '',
};

const storageKey = (userId) => `${STORAGE_PREFIX}:${userId}`;

const loadState = (userId) => {
  if (!userId) return { ...initialState };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null');
    if (!saved || typeof saved !== 'object') return { ...initialState };
    if (saved.running && saved.endAt) {
      saved.remainingSeconds = Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000));
    }
    return { ...initialState, ...saved };
  } catch {
    return { ...initialState };
  }
};

export const FocusProvider = ({ children, userId }) => {
  const [state, setState] = useState(() => loadState(userId));
  const stateRef = useRef(state);
  const completingRef = useRef(false);
  const skipPersistRef = useRef(true);

  useEffect(() => {
    completingRef.current = false;
    skipPersistRef.current = true;
    setState(loadState(userId));
  }, [userId]);

  useEffect(() => {
    stateRef.current = state;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    if (userId) localStorage.setItem(storageKey(userId), JSON.stringify(state));
  }, [state, userId]);

  const requestRecall = useCallback(async (sessionId) => {
    try {
      const response = await fetch(`/api/focus/sessions/${sessionId}/recall-question`, {
        method: 'POST', credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not prepare a recall question.');
      setState((current) => ({ ...current, recall: data, error: '' }));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    }
  }, []);

  const completeSession = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setState((current) => ({ ...current, running: false, endAt: null, remainingSeconds: 0, status: 'saving' }));
    try {
      const snapshot = stateRef.current;
      const response = await fetch('/api/focus/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject_id: snapshot.subject?.id,
          topic: snapshot.topic || null,
          duration_minutes: snapshot.focusMinutes,
          break_duration_minutes: 0,
          completed: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save the focus session.');
      setState((current) => ({ ...current, status: 'recall', sessionId: data.id, error: '' }));
      await requestRecall(data.id);
    } catch (error) {
      setState((current) => ({ ...current, status: 'complete', error: error.message }));
    } finally {
      completingRef.current = false;
    }
  }, [requestRecall]);

  useEffect(() => {
    if (!state.running || !state.endAt) return undefined;
    const tick = () => {
      const next = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
      setState((current) => ({ ...current, remainingSeconds: next }));
      if (next === 0) completeSession();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [state.running, state.endAt, completeSession]);

  const configure = useCallback((updates) => {
    setState((current) => {
      if (current.running) return current;
      const normalized = { ...updates };
      if (updates.focusMinutes !== undefined) {
        const minutes = Number.parseInt(updates.focusMinutes, 10);
        normalized.focusMinutes = Math.min(240, Math.max(1, Number.isNaN(minutes) ? current.focusMinutes : minutes));
      }
      const next = { ...current, ...normalized, error: '' };
      if (normalized.focusMinutes) next.remainingSeconds = normalized.focusMinutes * 60;
      return next;
    });
  }, []);

  const start = useCallback(() => {
    setState((current) => {
      if (!current.subject?.id) return { ...current, error: 'Choose a subject before starting.' };
      const seconds = current.remainingSeconds > 0 ? current.remainingSeconds : current.focusMinutes * 60;
      return { ...current, running: true, status: 'focus', endAt: Date.now() + seconds * 1000, error: '' };
    });
  }, []);

  const pause = useCallback(() => {
    setState((current) => {
      if (!current.running) return current;
      const remainingSeconds = Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000));
      return { ...current, running: false, endAt: null, remainingSeconds };
    });
  }, []);

  const reset = useCallback(() => {
    setState((current) => ({ ...initialState, subject: current.subject, topic: current.topic, focusMinutes: current.focusMinutes, remainingSeconds: current.focusMinutes * 60 }));
  }, []);

  const submitRecall = useCallback(async (answer) => {
    if (!state.sessionId) return;
    const response = await fetch(`/api/focus/sessions/${state.sessionId}/recall-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ answer }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not check your answer.');
    setState((current) => ({ ...current, feedback: data, status: 'reviewed', error: '' }));
  }, [state.sessionId]);

  const value = useMemo(() => ({ state, configure, start, pause, reset, submitRecall }), [state, configure, start, pause, reset, submitRecall]);
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
};

export const useFocus = () => {
  const value = useContext(FocusContext);
  if (!value) throw new Error('useFocus must be used inside FocusProvider');
  return value;
};

export const formatFocusTime = (seconds) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};
