'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Building2, CreditCard, Shield, Clock, Sparkles, AlertCircle, RefreshCw,
} from 'lucide-react';
import { trackFunnelStep } from '@/lib/analytics';

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
  const selectedPlan = searchParams.get('plan') || 'starter';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [trialType, setTrialType] = useState<'standard' | 'extended'>('standard');
  const [businessId, setBusinessId] = useState<string | null>(null);

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
    if (lower.includes('not configured') || lower.includes('stripe'))
      return { message: 'Payment system is temporarily unavailable.', hint: 'Please try again in a few minutes. If this persists, contact support@palmtai.com.' };
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
      const payload = {
        ...form,
        email: form.email || form.owner_email,
        signup_source: 'direct',
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

      const data = await res.json();
      setBusinessId(data.business_id);
      setStep(3);
      trackFunnelStep(3, 'registration', { plan: selectedPlan });
    } catch (e: any) {
      setFriendlyError(e.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleStartTrial = async () => {
    if (!businessId) return;
    setLoading(true);
    clearError();

    try {
      const res = await fetch(`${API}/billing/signup-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          email: form.owner_email,
          billing_cycle: billingCycle,
          trial_type: trialType,
          plan_tier: selectedPlan,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Could not connect to payment service' }));
        const detail = typeof data.detail === 'string' ? data.detail : 'Could not set up payment. Please try again.';
        throw new Error(detail);
      }

      const data = await res.json();
      if (!data.checkout_url) throw new Error('Payment service returned an invalid response.');
      trackFunnelStep(4, 'registration', { plan: selectedPlan, billing: billingCycle, trial: trialType });
      window.location.href = data.checkout_url;
    } catch (e: any) {
      setFriendlyError(e.message || 'Unable to connect to payment service. Please try again.');
      setLoading(false);
    }
  };

  const planConfig: Record<string, { label: string; price: number; annual: number }> = {
    starter: { label: 'Starter', price: 89.99, annual: 899 },
    growth: { label: 'Growth', price: 179.99, annual: 1799 },
    professional: { label: 'Professional', price: 299.99, annual: 2999 },
  };
  const activePlan = planConfig[selectedPlan] || planConfig.starter;
  const planLabel = activePlan.label;
  const planPrice = activePlan.price;
  const annualPrice = activePlan.annual;
  const displayPrice = billingCycle === 'annual' ? +(annualPrice / 12).toFixed(2) : planPrice;
  const trialDays = trialType === 'extended' ? 30 : 14;

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
              Set up your agency in minutes. Credit card required to start trial — you
              will not be charged until your trial period ends.
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
            <div className="flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> Stripe Secured</div>
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
          {step <= 3 && (
            <div className="flex items-center gap-2 mb-8">
              {[
                { n: 1, label: 'Account' },
                { n: 2, label: 'Agency' },
                { n: 3, label: 'Start Trial' },
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
                  {n < 3 && <div className="w-6 h-px bg-white/10 mx-1" />}
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
                  <><Building2 className="w-4 h-4" /> Continue to Trial Setup</>}
              </button>
            </div>
          )}

          {/* STEP 3: Choose Trial & Billing, then Stripe Checkout */}
          {step === 3 && (
            <div>
              <button onClick={() => { setStep(2); clearError(); }}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-4 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-bold text-white mb-1">Choose Your Trial</h1>
              <p className="text-white/50 text-sm mb-6">
                Select a trial period and billing cycle. Your credit card is required but you will not be charged until the trial ends.
              </p>

              {/* Trial Type Selection */}
              <div className="space-y-3 mb-6">
                <button onClick={() => setTrialType('standard')}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    trialType === 'standard'
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-400" />
                        <span className="text-white font-semibold text-sm">14-Day Free Trial</span>
                      </div>
                      <p className="text-white/50 text-xs mt-1 ml-6">$0 today — full access for 14 days</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      trialType === 'standard' ? 'border-teal-500 bg-teal-500' : 'border-white/20'
                    }`}>
                      {trialType === 'standard' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>

                <button onClick={() => setTrialType('extended')}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    trialType === 'extended'
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-semibold text-sm">30-Day Extended Trial</span>
                        <span className="text-amber-400 text-[10px] font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">$39.99</span>
                      </div>
                      <p className="text-white/50 text-xs mt-1 ml-6">$39.99 today — full access for 30 days</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      trialType === 'extended' ? 'border-teal-500 bg-teal-500' : 'border-white/20'
                    }`}>
                      {trialType === 'extended' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              </div>

              {/* Billing Cycle */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/70 mb-3">After trial, bill me:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setBillingCycle('monthly')}
                    className={`p-3 rounded-xl border text-center transition ${
                      billingCycle === 'monthly'
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}>
                    <div className="text-white font-semibold text-sm">${planPrice}/mo</div>
                    <div className="text-white/40 text-xs">Monthly</div>
                  </button>
                  <button onClick={() => setBillingCycle('annual')}
                    className={`p-3 rounded-xl border text-center transition relative ${
                      billingCycle === 'annual'
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}>
                    <div className="absolute -top-2 right-2 text-[9px] font-bold text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded">SAVE 17%</div>
                    <div className="text-white font-semibold text-sm">${Math.round(annualPrice / 12)}/mo</div>
                    <div className="text-white/40 text-xs">${annualPrice.toLocaleString()}/yr</div>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Plan</span>
                  <span className="text-white font-medium text-sm">{planLabel}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Trial period</span>
                  <span className="text-teal-400 font-medium text-sm">{trialDays} days</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">Due today</span>
                  <span className="text-white font-semibold text-sm">
                    {trialType === 'extended' ? '$39.99' : '$0.00'}
                  </span>
                </div>
                <div className="border-t border-white/10 mt-3 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">After trial ends</span>
                    <span className="text-white font-semibold text-sm">
                      {billingCycle === 'annual'
                        ? `$${annualPrice.toLocaleString()}/yr`
                        : `$${planPrice}/mo`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms notice */}
              <p className="text-white/40 text-[11px] leading-relaxed mb-4">
                By continuing, you agree that after your {trialDays}-day trial,
                your card will be automatically charged{' '}
                {billingCycle === 'monthly'
                  ? `$${planPrice}/month`
                  : `$${annualPrice.toLocaleString()}/year`}{' '}
                for PalmCare AI {planLabel}. You can cancel anytime before the trial ends
                to avoid being charged.
              </p>

              <button onClick={handleStartTrial} disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout...</> :
                  <><CreditCard className="w-4 h-4" /> Start {trialDays}-Day Trial</>}
              </button>

              <div className="flex items-center justify-center gap-4 mt-4 text-white/30 text-[10px]">
                <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> SSL Encrypted</div>
                <div className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Powered by Stripe</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
