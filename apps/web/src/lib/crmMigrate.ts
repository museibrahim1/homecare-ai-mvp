import { api } from '@/lib/api';

const LEADS_KEY_PREFIX = 'palmcare_leads_';

let migratePromise: Promise<void> | null = null;

/**
 * One-time import of browser localStorage CRM data into the server.
 * Only migrates keys that are already scoped to this user id.
 * Unscoped keys (schedule / care-tracker) are never imported — they can
 * belong to a previous login on a shared device.
 *
 * Best effort: a failed import must never stop the caller from loading the
 * CRM data that is already on the server. The local copy is left in place so
 * a later visit can retry it.
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
      try {
        await api.migrateLocalCrm(token, payload);
      } catch (error) {
        console.warn('Local CRM import skipped:', error);
        // Retry on the next mount instead of pinning the rejection here,
        // where every later caller would await the same failure.
        migratePromise = null;
        return;
      }
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
