'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Mic, Waves, Shield, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser, logout, token } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear any existing session when the login page loads
  // so every sign-in requires fresh credentials.
  // Intentionally using [] — adding token/logout as deps would cause infinite loop.
  useEffect(() => {
    if (token) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(email, password);
      
      // Fetch user data to determine role/permissions
      let userData = null;
      try {
        userData = await api.getMe(response.access_token);
      } catch (userErr) {
      }
      
      // Set token and user data
      setToken(response.access_token);
      if (userData) {
        setUser(userData);
      }
      
      // Small delay to ensure localStorage is updated before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if this is a first-time login for this user (show welcome page)
      const userId = userData?.id || email;
      const hasSeenWelcome = localStorage.getItem(`has-seen-welcome-${userId}`);
      if (!hasSeenWelcome) {
        localStorage.setItem(`has-seen-welcome-${userId}`, 'true');
        router.push('/welcome');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-dark-800 via-dark-900 to-dark-950 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-cyan/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Homecare AI</h1>
          </div>
          <p className="text-dark-300 text-lg mt-4">
            Turn care assessments into proposal-ready contracts
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Waves className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Care Assessment Capture</h3>
              <p className="text-dark-300 text-sm">
                Convert intake calls or transcripts into structured assessment signals
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent-green/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-accent-green" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Proposal-Ready Contracts</h3>
              <p className="text-dark-300 text-sm">
                Generate service contracts faster with AI-assisted drafting and templates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent-purple/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Human-in-the-Loop Review</h3>
              <p className="text-dark-300 text-sm">
                Review, edit, approve, and export contracts (plus notes/billing when needed)
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-dark-400 text-sm">
            © {new Date().getFullYear()} Homecare AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-dark-900">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Homecare AI</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-dark-300">Sign in to generate contracts from care assessments</p>
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
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-dark-200">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark w-full"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>

          </form>

          <div className="mt-8 text-center">
            <p className="text-dark-400 text-sm">
              New to Homecare AI?{' '}
              <Link href="/register" className="text-primary-400 hover:underline font-medium">
                Register your agency
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
