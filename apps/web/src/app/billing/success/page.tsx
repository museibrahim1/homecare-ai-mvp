'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function BillingSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const target = sessionId
      ? `/billing?checkout=success&session_id=${encodeURIComponent(sessionId)}`
      : '/billing?checkout=success';
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-600 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        Payment received. Opening billing…
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
        </div>
      }
    >
      <BillingSuccessInner />
    </Suspense>
  );
}
