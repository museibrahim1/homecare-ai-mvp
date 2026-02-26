'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={36} height={36} className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>PalmCare AI</h1>
          </div>
          <p className="text-lg mt-4" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Turn care assessments into proposal-ready contracts
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Waves className="w-6 h-6" style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#fff' }}>Care Assessment Capture</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Convert intake calls or transcripts into structured assessment signals
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6" style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#fff' }}>Proposal-Ready Contracts</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Generate service contracts faster with AI-assisted drafting and templates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6" style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: '#fff' }}>Human-in-the-Loop Review</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Review, edit, approve, and export contracts (plus notes/billing when needed)
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            © {new Date().getFullYear()} PalmCare AI. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="PalmCare AI" width={36} height={36} className="object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">PalmCare AI</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500">Sign in to generate contracts from care assessments</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-primary-500 hover:text-primary-600 hover:underline">
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
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#fff' }}
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
            <p className="text-slate-400 text-sm">
              New to PalmCare AI?{' '}
              <Link href="/#book-demo" className="text-primary-500 hover:underline font-medium">
                Schedule a demo
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
