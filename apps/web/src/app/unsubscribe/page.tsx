'use client';

import { FormEvent, useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, Mail } from 'lucide-react';

const FORMSPREE_CONTACT_ID = process.env.NEXT_PUBLIC_FORMSPREE_CONTACT_ID || '';

// Same-origin proxy to the backend (see next.config rewrites: /api/* -> API).
const UNSUBSCRIBE_ENDPOINT = '/api/platform/sales/leads/unsubscribe';

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Directly opt the recipient out via the backend using the signed token from
  // the email link. This is the real unsubscribe — no manual email needed.
  const unsubscribeViaApi = useCallback(
    async (addr: string, tok: string): Promise<boolean> => {
      const params = new URLSearchParams({ email: addr, token: tok });
      const response = await fetch(`${UNSUBSCRIBE_ENDPOINT}?${params.toString()}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'unsubscribe_failed');
      }
      return true;
    },
    []
  );

  // When arriving from an email link (email + signed token present), complete
  // the unsubscribe automatically. Link scanners don't run JS, so this only
  // fires for real recipients.
  useEffect(() => {
    if (!prefill || !token || done) return;
    let cancelled = false;
    setLoading(true);
    unsubscribeViaApi(prefill, token)
      .then(() => {
        if (!cancelled) setDone(true);
      })
      .catch(() => {
        // Fall back to the manual form (e.g. token expired).
        if (!cancelled) setError('');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Preferred path: signed token → real one-click unsubscribe on the backend.
      if (token) {
        try {
          await unsubscribeViaApi(email, token);
          setDone(true);
          return;
        } catch {
          // Token invalid/expired — fall through to the contact-form path.
        }
      }

      if (!FORMSPREE_CONTACT_ID) {
        // Fallback when Formspree isn't configured: open a prefilled mailto.
        window.location.href = `mailto:sales@palmtai.com?subject=${encodeURIComponent(
          'Unsubscribe request'
        )}&body=${encodeURIComponent(`Please unsubscribe: ${email}`)}`;
        setDone(true);
        return;
      }

      const response = await fetch(`https://formspree.io/f/${FORMSPREE_CONTACT_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email,
          inquiry_type: 'unsubscribe',
          message: `Please remove ${email} from PalmCare AI marketing emails.`,
          _subject: `[UNSUBSCRIBE] ${email}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit. Email sales@palmtai.com instead.');
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !done && prefill && token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Unsubscribing…</h1>
        <p className="text-slate-600">One moment while we remove you from marketing emails.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <CheckCircle className="h-7 w-7 text-teal-600" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">You&apos;re unsubscribed</h1>
        <p className="mb-8 text-slate-600">
          <span className="font-medium text-slate-800">{email}</span> won&apos;t receive any more
          marketing emails from PalmCare AI. Transactional account mail (password resets,
          receipts) is unaffected.
        </p>
        <Link href="/" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          Back to palmcareai.com
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
        <Mail className="h-6 w-6 text-teal-700" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Unsubscribe</h1>
      <p className="mb-6 text-slate-600">
        Enter the email address you want removed from PalmCare AI marketing messages.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Unsubscribe
        </button>
      </form>
      <p className="mt-6 text-xs text-slate-500">
        Or email{' '}
        <a href="mailto:sales@palmtai.com?subject=Unsubscribe" className="underline">
          sales@palmtai.com
        </a>{' '}
        with the word Unsubscribe.
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </main>
  );
}
