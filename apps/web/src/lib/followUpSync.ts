// Shared follow-up sync helper.
//
// When a client is moved to the follow_up stage (pipeline or clients board), or
// a follow-up note is saved next to a client, we upsert a matching calendar
// follow-up so Visits + Calendar stay in sync. The Calendar page (`/schedule`)
// reads the same local appointment store, so follow-ups appear there next to
// visits. When Google Calendar is connected for the user, we also mirror the
// follow-up to Google via the existing calendar events API.

import { formatLocalDate } from '@/lib/api';

const API_BASE = '/api';
const STORAGE_KEY = 'palmcare-schedule';

// Mirrors the Appointment shape used by apps/web/src/app/schedule/page.tsx.
type AppointmentType = 'assessment' | 'review' | 'meeting' | 'visit';
interface Appointment {
  id: string;
  title: string;
  client: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: string;
  location: string;
  type: AppointmentType;
  notes: string;
  googleEventId?: string;
}

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

function loadAppointments(): Appointment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Appointment[]) : [];
  } catch {
    return [];
  }
}

function saveAppointments(apts: Appointment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apts));
  } catch {
    /* storage full or unavailable — nothing else to do */
  }
}

/** Stable id so repeated saves update the same calendar follow-up. */
function followUpId(clientId: string): string {
  return `followup-${clientId}`;
}

function defaultFollowUpDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return formatLocalDate(d);
}

/**
 * Create or update the calendar follow-up for a client. Writes to the local
 * appointment store the Calendar page reads, and mirrors to Google Calendar
 * when connected. Safe to call from any board; never throws.
 */
export async function upsertFollowUp(input: FollowUpInput): Promise<void> {
  if (typeof window === 'undefined') return;
  const { clientId, clientName, note, token, googleConnected } = input;
  if (!clientId) return;

  const date = input.date || defaultFollowUpDate();
  const time = input.time || '09:00';
  const id = followUpId(clientId);
  const title = `Follow-up: ${clientName || 'Client'}`;
  const notes = (note || '').trim();

  const appointments = loadAppointments();
  const existing = appointments.find((a) => a.id === id);

  const appointment: Appointment = {
    id,
    title,
    client: clientName || '',
    date,
    time,
    duration: '30 min',
    location: '',
    type: 'review',
    notes,
    googleEventId: existing?.googleEventId,
  };

  // Mirror to Google Calendar when connected (platform-admin calendars today).
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
      if (appointment.googleEventId) {
        await fetch(`${API_BASE}/calendar/events`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ event_id: appointment.googleEventId, ...body }),
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
          appointment.googleEventId = d.event_id;
        }
      }
    } catch {
      /* Google sync is best-effort; the local follow-up still persists */
    }
  }

  const next = existing
    ? appointments.map((a) => (a.id === id ? appointment : a))
    : [...appointments, appointment];
  saveAppointments(next);
}

/** Remove a client's calendar follow-up (best-effort; also clears Google). */
export async function removeFollowUp(
  clientId: string,
  opts?: { token?: string | null; googleConnected?: boolean }
): Promise<void> {
  if (typeof window === 'undefined' || !clientId) return;
  const id = followUpId(clientId);
  const appointments = loadAppointments();
  const existing = appointments.find((a) => a.id === id);
  if (!existing) return;

  if (opts?.googleConnected && opts.token && existing.googleEventId) {
    try {
      await fetch(`${API_BASE}/calendar/events/${existing.googleEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${opts.token}` },
        credentials: 'include',
      });
    } catch {
      /* best-effort */
    }
  }

  saveAppointments(appointments.filter((a) => a.id !== id));
}
