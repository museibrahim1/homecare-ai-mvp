'use client';

import { FormEvent, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, Mail } from 'lucide-react';

const FORMSPREE_CONTACT_ID = process.env.NEXT_PUBLIC_FORMSPREE_CONTACT_ID || '';

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const prefill = searchParams.get('email') || '';

  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
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

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
          <CheckCircle className="h-7 w-7 text-teal-600" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">You&apos;re unsubscribed</h1>
        <p className="mb-8 text-slate-600">
          We&apos;ll remove <span className="font-medium text-slate-800">{email}</span> from
          marketing emails within one business day. Transactional account mail (password
          resets, receipts) is unaffected.
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
