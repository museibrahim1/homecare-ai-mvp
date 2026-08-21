'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// The standalone Activity Monitor has been retired. Redirect to the dashboard.
export default function ActivityRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center glass-page">
      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
    </div>
  );
}
