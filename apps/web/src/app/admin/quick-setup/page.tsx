'use client';

import { useState } from 'react';
import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import {
  Zap, Copy, ExternalLink, CheckCircle2, Loader2, AlertCircle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

const SERVICE_OPTIONS = [
  'Hospice',
  'IDD',
  'Non-Skilled Services',
  'Skilled Nursing',
  'Personal Care',
  'Companion Care',
];

const CLIENT_RANGES = [
  { label: '1–10', value: 10 },
  { label: '11–25', value: 25 },
  { label: '26–50', value: 50 },
  { label: '51–100', value: 100 },
  { label: '101–250', value: 250 },
  { label: '250+', value: 500 },
];

interface SetupResult {
  business_id: string;
  user_id: string;
  temporary_password: string;
  login_url: string;
}

export default function QuickSetupPage() {
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [estimatedClients, setEstimatedClients] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleService = (svc: string) => {
    setServices(prev =>
      prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/admin/quick-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          owner_name: ownerName,
          owner_email: ownerEmail,
          state,
          phone: phone || undefined,
          services: services.length > 0 ? services : undefined,
          estimated_clients: estimatedClients ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `Request failed (${res.status})`);
      }

      const data: SetupResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!result) return;
    const text = `Email: ${ownerEmail}\nPassword: ${result.temporary_password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setCompanyName('');
    setOwnerName('');
    setOwnerEmail('');
    setState('');
    setPhone('');
    setServices([]);
    setEstimatedClients(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Quick Setup</h1>
              <p className="text-sm text-slate-500">Onboard a new agency in seconds</p>
            </div>
          </div>

          {/* Success State */}
          {result && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h2 className="text-lg font-semibold text-emerald-600">Agency Created Successfully</h2>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Company</span>
                  <span className="text-slate-900 font-medium">{companyName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Business ID</span>
                  <span className="text-slate-900 font-mono text-xs">{result.business_id}</span>
                </div>
              </div>

              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Login Credentials</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Email</span>
                    <span className="text-slate-900 font-mono text-sm">{ownerEmail}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Password</span>
                    <span className="text-amber-600 font-mono text-sm">{result.temporary_password}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyCredentials}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Credentials'}
                </button>
                <a
                  href={result.login_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 hover:bg-primary-500/30 text-primary-600 text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Login Page
                </a>
              </div>

              <button
                onClick={resetForm}
                className="w-full mt-4 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
              >
                Set Up Another Agency
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          {!result && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <h3 className="text-slate-900 font-semibold text-sm uppercase tracking-wider mb-1">Agency Details</h3>

                {/* Company Name */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Sunrise Home Care LLC"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm"
                  />
                </div>

                {/* Owner Name */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm"
                  />
                </div>

                {/* Owner Email */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">Owner Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    placeholder="e.g. jane@sunrisehomecare.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">State *</label>
                  <select
                    required
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm appearance-none"
                  >
                    <option value="" className="bg-white">Select state...</option>
                    {US_STATES.map(s => (
                      <option key={s} value={s} className="bg-white">
                        {STATE_NAMES[s]} ({s})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">Phone <span className="text-slate-500">(optional)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. (402) 555-0123"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm"
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <h3 className="text-slate-900 font-semibold text-sm uppercase tracking-wider mb-1">Service Profile</h3>

                {/* Services */}
                <div>
                  <label className="block text-sm text-slate-500 mb-3">Services Offered</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICE_OPTIONS.map(svc => (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => toggleService(svc)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                          services.includes(svc)
                            ? 'bg-primary-50 text-primary-600 border border-primary-500/40'
                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-600'
                        }`}
                      >
                        {svc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimated Clients */}
                <div>
                  <label className="block text-sm text-slate-500 mb-1.5">Estimated Clients <span className="text-slate-500">(optional)</span></label>
                  <select
                    value={estimatedClients ?? ''}
                    onChange={e => setEstimatedClients(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 text-sm appearance-none"
                  >
                    <option value="" className="bg-white">Select range...</option>
                    {CLIENT_RANGES.map(r => (
                      <option key={r.value} value={r.value} className="bg-white">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !companyName || !ownerName || !ownerEmail || !state}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-slate-900 font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Agency...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Agency
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
