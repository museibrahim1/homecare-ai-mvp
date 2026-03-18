'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Check, ArrowLeft, Eye, EyeOff, Building2 } from 'lucide-react';

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
  const [showPw, setShowPw] = useState(false);

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
    if (!form.owner_password || form.owner_password.length < 8) return 'Password must be at least 8 characters';
    return '';
  };

  const validateStep2 = () => {
    if (!form.name.trim()) return 'Agency name is required';
    if (!form.state_of_incorporation) return 'State is required';
    if (!form.phone.trim()) return 'Phone number is required';
    if (!form.email.trim()) return 'Business email is required';
    if (!form.address.trim()) return 'Address is required';
    if (!form.city.trim()) return 'City is required';
    if (!form.state) return 'State is required';
    if (!form.zip_code.trim()) return 'ZIP code is required';
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        email: form.email || form.owner_email,
        signup_source: 'direct',
        selected_plan: selectedPlan,
      };

      const res = await fetch(`${API}/auth/business/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Registration failed' }));
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Registration failed');
      }

      const data = await res.json();
      setStep(3);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const planLabel = selectedPlan === 'growth' ? 'Growth ($399/mo)' : selectedPlan === 'enterprise' ? 'Enterprise' : 'Starter ($179/mo)';

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
              Start your 7-day<br />free trial today
            </h2>
            <p className="text-white/70 mt-4 text-lg leading-relaxed">
              No credit card required. Set up your agency in minutes and see how AI-powered documentation transforms your workflow.
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {[
              'AI voice-to-contract in 60 seconds',
              'HIPAA-compliant & secure',
              'Works across all 50 states',
              'Cancel anytime during trial',
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-white/80">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-white/40 text-xs">
          &copy; 2026 Palm Technologies, INC. &middot; <Link href="/privacy" className="underline">Privacy Policy</Link>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-2xl font-bold text-white">
              <span className="text-teal-400">Palm</span>Care AI
            </Link>
          </div>

          {/* Step Indicators */}
          {step < 3 && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    s === step ? 'bg-teal-500 text-white' :
                    s < step ? 'bg-teal-500/20 text-teal-400' :
                    'bg-white/10 text-white/30'
                  }`}>
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className={`text-xs font-medium ${s === step ? 'text-white' : 'text-white/30'}`}>
                    {s === 1 ? 'Your Account' : 'Agency Details'}
                  </span>
                  {s < 2 && <div className="w-8 h-px bg-white/10 mx-1" />}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Account */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
              <p className="text-white/50 text-sm mb-6">
                Selected plan: <span className="text-teal-400 font-semibold">{planLabel}</span> &middot; 7-day free trial
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Full Name</label>
                  <input
                    type="text" value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Email</label>
                  <input
                    type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)}
                    placeholder="jane@agency.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} value={form.owner_password} onChange={e => set('owner_password', e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition pr-10"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-6 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl text-sm font-semibold transition"
              >
                Continue
              </button>

              <p className="text-center text-white/30 text-xs mt-4">
                Already have an account? <Link href="/login" className="text-teal-400 hover:text-teal-300">Sign in</Link>
              </p>
            </div>
          )}

          {/* Step 2: Agency */}
          {step === 2 && (
            <div>
              <button onClick={() => { setStep(1); setError(''); }} className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-4 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-bold text-white mb-1">Agency Details</h1>
              <p className="text-white/50 text-sm mb-6">Tell us about your home care agency</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Agency Name</label>
                    <input
                      type="text" value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="ABC Home Care LLC"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Entity Type</label>
                    <select value={form.entity_type} onChange={e => set('entity_type', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 focus:outline-none transition">
                      {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">State of Incorporation</label>
                    <select value={form.state_of_incorporation} onChange={e => set('state_of_incorporation', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 focus:outline-none transition">
                      <option value="">Select State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Business Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="info@agency.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Address</label>
                  <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                    placeholder="123 Main St"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">City</label>
                    <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">State</label>
                    <select value={form.state} onChange={e => set('state', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-teal-500 focus:outline-none transition">
                      <option value="">State</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">ZIP</label>
                    <input type="text" value={form.zip_code} onChange={e => set('zip_code', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-teal-500 focus:outline-none transition" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-6 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : <>
                  <Building2 className="w-4 h-4" /> Create Account & Start Trial
                </>}
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-teal-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Welcome to PalmCare AI!</h1>
              <p className="text-white/60 mb-2">Your account has been created successfully.</p>
              <p className="text-teal-400 font-semibold mb-8">Your 7-day free trial has started.</p>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 text-left">
                <h3 className="text-white font-semibold text-sm mb-3">Next steps:</h3>
                <div className="space-y-2">
                  {[
                    'Sign in with your email and password',
                    'Set up your first client',
                    'Record your first voice assessment',
                    'Review the AI-generated contract',
                  ].map((s, i) => (
                    <div key={s} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                      <span className="text-white/70 text-sm">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => router.push('/login')}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl text-sm font-semibold transition"
              >
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
