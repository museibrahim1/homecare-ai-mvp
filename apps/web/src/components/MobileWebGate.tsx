'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Smartphone, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const ALLOWED_PATH_PREFIXES = ['/billing', '/settings'];

interface MobileWebGateProps {
  children: ReactNode;
}

/**
 * Blocks the web CRM for PalmCare Mobile subscribers ($89.99/iPhone plan).
 * They can still open billing and settings; assessments stay on iPhone.
 */
export default function MobileWebGate({ children }: MobileWebGateProps) {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const [mobileOnly, setMobileOnly] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    const allowed = ALLOWED_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
    if (!token || allowed) {
      setMobileOnly(false);
      setChecked(true);
      return;
    }

    let cancelled = false;
    api
      .getUsage(token)
      .then((usage) => {
        if (!cancelled) {
          setMobileOnly(usage.mobile_only === true);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMobileOnly(false);
          setChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, hydrated, pathname]);

  if (!checked) {
    return children;
  }

  if (!mobileOnly) {
    return children;
  }

  return (
    <div className="flex flex-1 items-center justify-center py-16 px-6">
      <div className="glass-card max-w-lg w-full p-10 text-center flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center">
          <Smartphone className="w-7 h-7 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-[#10211F]">Your plan is iPhone-only</h2>
        <p className="text-[#4B6B66] text-sm leading-relaxed">
          PalmCare Mobile includes unlimited assessments on iPhone. Open the PalmCare app to record visits,
          view notes, and send contracts. Upgrade to PalmCare Platform in the app for web CRM, team seats,
          and analytics.
        </p>
        <a
          href="https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988"
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-full text-sm font-semibold transition"
        >
          Open PalmCare on iPhone
          <ArrowRight className="w-4 h-4" />
        </a>
        <Link href="/billing" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          View billing and invoices
        </Link>
      </div>
    </div>
  );
}
