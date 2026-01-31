'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getStoredToken } from '@/lib/auth';
import {
  HelpCircle, Send, Loader2, CheckCircle, MessageSquare,
  AlertCircle, Book, FileQuestion, Bug, Lightbulb, Phone, Mail
} from 'lucide-react';

// Formspree form ID for support tickets
const FORMSPREE_SUPPORT_ID = process.env.NEXT_PUBLIC_FORMSPREE_SUPPORT_ID || 'mvgkzpqr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
    answer: 'Go to Team > Caregivers and click "Add Caregiver". You can set their role and permissions from there.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we use bank-level encryption (AES-256) for all data. Audio files are encrypted at rest and in transit. We are HIPAA compliant.',
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'faq' | 'ticket'>('faq');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_SUPPORT_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          // User info
          user_email: user?.email,
          user_name: user?.full_name || user?.email,
          // Ticket info
          category: formData.category,
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          // Email formatting
          _subject: `[SUPPORT-${formData.priority.toUpperCase()}] ${formData.subject}`,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({ category: 'general', subject: '', description: '', priority: 'medium' });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit ticket');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Help & Support</h1>
            <p className="text-dark-400 mt-1">Find answers or get in touch with our team</p>
          </div>

          {/* Quick Contact */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <a
              href="mailto:support@homecare.ai"
              className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-dark-700 hover:border-primary-500/50 transition"
            >
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-white font-medium">Email Support</p>
                <p className="text-dark-400 text-sm">support@homecare.ai</p>
              </div>
            </a>
            <a
              href="tel:+18005551234"
              className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-dark-700 hover:border-primary-500/50 transition"
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Phone Support</p>
                <p className="text-dark-400 text-sm">(800) 555-1234</p>
              </div>
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'faq'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:text-white'
              }`}
            >
              <Book className="w-4 h-4 inline mr-2" />
              FAQ
            </button>
            <button
              onClick={() => { setActiveTab('ticket'); setSubmitted(false); }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'ticket'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Submit Ticket
            </button>
          </div>

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-dark-700/50 transition"
                  >
                    <span className="text-white font-medium">{item.question}</span>
                    <span className={`text-primary-400 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {expandedFaq === index && (
                    <div className="px-5 pb-4 text-dark-300">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-dark-800/50 rounded-xl border border-dark-700 text-center">
                <p className="text-dark-400 mb-3">Can't find what you're looking for?</p>
                <button
                  onClick={() => setActiveTab('ticket')}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
                >
                  Submit a Support Ticket
                </button>
              </div>
            </div>
          )}

          {/* Ticket Tab */}
          {activeTab === 'ticket' && (
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Ticket Submitted!</h3>
                  <p className="text-dark-400 mb-6">
                    We've received your support request and will respond within 1 business day.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
                  >
                    Submit Another Ticket
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-3">Category</label>
                    <div className="grid grid-cols-2 gap-3">
                      {TICKET_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          className={`p-4 rounded-xl border text-left transition ${
                            formData.category === cat.id
                              ? 'bg-primary-500/10 border-primary-500/50'
                              : 'bg-dark-700/50 border-dark-600 hover:border-dark-500'
                          }`}
                        >
                          <cat.icon className={`w-5 h-5 mb-2 ${
                            formData.category === cat.id ? 'text-primary-400' : 'text-dark-400'
                          }`} />
                          <p className="text-white font-medium text-sm">{cat.label}</p>
                          <p className="text-dark-500 text-xs mt-0.5">{cat.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">Subject *</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">Description *</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Please provide as much detail as possible..."
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 resize-none"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-primary-500"
                    >
                      <option value="low">Low - General question</option>
                      <option value="medium">Medium - Need help soon</option>
                      <option value="high">High - Blocking my work</option>
                      <option value="urgent">Urgent - System down</option>
                    </select>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-sm">{error}</p>
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
          )}
        </div>
      </main>
    </div>
  );
}
