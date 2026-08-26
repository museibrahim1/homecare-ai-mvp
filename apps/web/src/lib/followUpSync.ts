// Shared follow-up sync helper.
//
// When a client is moved to the follow_up stage (pipeline or clients board), or
// a follow-up note is saved next to a client, we upsert a matching calendar
// follow-up via the CRM appointments API. When Google Calendar is connected,
// we also mirror the follow-up to Google.

import { api, formatLocalDate } from '@/lib/api';
import { appointmentToApi } from '@/lib/crmAdapters';

const API_BASE = '/api';

export interface FollowUpInput {
  clientId: string;
  clientName: string;
  note?: string;
  /** YYYY-MM-DD. Defaults to one week out when omitted. */
  date?: string;
  time?: string;
  token?: string | null;
  googleConnected?: boolean;
}

/** YYYY-MM-DD one week from today in the local timezone. */
export function defaultFollowUpDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return formatLocalDate(d);
}

/**
 * Create or update the server-backed calendar follow-up for a client.
 * Safe to call from any board; never throws.
 */
export async function upsertFollowUp(input: FollowUpInput): Promise<void> {
  if (typeof window === 'undefined') return;
  const { clientId, clientName, note, token, googleConnected } = input;
  if (!clientId || !token) return;

  const date = input.date || defaultFollowUpDate();
  const time = input.time || '09:00';
  const title = `Follow-up: ${clientName || 'Client'}`;
  const notes = (note || '').trim();

  let googleEventId: string | undefined;
  let existingId: string | undefined;

  try {
    const existing = await api.getAppointments(token, { client_id: clientId, is_follow_up: true });
    if (existing?.length) {
      existingId = existing[0].id;
      googleEventId = existing[0].google_event_id || undefined;
    }
  } catch {
    /* continue with create */
  }

  if (googleConnected && token) {
    try {
      const start = new Date(`${date}T${time}:00`);
      const end = new Date(start.getTime() + 30 * 60000);
      const body = {
        title,
        description: notes,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: '',
      };
      if (googleEventId) {
        await fetch(`${API_BASE}/calendar/events`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ event_id: googleEventId, ...body }),
        });
      } else {
        const res = await fetch(`${API_BASE}/calendar/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const d = await res.json();
          googleEventId = d.event_id;
        }
      }
    } catch {
      /* Google sync is best-effort */
    }
  }

  const payload = appointmentToApi(
    {
      title,
      client: clientName || '',
      date,
      time,
      duration: '30 min',
      location: '',
      type: 'review',
      notes,
      googleEventId,
      clientId,
      isFollowUp: true,
    },
    { clientId, isFollowUp: true }
  );

  try {
    if (existingId) {
      await api.updateAppointment(token, existingId, payload);
    } else {
      await api.createAppointment(token, payload);
    }
  } catch {
    /* best-effort */
  }
}

/** Remove a client's calendar follow-up (best-effort; also clears Google). */
export async function removeFollowUp(
  clientId: string,
  opts?: { token?: string | null; googleConnected?: boolean }
): Promise<void> {
  if (typeof window === 'undefined' || !clientId || !opts?.token) return;

  try {
    const existing = await api.getAppointments(opts.token, { client_id: clientId, is_follow_up: true });
    const row = existing?.[0];
    if (!row) return;

    if (opts.googleConnected && row.google_event_id) {
      try {
        await fetch(`${API_BASE}/calendar/events/${row.google_event_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${opts.token}` },
          credentials: 'include',
        });
      } catch {
        /* best-effort */
      }
    }

    await api.deleteAppointment(opts.token, row.id);
  } catch {
    /* best-effort */
  }
}
