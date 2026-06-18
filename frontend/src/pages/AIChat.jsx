import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, MessageSquare, SendHorizontal, Sparkles, UserRound, ArrowLeft, Plus, Trash2, History, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const AIChat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subject = searchParams.get('subject') || '';
  const unit = searchParams.get('unit') || '';
  const unitLabel = searchParams.get('unitLabel') || '';

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: subject
        ? `Hi! I'm ready to help you study **${unit || subject}**. Ask me to explain concepts, quiz you, create notes, or anything else about this topic.`
        : 'Hi, I am ready to help with concepts, revision, and questions from your uploaded materials.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  // Session management state
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [deletingSession, setDeletingSession] = useState(null);

  const history = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })),
    [messages]
  );

  const parseJsonResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();

    if (!rawBody) {
      return null;
    }

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
        // Prepend welcome message if loaded messages don't have one
        if (loadedMessages.length > 0 && loadedMessages[0].role !== 'assistant') {
          loadedMessages.unshift({
            id: 0,
            role: 'assistant',
            content: subject
              ? `Hi! I'm ready to help you study **${unit || subject}**.`
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

  const deleteSession = async (sessId) => {
    setDeletingSession(sessId);
    try {
      const res = await fetch(`/api/chat/sessions/${sessId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessId));
        if (sessionId === sessId) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeletingSession(null);
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: subject
          ? `Hi! I'm ready to help you study **${unit || subject}**. Ask me to explain concepts, quiz you, create notes, or anything else about this topic.`
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

      // Update session ID from response
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
          content: 'I could not reach the AI service just now. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = subject
    ? [
        `Explain the key concepts of ${unit || subject} in simple terms.`,
        `Create 5 revision bullet points for ${unit || subject}.`,
        `Quiz me on the important concepts from ${unit || subject}.`,
      ]
    : [
        'Explain the last topic in simple terms.',
        'Turn my notes into 5 revision bullets.',
        'Quiz me on the important concepts from my materials.',
      ];

  return (
    <div className="flex flex-col h-full min-h-[72vh] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {subject && (
            <button
              onClick={() => navigate('/dashboard/syllabus')}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {subject ? `Study: ${unit || subject}` : 'AI Chat Assistant'}
            </h3>
            <p className="text-sm text-slate-500">
              {subject
                ? `Focused on ${subject}${unit ? ` — ${unit}` : ''}`
                : 'Connected to Gemini on the server, with your uploaded materials included when available.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchSessions(); setShowSessions(!showSessions); }}
            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-colors shadow-sm"
            title="Chat History"
          >
            <History size={18} />
          </button>
          <button
            onClick={startNewChat}
            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-colors shadow-sm"
            title="New Chat"
          >
            <Plus size={18} />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/80 border border-slate-200 rounded-full px-3 py-1.5">
            <Sparkles size={14} className="text-blue-500" /> Study mode
          </div>
        </div>
      </div>

      {/* Session History Panel */}
      {showSessions && (
        <div className="border-b border-slate-100 bg-slate-50/80 p-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-700">Chat History</h4>
            <button onClick={() => setShowSessions(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          {loadingSessions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-slate-300" size={20} />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No previous chats</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    sessionId === sess.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-white border border-slate-100 hover:border-blue-200'
                  }`}
                >
                  <button
                    onClick={() => loadSession(sess.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-bold text-slate-700 truncate">{sess.title}</p>
                    <p className="text-xs text-slate-400">
                      {sess.message_count} messages · {new Date(sess.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                    disabled={deletingSession === sess.id}
                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                  >
                    {deletingSession === sess.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/70">
        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role} content={message.content} />
        ))}
        {loading && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Bot size={18} />
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              Thinking through your question...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-100 rounded-full px-3 py-2 transition-colors disabled:opacity-60"
            >
              {prompt}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        ) : null}

        <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-sm">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Ask about a topic, paste a question, or request a revision summary..."
            className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none min-h-[48px] max-h-40 px-1 py-2"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatBubble = ({ role, content }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
          <Bot size={18} />
        </div>
      )}
      <div
        className={`max-w-[min(44rem,85%)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
          isUser
            ? 'bg-blue-600 text-white border-blue-500 rounded-br-md'
            : 'bg-white text-slate-700 border-slate-200 rounded-bl-md'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none prose-p:my-1 prose-pre:bg-slate-100 prose-pre:border prose-pre:border-slate-200 prose-code:text-pink-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-normal prose-pre:code:bg-transparent prose-pre:code:p-0">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-10 h-10 rounded-full bg-slate-900 text-white border border-slate-800 flex items-center justify-center shadow-sm flex-shrink-0">
          <UserRound size={18} />
        </div>
      )}
    </div>
  );
};

export default AIChat;
