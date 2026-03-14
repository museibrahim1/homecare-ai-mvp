'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { getStoredToken } from '@/lib/auth';
import { Send, X, Loader2, Bot, Sparkles, Minimize2, Mic, MicOff, Volume2, VolumeX, Download, FileText } from 'lucide-react';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface FileAttachment {
  url: string;
  filename: string;
  format: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: FileAttachment[];
}

const SUGGESTIONS_ADMIN = [
  'What are my outreach stats?',
  'Send all agency emails',
  'Show me pending work',
  'Export my billing report',
  'Generate a weekly summary document',
];

const SUGGESTIONS_USER = [
  'List my clients',
  'Show my pending tasks',
  'Export contract for a client',
  'Create a care plan document',
  'How many assessments this week?',
];

export default function PalmAgent({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const speakText = useCallback(async (text: string) => {
    if (!ttsEnabled || !text) return;
    const clean = text.replace(/[*#|`_\[\]()]/g, '').replace(/<[^>]*>/g, '').slice(0, 4096);
    if (clean.length < 5) return;
    try {
      setSpeaking(true);
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/platform/agent/tts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voice: 'nova' }),
      });
      if (!res.ok) { setSpeaking(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      setSpeaking(false);
    }
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setSpeaking(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const handleSend = async (overrideMsg?: string) => {
    const msg = (overrideMsg || input).trim();
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
      const files: FileAttachment[] = (data.files || []).map((f: FileAttachment) => ({ ...f, url: `${API_BASE}${f.url}` }));
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, files }]);
      speakText(data.response);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Something went wrong. ${e instanceof Error ? e.message : ''}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  const downloadFile = useCallback((url: string, filename: string) => {
    const token = getStoredToken();
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }, []);

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
         style={{ height: 'min(640px, calc(100vh - 6rem))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Palm AI</h3>
            <p className="text-[10px] text-teal-100">Voice + Documents + Intelligence</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setTtsEnabled(!ttsEnabled); if (speaking) stopSpeaking(); }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={ttsEnabled ? 'Mute voice' : 'Enable voice'}
            title={ttsEnabled ? 'Voice on' : 'Voice off'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </button>
          <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Minimize">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={() => { setOpen(false); setMessages([]); stopSpeaking(); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Close">
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
            <p className="text-xs text-slate-400 mb-4">Ask me anything — type or use your voice.</p>
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
            <div className={`max-w-[85%] rounded-2xl text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-teal-600 text-white rounded-br-md px-3.5 py-2.5'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <div
                    className="px-3.5 py-2.5 prose prose-sm prose-slate max-w-none [&>p]:mb-1 [&>ul]:my-1 [&>ol]:my-1 [&_li]:my-0"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-[11px]">$1</code>')
                          .replace(/^### (.*)/gm, '<h4 class="font-semibold text-slate-800 mt-2 mb-1">$1</h4>')
                          .replace(/^## (.*)/gm, '<h3 class="font-bold text-slate-900 mt-2 mb-1">$1</h3>')
                          .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
                          .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal">$2</li>')
                          .replace(/\n/g, '<br/>'),
                        { ALLOWED_TAGS: ['strong', 'em', 'code', 'h3', 'h4', 'li', 'br', 'ul', 'ol', 'p', 'a'], ALLOWED_ATTR: ['class', 'href'] }
                      )
                    }}
                  />
                  {msg.files && msg.files.length > 0 && (
                    <div className="px-3.5 pb-2.5 pt-1 border-t border-slate-100 mt-1 space-y-1.5">
                      {msg.files.map((f, fi) => (
                        <button
                          key={fi}
                          onClick={() => downloadFile(f.url, f.filename)}
                          className="flex items-center gap-2 w-full px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors text-left"
                        >
                          <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="text-xs font-medium text-teal-800 truncate flex-1">{f.filename}</span>
                          <Download className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
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
        {speaking && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-1 bg-teal-500 rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 12}px`, animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
            <span className="text-[11px] text-teal-600 font-medium">Speaking...</span>
            <button onClick={stopSpeaking} className="text-[11px] text-slate-400 hover:text-red-500 ml-auto">Stop</button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={toggleListening}
            className={`px-3 py-2.5 rounded-xl transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
            placeholder={listening ? 'Listening...' : 'Ask Palm anything...'}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
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
