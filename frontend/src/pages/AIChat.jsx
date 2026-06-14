import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, MessageSquare, SendHorizontal, Sparkles, UserRound } from 'lucide-react';

const AIChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hi, I am ready to help with concepts, revision, and questions from your uploaded materials.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

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

  const quickPrompts = [
    'Explain the last topic in simple terms.',
    'Turn my notes into 5 revision bullets.',
    'Quiz me on the important concepts from my materials.',
  ];

  return (
    <div className="flex flex-col h-full min-h-[72vh] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">AI Chat Assistant</h3>
            <p className="text-sm text-slate-500">Connected to DeepSeek on the server, with your uploaded materials included when available.</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/80 border border-slate-200 rounded-full px-3 py-1.5">
          <Sparkles size={14} className="text-blue-500" /> Study mode
        </div>
      </div>

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
        className={`max-w-[min(44rem,85%)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white border-blue-500 rounded-br-md'
            : 'bg-white text-slate-700 border-slate-200 rounded-bl-md'
        }`}
      >
        {content}
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
