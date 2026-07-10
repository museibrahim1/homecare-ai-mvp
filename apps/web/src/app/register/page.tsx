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

const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const ENTITY_TYPES = [
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'non_profit', label: 'Non-Profit' },
  { value: 'other', label: 'Other' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY','DC',
];

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
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
    entity_type: 'llc',
    state_of_incorporation: '',
    registration_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
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
    professional: { label: 'Professional' },
  };
  const activePlan = planConfig[selectedPlan] || planConfig.starter;
  const planLabel = activePlan.label;

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition";

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-teal-600 to-teal-800 flex-col justify-between p-12">
        <div>
          <Link href="/" className="text-3xl font-bold text-white">
            <span className="text-white/80">Palm</span>Care AI
          </Link>
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Start your free trial<br />and transform your agency
            </h2>
            <p className="text-white/70 mt-4 text-lg leading-relaxed">
              Set up your agency in minutes and start a 14-day free trial.
              No credit card required.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {[
              'AI voice-to-contract in 60 seconds',
              'HIPAA-compliant & secure',
              'Works across all 50 states',
              'Cancel anytime — no charge during trial',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-white/80">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex items-center gap-6 text-white/50 text-xs">
            <div className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> HIPAA Compliant</div>
            <div className="flex items-center gap-1.5"><Check className="w-4 h-4" /> No Credit Card</div>
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Cancel Anytime</div>
          </div>
        </div>
        <div className="text-white/40 text-xs">
          &copy; 2026 Palm Technologies, INC. &middot; <Link href="/privacy" className="underline">Privacy Policy</Link>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-2xl font-bold text-white">
              <span className="text-teal-400">Palm</span>Care AI
            </Link>
          </div>

          {/* Step Indicators */}
          {step <= 2 && (
            <div className="flex items-center gap-2 mb-8">
              {[
                { n: 1, label: 'Account' },
                { n: 2, label: 'Agency' },
              ].map(({ n, label }) => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    n === step ? 'bg-teal-500 text-white' :
                    n < step ? 'bg-teal-500/20 text-teal-400' :
                    'bg-white/10 text-white/30'
                  }`}>
                    {n < step ? <Check className="w-4 h-4" /> : n}
                  </div>
                  <span className={`text-xs font-medium ${n === step ? 'text-white' : 'text-white/30'}`}>
                    {label}
                  </span>
                  {n < 2 && <div className="w-6 h-px bg-white/10 mx-1" />}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3.5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                  {errorHint && <p className="text-red-400/60 text-xs mt-1">{errorHint}</p>}
                </div>
                <button onClick={clearError} className="text-red-400/40 hover:text-red-400 transition shrink-0">
                  <span className="sr-only">Dismiss</span>&times;
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Account */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
              <p className="text-white/50 text-sm mb-6">
                Selected plan: <span className="text-teal-400 font-semibold">{planLabel}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Full Name</label>
                  <input type="text" value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
                    placeholder="Jane Smith" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
                  <input type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)}
                    placeholder="jane@agency.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.owner_password}
                      onChange={e => set('owner_password', e.target.value)}
                      placeholder="Min 8 characters" className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={handleNext}
                className="w-full mt-6 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-white/30 text-xs mt-4">
                Already have an account? <Link href="/login" className="text-teal-400 hover:text-teal-300">Sign in</Link>
              </p>
            </div>
          )}

          {/* STEP 2: Agency */}
          {step === 2 && (
            <div>
              <button onClick={() => { setStep(1); clearError(); }}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-4 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-bold text-white mb-1">Agency Details</h1>
              <p className="text-white/50 text-sm mb-6">Tell us about your home care agency</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Agency Name</label>
                    <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="ABC Home Care LLC" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Entity Type</label>
                    <select value={form.entity_type} onChange={e => set('entity_type', e.target.value)} className={inputClass}>
                      {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">State</label>
                    <select value={form.state_of_incorporation} onChange={e => set('state_of_incorporation', e.target.value)} className={inputClass}>
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="(555) 000-0000" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Address</label>
                  <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                    placeholder="123 Main St" className={inputClass} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">City</label>
                    <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">State</label>
                    <select value={form.state} onChange={e => set('state', e.target.value)} className={inputClass}>
                      <option value="">State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">ZIP</label>
                    <input type="text" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <button onClick={handleRegister} disabled={loading}
                className="w-full mt-6 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> :
                  <><Building2 className="w-4 h-4" /> Create Account & Start Free Trial</>}
              </button>

              <p className="text-center text-white/30 text-xs mt-4">
                14-day free trial &middot; No credit card required
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
