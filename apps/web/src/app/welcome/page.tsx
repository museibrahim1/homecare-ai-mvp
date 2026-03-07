'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, DollarSign, Mic, CheckCircle, ArrowRight, ArrowLeft,
  Building2, Sparkles, Loader2, AlertCircle, ChevronRight,
  FileCheck, Users, Play, Mail, Settings, Calendar, FileText
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

const SERVICE_OPTIONS = [
  { id: 'personal_care', label: 'Personal Care (ADLs)' },
  { id: 'companion', label: 'Companion Care' },
  { id: 'skilled_nursing', label: 'Skilled Nursing' },
  { id: 'homemaker', label: 'Homemaker / Light Housekeeping' },
  { id: 'respite', label: 'Respite Care' },
  { id: 'hospice', label: 'Hospice Support' },
  { id: 'medication_mgmt', label: 'Medication Management' },
  { id: 'meal_prep', label: 'Meal Preparation' },
  { id: 'transportation', label: 'Transportation' },
];

const PAY_SOURCE_OPTIONS = [
  { id: 'medicaid', label: 'Medicaid', desc: 'State-funded program' },
  { id: 'medicare', label: 'Medicare', desc: 'Federal health insurance' },
  { id: 'private_pay', label: 'Private Pay', desc: 'Client pays out of pocket' },
  { id: 'insurance', label: 'Private Insurance', desc: 'Third-party insurers' },
  { id: 'va', label: 'VA Benefits', desc: 'Veterans Affairs' },
];

interface AgencyData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  service_types: string[];
  pay_sources: string[];
  billing_type: string;
  default_hourly_rate: number | null;
  medicaid_companion_rate: number | null;
  medicaid_personal_care_rate: number | null;
  medicaid_respite_rate: number | null;
  medicare_skilled_rate: number | null;
  medicare_aide_rate: number | null;
  private_pay_rate: number | null;
  accepts_medicaid: boolean;
  accepts_medicare: boolean;
  accepts_private_pay: boolean;
  accepts_insurance: boolean;
  accepts_va: boolean;
}

const defaultData: AgencyData = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  service_types: [],
  pay_sources: ['private_pay'],
  billing_type: 'hourly',
  default_hourly_rate: null,
  medicaid_companion_rate: null,
  medicaid_personal_care_rate: null,
  medicaid_respite_rate: null,
  medicare_skilled_rate: null,
  medicare_aide_rate: null,
  private_pay_rate: null,
  accepts_medicaid: false,
  accepts_medicare: false,
  accepts_private_pay: true,
  accepts_insurance: false,
  accepts_va: false,
};

