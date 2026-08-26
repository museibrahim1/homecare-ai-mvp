/**
 * Browser caches that are NOT keyed by user id.
 * Clearing these on logout prevents one user's agency/CRM data from
 * leaking to the next login on a shared computer.
 */
const SHARED_CLIENT_CACHE_KEYS = [
  'agencySettings',
  'palmcare-schedule',
  'palmcare-tasks',
  'palmcare-care-tracker',
  'palmcare-notifications',
  'palmcare-notif-dismissed',
  'onboarding-dismissed',
] as const;

/** Legacy unscoped keys that may still exist from older builds. */
const SHARED_KEY_PREFIXES = [
  'palmcare-notifications',
  'palmcare-notif-dismissed',
] as const;

export function clearSharedClientCaches(): void {
  if (typeof window === 'undefined') return;

  for (const key of SHARED_CLIENT_CACHE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore quota / private mode */
    }
  }

  // Sweep any remaining unscoped variants (exact prefixes without a user id suffix).
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      for (const prefix of SHARED_KEY_PREFIXES) {
        if (key === prefix) toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
