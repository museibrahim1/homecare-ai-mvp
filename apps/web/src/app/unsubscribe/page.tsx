'use client';

import { FormEvent, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';

const API_BASE = '/api/platform/sales/leads';

type Prefs = {
  outreach: boolean;
  product_updates: boolean;
  announcements: boolean;
};

const CATEGORIES: {
  key: keyof Prefs;
  title: string;
  description: string;
}[] = [
  {
    key: 'outreach',
    title: 'Sales and demo outreach',
    description: 'Cold emails, demo invites, and agency follow-ups.',
  },
  {
    key: 'product_updates',
    title: 'Product tips and feature updates',
    description: 'How Palm works, new features, and workflow tips.',
  },
  {
    key: 'announcements',
    title: 'News and announcements',
    description: 'Launches, pricing notes, and company updates.',
  },
];

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState(prefill);
  const [prefs, setPrefs] = useState<Prefs>({
    outreach: false,
    product_updates: false,
    announcements: false,
  });
  const [loading, setLoading] = useState(Boolean(prefill && token));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!prefill || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ email: prefill, token });
        const res = await fetch(`${API_BASE}/unsubscribe/preferences?${params}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error('invalid_token');
        if (cancelled) return;
        // From an unsubscribe link: default to stopping all marketing.
        // Uncheck any category they still want to receive.
        setPrefs({
          outreach: false,
          product_updates: false,
          announcements: false,
        });
        setEmail(prefill);
      } catch {
        if (!cancelled) {
          setError('This link is invalid or expired. You can still email sales@palmtai.com.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefill, token]);

  async function save(next: Prefs, unsubscribeAll = false) {
    setSaving(true);
    setError('');
    try {
      if (!token) {
        throw new Error('Open this page from the unsubscribe link in your email.');
      }
      const params = new URLSearchParams({ email, token });
      const res = await fetch(`${API_BASE}/unsubscribe?${params}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          unsubscribe_all: unsubscribeAll,
          ...next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error === 'invalid_token'
          ? 'This link is invalid or expired.'
          : 'Could not save preferences.');
      }
      const saved = data.preferences || next;
      const stopped: string[] = [];
      if (!saved.outreach) stopped.push('sales outreach');
      if (!saved.product_updates) stopped.push('product tips');
      if (!saved.announcements) stopped.push('announcements');
      setSummary(
        stopped.length === 3
          ? 'You are unsubscribed from all PalmCare marketing email.'
          : stopped.length
            ? `Stopped: ${stopped.join(', ')}.`
            : 'You are still subscribed to all marketing categories.'
      );
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await save(prefs, false);
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Loading preferences</h1>
        <p className="text-slate-600">One moment.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <CheckCircle className="h-7 w-7 text-teal-600" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Preferences saved</h1>
        <p className="mb-2 text-slate-600">
          <span className="font-medium text-slate-800">{email}</span>
        </p>
        <p className="mb-8 text-slate-600">{summary}</p>
        <p className="mb-8 text-sm text-slate-500">
          Password resets, receipts, and other account mail are never turned off here.
        </p>
        <Link href="/" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to palmcareai.com
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app-logo.png" alt="PalmCare AI" width={48} height={48} className="h-full w-full object-cover" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">Email preferences</h1>
      <p className="mb-6 text-slate-600">
        Choose what <span className="font-medium text-slate-800">{email || 'this address'}</span> should
        stop receiving. Account mail stays on.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!token && (
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="you@agency.com"
              autoComplete="email"
            />
          </div>
        )}

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-semibold text-slate-800">Stop sending me</legend>
          {CATEGORIES.map((cat) => {
            const stopped = !prefs[cat.key];
            return (
              <label
                key={cat.key}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition ${
                  stopped
                    ? 'border-teal-200 bg-teal-50/70'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  checked={stopped}
                  onChange={(e) =>
                    setPrefs((prev) => ({
                      ...prev,
                      [cat.key]: !e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{cat.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{cat.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !email || !token}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save preferences
        </button>

        <button
          type="button"
          disabled={saving || !email || !token}
          onClick={() =>
            save(
              { outreach: false, product_updates: false, announcements: false },
              true
            )
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          Unsubscribe from all marketing
        </button>
      </form>

      <p className="mt-6 text-xs text-slate-500">
        Need help? Email{' '}
        <a href="mailto:sales@palmtai.com?subject=Unsubscribe" className="underline">
          sales@palmtai.com
        </a>
        .
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          }
        >
          <UnsubscribeForm />
        </Suspense>
      </div>
    </main>
  );
}
