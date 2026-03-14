'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getStoredToken } from '@/lib/auth';
import { Send, X, Loader2, Bot, Sparkles, Minimize2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS_ADMIN = [
  'What are my outreach stats?',
  'Send all agency emails',
  'Show me pending work',
  'List my callbacks',
  'Search investors in health tech',
];

const SUGGESTIONS_USER = [
  'List my clients',
  'Show my pending tasks',
  'How many assessments this week?',
  'Find a caregiver for Jane Smith',
  'Create a note about today\'s visits',
];

export default function PalmAgent({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = isAdmin ? SUGGESTIONS_ADMIN : SUGGESTIONS_USER;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }, []);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-20);
      const data = await apiFetch('/platform/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, history }),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Something went wrong. ${e instanceof Error ? e.message : ''}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-lg shadow-teal-500/25 flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all group"
        aria-label="Open Palm AI assistant"
      >
        <Bot className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 flex flex-col overflow-hidden"
         style={{ height: 'min(600px, calc(100vh - 6rem))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Palm AI</h3>
            <p className="text-[10px] text-teal-100">Your intelligent assistant</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Minimize">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => { setOpen(false); setMessages([]); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-teal-400" />
            <p className="text-sm font-medium text-slate-600 mb-1">Hi! I&apos;m Palm.</p>
            <p className="text-xs text-slate-400 mb-4">Ask me anything about your workspace.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-[11px] px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-teal-600 text-white rounded-br-md'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div
                  className="prose prose-sm prose-slate max-w-none [&>p]:mb-1 [&>ul]:my-1 [&>ol]:my-1 [&_li]:my-0 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-[11px]">$1</code>')
                      .replace(/^### (.*)/gm, '<h4 class="font-semibold text-slate-800 mt-2 mb-1">$1</h4>')
                      .replace(/^## (.*)/gm, '<h3 class="font-bold text-slate-900 mt-2 mb-1">$1</h3>')
                      .replace(/^\|(.+)\|$/gm, (match) => {
                        const cells = match.split('|').filter(Boolean).map(c => c.trim());
                        if (cells.every(c => /^[-:]+$/.test(c))) return '';
                        return '<tr>' + cells.map(c => `<td class="border border-slate-200 px-2 py-1">${c}</td>`).join('') + '</tr>';
                      })
                      .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
                      .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal">$2</li>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              ) : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
            placeholder="Ask Palm anything..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3.5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-40 transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
