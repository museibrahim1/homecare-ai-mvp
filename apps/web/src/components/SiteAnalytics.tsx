'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { trackPageView, trackEvent, initClickTracking, initBeforeUnload } from '@/lib/analytics';
import { captureAttribution, getAttribution } from '@/lib/attribution';

let _initialized = false;
let _posthogInitialized = false;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!_posthogInitialized && POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true,
        capture_pageview: false, // We emit pageviews manually on route changes.
        person_profiles: 'identified_only',
      });
      _posthogInitialized = true;
    }

    if (!_initialized) {
      const isNewSession = captureAttribution();
      if (isNewSession) {
        const attr = getAttribution();
        const payload = {
          channel: attr?.last_touch.channel,
          utm_source: attr?.last_touch.utm_source,
          utm_medium: attr?.last_touch.utm_medium,
          utm_campaign: attr?.last_touch.utm_campaign,
          landing_page: attr?.last_touch.landing_page,
          first_touch_channel: attr?.first_touch.channel,
        };
        trackEvent({
          event_type: 'session_start',
          metadata: payload,
        });
        if (_posthogInitialized) posthog.capture('session_start', payload);
      }
      initClickTracking();
      initBeforeUnload();
      _initialized = true;
    }
  }, []);

  useEffect(() => {
    trackPageView(pathname);
    if (_posthogInitialized) {
      posthog.capture('$pageview', {
        pathname,
        current_url: window.location.href,
      });
    }
  }, [pathname]);

  return null;
}
