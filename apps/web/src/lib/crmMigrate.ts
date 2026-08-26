import { api } from '@/lib/api';

const LEADS_KEY_PREFIX = 'palmcare_leads_';

let migratePromise: Promise<void> | null = null;

/**
 * One-time import of browser localStorage CRM data into the server.
 * Only migrates keys that are already scoped to this user id.
 * Unscoped keys (schedule / care-tracker) are never imported — they can
 * belong to a previous login on a shared device.
 */
export async function migrateLocalCrmToServer(token: string, userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const flag = `palm_crm_migrated_${userId}`;
  if (localStorage.getItem(flag) === '1') return;

  if (migratePromise) return migratePromise;

  migratePromise = (async () => {
    const leadsRaw = localStorage.getItem(`${LEADS_KEY_PREFIX}${userId}`);

    const payload: {
      leads?: unknown[];
    } = {};

    if (leadsRaw) {
      try {
        payload.leads = JSON.parse(leadsRaw);
      } catch {
        /* ignore */
      }
    }

    if (payload.leads?.length) {
      await api.migrateLocalCrm(token, payload);
    }

    localStorage.setItem(flag, '1');
    if (leadsRaw) localStorage.removeItem(`${LEADS_KEY_PREFIX}${userId}`);
    // Drop any leftover unscoped CRM caches from older app versions.
    localStorage.removeItem('palmcare-care-tracker');
    localStorage.removeItem('palmcare-schedule');
    localStorage.removeItem('palmcare-tasks');
    localStorage.removeItem('agencySettings');
  })();

  return migratePromise;
}
