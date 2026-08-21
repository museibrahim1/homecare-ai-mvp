'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import PalmOrb from '@/components/glass/PalmOrb';
import WaveField from '@/components/glass/WaveField';
import SocialAuthButtons from '@/components/SocialAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser, logout, token } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(email, password);
      let userData = null;
      try {
        userData = await api.getMe(response.access_token);
      } catch {
        /* optional */
      }

      setToken(response.access_token);
      if (userData) setUser(userData);

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[minmax(280px,520px)_1fr] relative overflow-hidden bg-[#E7F1EF] antialiased">
      {/* Left brand panel — dark teal */}
      <div
        className="flex flex-col justify-between p-8 sm:p-10 xl:p-14 relative overflow-hidden min-h-[280px] md:min-h-screen"
        style={{ backgroundColor: '#071412' }}
      >
        <WaveField dark className="opacity-90" />
        <Link href="/" className="relative z-10 flex items-center gap-3 hover:opacity-90 transition-opacity">
          <PalmOrb size={36} />
          <span className="text-[18px] tracking-[0.02em] font-bold text-white">PALM</span>
        </Link>

        <div className="relative z-10 flex flex-col gap-6 md:gap-9 max-w-[448px] py-6 md:py-0">
          <PalmOrb size={160} className="hidden md:block shrink-0 w-[160px] h-[160px] xl:w-[220px] xl:h-[220px]" />
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-baseline flex-wrap">
              <span className="text-[40px] md:text-[48px] xl:text-[56px] leading-none tracking-tight font-extrabold text-white">
                Palm&nbsp;
              </span>
              <span className="text-[40px] md:text-[48px] xl:text-[56px] leading-none tracking-tight font-extrabold text-[#2DD4BF]">
                It.
              </span>
            </div>
            <p className="text-[16px] md:text-[18px] leading-7 text-white/68 max-w-[380px]">
              Welcome back. Pick up where you left off.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-[13px] font-medium text-white/40">
          Home care documentation
        </p>
      </div>

      {/* Right form — frosted glass card */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8 relative min-h-screen">
        <WaveField className="opacity-40 md:hidden" />
        <div className="relative z-10 w-full max-w-[440px] flex flex-col gap-6 p-8 sm:p-10 rounded-[24px] bg-[#FFFFFFB8] border border-[#FFFFFFE6] shadow-[0_30px_70px_#115E5924] backdrop-blur-xl">
          <div className="flex flex-col items-start gap-[18px]">
            <PalmOrb size={56} />
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[30px] tracking-[-0.02em] font-bold leading-9 text-[#0F172A]">
                Sign in
              </h1>
              <p className="text-[15px] leading-[18px] text-[#64748B]">
                Pick up where you left off.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <SocialAuthButtons onError={setError} />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-[13px] leading-4 tracking-[0.02em] font-semibold text-[#475569]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[52px] w-full px-4 rounded-xl bg-white border border-[#D3E2DF] text-[15px] font-medium text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                placeholder="you@agency.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-[13px] leading-4 tracking-[0.02em] font-semibold text-[#475569]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[52px] w-full px-4 pr-12 rounded-xl bg-white border border-[#D3E2DF] text-[15px] font-medium text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-[54px] w-full rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-base font-bold shadow-[0_12px_26px_#0D948852] transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex justify-center">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#64748B] hover:text-primary-600"
            >
              Forgot password
            </Link>
          </div>

          <div className="h-px w-full bg-[#D3E2DF]" />

          <p className="text-center text-sm text-[#64748B]">
            New here?{' '}
            <Link href="/register" className="font-semibold text-primary-500 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
