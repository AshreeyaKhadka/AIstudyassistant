import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, MessageSquare, SendHorizontal, UserRound, ArrowLeft, Plus, Trash2, History, X, AlertTriangle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const AIChat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subject = searchParams.get('subject') || '';
  const unit = searchParams.get('unit') || '';
  const unitLabel = searchParams.get('unitLabel') || '';
  const subject_id = searchParams.get('subject_id') || '';
  const doc_type = searchParams.get('doc_type') || '';

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: subject
        ? `Hi! I am ready to help you study **${unit || subject}**. Ask me to explain concepts, quiz you, or generate revision notes.`
        : 'Hi, I am ready to help with concepts, revision, and questions from your uploaded materials.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const history = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })),
    [messages]
  );

  const parseJsonResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();

    if (!rawBody) return null;

    if (contentType.includes('application/json')) {
      return JSON.parse(rawBody);
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      return { message: rawBody };
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch('/api/chat/sessions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessId) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const loadedMessages = data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
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
      console.error('Failed to load session:', err);
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
        if (sessionId === sessionToDelete.id) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
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
        content: subject
          ? `Hi! I am ready to help you study **${unit || subject}**. Ask me to explain concepts, quiz you, or create notes.`
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
          subject: subject || undefined,
          unit: unit || undefined,
          unitLabel: unitLabel || undefined,
          session_id: sessionId || undefined,
          subject_id: subject_id ? parseInt(subject_id) : undefined,
          doc_type: doc_type || undefined,
        }),
      });

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: data?.reply || 'The assistant returned an empty response.',
        },
      ]);

      if (data?.session_id && !sessionId) {
        setSessionId(data.session_id);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'I could not reach the AI service just now. Please check your connection and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = subject
    ? [
        `Explain key concepts of ${unit || subject}`,
        `5 revision bullet points for ${unit || subject}`,
        `Quiz me on important concepts from ${unit || subject}`,
      ]
    : dynamicSuggestions.length > 0
    ? dynamicSuggestions
    : [
        'Explain the last topic in simple terms',
        'Turn my notes into 5 revision bullets',
        'Quiz me on key concepts from my materials',
      ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
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
          {subject && (
            <button
              onClick={() => navigate('/dashboard/syllabus')}
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
              {subject ? `Study: ${unit || subject}` : 'Chat Assistant'}
            </h3>
            <p className="text-[10px] text-[#666666] font-mono truncate">
              {subject ? `FOCUSED ON ${subject.toUpperCase()}` : 'RAG ACADEMIC ENGINE'}
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
            <button onClick={() => setShowSessions(false)} className="text-[#666666] hover:text-[#111111]">
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
        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role} content={message.content} />
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
          <div className="mb-3 text-xs font-mono text-[#C96A32] bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] px-3 py-2 flex justify-between items-center">
            <span>{error}</span>
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
            className="flex-1 bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3.5 py-2.5 text-xs text-[#111111] outline-none"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-3.5 md:px-4 py-2.5 rounded-[4px] bg-[#102326] hover:bg-[#0b191c] text-white font-mono text-xs font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
            <span className="hidden sm:inline">SEND</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatBubble = ({ role, content }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex items-start gap-2.5 md:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-[4px] bg-[#102326] text-white flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={15} />
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-[4px] px-3.5 py-2.5 md:px-4 md:py-3 text-xs leading-relaxed border ${
          isUser
            ? 'bg-[#102326] text-white border-[#102326]'
            : 'bg-white text-[#111111] border-[#D7D3CF]'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap break-words">{content}</span>
        ) : (
          <div className="prose prose-xs max-w-none text-[#111111] break-words">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
          </div>
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
