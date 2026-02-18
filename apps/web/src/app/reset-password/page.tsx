'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mic, Lock, CheckCircle, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Redirect if no token
  useEffect(() => {
    if (!resetToken) {
      setError('No reset token found. Please request a new password reset link.');
    }
  }, [resetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          new_password: password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(data.detail || 'Failed to reset password. Please try again.');
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

        {success ? (
          /* Success State */
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
            <p className="text-dark-300 mb-6">
              Your password has been updated successfully. 
              You&apos;ll be redirected to sign in momentarily.
            </p>
            <Link
              href="/login"
              className="btn-primary inline-flex items-center gap-2"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          /* Form State */
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Set New Password</h2>
              <p className="text-dark-300 text-sm">
                Enter your new password below. Make sure it&apos;s at least 6 characters.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark-200 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-dark w-full pr-12"
                    placeholder="At least 6 characters"
                    autoFocus
                    disabled={!resetToken}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="text-amber-400 text-xs mt-1">Password must be at least 6 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-dark-200 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Re-enter your password"
                  disabled={!resetToken}
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !resetToken || password.length < 6 || password !== confirmPassword}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/forgot-password"
                className="text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                Request a new reset link
              </Link>
              <span className="text-dark-600 mx-2">|</span>
              <Link
                href="/login"
                className="text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
