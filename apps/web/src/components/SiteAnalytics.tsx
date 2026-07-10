'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, trackEvent, initClickTracking, initBeforeUnload } from '@/lib/analytics';
import { captureAttribution, getAttribution } from '@/lib/attribution';

let _initialized = false;

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!_initialized) {
      const isNewSession = captureAttribution();
      if (isNewSession) {
        const attr = getAttribution();
        trackEvent({
          event_type: 'session_start',
          metadata: {
            channel: attr?.last_touch.channel,
            utm_source: attr?.last_touch.utm_source,
            utm_medium: attr?.last_touch.utm_medium,
            utm_campaign: attr?.last_touch.utm_campaign,
            landing_page: attr?.last_touch.landing_page,
            first_touch_channel: attr?.first_touch.channel,
          },
        });
      }
      initClickTracking();
      initBeforeUnload();
      _initialized = true;
    }
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
