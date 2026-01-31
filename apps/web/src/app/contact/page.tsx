'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Mic, Send, Building2, Mail, Phone, User, MessageSquare,
  Loader2, CheckCircle, ArrowLeft
} from 'lucide-react';

// Formspree form ID - get yours at https://formspree.io
const FORMSPREE_CONTACT_ID = process.env.NEXT_PUBLIC_FORMSPREE_CONTACT_ID || 'xwpkgpbw';

function ContactForm() {
  const searchParams = useSearchParams();
  const inquiry = searchParams.get('inquiry');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    inquiry_type: inquiry === 'enterprise' ? 'enterprise' : 'general',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Submit to Formspree
      const response = await fetch(`https://formspree.io/f/${FORMSPREE_CONTACT_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          inquiry_type: formData.inquiry_type,
          message: formData.message,
          _subject: `[${formData.inquiry_type.toUpperCase()}] Contact from ${formData.company}`,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Thank You!</h1>
          <p className="text-dark-300 mb-8">
            We've received your inquiry and will get back to you within 1 business day.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700/50 bg-dark-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Homecare AI</span>
          </Link>
          <Link href="/pricing" className="text-dark-300 hover:text-white transition">
            View Pricing
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-16">
          {/* Left - Info */}
          <div>
            <h1 className="text-4xl font-bold text-white mb-6">
              {inquiry === 'enterprise' ? 'Enterprise Solutions' : 'Contact Us'}
            </h1>
            <p className="text-xl text-dark-300 mb-8">
              {inquiry === 'enterprise'
                ? "Let's discuss custom solutions tailored to your organization's needs."
                : "Have questions? We'd love to hear from you."
              }
            </p>

            {inquiry === 'enterprise' && (
              <div className="space-y-6 mb-8">
                <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
                  <h3 className="text-white font-semibold mb-2">What's included in Enterprise?</h3>
                  <ul className="space-y-2 text-dark-300 text-sm">
                    <li>• Everything in Pro plan</li>
                    <li>• Custom integrations with your EHR/EMR</li>
                    <li>• Dedicated account manager</li>
                    <li>• Custom SLA guarantees</li>
                    <li>• On-premise deployment option</li>
                    <li>• White-label branding available</li>
                    <li>• Volume-based pricing</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Email us at</p>
                  <a href="mailto:sales@homecare.ai" className="text-white hover:text-primary-400 transition">
                    sales@homecare.ai
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Call us at</p>
                  <a href="tel:+18005551234" className="text-white hover:text-primary-400 transition">
                    (800) 555-1234
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {inquiry === 'enterprise' ? 'Request Enterprise Quote' : 'Send us a message'}
            </h2>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-400 text-sm mb-2">Your Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                      placeholder="John Smith"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-dark-400 text-sm mb-2">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-400 text-sm mb-2">Company *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                      placeholder="ABC Healthcare"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-dark-400 text-sm mb-2">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-2">Inquiry Type</label>
                <select
                  value={formData.inquiry_type}
                  onChange={e => setFormData({ ...formData, inquiry_type: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="general">General Inquiry</option>
                  <option value="demo">Request Demo</option>
                  <option value="enterprise">Enterprise Quote</option>
                  <option value="support">Technical Support</option>
                  <option value="partnership">Partnership Opportunity</option>
                </select>
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-2">Message *</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-dark-500" />
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 resize-none"
                    placeholder={inquiry === 'enterprise' 
                      ? "Tell us about your organization, number of locations, current challenges, and what you're looking for..."
                      : "How can we help you?"
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {inquiry === 'enterprise' ? 'Request Quote' : 'Send Message'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    }>
      <ContactForm />
    </Suspense>
  );
}
