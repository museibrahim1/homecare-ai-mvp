'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, initClickTracking, initBeforeUnload } from '@/lib/analytics';

let _initialized = false;

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!_initialized) {
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
