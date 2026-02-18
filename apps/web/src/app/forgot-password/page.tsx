'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mic, ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.detail || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PalmCare AI</h1>
        </div>

        {sent ? (
          /* Success State */
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-dark-300 mb-6">
              If an account exists for <span className="text-white font-medium">{email}</span>, 
              we&apos;ve sent a password reset link. It will expire in 1 hour.
            </p>
            <p className="text-dark-400 text-sm mb-6">
              Don&apos;t see it? Check your spam folder or try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="w-full py-3 px-4 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-colors border border-dark-600"
              >
                Try a different email
              </button>
              <Link
                href="/login"
                className="block w-full py-3 px-4 text-center text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Form State */
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
              <p className="text-dark-300 text-sm">
                Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-200 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark w-full"
                  placeholder="you@company.com"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-primary-400 hover:text-primary-300 text-sm font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
