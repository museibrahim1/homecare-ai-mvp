'use client';

/**
 * /app — attribution hop before the App Store.
 *
 * Social captions and emails link here (not straight to apps.apple.com) so
 * GA4 can attribute the session and fire `app_store_click`. Short paths
 * like /a/meta redirect here with UTMs already set.
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { trackAppStoreClick } from '@/lib/ga';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988';

function AppRedirectInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const source = searchParams.get('utm_source') || 'direct';
    const medium = searchParams.get('utm_medium') || 'referral';
    const campaign = searchParams.get('utm_campaign') || 'app_download';
    const content = searchParams.get('utm_content') || undefined;

    trackAppStoreClick('app_hop', {
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      utm_content: content,
    });

    // Give the tag a beat to flush, then send the user to the App Store.
    const t = window.setTimeout(() => {
      window.location.replace(APP_STORE_URL);
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center max-w-sm">
        <p className="text-sm font-semibold tracking-wide text-teal-700 mb-2">PALM</p>
        <h1 className="text-xl font-semibold text-slate-900 mb-3">Opening the App Store…</h1>
        <p className="text-sm text-slate-600 mb-6">
          If nothing happens, tap the button below.
        </p>
        <a
          href={APP_STORE_URL}
          className="inline-block rounded-xl bg-teal-600 px-5 py-3 text-white font-semibold text-sm hover:bg-teal-700"
          onClick={() => trackAppStoreClick('app_hop_fallback')}
        >
          Download PALM on the App Store
        </a>
      </div>
    </main>
  );
}

export default function AppRedirectPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-600">Opening the App Store…</p>
        </main>
      }
    >
      <AppRedirectInner />
    </Suspense>
  );
}