export default function WelcomePage() {
  const router = useRouter();
  const { token, user, isReady } = useRequireAuth();

  const [step, setStep] = useState(0);
  const [agency, setAgency] = useState<AgencyData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/agency`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.onboarding_completed) {
            setOnboardingDone(true);
          }
          setAgency(prev => ({
            ...prev,
            name: data.name || prev.name,
            address: data.address || prev.address,
            city: data.city || prev.city,
            state: data.state || prev.state,
            zip_code: data.zip_code || prev.zip_code,
            phone: data.phone || prev.phone,
            email: data.email || prev.email,
            service_types: data.service_types?.length ? data.service_types : prev.service_types,
            pay_sources: data.pay_sources?.length ? data.pay_sources : prev.pay_sources,
            billing_type: data.billing_type || prev.billing_type,
            default_hourly_rate: data.default_hourly_rate ?? prev.default_hourly_rate,
            medicaid_companion_rate: data.medicaid_companion_rate ?? prev.medicaid_companion_rate,
            medicaid_personal_care_rate: data.medicaid_personal_care_rate ?? prev.medicaid_personal_care_rate,
            medicaid_respite_rate: data.medicaid_respite_rate ?? prev.medicaid_respite_rate,
            medicare_skilled_rate: data.medicare_skilled_rate ?? prev.medicare_skilled_rate,
            medicare_aide_rate: data.medicare_aide_rate ?? prev.medicare_aide_rate,
            private_pay_rate: data.private_pay_rate ?? prev.private_pay_rate,
            accepts_medicaid: data.accepts_medicaid ?? prev.accepts_medicaid,
            accepts_medicare: data.accepts_medicare ?? prev.accepts_medicare,
            accepts_private_pay: data.accepts_private_pay ?? prev.accepts_private_pay,
            accepts_insurance: data.accepts_insurance ?? prev.accepts_insurance,
            accepts_va: data.accepts_va ?? prev.accepts_va,
          }));
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const saveProgress = useCallback(async (markComplete = false) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...agency };
      if (markComplete) body.onboarding_completed = true;
      const res = await fetch(`${API_BASE}/agency`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch (e: any) {
      setError(e?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }, [token, agency]);

  const handleNext = async () => {
    await saveProgress();
    if (step < 2) {
      setStep(s => s + 1);
    } else {
      await saveProgress(true);
      router.push('/visits');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const toggleArrayItem = (key: 'service_types' | 'pay_sources', item: string) => {
    setAgency(prev => {
      const arr = prev[key];
      const next = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
      const updates: Partial<AgencyData> = { [key]: next };

      if (key === 'pay_sources') {
        updates.accepts_medicaid = next.includes('medicaid');
        updates.accepts_medicare = next.includes('medicare');
        updates.accepts_private_pay = next.includes('private_pay');
        updates.accepts_insurance = next.includes('insurance');
        updates.accepts_va = next.includes('va');
      }
      return { ...prev, ...updates };
    });
  };

  const setField = (key: keyof AgencyData, value: any) => {
    setAgency(prev => ({ ...prev, [key]: value }));
  };

  const setRate = (key: keyof AgencyData, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    setAgency(prev => ({ ...prev, [key]: num }));
  };

  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (onboardingDone) {
    return <CompletedWalkthrough token={token} />;
  }

  const stepLabels = ['Agency Location', 'Billing & Rates', 'Ready to Go'];
  const progress = ((step + 1) / stepLabels.length) * 100;

  const locationValid = agency.name.trim() && agency.address.trim() && agency.city.trim() && agency.state && agency.zip_code.trim();
  const billingValid = agency.pay_sources.length > 0 && agency.service_types.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center overflow-hidden">
                <Image src="/hand-icon-white.png" alt="PalmCare AI" width={28} height={28} className="object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Set Up Your Agency</h1>
                <p className="text-slate-500 text-xs">This helps the AI generate accurate contracts</p>
              </div>
            </div>
            <Link href="/visits" className="text-slate-400 hover:text-slate-600 text-sm transition flex items-center gap-1">
              Skip <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 mb-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary-500' : 'bg-slate-200'}`} />
              <p className={`text-xs mt-1 ${i === step ? 'text-primary-600 font-medium' : 'text-slate-400'}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-3xl mx-auto px-6 mt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-600 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 text-xs underline">Dismiss</button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Step 0: Location */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Where is your agency located?</h2>
                <p className="text-slate-500 text-sm">The AI uses your state to apply the correct regulations and rate schedules.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agency Name</label>
                <input
                  type="text"
                  value={agency.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Sunshine Home Care LLC"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={agency.address}
                  onChange={e => setField('address', e.target.value)}
                  placeholder="123 Main St, Suite 100"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={agency.city}
                    onChange={e => setField('city', e.target.value)}
                    placeholder="Omaha"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <select
                    value={agency.state}
                    onChange={e => setField('state', e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  >
                    <option value="">--</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={agency.zip_code}
                    onChange={e => setField('zip_code', e.target.value)}
                    placeholder="68102"
                    maxLength={10}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={agency.phone}
                    onChange={e => setField('phone', e.target.value)}
                    placeholder="(402) 555-0100"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={agency.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="contact@agency.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 text-sm font-medium">Why does this matter?</p>
                <p className="text-blue-600 text-xs mt-0.5">
                  Every state has different Medicaid rates, documentation requirements, and care regulations.
                  Your address tells the AI which rules to follow — so every contract is compliant from day one.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Billing & Rates */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">How does your agency charge?</h2>
                <p className="text-slate-500 text-sm">The AI will use your exact rates in every contract — no guessing.</p>
              </div>
            </div>

            {/* Pay Sources */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Which pay sources do you accept?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAY_SOURCE_OPTIONS.map(ps => {
                  const selected = agency.pay_sources.includes(ps.id);
                  return (
                    <button
                      key={ps.id}
                      onClick={() => toggleArrayItem('pay_sources', ps.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition ${
                        selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        selected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
                      }`}>
                        {selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${selected ? 'text-primary-700' : 'text-slate-700'}`}>{ps.label}</p>
                        <p className="text-xs text-slate-400">{ps.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Types */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">What services do you provide?</h3>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map(svc => {
                  const selected = agency.service_types.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      onClick={() => toggleArrayItem('service_types', svc.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        selected
                          ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {svc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rates */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Your rates ($/hour)</h3>
              <p className="text-xs text-slate-400 -mt-2 mb-3">Leave blank for any rate you don't use. The AI will apply state defaults.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RateInput label="Default Hourly Rate" value={agency.default_hourly_rate} onChange={v => setRate('default_hourly_rate', v)} />
                <RateInput label="Private Pay Rate" value={agency.private_pay_rate} onChange={v => setRate('private_pay_rate', v)} />
              </div>

              {agency.accepts_medicaid && (
                <>
                  <p className="text-xs text-slate-500 font-medium mt-2">Medicaid Rates</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <RateInput label="Companion" value={agency.medicaid_companion_rate} onChange={v => setRate('medicaid_companion_rate', v)} />
                    <RateInput label="Personal Care" value={agency.medicaid_personal_care_rate} onChange={v => setRate('medicaid_personal_care_rate', v)} />
                    <RateInput label="Respite" value={agency.medicaid_respite_rate} onChange={v => setRate('medicaid_respite_rate', v)} />
                  </div>
                </>
              )}

              {agency.accepts_medicare && (
                <>
                  <p className="text-xs text-slate-500 font-medium mt-2">Medicare Rates</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <RateInput label="Skilled Nursing" value={agency.medicare_skilled_rate} onChange={v => setRate('medicare_skilled_rate', v)} />
                    <RateInput label="Home Health Aide" value={agency.medicare_aide_rate} onChange={v => setRate('medicare_aide_rate', v)} />
                  </div>
                </>
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
              <DollarSign className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-800 text-sm font-medium">No more guessing</p>
                <p className="text-emerald-600 text-xs mt-0.5">
                  Every contract the AI generates will use your exact rates.
                  If a client is Medicaid, the AI applies your Medicaid rate — automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Ready */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">You're all set!</h2>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                The AI now knows your location, services, and billing rates. Every contract will be tailored to your agency.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-900">{agency.name}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">{agency.city}, {agency.state} {agency.zip_code}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">
                  {agency.pay_sources.map(p => p.replace('_', ' ')).join(', ')}
                </span>
                {agency.default_hourly_rate && (
                  <span className="text-slate-400">| ${agency.default_hourly_rate}/hr default</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {agency.service_types.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick start actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Users, title: 'Add Your First Client', href: '/clients?action=new', desc: 'Create a client profile' },
                { icon: Mic, title: 'Record an Assessment', href: '/visits/new', desc: 'AI transcribes everything' },
                { icon: FileCheck, title: 'Generate a Contract', href: '/contracts', desc: 'AI fills your rates in automatically' },
                { icon: Settings, title: 'Agency Settings', href: '/settings', desc: 'Adjust branding & templates' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.title} href={item.href} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 transition group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          {step > 0 ? (
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={handleNext}
            disabled={saving || (step === 0 && !locationValid) || (step === 1 && !billingValid)}
            className="flex items-center gap-2 bg-primary-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {step === 2 ? 'Go to Dashboard' : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}


function RateInput({ label, value, onChange }: { label: string; value: number | null; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
        <input
          type="number"
          step="0.50"
          min="0"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          className="w-full pl-7 pr-4 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
        />
      </div>
    </div>
  );
}


function CompletedWalkthrough({ token }: { token: string | null }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Agency Setup Complete</h1>
        <p className="text-slate-500 mb-8">Your agency is configured. The AI is ready to generate contracts with your rates.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/visits" className="inline-flex items-center justify-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600 transition">
            <Play className="w-5 h-5" /> Go to Dashboard
          </Link>
          <Link href="/settings" className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition">
            <Settings className="w-5 h-5" /> Edit Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
