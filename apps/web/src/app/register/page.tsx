'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Building2, AlertCircle,
} from 'lucide-react';
import { trackFunnelStep } from '@/lib/analytics';
import { getAttribution, getSignupSource } from '@/lib/attribution';
import { trackSignUp } from '@/lib/ga';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import PalmOrb from '@/components/glass/PalmOrb';
import WaveField from '@/components/glass/WaveField';
import SocialAuthButtons from '@/components/SocialAuthButtons';

const API = '/api';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY','DC',
];

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
    <Suspense
      fallback={
        <div className="min-h-screen glass-page flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      }
    >
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
      return { message: "Password doesn't meet security requirements.", hint: 'Use at least 8 characters with a mix of letters, numbers, and symbols.' };
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

  const clearError = () => {
    setError('');
    setErrorHint('');
  };

  useEffect(() => {
    trackFunnelStep(1, 'registration', { plan: selectedPlan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const validateStep1 = () => {
    if (!form.owner_name.trim()) return 'Full name is required';
    if (!form.name.trim()) return 'Agency name is required';
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
    if (err) {
      setError(err);
      setErrorHint('');
      return;
    }
    clearError();
    setStep(2);
    trackFunnelStep(2, 'registration', { plan: selectedPlan });
  };

  const handleRegister = async () => {
    const err = validateStep2();
    if (err) {
      setError(err);
      setErrorHint('');
      return;
    }
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
        const detail =
          typeof data.detail === 'string'
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((d: { msg?: string }) => d.msg || d).join('. ')
              : 'Registration failed. Please try again.';
        throw new Error(detail);
      }

      const data = await res.json();
      trackFunnelStep(4, 'registration', { plan: selectedPlan });
      trackFunnelStep(5, 'registration', { plan: selectedPlan, completed: true });
      try {
        trackSignUp({
          plan: selectedPlan,
          signup_source: getSignupSource(),
          referral_source: form.referral_source || 'not_answered',
        });
      } catch {
        /* analytics must never break signup */
      }
      if (data.access_token) {
        setToken(data.access_token);
        try {
          const me = await api.getMe(data.access_token);
          if (me) setUser(me);
        } catch {
          /* non-fatal */
        }
        await new Promise((r) => setTimeout(r, 100));
        router.push('/welcome');
      } else {
        router.push('/login');
      }
    } catch (e: unknown) {
      setFriendlyError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const inputClass =
    'h-[52px] w-full px-4 rounded-xl bg-white border border-[#D3E2DF] text-[15px] font-medium text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500';
  const labelClass =
    'text-[13px] leading-4 tracking-[0.02em] font-semibold text-[#475569]';

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[minmax(280px,520px)_1fr] relative overflow-hidden bg-[#E7F1EF] antialiased">
      <div
        className="flex flex-col justify-between p-8 sm:p-10 xl:p-14 relative overflow-hidden min-h-[280px] md:min-h-screen"
        style={{ backgroundColor: '#071412' }}
      >
        <WaveField dark className="opacity-90" />
        <Link href="/" className="relative z-10 flex items-center gap-3 hover:opacity-90 transition-opacity">
          <PalmOrb size={36} />
          <span className="text-[18px] tracking-[0.02em] font-bold text-white">PALM</span>
        </Link>

        <div className="relative z-10 flex flex-col gap-6 md:gap-9 max-w-[448px] py-6 md:py-0">
          <PalmOrb size={160} className="hidden md:block shrink-0 w-[160px] h-[160px] xl:w-[220px] xl:h-[220px]" />
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-baseline flex-wrap">
              <span className="text-[40px] md:text-[48px] xl:text-[56px] leading-none tracking-tight font-extrabold text-white">
                Palm&nbsp;
              </span>
              <span className="text-[40px] md:text-[48px] xl:text-[56px] leading-none tracking-tight font-extrabold text-[#2DD4BF]">
                It.
              </span>
            </div>
            <p className="text-[16px] md:text-[18px] leading-7 text-white/68 max-w-[380px]">
              Set up your agency and finish your first visit today.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-[13px] font-medium text-white/40">Home care documentation</p>
      </div>

      <div className="flex items-center justify-center px-5 py-10 sm:px-8 relative min-h-screen">
        <WaveField className="opacity-40 md:hidden" />
        <div className="relative z-10 w-full max-w-[480px] flex flex-col gap-5 p-8 sm:p-10 rounded-[24px] bg-[#FFFFFFB8] border border-[#FFFFFFE6] shadow-[0_30px_70px_#115E5924] backdrop-blur-xl">
          <div className="flex flex-col items-start gap-4">
            <PalmOrb size={56} />
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[30px] tracking-[-0.02em] font-bold leading-9 text-[#0F172A]">
                {step === 1 ? 'Create account' : 'Agency details'}
              </h1>
              <p className="text-[15px] leading-[18px] text-[#64748B]">
                {step === 1
                  ? 'Four documents from one recording.'
                  : 'This sets up your contracts with the right state rules.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    n === step
                      ? 'bg-primary-500 text-white'
                      : n < step
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {n < step ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                {n < 2 && <div className="w-8 h-px bg-[#D3E2DF]" />}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                  {errorHint && <p className="text-red-600/80 text-xs mt-1">{errorHint}</p>}
                </div>
                <button type="button" onClick={clearError} className="text-red-400 hover:text-red-600">
                  ×
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <SocialAuthButtons onError={setFriendlyError} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Full name</label>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => set('owner_name', e.target.value)}
                    placeholder="Maria Santos"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Agency name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Sunrise Home Care"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Work email</label>
                <input
                  type="email"
                  value={form.owner_email}
                  onChange={(e) => set('owner_email', e.target.value)}
                  placeholder="maria@agency.com"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.owner_password}
                    onChange={(e) => set('owner_password', e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="h-[54px] w-full rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-base font-bold shadow-[0_12px_26px_#0D948852] flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  clearError();
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>State of incorporation</label>
                <select
                  value={form.state_of_incorporation}
                  onChange={(e) => set('state_of_incorporation', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="(555) 000-0000"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="123 Main St"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>State</label>
                  <select value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass}>
                    <option value="">State</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>ZIP</label>
                  <input
                    type="text"
                    value={form.zip_code}
                    onChange={(e) => set('zip_code', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Where did you find us?</label>
                <select
                  value={form.referral_source}
                  onChange={(e) => set('referral_source', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select one (optional)</option>
                  {REFERRAL_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="h-[54px] w-full rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-base font-bold shadow-[0_12px_26px_#0D948852] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" /> Create account
                  </>
                )}
              </button>
            </div>
          )}

          <p className="text-center text-sm text-[#64748B]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary-500 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-center text-xs text-[#94A3B8]">
            By continuing you agree to the{' '}
            <Link href="/terms" className="underline underline-offset-2">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
