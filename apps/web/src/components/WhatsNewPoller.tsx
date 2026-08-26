'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  CURRENT_WHATS_NEW_VERSION,
  canShowWhatsNew,
  getCurrentRelease,
  markWhatsNewSeen,
} from '@/lib/whatsNew';
import WhatsNewModal from '@/components/WhatsNewModal';

/**
 * Corner "What's New" panel for logged-in app users only.
 * Shows once per release when there is a new update they have not seen.
 */
export default function WhatsNewPoller() {
  const pathname = usePathname();
  const { token, user, hydrated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const release = getCurrentRelease();

  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    if (!hydrated || !release) {
      setIsOpen(false);
      return;
    }

    if (!canShowWhatsNew(pathname, isAuthenticated)) {
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      if (canShowWhatsNew(pathname, isAuthenticated)) {
        setIsOpen(true);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [hydrated, pathname, isAuthenticated, release]);

  const handleClose = () => {
    markWhatsNewSeen(CURRENT_WHATS_NEW_VERSION);
    setIsOpen(false);
  };

  if (!isOpen || !release) return null;

  return <WhatsNewModal release={release} onClose={handleClose} />;
}
