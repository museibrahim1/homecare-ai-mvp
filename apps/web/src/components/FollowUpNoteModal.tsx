'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Loader2, X } from 'lucide-react';
import { api, formatLocalDate } from '@/lib/api';
import { defaultFollowUpDate, upsertFollowUp } from '@/lib/followUpSync';

export interface FollowUpClient {
  id: string;
  full_name: string;
  status?: string;
  follow_up_note?: string | null;
  follow_up_at?: string | null;
}

/**
 * Compact editor for a client's follow-up note + date. Saving persists the note
 * on the client, moves the client into the follow_up stage, and upserts a
 * matching calendar follow-up so it appears on the Calendar next to visits.
 */
export default function FollowUpNoteModal({
  isOpen,
  onClose,
  client,
  token,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  client: FollowUpClient | null;
  token: string | null;
  onSaved?: () => void;
}) {
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    if (!isOpen || !client) return;
    setNote(client.follow_up_note || '');
    setDate(client.follow_up_at ? client.follow_up_at.slice(0, 10) : '');
    setError(null);
  }, [isOpen, client]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/calendar/status', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok && active) {
          const d = await res.json();
          setGoogleConnected(!!d.connected);
        }
      } catch {
        /* status is optional */
      }
    })();
    return () => { active = false; };
  }, [isOpen, token]);

  if (!isOpen || !client) return null;

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      // Match calendar default: blank date means one week out, and that same
      // date must be stored on the client so reloads stay in sync.
      const resolvedDate = date || defaultFollowUpDate();
      const followUpAt = new Date(`${resolvedDate}T09:00:00`).toISOString();
      await api.updateClient(token, client.id, {
        follow_up_note: note.trim() || null,
        follow_up_at: followUpAt,
        status: 'follow_up',
      });
      await upsertFollowUp({
        clientId: client.id,
        clientName: client.full_name,
        note: note.trim(),
        date: resolvedDate,
        token,
        googleConnected,
      });
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Could not save the follow-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-semibold text-slate-900">Follow-up</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-500">
            Add a follow-up note for <span className="font-medium text-slate-800">{client.full_name}</span>. Saving adds it to the Calendar.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Follow-up date</label>
            <input
              type="date"
              value={date}
              min={formatLocalDate(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-400 mt-1">Leave blank to schedule one week out.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What needs following up on?"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
          {googleConnected && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
              Will also sync to Google Calendar
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 disabled:bg-slate-100 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save follow-up'}
          </button>
        </div>
      </div>
    </div>
  );
}
