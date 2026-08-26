'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  CURRENT_WHATS_NEW_VERSION,
  canShowWhatsNew,
  getCurrentRelease,
  isLoggedInAppRoute,
  markWhatsNewSeen,
} from '@/lib/whatsNew';
import WhatsNewModal from '@/components/WhatsNewModal';

const OPEN_DELAYS_MS = [400, 1200, 2800];

/**
 * Corner "What's New" panel for logged-in desktop web users only.
 * Not used by the iOS app (TestFlight / App Store "What's New" covers that).
 * Shows once per release when there is a new update they have not seen.
 */
export default function WhatsNewPoller() {
  const pathname = usePathname();
  const { token, hydrated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const openedRef = useRef(false);
  const release = getCurrentRelease();

  useEffect(() => {
    if (!hydrated || !release || openedRef.current) return;

    const tryOpen = () => {
      if (openedRef.current) return true;
      if (!canShowWhatsNew(pathname, token)) return false;
      openedRef.current = true;
      setIsOpen(true);
      return true;
    };

    if (tryOpen()) return;

    // Token already present: remaining gates (route, desktop, seen) are sync.
    // Retries only help while auth is still hydrating on an app route.
    if (token || !isLoggedInAppRoute(pathname)) return;

    const timers = OPEN_DELAYS_MS.map((delay) =>
      window.setTimeout(() => {
        tryOpen();
      }, delay),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [hydrated, pathname, token, release]);

  const handleClose = () => {
    markWhatsNewSeen(CURRENT_WHATS_NEW_VERSION);
    setIsOpen(false);
  };

  if (!isOpen || !release) return null;

  return <WhatsNewModal release={release} onClose={handleClose} />;
}
