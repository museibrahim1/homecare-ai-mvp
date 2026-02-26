'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Hand } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING = "Hey! I'm Palm. Ask me anything about PalmCare AI, or let's get you set up with a free demo. What can I help with?";

const QUICK_PROMPTS = [
  'What does PalmCare AI do?',
  'How does voice assessment work?',
  'Is it HIPAA compliant?',
  'I want to schedule a demo',
];

export default function ChatWidget() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to get response');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Hmm, I'm having a connection issue. Try again in a sec! Or better yet — scroll down and schedule a free demo. Our team will answer everything live." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [API, loading, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-[90] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
          style={{
            height: '520px',
            maxHeight: 'calc(100vh - 120px)',
            background: 'linear-gradient(145deg, #0a1628 0%, #0f2140 100%)',
            border: '1px solid rgba(45, 84, 148, 0.4)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(13, 148, 136, 0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(45, 84, 148, 0.3)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0d9488, #06b6d4)' }}
              >
                <Hand className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#ffffff' }}>Palm</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs" style={{ color: 'rgb(130 155 205)' }}>Palm it.</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgb(130 155 205)' }}
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(13, 148, 136, 0.15)' }}
                  >
                    <Bot className="w-4 h-4" style={{ color: '#0d9488' }} />
                  </div>
                )}
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                    color: '#ffffff',
                    borderBottomRightRadius: '6px',
                  } : {
                    background: 'rgba(30, 63, 118, 0.4)',
                    color: '#e2e8f0',
                    borderBottomLeftRadius: '6px',
                  }}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(13, 148, 136, 0.15)' }}
                  >
                    <User className="w-4 h-4" style={{ color: '#06b6d4' }} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(13, 148, 136, 0.15)' }}
                >
                  <Bot className="w-4 h-4" style={{ color: '#0d9488' }} />
                </div>
                <div className="rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(30, 63, 118, 0.4)', borderBottomLeftRadius: '6px' }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#0d9488', animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#0d9488', animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#0d9488', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick prompts (only show at start) */}
            {messages.length === 1 && !loading && (
              <div className="space-y-2 pt-1">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="block w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: 'rgba(30, 63, 118, 0.25)',
                      border: '1px solid rgba(45, 84, 148, 0.3)',
                      color: '#94a3b8',
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLElement).style.background = 'rgba(13, 148, 136, 0.1)';
                      (e.target as HTMLElement).style.borderColor = 'rgba(13, 148, 136, 0.3)';
                      (e.target as HTMLElement).style.color = '#e2e8f0';
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLElement).style.background = 'rgba(30, 63, 118, 0.25)';
                      (e.target as HTMLElement).style.borderColor = 'rgba(45, 84, 148, 0.3)';
                      (e.target as HTMLElement).style.color = '#94a3b8';
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: 'rgba(30, 63, 118, 0.3)',
                border: '1px solid rgba(45, 84, 148, 0.3)',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Palm anything..."
                disabled={loading}
                className="flex-1 bg-transparent outline-none text-sm placeholder-slate-500"
                style={{ color: '#e2e8f0' }}
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg transition-all disabled:opacity-30"
                style={{
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #0d9488, #0891b2)' : 'transparent',
                  color: '#ffffff',
                }}
                aria-label="Send message"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center mt-2 text-xs" style={{ color: 'rgb(61 105 178)' }}>
              Palm it.
            </p>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => { setOpen(!open); setPulse(false); }}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #0d9488, #0891b2)',
          boxShadow: '0 8px 32px rgba(13, 148, 136, 0.4)',
          color: '#ffffff',
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {pulse && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 animate-ping" />
            )}
            {pulse && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400" />
            )}
          </>
        )}
      </button>
    </>
  );
}
