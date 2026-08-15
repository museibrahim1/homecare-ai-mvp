'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const { token, setUser } = useAuth();
  const [agencyName, setAgencyName] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/login');
      return;
    }
    if (!consent) {
      setError('You must accept the Terms, Privacy Policy, and AI data processing notice.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.completeOnboarding(token, agencyName, true);
      try {
        const me = await api.getMe(token);
        setUser(me);
      } catch {
        /* ignore */
      }
      router.push('/welcome');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not finish setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Set up your agency</h1>
          <p className="text-slate-500 mt-2 text-sm">
            One more step before you start documenting visits.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Agency name</label>
          <input
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg"
            placeholder="e.g. Sunrise Home Care"
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="text-primary-600 underline">
              Terms of Service
            </Link>
            ,{' '}
            <Link href="/privacy" className="text-primary-600 underline">
              Privacy Policy
            </Link>
            , and AI data processing notice.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-500 text-white font-medium rounded-lg disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
