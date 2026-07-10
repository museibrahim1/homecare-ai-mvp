'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Building2, Shield, Clock, AlertCircle,
} from 'lucide-react';
import { trackFunnelStep } from '@/lib/analytics';
import { getAttribution, getSignupSource } from '@/lib/attribution';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const API = '/api';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY','DC',
];

// Self-reported acquisition channel. Answers where the automatic attribution
// can't see (e.g. a ChatGPT recommendation looks like "direct" traffic).
const REFERRAL_SOURCES = [
  { value: 'google', label: 'Google search' },
  { value: 'ai_assistant', label: 'ChatGPT or another AI assistant' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook_instagram', label: 'Facebook or Instagram' },
  { value: 'referral', label: 'Referral from a colleague or friend' },
  { value: 'event', label: 'Industry conference or event' },
  { value: 'email', label: 'An email from us' },
  { value: 'other', label: 'Other' },
];

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, setUser } = useAuth();
  const selectedPlan = searchParams.get('plan') || 'starter';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [showPw, setShowPw] = useState(false);

  const friendlyError = (raw: string): { message: string; hint: string } => {
    const lower = raw.toLowerCase();
    if (lower.includes('already exists') && lower.includes('email'))
      return { message: 'An account with this email already exists.', hint: 'Try signing in instead, or use a different email.' };
    if (lower.includes('already exists') && lower.includes('business'))
      return { message: 'This business is already registered.', hint: 'If this is your agency, try signing in or contact support.' };
    if (lower.includes('password') && (lower.includes('8 char') || lower.includes('security')))
      return { message: 'Password doesn\'t meet security requirements.', hint: 'Use at least 8 characters with a mix of letters, numbers, and symbols.' };
    if (lower.includes('rate limit') || lower.includes('too many'))
      return { message: 'Too many attempts. Please wait a moment.', hint: 'For security, we limit registration attempts. Try again in a few minutes.' };
    if (lower.includes('not configured'))
      return { message: 'Our service is temporarily unavailable.', hint: 'Please try again in a few minutes. If this persists, contact support@palmtai.com.' };
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch'))
      return { message: 'Unable to connect to our servers.', hint: 'Check your internet connection and try again.' };
    if (lower.includes('checkout') || lower.includes('payment'))
      return { message: 'Could not set up payment. Please try again.', hint: 'If this keeps happening, contact support@palmtai.com for help.' };
    if (lower.includes('500') || lower.includes('internal'))
      return { message: 'Something went wrong on our end.', hint: 'Our team has been notified. Please try again in a few minutes.' };
    if (raw.length > 120)
      return { message: 'Something went wrong. Please try again.', hint: 'If this keeps happening, contact support@palmtai.com.' };
    return { message: raw, hint: '' };
  };

  const setFriendlyError = (raw: string) => {
    const { message, hint } = friendlyError(raw);
    setError(message);
    setErrorHint(hint);
  };

  const clearError = () => { setError(''); setErrorHint(''); };

  useEffect(() => { trackFunnelStep(1, 'registration', { plan: selectedPlan }); }, []);

  const [form, setForm] = useState({
    owner_name: '',
    owner_email: '',
    owner_password: '',
    name: '',
    dba_name: '',
    state_of_incorporation: '',
    registration_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    referral_source: '',
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const validateStep1 = () => {
    if (!form.owner_name.trim()) return 'Full name is required';
    if (!form.owner_email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.owner_email)) return 'Please enter a valid email';
    if (!form.owner_password || form.owner_password.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const validateStep2 = () => {
    if (!form.name.trim()) return 'Agency name is required';
    if (!form.state_of_incorporation) return 'State is required';
    if (!form.phone.trim()) return 'Phone number is required';
    if (!form.address.trim()) return 'Address is required';
    if (!form.city.trim()) return 'City is required';
    if (!form.state) return 'State is required';
    if (!form.zip_code.trim()) return 'ZIP code is required';
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); setErrorHint(''); return; }
    clearError();
    setStep(2);
    trackFunnelStep(2, 'registration', { plan: selectedPlan });
  };

  const handleRegister = async () => {
    const err = validateStep2();
    if (err) { setError(err); setErrorHint(''); return; }
    clearError();
    setLoading(true);

    try {
      const attribution = getAttribution();
      const payload = {
        ...form,
        email: form.email || form.owner_email,
        signup_source: getSignupSource(),
        attribution,
        selected_plan: selectedPlan,
        accepted_terms: true,
      };

      const res = await fetch(`${API}/auth/business/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Registration failed. Please try again.' }));
        const detail = typeof data.detail === 'string' ? data.detail
          : Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg || d).join('. ')
          : 'Registration failed. Please try again.';
        throw new Error(detail);
      }

      // Registration creates the account AND a 14-day free trial, and returns
      // an access token. Subscriptions/billing are managed via Apple IAP in the
      // iOS app, so there is no web checkout step — sign the user straight in.
      const data = await res.json();
      trackFunnelStep(4, 'registration', { plan: selectedPlan });
      // GA4 conversion event — lets Google Analytics report signups by
      // source/medium alongside our internal attribution.
      try {
        (window as any).gtag?.('event', 'sign_up', {
          method: 'website',
          plan: selectedPlan,
          signup_source: getSignupSource(),
          referral_source: form.referral_source || 'not_answered',
        });
      } catch { /* analytics must never break signup */ }
      if (data.access_token) {
        setToken(data.access_token);
        try {
          const me = await api.getMe(data.access_token);
          if (me) setUser(me);
        } catch {
          // non-fatal — user can still proceed; /welcome will load the session
        }
        await new Promise((r) => setTimeout(r, 100));
        router.push('/welcome');
      } else {
        router.push('/login');
      }
    } catch (e: any) {
      setFriendlyError(e.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const planConfig: Record<string, { label: string }> = {
    starter: { label: 'Starter' },
    growth: { label: 'Growth' },
    enterprise: { label: 'Enterprise' },
  };
  const activePlan = planConfig[selectedPlan] || planConfig.starter;
  const planLabel = activePlan.label;

  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 focus:outline-none transition";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav — same bar as the homepage */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/hand-icon-white.png" alt="PalmCare AI" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-slate-900">PalmCare AI</span>
          </Link>
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-700 hover:text-primary-800 font-medium">Sign in</Link>
          </p>
        </div>
      </nav>

      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-10 sm:py-14">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {step === 1 ? 'Start your 14-day free trial' : 'Tell us about your agency'}
            </h1>
            <p className="text-slate-600 mt-2">
              {step === 1
                ? 'Full access to every feature. No credit card required.'
                : 'This sets up your contracts with the right state rules.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { n: 1, label: 'Account' },
              { n: 2, label: 'Agency' },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  n === step ? 'bg-primary-600 text-white' :
                  n < step ? 'bg-primary-50 text-primary-700' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {n < step ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <span className={`text-xs font-medium ${n === step ? 'text-slate-900' : 'text-slate-400'}`}>
                  {label}
                </span>
                {n < 2 && <div className="w-8 h-px bg-slate-300 mx-1" />}
              </div>
            ))}
          </div>

          <div className="card p-6 sm:p-8 shadow-lg shadow-slate-900/5">
            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                    {errorHint && <p className="text-red-600/80 text-xs mt-1">{errorHint}</p>}
                  </div>
                  <button onClick={clearError} className="text-red-400 hover:text-red-600 transition shrink-0">
                    <span className="sr-only">Dismiss</span>&times;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1: Account */}
            {step === 1 && (
              <div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input type="text" value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
                      placeholder="Jane Smith" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Work email</label>
                    <input type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)}
                      placeholder="jane@agency.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={form.owner_password}
                        onChange={e => set('owner_password', e.target.value)}
                        placeholder="At least 8 characters" className={`${inputClass} pr-10`} />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={handleNext}
                  className="btn-primary w-full mt-6 py-3 text-sm font-semibold flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-slate-500 text-xs mt-4">
                  Selected plan: <span className="text-primary-700 font-semibold">{planLabel}</span>
                </p>
              </div>
            )}

            {/* STEP 2: Agency */}
            {step === 2 && (
              <div>
                <button onClick={() => { setStep(1); clearError(); }}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-5 transition">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Agency name</label>
                    <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="ABC Home Care LLC" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>State of incorporation</label>
                    <select value={form.state_of_incorporation} onChange={e => set('state_of_incorporation', e.target.value)} className={inputClass}>
                      <option value="">Select state</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                      placeholder="(555) 000-0000" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="123 Main St" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>City</label>
                      <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>State</label>
                      <select value={form.state} onChange={e => set('state', e.target.value)} className={inputClass}>
                        <option value="">State</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>ZIP</label>
                      <input type="text" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Where did you find us?</label>
                    <select value={form.referral_source} onChange={e => set('referral_source', e.target.value)} className={inputClass}>
                      <option value="">Select one (optional)</option>
                      {REFERRAL_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={handleRegister} disabled={loading}
                  className="btn-primary w-full mt-6 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> :
                    <><Building2 className="w-4 h-4" /> Create account and start free trial</>}
                </button>
              </div>
            )}
          </div>

          {/* Trust row — mirrors homepage hero */}
          <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" /> HIPAA compliant
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" /> Cancel anytime
            </span>
            <span>No charge until the trial ends</span>
          </div>

          <p className="text-center text-slate-400 text-xs mt-8">
            &copy; 2026 Palm Technologies, Inc. &middot;{' '}
            <Link href="/privacy" className="hover:text-slate-600 underline underline-offset-2">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
