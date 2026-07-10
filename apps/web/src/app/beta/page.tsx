'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Check, Smartphone, ArrowLeft } from 'lucide-react';

const API = '/api';

const DEVICES = ['iPhone', 'iPad', 'Both'];

export default function BetaPage() {
  const [form, setForm] = useState({ name: '', email: '', agency_name: '', device: 'iPhone', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/beta/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          agency_name: form.agency_name.trim() || undefined,
          device: form.device,
          note: form.note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.');
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition bg-white';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-slate-900">
            <span className="text-primary-600">Palm</span>Care AI
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft className="w-4 h-4" /> Back to site
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">
          {done ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">You&apos;re on the list!</h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                We&apos;ve received your request. Watch your inbox for a <strong>TestFlight invitation</strong> —
                it usually arrives within 1&ndash;2 business days.
              </p>
              <Link href="/" className="inline-block mt-6 text-sm font-semibold text-primary-600 hover:text-primary-700">
                Back to palmcareai.com
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-5">
                <Smartphone className="w-5 h-5 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Join the iOS beta</h1>
              <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
                Get early access to the PalmCare AI iPhone app through TestFlight.
                We&apos;ll send your invite personally — usually within 1&ndash;2 business days.
              </p>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                  <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="Jane Smith" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email <span className="text-slate-400 font-normal">(your Apple ID email works best)</span>
                  </label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="jane@agency.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Agency name <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={form.agency_name} onChange={e => set('agency_name', e.target.value)}
                    placeholder="ABC Home Care" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Device</label>
                  <select value={form.device} onChange={e => set('device', e.target.value)} className={inputClass}>
                    {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Anything you&apos;d like us to know? <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={3}
                    placeholder="e.g. features you're most interested in testing" className={inputClass} />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Request TestFlight Access'}
                </button>
              </form>

              <p className="text-xs text-slate-400 text-center mt-4">
                Free during beta &middot; No credit card &middot; We never share your email
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
