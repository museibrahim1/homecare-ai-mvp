'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GlassShell from '@/components/GlassShell';
import { getStoredToken } from '@/lib/auth';
import {
  HelpCircle, Send, Loader2, CheckCircle, MessageSquare,
  AlertCircle, Book, FileQuestion, Bug, Lightbulb, Mail, Clock, ChevronDown,
} from 'lucide-react';
import GlassTabs from '@/components/GlassTabs';

// Formspree form ID for support tickets
const FORMSPREE_SUPPORT_ID = process.env.NEXT_PUBLIC_FORMSPREE_SUPPORT_ID || '';

const API_BASE = '/api';

const TICKET_CATEGORIES = [
  { id: 'technical', label: 'Technical Issue', icon: Bug, description: 'App not working, errors, bugs' },
  { id: 'billing', label: 'Billing Question', icon: FileQuestion, description: 'Payment, subscription, invoices' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest improvements' },
  { id: 'general', label: 'General Help', icon: HelpCircle, description: 'Other questions' },
];

const FAQ_ITEMS = [
  {
    question: 'How do I upload an audio recording?',
    answer: 'Go to Assessments > New Assessment, then drag and drop your audio file or click to browse. We support MP3, WAV, and M4A formats up to 100MB.',
  },
  {
    question: 'How long does transcription take?',
    answer: 'Most recordings are transcribed within 2-5 minutes. Longer recordings (30+ minutes) may take up to 10 minutes.',
  },
  {
    question: 'Can I edit generated contracts?',
    answer: 'Yes! After a contract is generated, you can edit any section before exporting. Click "Edit" on any contract field to make changes.',
  },
  {
    question: 'How do I add team members?',
    answer: 'Go to Team Members and click "Add Caregiver". You can set their role and permissions from there.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we use bank-level encryption (AES-256) for all data. Audio files are encrypted at rest and in transit. We are HIPAA compliant.',
  },
];

interface Ticket {
  id: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

export default function HelpPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'guides' | 'tickets'>('guides');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Ticket form state
  const [formData, setFormData] = useState({
    category: 'general',
    subject: '',
    description: '',
    priority: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const token = getStoredToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setUser(await response.json());
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Read the active tab from the URL (?tab=tickets)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'tickets' || tab === 'guides') setActiveTab(tab);
  }, []);

  const storageKey = user?.id ? `palm_support_tickets_${user.id}` : null;

  // Load saved tickets once the user (and therefore the storage key) is known
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setTickets(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
  }, [storageKey]);

  const persistTickets = (next: Ticket[]) => {
    setTickets(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
    }
  };

  const handleTabChange = (key: string) => {
    const tab = key === 'tickets' ? 'tickets' : 'guides';
    setActiveTab(tab);
    if (tab === 'tickets') setSubmitted(false);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/help?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Best-effort email delivery through Formspree when configured. The local
    // ticket record is saved regardless so the open tickets list always works.
    if (FORMSPREE_SUPPORT_ID) {
      try {
        await fetch(`https://formspree.io/f/${FORMSPREE_SUPPORT_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            user_email: user?.email,
            user_name: user?.full_name || user?.email,
            category: formData.category,
            subject: formData.subject,
            description: formData.description,
            priority: formData.priority,
            _subject: `[SUPPORT-${formData.priority.toUpperCase()}] ${formData.subject}`,
          }),
        });
      } catch {
        // fall through; ticket is still stored locally
      }
    }

    const newTicket: Ticket = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}`,
      category: formData.category,
      subject: formData.subject,
      description: formData.description,
      priority: formData.priority,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    persistTickets([newTicket, ...tickets]);
    setSubmitted(true);
    setFormData({ category: 'general', subject: '', description: '', priority: 'medium' });
    setSubmitting(false);
  };

  const handleResolveTicket = (id: string) => {
    persistTickets(tickets.map(t => t.id === id ? { ...t, status: 'resolved' } : t));
  };

  if (loading) {
    return (
      <div className="min-h-screen glass-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === 'open');

  return (
    <GlassShell title="Help" subtitle="Find answers or get in touch with our team">
        <div className="max-w-4xl mx-auto w-full">
          {/* Quick Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <a
              href="mailto:support@palmtai.com"
              className="flex items-center gap-4 p-4 glass-card hover:bg-white transition"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-slate-900 font-medium">Email Support</p>
                <p className="text-slate-500 text-sm">support@palmtai.com</p>
              </div>
            </a>
            <a
              href="mailto:sales@palmtai.com"
              className="flex items-center gap-4 p-4 glass-card hover:bg-white transition"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-900 font-medium">Sales & Billing</p>
                <p className="text-slate-500 text-sm">sales@palmtai.com</p>
              </div>
            </a>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <GlassTabs
              tabs={[
                { key: 'guides', label: 'Guides', icon: Book },
                { key: 'tickets', label: 'Tickets', icon: MessageSquare, count: openTickets.length || undefined },
              ]}
              active={activeTab}
              onChange={handleTabChange}
            />
          </div>

          {/* Guides Tab */}
          {activeTab === 'guides' && (
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="glass-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/60 transition"
                  >
                    <span className="text-slate-900 font-medium">{item.question}</span>
                    <ChevronDown className={`w-4 h-4 text-primary-500 shrink-0 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-5 pb-4 text-slate-600">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-6 p-4 glass-card text-center">
                <p className="text-slate-500 mb-3">Can&apos;t find what you&apos;re looking for?</p>
                <button
                  onClick={() => handleTabChange('tickets')}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
                >
                  Submit a Support Ticket
                </button>
              </div>
            </div>
          )}

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              {/* Open tickets list */}
              {openTickets.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-slate-900 mb-3">Open tickets</h3>
                  <div className="space-y-3">
                    {openTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/70 border border-white/70">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900 truncate">{ticket.subject}</span>
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium}`}>
                              {ticket.priority}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2">{ticket.description}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleResolveTicket(ticket.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
                        >
                          Mark resolved
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ticket form */}
              <div className="glass-card p-6">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Ticket submitted</h3>
                    <p className="text-slate-500 mb-6">
                      We&apos;ve received your support request and will respond within 1 business day.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-4 py-2 bg-white/70 border border-white text-slate-800 rounded-xl hover:bg-white transition"
                    >
                      Submit another ticket
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Category Selection */}
                    <div>
                      <label className="block text-slate-500 text-sm mb-3">Category</label>
                      <div className="grid grid-cols-2 gap-3">
                        {TICKET_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: cat.id })}
                            className={`p-4 rounded-xl border text-left transition ${
                              formData.category === cat.id
                                ? 'bg-primary-50 border-primary-500/50'
                                : 'bg-white/70 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <cat.icon className={`w-5 h-5 mb-2 ${
                              formData.category === cat.id ? 'text-primary-400' : 'text-slate-500'
                            }`} />
                            <p className="text-slate-900 font-medium text-sm">{cat.label}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{cat.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-slate-500 text-sm mb-2">Subject *</label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Brief description of your issue"
                        className="w-full px-4 py-3 bg-white/80 border border-[#10211F1A] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-slate-500 text-sm mb-2">Description *</label>
                      <textarea
                        required
                        rows={5}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Please provide as much detail as possible..."
                        className="w-full px-4 py-3 bg-white/80 border border-[#10211F1A] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 resize-none"
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-slate-500 text-sm mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-4 py-3 bg-white/80 border border-[#10211F1A] rounded-xl text-slate-800 focus:outline-none focus:border-primary-500"
                      >
                        <option value="low">Low - General question</option>
                        <option value="medium">Medium - Need help soon</option>
                        <option value="high">High - Blocking my work</option>
                        <option value="urgent">Urgent - System down</option>
                      </select>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit Ticket
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
    </GlassShell>
  );
}
