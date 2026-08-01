import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, MessageSquare, SendHorizontal, UserRound, ArrowLeft, Plus, Trash2, History, X, AlertTriangle, ExternalLink, FileText, BookOpenCheck, PanelLeft, Files } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import syllabusData from '../data/syllabus.json';

const parseJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  if (!rawBody) return null;
  if (contentType.includes('application/json')) return JSON.parse(rawBody);
  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody };
  }
};

const canChatWithDocument = (document) => (
  document?.admission_status === 'admitted'
  && ['approved', 'needs_review'].includes(document?.validation_status)
  && document?.embedding_status === 'embedded'
  && document?.processing_status === 'ready'
);

const AIChat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subject = searchParams.get('subject') || '';
  const unit = searchParams.get('unit') || '';
  const unitLabel = searchParams.get('unitLabel') || '';
  const subject_id = searchParams.get('subject_id') || '';
  const doc_type = searchParams.get('doc_type') || '';
  const studyMode = searchParams.get('study_mode') || '';
  const catalogSubjectKey = searchParams.get('catalog_subject_key') || '';
  const catalogUnitKey = searchParams.get('catalog_unit_key') || '';
  const semester = searchParams.get('semester') || '';
  const uploadId = searchParams.get('upload_id') || '';
  const documentName = searchParams.get('filename') || '';
  const syllabusContextId = searchParams.get('syllabusContext') || '';
  const requestedSessionId = Number(searchParams.get('session_id')) || null;

  const syllabusFocus = useMemo(() => {
    const chapterText = (chapter) => {
      const topics = Array.isArray(chapter.topics) && chapter.topics.length
        ? `\nTopics:\n${chapter.topics.map((topic) => `- ${topic}`).join('\n')}`
        : '';
      return `${chapter.unit ? `${chapter.unit}: ` : ''}${chapter.title}\n${chapter.summary || ''}${topics}`;
    };

    if (!syllabusContextId) return null;
    for (const semester of syllabusData.semesters || []) {
      for (const item of semester.subjects || []) {
        if (item.id === syllabusContextId) {
          const hasDetails = Array.isArray(item.chapters) && item.chapters.length > 0;
          return {
            subject: item.name,
            label: item.name,
            contextText: hasDetails
              ? `${item.name}\n${item.chapters.map(chapterText).join('\n\n')}`
              : `${item.name}\nDetailed syllabus content is not available yet.`,
            note: hasDetails ? '' : 'Detailed syllabus content is not available yet.'
          };
        }
        const chapter = (item.chapters || []).find((entry) => entry.id === syllabusContextId);
        if (chapter) {
          return {
            subject: item.name,
            chapter: chapter.title,
            label: `${item.name} - ${chapter.title}`,
            contextText: `${item.name}\n${chapterText(chapter)}`,
            note: ''
          };
        }
      }
    }
    return subject ? { subject, label: subject, contextText: subject, note: 'Detailed syllabus content is not available yet.' } : null;
  }, [syllabusContextId, subject]);

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: studyMode === 'document'
        ? `Hi! I am ready to answer from **${documentName || 'your selected document'}**. My answer will stay grounded in this file.`
        : subject
        ? `Hi! I am ready to help you study **${unit || syllabusFocus?.label || subject}**.${syllabusFocus?.note ? ` ${syllabusFocus.note}` : ''} Ask me to explain concepts, quiz you, or generate revision notes.`
        : 'Hi, I am ready to help with concepts, revision, and questions from your uploaded materials.',
    },
  ]);
  const [input, setInput] = useState('');
  const [learningMode, setLearningMode] = useState('exam');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scopeSuggestion, setScopeSuggestion] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [showDocuments, setShowDocuments] = useState(false);

  // Dynamic Suggestion Chips
  const [dynamicSuggestions, setDynamicSuggestions] = useState([]);

  useEffect(() => {
    // Fetch dynamic prompt suggestions from backend based on user uploads/subjects
    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/chat/suggestions', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setDynamicSuggestions(data);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    };
    if (!subject) {
      fetchSuggestions();
    }
  }, [subject]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/upload/', { credentials: 'include' })
      .then(parseJsonResponse)
      .then((data) => {
        if (!cancelled) setDocuments((Array.isArray(data) ? data : []).filter((item) => item.doc_type === 'material'));
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openDocumentChat = (document) => {
    if (!canChatWithDocument(document)) return;
    const params = new URLSearchParams({
      study_mode: 'document',
      upload_id: String(document.id),
      filename: document.filename,
    });
    if (document.subject) params.set('subject', document.subject);
    window.location.assign(`/dashboard/chat?${params.toString()}`);
  };

  const openGeneralChat = () => {
    window.location.assign('/dashboard/chat');
  };

  const history = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })),
    [messages]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/chat/sessions', { credentials: 'include' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Could not load chat history.');
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load chat history.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = useCallback(async (sessId) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessId}`, { credentials: 'include' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Could not open this conversation.');
      if (data) {
        const loadedMessages = (data.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata || {},
        }));
        if (loadedMessages.length > 0 && loadedMessages[0].role !== 'assistant') {
          loadedMessages.unshift({
            id: 0,
            role: 'assistant',
            content: subject
              ? `Hi! I am ready to help you study **${unit || subject}**.`
              : 'Hi, I am ready to help with concepts, revision, and questions.',
          });
        }
        setMessages(loadedMessages);
        setSessionId(sessId);
        setShowSessions(false);
      }
    } catch (err) {
      setError(err.message || 'Could not open this conversation.');
    }
  }, [subject, unit]);

  useEffect(() => {
    if (requestedSessionId) loadSession(requestedSessionId);
  }, [requestedSessionId, loadSession]);

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Could not delete this conversation.');
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
      if (sessionId === sessionToDelete.id) {
        startNewChat();
      }
    } catch (err) {
      setError(err.message || 'Could not delete this conversation.');
    } finally {
      setDeleting(false);
      setSessionToDelete(null);
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: studyMode === 'document'
          ? `Hi! I am ready to answer from **${documentName || 'your selected document'}**. My answer will stay grounded in this file.`
          : subject
          ? `Hi! I am ready to help you study **${unit || syllabusFocus?.label || subject}**.${syllabusFocus?.note ? ` ${syllabusFocus.note}` : ''} Ask me to explain concepts, quiz you, or create notes.`
          : 'Hi, I am ready to help with concepts, revision, and questions from your uploaded materials.',
      },
    ]);
    setSessionId(null);
    setShowSessions(false);
  };

  const handleSend = async (presetMessage) => {
    const text = (presetMessage ?? input).trim();
    if (!text || loading) return;

    setError('');
    setScopeSuggestion(null);
    setInput('');

    const nextMessages = [
      ...messages,
      {
        id: Date.now(),
        role: 'user',
        content: text,
      },
    ];

    setMessages(nextMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: history,
          subject: syllabusFocus?.subject || subject || undefined,
          unit: unit || undefined,
          unitLabel: unitLabel || undefined,
          session_id: sessionId || undefined,
          subject_id: subject_id ? parseInt(subject_id) : undefined,
          doc_type: doc_type || undefined,
          syllabus_context: syllabusFocus?.contextText || undefined,
          learning_mode: learningMode,
          study_context: studyMode ? {
            mode: studyMode,
            subject_key: catalogSubjectKey || undefined,
            unit_key: catalogUnitKey || undefined,
            semester: semester ? parseInt(semester) : undefined,
            upload_id: uploadId ? parseInt(uploadId) : undefined,
          } : undefined,
        }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        if (data?.code === 'unit_scope_mismatch' && data?.details) {
          setScopeSuggestion(data.details);
        }
        throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: data?.reply || 'The assistant returned an empty response.',
          metadata: data?.metadata || { citations: data?.citations || [] },
        },
      ]);

      if (data?.session_id && !sessionId) {
        setSessionId(data.session_id);
      }
      if (data?.persistence_warning) {
        setError(data.persistence_warning);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = studyMode === 'document'
    ? [
        `Summarize the key study points from ${documentName || 'this document'}`,
        'Explain the hardest concept in this document step by step',
        'Create exam-ready revision notes from this document',
      ]
    : subject || syllabusFocus
    ? [
        `Explain key concepts of ${unit || syllabusFocus?.label || subject}`,
        `5 revision bullet points for ${unit || syllabusFocus?.label || subject}`,
        `Quiz me on important concepts from ${unit || syllabusFocus?.label || subject}`,
      ]
    : dynamicSuggestions.length > 0
    ? dynamicSuggestions
    : [
        'Explain the last topic in simple terms',
        'Turn my notes into 5 revision bullets',
        'Quiz me on key concepts from my materials',
      ];

  return (
    <div className="relative flex h-[calc(100vh-8rem)] min-h-0 gap-3">
      <DocumentSidebar
        documents={documents}
        loading={documentsLoading}
        activeUploadId={uploadId}
        onSelect={openDocumentChat}
        onGeneral={openGeneralChat}
        mobileOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 max-w-sm w-full space-y-4 shadow-lg">
            <div className="flex items-center gap-3 text-[#C96A32]">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-[#111111]">Delete Conversation?</h3>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed font-sans">
              Are you sure you want to delete <span className="font-semibold text-[#111111]">"{sessionToDelete.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D7D3CF]">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={deleting}
                className="px-3 py-1.5 border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={deleting}
                className="px-3 py-1.5 bg-[#C96A32] text-white hover:bg-[#a85222] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>DELETE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 md:px-6 py-3.5 border-b border-[#D7D3CF] bg-[#F7F5F2] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowDocuments(true)}
            className="p-1.5 rounded-[4px] bg-white border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] md:hidden"
            aria-label="Open documents"
            title="Documents"
          >
            <PanelLeft size={16} />
          </button>
          {(subject || syllabusFocus || studyMode === 'document') && (
            <button
              onClick={() => navigate(studyMode === 'document' ? '/dashboard/upload' : '/dashboard/syllabus')}
              className="p-1.5 rounded-[4px] bg-white border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="w-8 h-8 rounded-[4px] bg-[#102326] text-white flex items-center justify-center shrink-0">
            <MessageSquare size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-bold text-[#111111] tracking-tight truncate">
              {studyMode === 'document' ? `Document: ${documentName || 'Selected material'}` : subject || syllabusFocus ? `Study: ${unit || syllabusFocus?.label || subject}` : 'Chat Assistant'}
            </h3>
            <p className="text-[10px] text-[#666666] font-mono truncate">
              {studyMode === 'document' ? 'SELECTED DOCUMENT ONLY' : subject || syllabusFocus ? `FOCUSED ON ${(syllabusFocus?.subject || subject).toUpperCase()}` : 'Study help'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { fetchSessions(); setShowSessions(!showSessions); }}
            className="px-3 py-1.5 bg-white border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5"
            title="Chat History"
          >
            <History size={14} />
            <span className="hidden sm:inline">HISTORY</span>
          </button>
          <button
            onClick={startNewChat}
            className="px-3 py-1.5 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] transition-colors text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5"
            title="New Chat"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">NEW CHAT</span>
          </button>
        </div>
      </div>

      {/* History Drawer */}
      {showSessions && (
        <div className="border-b border-[#D7D3CF] bg-[#F7F5F2] p-4 max-h-60 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">Previous Conversations</h4>
            <button onClick={() => setShowSessions(false)} className="text-[#666666] hover:text-[#111111]" aria-label="Close chat history">
              <X size={16} />
            </button>
          </div>
          {loadingSessions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-[#102326]" size={18} />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs font-mono text-[#666666] text-center py-3">No previous chat sessions found.</p>
          ) : (
            <div className="space-y-1.5">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`flex items-center justify-between p-2.5 rounded-[4px] border cursor-pointer transition-colors ${
                    sessionId === sess.id
                      ? 'bg-[#102326] text-white border-[#102326]'
                      : 'bg-white text-[#111111] border-[#D7D3CF] hover:bg-[#ECEAE7]'
                  }`}
                >
                  <button
                    onClick={() => loadSession(sess.id)}
                    className="flex-1 text-left min-w-0 pr-2"
                  >
                    <p className="text-xs font-bold truncate">{sess.title}</p>
                    <p className={`text-[10px] font-mono mt-0.5 ${sessionId === sess.id ? 'text-[#A0B0B3]' : 'text-[#666666]'}`}>
                      {sess.message_count} msgs • {new Date(sess.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSessionToDelete(sess); }}
                    className="p-1 hover:text-[#C96A32] transition-colors"
                    title="Delete Chat"
                    aria-label={`Delete ${sess.title}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#F7F5F2]">
        {(syllabusFocus || studyMode === 'document') && (
          <div className="inline-flex max-w-full items-center gap-2 rounded-[4px] border border-[#D7D3CF] bg-white px-3 py-2 text-xs font-mono text-[#111111]">
            <span className="font-semibold">{studyMode === 'document' ? 'Document study:' : 'Syllabus study:'}</span>
            <span className="truncate">{studyMode === 'document' ? documentName : syllabusFocus?.label}</span>
            {syllabusFocus?.note && <span className="text-[#666666]">- {syllabusFocus.note}</span>}
          </div>
        )}
        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role} content={message.content} metadata={message.metadata} />
        ))}
        {loading && (
          <div className="flex items-center gap-3 text-xs font-mono text-[#666666]">
            <div className="w-8 h-8 rounded-[4px] bg-[#102326] text-white flex items-center justify-center shrink-0">
              <Bot size={15} />
            </div>
            <div className="flex items-center gap-2 bg-white border border-[#D7D3CF] rounded-[4px] px-3.5 py-2.5">
              <Loader2 size={14} className="animate-spin text-[#102326]" />
              Processing academic request...
            </div>
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="border-t border-[#D7D3CF] bg-white p-3 md:p-4 shrink-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-[#666666] font-semibold">Mode</span>
          {[
            { id: 'beginner', label: 'Beginner', title: 'Detailed simple explanation with prerequisites' },
            { id: 'exam', label: 'Exam', title: 'Full exam-ready answer with marks guidance' },
            { id: 'deep', label: 'Deep', title: 'Advanced technical explanation with details' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setLearningMode(mode.id)}
              title={mode.title}
              className={`px-2.5 py-1 rounded-[4px] border text-[10px] font-mono font-semibold uppercase ${
                learningMode === mode.id
                  ? 'bg-[#102326] text-white border-[#102326]'
                  : 'bg-[#F7F5F2] text-[#111111] border-[#D7D3CF] hover:bg-[#ECEAE7]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 max-h-24 overflow-y-auto custom-scrollbar">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-[11px] font-mono text-[#111111] bg-[#F7F5F2] hover:bg-[#102326] hover:text-white border border-[#D7D3CF] rounded-[4px] px-2.5 py-1 transition-colors disabled:opacity-50 text-left truncate max-w-full"
            >
              {prompt}
            </button>
          ))}
        </div>

        {error ? (
          <div role="alert" className="mb-3 text-xs font-mono text-[#C96A32] bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] px-3 py-2 flex justify-between items-start gap-3">
            <span className="min-w-0 break-words">
              {error}
              {scopeSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('catalog_unit_key', scopeSuggestion.suggested_unit_key);
                    params.set('unit', scopeSuggestion.suggested_unit_title);
                    params.set('syllabusContext', scopeSuggestion.suggested_unit_key);
                    navigate(`/dashboard/chat?${params.toString()}`);
                    window.location.reload();
                  }}
                  className="mt-1 block font-semibold underline text-[#102326]"
                >
                  Open {scopeSuggestion.suggested_unit_label}: {scopeSuggestion.suggested_unit_title}
                </button>
              )}
            </span>
            <button onClick={() => setError('')} className="underline text-[10px] ml-2">Dismiss</button>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question or request revision notes..."
            aria-label="Ask the study assistant"
            className="flex-1 bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3.5 py-2.5 text-xs text-[#111111] outline-none"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            aria-label={loading ? 'Generating answer' : 'Send message'}
            className="px-3.5 md:px-4 py-2.5 rounded-[4px] bg-[#102326] hover:bg-[#0b191c] text-white font-mono text-xs font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
            <span className="hidden sm:inline">SEND</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

const DocumentSidebar = ({ documents, loading, activeUploadId, onSelect, onGeneral, mobileOpen, onClose }) => {
  const content = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-[61px] items-center justify-between border-b border-[#D7D3CF] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Files size={15} className="shrink-0 text-[#102326]" />
          <span className="truncate font-mono text-[10px] font-semibold uppercase text-[#111111]">Study documents</span>
        </div>
        <button onClick={onClose} className="p-1 text-[#666666] md:hidden" aria-label="Close documents"><X size={15} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <button
          type="button"
          onClick={onGeneral}
          className={`mb-2 w-full rounded-[4px] border px-3 py-2 text-left ${!activeUploadId ? 'border-[#102326] bg-[#102326] text-white' : 'border-[#D7D3CF] bg-[#F7F5F2] text-[#111111]'}`}
        >
          <span className="block text-xs font-semibold">All approved notes</span>
          <span className={`mt-0.5 block font-mono text-[9px] ${!activeUploadId ? 'text-[#C7D2D0]' : 'text-[#666666]'}`}>GENERAL STUDY CHAT</span>
        </button>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-[#102326]" /></div>
        ) : documents.length === 0 ? (
          <p className="px-2 py-6 text-center font-mono text-[10px] text-[#777777]">No uploaded study documents.</p>
        ) : (
          <div className="space-y-1.5">
            {documents.map((document) => {
              const usable = canChatWithDocument(document);
              const active = String(document.id) === String(activeUploadId);
              const status = document.admission_status === 'rejected'
                ? 'Rejected'
                : document.admission_status === 'screening'
                  ? 'Screening'
                  : document.validation_status === 'needs_review'
                    ? 'Admitted with warning'
                    : document.processing_status === 'ready' ? 'Ready' : 'Processing';
              const reason = document.admission_error || document.validation_error || document.processing_error || status;
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => onSelect(document)}
                  disabled={!usable}
                  title={usable ? `Chat with ${document.filename}` : reason}
                  className={`w-full rounded-[4px] border px-3 py-2 text-left transition-colors ${active ? 'border-[#102326] bg-[#E9EFEE]' : 'border-[#D7D3CF] bg-white hover:bg-[#F7F5F2]'} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="block truncate text-[11px] font-semibold text-[#111111]">{document.filename}</span>
                  <span className="mt-0.5 block truncate font-mono text-[9px] text-[#666666]">{document.subject || 'Unassigned'}</span>
                  <span className={`mt-1 block font-mono text-[9px] font-semibold uppercase ${document.validation_status === 'needs_review' || document.admission_status === 'rejected' ? 'text-[#C96A32]' : 'text-[#185C28]'}`}>{status}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-60 shrink-0 overflow-hidden rounded-[4px] border border-[#D7D3CF] md:block">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/35 md:hidden" onClick={onClose}>
          <aside className="h-full w-[min(82vw,300px)] border-r border-[#D7D3CF]" onClick={(event) => event.stopPropagation()}>{content}</aside>
        </div>
      )}
    </>
  );
};

const ChatBubble = ({ role, content, metadata = {} }) => {
  const isUser = role === 'user';
  const citations = Array.isArray(metadata.citations) ? metadata.citations : [];
  const resources = Array.isArray(metadata.resources) ? metadata.resources : [];
  const prerequisites = Array.isArray(metadata.prerequisites) ? metadata.prerequisites : [];
  const nextTopics = Array.isArray(metadata.next_topics) ? metadata.next_topics : [];
  const syllabusPath = metadata.syllabus_path && typeof metadata.syllabus_path === 'object'
    ? [metadata.syllabus_path.subject, metadata.syllabus_path.chapter, metadata.syllabus_path.unit, metadata.syllabus_path.topic].filter(Boolean)
    : [];
  const sourceUrl = (citation) => citation.doc_type === 'syllabus'
    ? `/api/syllabus/workspace/${citation.upload_id}/file`
    : `/api/upload/${citation.upload_id}/file`;
  const sourceGroups = metadata.source_groups && typeof metadata.source_groups === 'object'
    ? metadata.source_groups
    : null;

  return (
    <div className={`flex items-start gap-2.5 md:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-[4px] bg-[#102326] text-white flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={15} />
        </div>
      )}
      <div
        className={`${isUser ? 'max-w-[85%] sm:max-w-[75%]' : 'min-w-0 max-w-[94%] xl:max-w-[88%]'} rounded-[4px] px-3.5 py-2.5 md:px-4 md:py-3 text-xs leading-relaxed border ${
          isUser
            ? 'bg-[#102326] text-white border-[#102326]'
            : 'bg-white text-[#111111] border-[#D7D3CF]'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap break-words">{content}</span>
        ) : (
          <>
            {(metadata.topic_title || metadata.retrieval_scope) && (
              <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[#ECEAE7] pb-2 font-mono text-[9px] uppercase text-[#666666]">
                {metadata.topic_title && <span className="font-semibold text-[#102326]">{metadata.topic_title}</span>}
                {metadata.retrieval_scope && <span>{metadata.retrieval_scope.replaceAll('_', ' ')}</span>}
                {metadata.confidence && <span>{metadata.confidence} evidence</span>}
                {metadata.is_follow_up && <span>Follow-up</span>}
              </div>
            )}
            {syllabusPath.length > 0 && (
              <div className="mb-3 text-[10px] text-[#666666]">
                <span className="font-semibold text-[#102326]">Syllabus:</span> {syllabusPath.join(' / ')}
              </div>
            )}
            {sourceGroups && (
              <div className="mb-3 flex flex-wrap gap-1.5 font-mono text-[9px] uppercase text-[#555555]">
                {sourceGroups.official_syllabus && <span className="border border-[#D7D3CF] px-1.5 py-0.5">Official syllabus</span>}
                {sourceGroups.documents?.length > 0 && <span className="border border-[#D7D3CF] px-1.5 py-0.5">{sourceGroups.documents.length} approved note{sourceGroups.documents.length === 1 ? '' : 's'}</span>}
                {sourceGroups.general_knowledge_used && <span className="border border-[#D7D3CF] px-1.5 py-0.5">General knowledge</span>}
              </div>
            )}
            <div className="academic-content prose prose-xs max-w-none text-[#111111] break-words">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
            </div>
            {(prerequisites.length > 0 || nextTopics.length > 0) && (
              <div className="mt-3 grid gap-2 border-t border-[#D7D3CF] pt-3 sm:grid-cols-2">
                {prerequisites.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] font-semibold uppercase text-[#666666]">Learn first</p>
                    <p className="mt-1 text-[10px] text-[#444444]">{prerequisites.join(' · ')}</p>
                  </div>
                )}
                {nextTopics.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] font-semibold uppercase text-[#666666]">Study next</p>
                    <p className="mt-1 text-[10px] text-[#444444]">{nextTopics.join(' · ')}</p>
                  </div>
                )}
              </div>
            )}
            {citations.length > 0 && (
              <details className="mt-4 border-t border-[#D7D3CF] pt-3">
                <summary className="cursor-pointer list-none font-mono text-[10px] font-semibold uppercase text-[#102326] inline-flex items-center gap-1.5">
                  <FileText size={12} /> References ({citations.length})
                </summary>
                <div className="mt-2 divide-y divide-[#ECEAE7]">
                  {citations.map((citation) => {
                    const isCatalog = citation.source_type === 'official_catalog' || citation.doc_type === 'syllabus_catalog';
                    const CitationTag = isCatalog ? 'div' : 'a';
                    return (
                    <CitationTag
                      key={`${citation.source}-${citation.upload_id}-${citation.chunk_index}`}
                      {...(!isCatalog ? { href: sourceUrl(citation), target: '_blank', rel: 'noreferrer' } : {})}
                      className="flex items-start justify-between gap-3 py-2 text-[10px] text-[#444444] hover:text-[#102326]"
                    >
                      <span className="min-w-0">
                        <span className="font-semibold">Source {citation.source}: {citation.filename}</span>
                        <span className="block text-[#777777]">
                          {[citation.heading, citation.page_number ? `${citation.locator_type} ${citation.page_number}` : null].filter(Boolean).join(' · ') || citation.doc_type}
                        </span>
                        {citation.excerpt && <span className="mt-0.5 block line-clamp-2">{citation.excerpt}</span>}
                      </span>
                      {!isCatalog && <ExternalLink size={12} className="mt-0.5 shrink-0" />}
                    </CitationTag>
                  )})}
                </div>
              </details>
            )}
            {resources.length > 0 && (
              <div className="mt-3 border-t border-[#D7D3CF] pt-3">
                <p className="font-mono text-[10px] font-semibold uppercase text-[#102326] inline-flex items-center gap-1.5"><BookOpenCheck size={12} /> Study resources</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {resources.map((resource) => (
                    <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-[#D7D3CF] px-2 py-1 text-[10px] text-[#444444] hover:border-[#102326] hover:text-[#102326] rounded-[3px]">
                      {resource.provider}: {resource.label} <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-[4px] bg-[#ECEAE7] text-[#111111] border border-[#D7D3CF] flex items-center justify-center shrink-0 mt-0.5">
          <UserRound size={15} />
        </div>
      )}
    </div>
  );
};

export default AIChat;
