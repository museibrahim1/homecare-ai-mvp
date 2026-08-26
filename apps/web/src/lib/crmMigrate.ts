import { api } from '@/lib/api';

const LEADS_KEY_PREFIX = 'palmcare_leads_';
const CARE_TRACKER_KEY = 'palmcare-care-tracker';
const SCHEDULE_KEY = 'palmcare-schedule';

let migratePromise: Promise<void> | null = null;

/** One-time import of browser localStorage CRM data into the server. */
export async function migrateLocalCrmToServer(token: string, userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const flag = `palm_crm_migrated_${userId}`;
  if (localStorage.getItem(flag) === '1') return;

  if (migratePromise) return migratePromise;

  migratePromise = (async () => {
    const leadsRaw = localStorage.getItem(`${LEADS_KEY_PREFIX}${userId}`);
    const careRaw = localStorage.getItem(CARE_TRACKER_KEY);
    const scheduleRaw = localStorage.getItem(SCHEDULE_KEY);

    const payload: {
      leads?: unknown[];
      care_tracker?: unknown[];
      appointments?: unknown[];
    } = {};

    if (leadsRaw) {
      try {
        payload.leads = JSON.parse(leadsRaw);
      } catch {
        /* ignore */
      }
    }
    if (careRaw) {
      try {
        payload.care_tracker = JSON.parse(careRaw);
      } catch {
        /* ignore */
      }
    }
    if (scheduleRaw) {
      try {
        const apts = JSON.parse(scheduleRaw) as Array<Record<string, unknown>>;
        payload.appointments = apts
          .filter((a) => !String(a.id || '').startsWith('followup-'))
          .map((a) => ({
            id: a.id,
            title: a.title,
            client: a.client,
            date: a.date,
            time: a.time,
            duration: parseInt(String(a.duration || '60'), 10) || 60,
            location: a.location,
            type: a.type,
            notes: a.notes,
            googleEventId: a.googleEventId,
          }));
      } catch {
        /* ignore */
      }
    }

    if (payload.leads?.length || payload.care_tracker?.length || payload.appointments?.length) {
      await api.migrateLocalCrm(token, payload);
    }

    localStorage.setItem(flag, '1');
    if (leadsRaw) localStorage.removeItem(`${LEADS_KEY_PREFIX}${userId}`);
    if (careRaw) localStorage.removeItem(CARE_TRACKER_KEY);
    // Keep schedule key until follow-ups are fully server-backed; partial data may remain.
  })();

  return migratePromise;
}
