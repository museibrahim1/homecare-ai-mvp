'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Mic } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        router.push('/visits');
      } else {
        router.push('/login');
      }
    }
  }, [token, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
          <Mic className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-dark-300">Loading Homecare AI...</p>
      </div>
    </div>
  );
}
