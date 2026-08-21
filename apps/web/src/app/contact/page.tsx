'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Send, Building2, Mail, Phone, User, MessageSquare,
  Loader2, CheckCircle, ArrowLeft
} from 'lucide-react';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';

// Formspree form ID - get yours at https://formspree.io
const FORMSPREE_CONTACT_ID = process.env.NEXT_PUBLIC_FORMSPREE_CONTACT_ID || '';

const inputClass =
  'w-full pl-10 pr-4 py-3 bg-white/70 border border-[#10211F18] rounded-xl text-[#10211F] placeholder-[#7A8C88] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition';

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
      <div className="flex items-center justify-center px-6 py-24 sm:py-32">
        <div className="max-w-md text-center glass-card p-10">
          <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#10211F] mb-4">Thank you</h1>
          <p className="text-[#4B6B66] mb-8">
            We got your message and will reply within one business day.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-10 lg:px-16 py-16 sm:py-20">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
        {/* Left - Info */}
        <div>
          <h1 className="text-4xl font-bold text-[#10211F] mb-5">
            {inquiry === 'enterprise' ? 'Enterprise' : 'Contact us'}
          </h1>
          <p className="text-lg text-[#4B6B66] mb-8 leading-relaxed">
            {inquiry === 'enterprise'
              ? 'Tell us about your agency and we will tailor a plan to fit it.'
              : 'Have a question? Send us a note and we will get back to you.'}
          </p>

          {inquiry === 'enterprise' && (
            <div className="mb-8">
              <div className="glass-card p-6">
                <h3 className="text-[#10211F] font-semibold mb-3">Custom enterprise needs</h3>
                <p className="text-[#4B6B66] text-sm leading-relaxed mb-3">
                  Every agency runs a little differently. For larger teams and
                  multi-location operations, we work through the details with you
                  directly. Common requests include:
                </p>
                <ul className="space-y-2 text-[#4B6B66] text-sm">
                  <li>EHR and EMR integrations</li>
                  <li>A dedicated point of contact</li>
                  <li>Custom service level terms</li>
                  <li>Volume pricing for many seats</li>
                </ul>
                <p className="text-[#7A8C88] text-sm mt-4">
                  Reach out and our team will scope what you need. There are no
                  fixed tiers to pick from, we build the plan around your agency.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-[#7A8C88] text-sm">Sales and partnerships</p>
                <a href="mailto:sales@palmtai.com" className="text-[#10211F] font-medium hover:text-primary-600 transition">
                  sales@palmtai.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-[#7A8C88] text-sm">Technical support</p>
                <a href="mailto:support@palmtai.com" className="text-[#10211F] font-medium hover:text-primary-600 transition">
                  support@palmtai.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-[#7A8C88] text-sm">General inquiries</p>
                <a href="mailto:info@palmtai.com" className="text-[#10211F] font-medium hover:text-primary-600 transition">
                  info@palmtai.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Form */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-[#10211F] mb-6">
            {inquiry === 'enterprise' ? 'Tell us about your agency' : 'Send us a message'}
          </h2>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#4B6B66] text-sm mb-2">Your name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A8C88]" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                    placeholder="Jane Smith"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#4B6B66] text-sm mb-2">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A8C88]" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    placeholder="jane@agency.com"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#4B6B66] text-sm mb-2">Company *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A8C88]" />
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                    className={inputClass}
                    placeholder="Sunrise Home Care"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#4B6B66] text-sm mb-2">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A8C88]" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[#4B6B66] text-sm mb-2">Inquiry type</label>
              <select
                value={formData.inquiry_type}
                onChange={e => setFormData({ ...formData, inquiry_type: e.target.value })}
                className="w-full px-4 py-3 bg-white/70 border border-[#10211F18] rounded-xl text-[#10211F] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition"
              >
                <option value="general">General inquiry</option>
                <option value="demo">Request a demo</option>
                <option value="enterprise">Enterprise</option>
                <option value="support">Technical support</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>

            <div>
              <label className="block text-[#4B6B66] text-sm mb-2">Message *</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-[#7A8C88]" />
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className={`${inputClass} resize-none`}
                  placeholder={inquiry === 'enterprise'
                    ? 'Tell us about your agency, how many locations you run, and what you are looking for.'
                    : 'How can we help?'
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {inquiry === 'enterprise' ? 'Send request' : 'Send message'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <GlassMarketingShell>
      <Suspense fallback={
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      }>
        <ContactForm />
      </Suspense>
    </GlassMarketingShell>
  );
}
