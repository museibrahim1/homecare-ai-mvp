'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import GlassShell from '@/components/GlassShell';
import {
  CalendarDays, Plus, Clock, MapPin, User, X, Link2, Check, Loader2,
  Pencil, Trash2, AlertCircle, ChevronLeft, ChevronRight, Calendar,
  LayoutGrid, List, Sun, Users, FileText, Video
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatLocalDate } from '@/lib/api';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, isBefore, parseISO } from 'date-fns';

/* ─── Types ─── */
type AppointmentType = 'assessment' | 'review' | 'meeting' | 'visit';

type Appointment = {
  id: string;
  title: string;
  client: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  duration: string;
  location: string;
  type: AppointmentType;
  notes: string;
  googleEventId?: string;
};

/* ─── Config ─── */
const TYPE_CONFIG: Record<AppointmentType, { color: string; bg: string; border: string; label: string; icon: typeof Calendar }> = {
  assessment: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-l-blue-500', label: 'Assessment', icon: FileText },
  review:     { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-green-500', label: 'Care Review', icon: Users },
  meeting:    { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-l-purple-500', label: 'Meeting', icon: Video },
  visit:      { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-l-orange-500', label: 'Home Visit', icon: MapPin },
};

/* Paper agenda uses solid left color bars per appointment type */
const TYPE_BAR: Record<AppointmentType, string> = {
  assessment: '#3B82F6',
  review: '#10B981',
  meeting: '#8B5CF6',
  visit: '#F59E0B',
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm
const DURATION_OPTIONS = ['30 min', '45 min', '1 hour', '1.5 hours', '2 hours'];

const API_URL = '/api';
const STORAGE_KEY = 'palmcare-schedule';

/* ─── Persistence ─── */
function loadAppointments(): Appointment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAppointments(apts: Appointment[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apts));
}

function getDurationMinutes(d: string): number {
  if (d.includes('2')) return 120;
  if (d.includes('1.5')) return 90;
  if (d.includes('45')) return 45;
  if (d.includes('30')) return 30;
  return 60;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* ─── OAuth Handler ─── */
function OAuthHandler({ token, onConnected, onError }: { token: string | null; onConnected: () => void; onError: (msg: string) => void }) {
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    if (error) { onError('Failed to connect Google Calendar: ' + error); window.history.replaceState({}, '', '/schedule'); return; }
    // No session (expired during OAuth): still scrub the one-time code from
    // the address bar/history rather than leaving it to linger.
    if (code && !token) { window.history.replaceState({}, '', '/schedule'); return; }
    if (code && token && !processing) {
      setProcessing(true);
      (async () => {
        try {
          const res = await fetch(`${API_URL}/calendar/connect`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/schedule` }),
          });
          if (res.ok) onConnected();
          else { const d = await res.json(); onError('Failed: ' + (d.detail || 'Unknown error')); }
        } catch { onError('Failed to connect Google Calendar'); }
        window.history.replaceState({}, '', '/schedule');
        setProcessing(false);
      })();
    }
  }, [searchParams, token, onConnected, processing, onError]);

  if (processing) return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-500/20 rounded-xl flex items-center gap-3">
      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      <span className="text-blue-600 text-sm">Connecting to Google Calendar...</span>
    </div>
  );
  return null;
}

/* ─── Appointment Form (shared between Add & Edit) ─── */
function AppointmentForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  loading,
  googleConnected,
  isEdit,
}: {
  data: Omit<Appointment, 'id'>;
  onChange: (d: Omit<Appointment, 'id'>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  loading: boolean;
  googleConnected: boolean;
  isEdit: boolean;
}) {
  const INPUT = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Appointment' : 'New Appointment'}</h2>
          <button onClick={onCancel} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Title *</label>
              <input type="text" value={data.title} onChange={e => onChange({ ...data, title: e.target.value })} placeholder="e.g., Initial Assessment" className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Client *</label>
              <input type="text" value={data.client} onChange={e => onChange({ ...data, client: e.target.value })} placeholder="Client name" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label>
              <input type="date" value={data.date} onChange={e => onChange({ ...data, date: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Time</label>
              <input type="time" value={data.time} onChange={e => onChange({ ...data, time: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Duration</label>
              <select value={data.duration} onChange={e => onChange({ ...data, duration: e.target.value })} className={INPUT}>
                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
              <select value={data.type} onChange={e => onChange({ ...data, type: e.target.value as AppointmentType })} className={INPUT}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
              <input type="text" value={data.location} onChange={e => onChange({ ...data, location: e.target.value })} placeholder="Address or 'Virtual'" className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
              <textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} placeholder="Additional notes..." rows={2} className={`${INPUT} resize-none`} />
            </div>
          </div>
          {googleConnected && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
              <Check className="w-3.5 h-3.5" />
              {isEdit ? 'Changes will sync to Google Calendar' : 'Will sync to Google Calendar'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={onSubmit} disabled={loading || !data.title.trim() || !data.client.trim()} className="flex-1 px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 disabled:bg-slate-100 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Day Timeline View ─── */
function DayTimeline({
  appointments,
  onEdit,
  onDelete,
  onAddAtTime,
  deleting,
}: {
  appointments: Appointment[];
  onEdit: (a: Appointment) => void;
  onDelete: (a: Appointment) => void;
  onAddAtTime: (time: string) => void;
  deleting: string | null;
}) {
  return (
    <div className="relative">
      {HOURS.map((hour) => {
        const hourApts = appointments.filter(a => {
          const startMin = timeToMinutes(a.time);
          const endMin = startMin + getDurationMinutes(a.duration);
          return startMin < (hour + 1) * 60 && endMin > hour * 60;
        });
        const isNowHour = new Date().getHours() === hour;

        return (
          <div
            key={hour}
            className="flex min-h-[64px] group/row"
          >
            {/* Time label */}
            <div className="w-16 lg:w-20 shrink-0 pr-3 pt-0 text-right">
              <span className={`text-xs ${isNowHour ? 'text-primary-400 font-semibold' : 'text-slate-400'}`}>
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </span>
            </div>

            {/* Time slot */}
            <div
              className="flex-1 border-t border-slate-200/40 relative cursor-pointer hover:bg-slate-50/10 transition-colors min-h-[64px]"
              onClick={() => onAddAtTime(minutesToTime(hour * 60))}
            >
              {/* Now indicator */}
              {isNowHour && (
                <div className="absolute left-0 right-0 border-t-2 border-red-400 z-10" style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}>
                  <div className="w-2 h-2 bg-red-400 rounded-full -mt-1 -ml-1" />
                </div>
              )}

              {/* Appointments in this slot */}
              <div className="absolute inset-0 py-0.5 px-1">
                {hourApts.filter(a => {
                  const startHour = Math.floor(timeToMinutes(a.time) / 60);
                  return startHour === hour;
                }).map(apt => {
                  const cfg = TYPE_CONFIG[apt.type];
                  const startMin = timeToMinutes(apt.time);
                  const durMin = getDurationMinutes(apt.duration);
                  const topPct = ((startMin % 60) / 60) * 100;
                  const heightPx = Math.max((durMin / 60) * 64, 28);

                  return (
                    <div
                      key={apt.id}
                      onClick={(e) => { e.stopPropagation(); onEdit(apt); }}
                      className={`absolute left-1 right-1 rounded-lg border-l-[3px] ${cfg.border} ${cfg.bg} px-2.5 py-1.5 cursor-pointer hover:ring-1 hover:ring-primary-500/40 transition-all group/apt overflow-hidden z-10`}
                      style={{ top: `${topPct}%`, height: `${heightPx}px` }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate leading-tight">{apt.title}</p>
                          <p className="text-[10px] text-slate-500 truncate">{apt.client} &middot; {formatTime12(apt.time)}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(apt); }}
                          className="p-0.5 text-slate-300 hover:text-red-600 opacity-0 group-hover/apt:opacity-100 transition-all shrink-0"
                        >
                          {deleting === apt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                      {heightPx > 40 && apt.location && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />{apt.location}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hover add indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[10px] text-slate-400">+ Add</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Week View ─── */
function WeekView({
  weekStart,
  appointments,
  onSelectDate,
  selectedDate,
}: {
  weekStart: Date;
  appointments: Appointment[];
  onSelectDate: (d: Date) => void;
  selectedDate: Date;
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-px bg-slate-50/30 rounded-xl overflow-hidden border border-slate-200">
      {/* Day headers */}
      {weekDays.map((day) => {
        const dayStr = formatLocalDate(day);
        const dayApts = appointments.filter(a => a.date === dayStr);
        const isSelected = isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <div
            key={dayStr}
            onClick={() => onSelectDate(day)}
            className={`bg-white/80 p-2 lg:p-3 cursor-pointer hover:bg-slate-100 transition-colors min-h-[140px] ${
              isSelected ? 'ring-1 ring-primary-500/40 bg-primary-500/5' : ''
            }`}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase">{format(day, 'EEE')}</span>
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                  today ? 'bg-primary-500 text-white' : isSelected ? 'text-primary-400' : 'text-slate-800'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
              {dayApts.length > 0 && (
                <span className="text-[10px] text-slate-400">{dayApts.length}</span>
              )}
            </div>

            {/* Appointments */}
            <div className="space-y-1">
              {dayApts.slice(0, 3).map(apt => {
                const cfg = TYPE_CONFIG[apt.type];
                return (
                  <div key={apt.id} className={`px-1.5 py-1 rounded text-[10px] ${cfg.bg} ${cfg.color} truncate`}>
                    <span className="font-medium">{apt.time.slice(0, 5)}</span> {apt.title}
                  </div>
                );
              })}
              {dayApts.length > 3 && (
                <p className="text-[10px] text-slate-400 pl-1">+{dayApts.length - 3} more</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Schedule Content ─── */
function ScheduleContent() {
  const { token, user } = useAuth();
  const isPlatformAdmin = user?.role === 'admin' && (user?.email || '').endsWith('@palmtai.com');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emptyForm = useCallback(() => ({
    title: '', client: '', date: formatLocalDate(selectedDate), time: '09:00',
    duration: '1 hour', location: '', type: 'assessment' as AppointmentType, notes: '',
  }), [selectedDate]);

  const [formData, setFormData] = useState<Omit<Appointment, 'id'>>(emptyForm());

  // Load from localStorage
  useEffect(() => { setAppointments(loadAppointments()); }, []);

  const persist = useCallback((updated: Appointment[]) => {
    setAppointments(updated);
    saveAppointments(updated);
  }, []);

  // Google status check
  useEffect(() => {
    if (!token) { setCheckingStatus(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/calendar/status`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { const d = await res.json(); setGoogleConnected(d.connected); }
      } catch {}
      setCheckingStatus(false);
    })();
  }, [token]);

  // Sync from Google on connect
  useEffect(() => {
    if (googleConnected && token && !checkingStatus) handleSyncNow();
  }, [googleConnected, checkingStatus]);

  /* ─── Computed data ─── */
  const dateStr = formatLocalDate(selectedDate);
  const todayApts = useMemo(() =>
    appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, dateStr]
  );

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  const weekApts = useMemo(() => {
    const ws = formatLocalDate(weekStart);
    const we = formatLocalDate(weekEnd);
    return appointments.filter(a => a.date >= ws && a.date <= we);
  }, [appointments, weekStart, weekEnd]);

  const todayTotal = useMemo(() => appointments.filter(a => a.date === formatLocalDate(new Date())).length, [appointments]);
  const weekTotal = useMemo(() => {
    const ws = formatLocalDate(startOfWeek(new Date(), { weekStartsOn: 0 }));
    const we = formatLocalDate(endOfWeek(new Date(), { weekStartsOn: 0 }));
    return appointments.filter(a => a.date >= ws && a.date <= we).length;
  }, [appointments]);
  const upcomingCount = useMemo(() => {
    const today = formatLocalDate(new Date());
    return appointments.filter(a => a.date >= today).length;
  }, [appointments]);

  /* ─── CRUD handlers ─── */
  const handleAdd = async () => {
    const apt: Appointment = { id: Date.now().toString(), ...formData };
    if (googleConnected && token) {
      setSyncing(true);
      try {
        const start = new Date(`${formData.date}T${formData.time}:00`);
        const end = new Date(start.getTime() + getDurationMinutes(formData.duration) * 60000);
        const res = await fetch(`${API_URL}/calendar/events`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `${formData.title} - ${formData.client}`, description: formData.notes, start_time: start.toISOString(), end_time: end.toISOString(), location: formData.location }),
        });
        if (res.ok) { const d = await res.json(); apt.googleEventId = d.event_id; }
      } catch {}
      setSyncing(false);
    }
    persist([...appointments, apt]);
    setFormData(emptyForm());
    setShowAddModal(false);
  };

  const handleUpdate = async () => {
    if (!editingAppointment) return;
    setSyncing(true);
    if (googleConnected && token && editingAppointment.googleEventId) {
      try {
        const start = new Date(`${editingAppointment.date}T${editingAppointment.time}:00`);
        const end = new Date(start.getTime() + getDurationMinutes(editingAppointment.duration) * 60000);
        await fetch(`${API_URL}/calendar/events`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: editingAppointment.googleEventId, title: `${editingAppointment.title} - ${editingAppointment.client}`, description: editingAppointment.notes, start_time: start.toISOString(), end_time: end.toISOString(), location: editingAppointment.location }),
        });
      } catch {}
    }
    persist(appointments.map(a => a.id === editingAppointment.id ? editingAppointment : a));
    setSyncing(false);
    setShowEditModal(false);
    setEditingAppointment(null);
  };

  const handleDelete = async (apt: Appointment) => {
    setDeleting(apt.id);
    if (googleConnected && token && apt.googleEventId) {
      try { await fetch(`${API_URL}/calendar/events/${apt.googleEventId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); } catch {}
    }
    persist(appointments.filter(a => a.id !== apt.id));
    setDeleting(null);
  };

  const handleEdit = (apt: Appointment) => {
    setEditingAppointment({ ...apt });
    setShowEditModal(true);
  };

  const handleAddAtTime = (time: string) => {
    setFormData({ ...emptyForm(), date: dateStr, time });
    setShowAddModal(true);
  };

  /* ─── Google Calendar ─── */
  const handleConnectGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) { setError('Google Calendar not configured.'); return; }
    const redirectUri = `${window.location.origin}/schedule`;
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  };

  const handleDisconnectGoogle = async () => {
    if (!token) return;
    try { const res = await fetch(`${API_URL}/calendar/disconnect`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) setGoogleConnected(false); } catch {}
    setShowConnectModal(false);
  };

  const handleSyncNow = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/calendar/events`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const synced: Appointment[] = (data.events || []).map((ev: any, i: number) => {
          const start = ev.start?.dateTime || ev.start?.date || '';
          let dateStr = '', timeStr = '09:00', duration = '1 hour';
          if (start) {
            const s = new Date(start);
            dateStr = formatLocalDate(s);
            timeStr = s.toTimeString().slice(0, 5);
            if (ev.end?.dateTime) {
              const mins = Math.round((new Date(ev.end.dateTime).getTime() - s.getTime()) / 60000);
              duration = mins <= 30 ? '30 min' : mins <= 45 ? '45 min' : mins <= 60 ? '1 hour' : mins <= 90 ? '1.5 hours' : '2 hours';
            }
          }
          const parts = (ev.summary || 'Untitled').split(' - ');
          return {
            id: `g-${ev.id || i}`,
            title: parts[0], client: parts[1] || '',
            date: dateStr, time: timeStr, duration, location: ev.location || '',
            type: (ev.summary?.toLowerCase().includes('assessment') ? 'assessment' : ev.summary?.toLowerCase().includes('review') ? 'review' : ev.summary?.toLowerCase().includes('meeting') ? 'meeting' : 'visit') as AppointmentType,
            notes: ev.description || '', googleEventId: ev.id,
          };
        });
        const local = appointments.filter(a => !a.googleEventId);
        persist([...local, ...synced]);
      }
    } catch {}
    setSyncing(false);
  };

  /* ─── Navigation ─── */
  const goToday = () => setSelectedDate(new Date());
  const goPrev = () => {
    if (view === 'day') setSelectedDate(d => addDays(d, -1));
    else if (view === 'week') setSelectedDate(d => subWeeks(d, 1));
    else setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const goNext = () => {
    if (view === 'day') setSelectedDate(d => addDays(d, 1));
    else if (view === 'week') setSelectedDate(d => addWeeks(d, 1));
    else setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const dateLabel = view === 'day'
    ? format(selectedDate, 'EEEE, MMMM d, yyyy')
    : view === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    : format(selectedDate, 'MMMM yyyy');

  /* ─── Month calendar generation ─── */
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    return cells;
  };

  return (
    <>
      <Suspense fallback={null}>
        <OAuthHandler token={token} onConnected={() => setGoogleConnected(true)} onError={msg => setError(msg)} />
      </Suspense>

      {/* Paper Calendar header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight text-[#10211F]">
            Calendar
          </h1>
          <p className="text-[15px] font-medium leading-6 text-[#64748B]">
            Visits, assessments, and follow-ups on one board.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setFormData({ ...emptyForm(), date: dateStr }); setShowAddModal(true); }}
          className="glass-btn-primary shrink-0"
        >
          <Plus className="w-4 h-4" />
          New visit
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-red-600 text-sm">{error}</span></div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Toolbar — Paper month chrome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-semibold text-[#4B6B66] hover:text-[#10211F] bg-[#FFFFFFB8] border border-[#FFFFFFE0] rounded-xl transition-colors">
            Today
          </button>
          <div className="flex items-center">
            <button onClick={goPrev} className="p-1.5 text-[#64748B] hover:text-[#10211F] hover:bg-white/60 rounded-l-xl transition-colors border border-[#FFFFFFE0] bg-[#FFFFFFB8]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goNext} className="p-1.5 text-[#64748B] hover:text-[#10211F] hover:bg-white/60 rounded-r-xl transition-colors border border-[#FFFFFFE0] border-l-0 bg-[#FFFFFFB8]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-sm lg:text-base font-semibold text-[#10211F] ml-1">{dateLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="glass-tabs">
            {[
              { key: 'week' as const, label: 'Week' },
              { key: 'month' as const, label: 'Month' },
            ].map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={`glass-tab ${view === v.key ? 'glass-tab-active' : ''}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legacy day stats removed from primary Paper layout — keep compact week stats */}
      <div className={`grid grid-cols-2 ${isPlatformAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 mb-6`}>
        {[
          { label: 'Today', value: todayTotal, icon: Sun, color: 'text-amber-600', bg: 'bg-amber-50', show: true },
          { label: 'This Week', value: weekTotal, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', show: true },
          { label: 'Upcoming', value: upcomingCount, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50', show: true },
          { label: 'Google Sync', value: googleConnected ? 'On' : 'Off', icon: Link2, color: googleConnected ? 'text-emerald-600' : 'text-slate-500', bg: googleConnected ? 'bg-emerald-50' : 'bg-slate-100', show: isPlatformAdmin },
        ].filter(s => s.show).map((s, i) => (
          <div key={i} className="glass-card p-3 lg:p-4 flex items-center gap-3" onClick={s.label === 'Google Sync' ? () => setShowConnectModal(true) : undefined} role={s.label === 'Google Sync' ? 'button' : undefined}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Views ─── */}
      {view === 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 glass-card p-4 lg:p-5 overflow-auto max-h-[calc(100vh-320px)]">
            {todayApts.length === 0 && (
              <div className="text-center py-8 mb-4 bg-slate-50/20 rounded-xl">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No appointments for this day</p>
                <button onClick={() => { setFormData({ ...emptyForm(), date: dateStr }); setShowAddModal(true); }} className="text-primary-400 text-xs mt-1 hover:text-primary-300">+ Add one</button>
              </div>
            )}
            <DayTimeline appointments={todayApts} onEdit={handleEdit} onDelete={handleDelete} onAddAtTime={handleAddAtTime} deleting={deleting} />
          </div>

          {/* Sidebar: upcoming */}
          <div className="glass-card p-4 lg:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Upcoming</h3>
            <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
              {appointments
                .filter(a => a.date >= formatLocalDate(new Date()))
                .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
                .slice(0, 10)
                .map(apt => {
                  const cfg = TYPE_CONFIG[apt.type];
                  const aptDate = new Date(apt.date + 'T00:00:00');
                  const today = isToday(aptDate);
                  return (
                    <div
                      key={apt.id}
                      onClick={() => handleEdit(apt)}
                      className={`p-2.5 rounded-lg border-l-2 ${cfg.border} bg-slate-50/30 hover:bg-slate-100 cursor-pointer transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-slate-900 truncate">{apt.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {today ? 'Today' : format(aptDate, 'EEE, MMM d')} &middot; {formatTime12(apt.time)}
                      </p>
                      {apt.client && <p className="text-[10px] text-slate-400 truncate">{apt.client}</p>}
                    </div>
                  );
                })
              }
              {appointments.filter(a => a.date >= formatLocalDate(new Date())).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No upcoming appointments</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'week' && (
        <WeekView weekStart={weekStart} appointments={weekApts} onSelectDate={(d) => { setSelectedDate(d); setView('day'); }} selectedDate={selectedDate} />
      )}

      {view === 'month' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Month grid card */}
          <div className="grow min-w-0 glass-card p-5 lg:p-6">
            <div className="grid grid-cols-7 gap-2 pb-1.5">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                <div key={d} className="text-center text-xs font-semibold tracking-[0.06em] text-[#94A3B8]">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {generateCalendarDays().map((day, i) => {
                const dayDate = day ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day) : null;
                const dayStr = dayDate ? formatLocalDate(dayDate) : '';
                const dayApts = day ? appointments.filter(a => a.date === dayStr) : [];
                const today = dayDate ? isToday(dayDate) : false;
                const isSelected = dayDate ? isSameDay(dayDate, selectedDate) : false;
                const highlight = isSelected || today;

                if (!day) {
                  return <div key={i} className="min-h-[74px] rounded-[14px]" />;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                    className={`min-h-[74px] flex flex-col gap-1.5 py-2.5 px-3 text-left rounded-[14px] border transition-colors ${
                      highlight
                        ? 'bg-primary-500 border-transparent shadow-[0_10px_24px_#0D948852]'
                        : 'bg-white/70 border-white/70 hover:bg-white/90'
                    }`}
                  >
                    <span className={`text-sm font-medium leading-[18px] ${highlight ? 'text-white font-bold' : 'text-[#10211F]'}`}>{day}</span>
                    <div className="space-y-1">
                      {dayApts.slice(0, 2).map(a => (
                        highlight ? (
                          <div key={a.id} className="h-1 rounded-full bg-white/80" style={{ width: `${Math.min(34, 18 + a.title.length)}px` }} />
                        ) : (
                          <div key={a.id} className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        )
                      ))}
                      {dayApts.length > 2 && (
                        <p className={`text-[10px] ${highlight ? 'text-white/80' : 'text-slate-400'}`}>+{dayApts.length - 2}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agenda sidebar */}
          <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-primary-500">
                {isToday(selectedDate) ? 'TODAY' : format(selectedDate, 'EEEE').toUpperCase()}
              </p>
              <h2 className="text-[22px] font-bold tracking-tight leading-tight text-[#10211F]">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h2>
            </div>

            {todayApts.length === 0 && (
              <div className="glass-panel p-5 text-center">
                <CalendarDays className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nothing scheduled</p>
              </div>
            )}

            {todayApts.map(apt => {
              const cfg = TYPE_CONFIG[apt.type];
              return (
                <button
                  key={apt.id}
                  onClick={() => handleEdit(apt)}
                  className="flex items-stretch gap-3.5 p-[18px] rounded-[20px] text-left bg-[#FFFFFFB3] border border-[#FFFFFFE0] shadow-[0_12px_30px_#0D948817] hover:bg-white transition-colors"
                >
                  <div className="w-1 shrink-0 self-stretch rounded-full" style={{ backgroundColor: TYPE_BAR[apt.type] }} />
                  <div className="grow min-w-0 flex flex-col gap-1">
                    <span className="text-[13px] font-semibold text-primary-500">{formatTime12(apt.time)}</span>
                    <span className="text-[15px] font-semibold leading-5 text-[#10211F] truncate">{apt.title}</span>
                    <span className="text-[13px] font-medium text-[#4B6B66] truncate">
                      {cfg.label}{apt.client ? ` · ${apt.client}` : ''}{apt.location ? ` · ${apt.location}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => { setFormData({ ...emptyForm(), date: dateStr }); setShowAddModal(true); }}
              className="flex items-center justify-center h-[52px] rounded-[20px] gap-2 bg-[#0D94880F] border border-dashed border-[#0D948866] text-primary-500 hover:bg-[#0D948817] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[15px] font-semibold">Add visit</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
      {showAddModal && (
        <AppointmentForm
          data={formData}
          onChange={setFormData}
          onSubmit={handleAdd}
          onCancel={() => setShowAddModal(false)}
          submitLabel="Create Appointment"
          loading={syncing}
          googleConnected={googleConnected}
          isEdit={false}
        />
      )}

      {showEditModal && editingAppointment && (
        <AppointmentForm
          data={editingAppointment}
          onChange={(d) => setEditingAppointment({ ...editingAppointment, ...d } as Appointment)}
          onSubmit={handleUpdate}
          onCancel={() => { setShowEditModal(false); setEditingAppointment(null); }}
          submitLabel="Save Changes"
          loading={syncing}
          googleConnected={googleConnected}
          isEdit={true}
        />
      )}

      {showConnectModal && isPlatformAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConnectModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Google Calendar</h2>
              <button onClick={() => setShowConnectModal(false)} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              {googleConnected ? (
                <>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-50 border border-green-500/20 rounded-xl">
                    <Check className="w-5 h-5 text-emerald-600" />
                    <div><p className="text-slate-900 text-sm font-medium">Connected</p><p className="text-[11px] text-slate-500">Events sync automatically</p></div>
                  </div>
                  <button onClick={handleDisconnectGoogle} className="w-full px-4 py-2 text-sm bg-red-50 text-red-600 border border-red-500/20 rounded-lg hover:bg-red-50 transition-colors">Disconnect</button>
                </>
              ) : (
                <>
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <CalendarDays className="w-6 h-6 text-primary-400" />
                    </div>
                    <p className="text-slate-600 text-sm mb-1">Sync with Google Calendar</p>
                    <p className="text-[11px] text-slate-400">Appointments sync to all your devices</p>
                  </div>
                  <button onClick={handleConnectGoogle} className="w-full px-4 py-2.5 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Sign in with Google
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Page Shell ─── */
export default function SchedulePage() {
  return (
    <GlassShell>
      <div className="max-w-6xl mx-auto w-full">
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>}>
          <ScheduleContent />
        </Suspense>
      </div>
    </GlassShell>
  );
}
