'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Loader2, Sparkles, Zap, FileText, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [countdown, setCountdown] = useState(8);
  const sessionId = searchParams.get('session_id');

  const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('palmcare-auth');

  useEffect(() => {
    if (!hasStoredToken && !isAuthenticated()) {
      router.push('/login');
    }
  }, [hasStoredToken, isAuthenticated, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/billing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  if (!hasStoredToken && !isAuthenticated()) return null;

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Success animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center animate-pulse">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <Sparkles className="w-6 h-6 text-amber-400 absolute top-0 right-1/3 animate-bounce" />
          <Sparkles className="w-5 h-5 text-primary-400 absolute bottom-2 left-1/3 animate-bounce delay-300" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          Payment Successful!
        </h1>
        <p className="text-dark-300 text-lg mb-8">
          Your subscription is now active. Welcome to the next level of home healthcare management.
        </p>

        {/* What's unlocked */}
        <div className="bg-dark-900/50 backdrop-blur border border-dark-800 rounded-2xl p-6 mb-8 text-left">
          <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-4">What&apos;s Unlocked</h3>
          <div className="space-y-3">
            {[
              { icon: Zap, label: 'AI-Powered Assessments', desc: 'Turn conversations into contracts' },
              { icon: FileText, label: 'Automated Proposals', desc: 'Send professional proposals instantly' },
              { icon: Users, label: 'Full Team Access', desc: 'Invite your team and assign roles' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-dark-400 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/billing"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20"
          >
            Go to Billing <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white font-medium rounded-xl transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-dark-500 text-xs mt-6">
          Redirecting to billing in {countdown}s...
        </p>
      </div>
    </div>
  );
}
