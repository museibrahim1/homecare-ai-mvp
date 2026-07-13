'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Loader2, AlertCircle, Mail } from 'lucide-react';

const API_BASE = '/api';

type Status = 'verifying' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  // Resend flow (shown when the link is invalid/expired)
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/business/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.detail || 'This verification link is invalid or has expired.');
        }
      } catch {
        if (cancelled) return;
        setStatus('error');
        setMessage('Unable to connect to the server. Please try again in a moment.');
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResending(true);
    try {
      await fetch(`${API_BASE}/auth/business/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.toLowerCase().trim() }),
      });
      // Endpoint always returns success to avoid email enumeration.
      setResent(true);
    } catch {
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden">
            <Image src="/hand-icon-white.png" alt="PalmCare AI" width={36} height={36} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PalmCare AI</h1>
        </div>

        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying your email…</h2>
              <p className="text-slate-600">Hang tight, this only takes a second.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
              <p className="text-slate-600 mb-6">
                Your email address is confirmed. You&apos;re all set to sign in.
              </p>
              <Link href="/login" className="btn-primary inline-flex items-center gap-2">
                Continue to Sign In
              </Link>
            </>
          )}

          {(status === 'error' || status === 'no-token') && (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Link Issue</h2>
              <p className="text-slate-600 mb-6">
                {status === 'no-token'
                  ? 'This page needs a verification link from your email. Enter your email below and we\u2019ll send a fresh one.'
                  : message || 'This verification link is invalid or has expired.'}
              </p>

              {resent ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>If an unverified account exists for that email, a new verification link is on its way.</span>
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-3 text-left">
                  <label htmlFor="resend-email" className="block text-sm font-medium text-slate-700">
                    Resend verification email
                  </label>
                  <input
                    id="resend-email"
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="input-dark w-full"
                    placeholder="you@company.com"
                  />
                  <button
                    type="submit"
                    disabled={resending || !resendEmail}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      'Send New Link'
                    )}
                  </button>
                </form>
              )}

              <div className="mt-6">
                <Link href="/login" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
