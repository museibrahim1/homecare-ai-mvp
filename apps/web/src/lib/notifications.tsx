'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { api, formatLocalDate } from './api';
import { getStoredToken, useAuth } from './auth';
import { appointmentFromApi } from './crmAdapters';

/* ─── Types ─── */
export type NotificationCategory = 'schedule' | 'task' | 'message' | 'email' | 'follow_up' | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: number;       // ms since epoch
  read: boolean;
  dismissed: boolean;
  link?: string;           // route to navigate to
  icon?: string;           // optional icon hint
  sourceId?: string;       // ID of the originating item (appointment, task, etc.)
  priority?: 'low' | 'medium' | 'high';
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/* ─── Storage (user-scoped) ─── */
const SCAN_INTERVAL_MS = 30_000;

function notifReadKey(userId: string) {
  return `palmcare-notifications-${userId}`;
}

function notifDismissedKey(userId: string) {
  return `palmcare-notif-dismissed-${userId}`;
}

function loadDismissed(userId: string | null | undefined): Set<string> {
  if (typeof window === 'undefined' || !userId) return new Set();
  try {
    const raw = localStorage.getItem(notifDismissedKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(userId: string | null | undefined, dismissed: Set<string>) {
  if (typeof window === 'undefined' || !userId) return;
  const arr = Array.from(dismissed).slice(-200);
  localStorage.setItem(notifDismissedKey(userId), JSON.stringify(arr));
}

function loadReadSet(userId: string | null | undefined): Set<string> {
  if (typeof window === 'undefined' || !userId) return new Set();
  try {
    const raw = localStorage.getItem(notifReadKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveReadSet(userId: string | null | undefined, readIds: Set<string>) {
  if (typeof window === 'undefined' || !userId) return;
  const arr = Array.from(readIds).slice(-200);
  localStorage.setItem(notifReadKey(userId), JSON.stringify(arr));
}

/* ─── Scanning Functions ─── */

type AptRow = { id: string; title: string; client: string; date: string; time: string };

function buildScheduleNotifications(appointments: AptRow[], now: Date, dismissed: Set<string>): AppNotification[] {
  const notifications: AppNotification[] = [];
  const todayStr = formatLocalDate(now);
  const nowMs = now.getTime();

  for (const apt of appointments) {
    if (!apt.date || !apt.time) continue;

    const aptDateTime = new Date(`${apt.date}T${apt.time}:00`);
    const aptMs = aptDateTime.getTime();
    if (Number.isNaN(aptMs)) continue;
    const diffMin = (aptMs - nowMs) / 60000;
    const id = `sched-${apt.id}`;

    if (dismissed.has(id)) continue;

    if (diffMin >= -15 && diffMin <= 0) {
      notifications.push({
        id: `${id}-now`,
        category: 'schedule',
        title: 'Appointment in progress',
        message: `${apt.title} with ${apt.client || 'client'} started at ${formatTime12(apt.time)}`,
        timestamp: aptMs,
        read: false,
        dismissed: false,
        link: '/schedule',
        sourceId: apt.id,
        priority: 'high',
      });
    } else if (diffMin > 0 && diffMin <= 30) {
      notifications.push({
        id: `${id}-soon`,
        category: 'schedule',
        title: 'Upcoming appointment',
        message: `${apt.title} with ${apt.client || 'client'} in ${Math.round(diffMin)} min`,
        timestamp: aptMs,
        read: false,
        dismissed: false,
        link: '/schedule',
        sourceId: apt.id,
        priority: 'high',
      });
    } else if (diffMin > 30 && diffMin <= 120) {
      notifications.push({
        id: `${id}-upcoming`,
        category: 'schedule',
        title: 'Later today',
        message: `${apt.title} with ${apt.client || 'client'} at ${formatTime12(apt.time)}`,
        timestamp: aptMs,
        read: false,
        dismissed: false,
        link: '/schedule',
        sourceId: apt.id,
        priority: 'medium',
      });
    } else if (apt.date === todayStr && diffMin > 120) {
      notifications.push({
        id: `${id}-today`,
        category: 'schedule',
        title: 'Scheduled today',
        message: `${apt.title} at ${formatTime12(apt.time)}`,
        timestamp: aptMs,
        read: false,
        dismissed: false,
        link: '/schedule',
        sourceId: apt.id,
        priority: 'low',
      });
    } else if (diffMin > 0 && diffMin <= 24 * 60 && apt.date !== todayStr) {
      notifications.push({
        id: `${id}-tomorrow`,
        category: 'schedule',
        title: 'Tomorrow',
        message: `${apt.title} with ${apt.client || 'client'} at ${formatTime12(apt.time)}`,
        timestamp: aptMs,
        read: false,
        dismissed: false,
        link: '/schedule',
        sourceId: apt.id,
        priority: 'low',
      });
    }
  }

  return notifications;
}

type TaskRow = {
  id: string;
  title: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
};

function buildTaskNotifications(tasks: TaskRow[], now: Date, dismissed: Set<string>): AppNotification[] {
  const notifications: AppNotification[] = [];
  const todayStr = formatLocalDate(now);

  for (const task of tasks) {
    if (task.status === 'completed' || task.status === 'done' || task.status === 'cancelled') continue;
    const id = `task-${task.id}`;
    if (dismissed.has(id)) continue;

    if (task.dueDate) {
      if (task.dueDate < todayStr) {
        notifications.push({
          id: `${id}-overdue`,
          category: 'task',
          title: 'Overdue task',
          message: `"${task.title}" was due ${task.dueDate}`,
          timestamp: new Date(task.dueDate + 'T00:00:00').getTime(),
          read: false,
          dismissed: false,
          link: '/dashboard',
          sourceId: task.id,
          priority: 'high',
        });
      } else if (task.dueDate === todayStr) {
        notifications.push({
          id: `${id}-today`,
          category: 'task',
          title: 'Task due today',
          message: `"${task.title}" is due today`,
          timestamp: now.getTime(),
          read: false,
          dismissed: false,
          link: '/dashboard',
          sourceId: task.id,
          priority: 'medium',
        });
      } else {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatLocalDate(tomorrow);
        if (task.dueDate === tomorrowStr) {
          notifications.push({
            id: `${id}-tomorrow`,
            category: 'task',
            title: 'Task due tomorrow',
            message: `"${task.title}" is due tomorrow`,
            timestamp: new Date(task.dueDate + 'T00:00:00').getTime(),
            read: false,
            dismissed: false,
            link: '/dashboard',
            sourceId: task.id,
            priority: 'low',
          });
        }
      }
    }

    if (task.status === 'in_progress' && !task.dueDate) {
      const created = new Date(task.createdAt || 0).getTime();
      const ageHours = (now.getTime() - created) / 3600000;
      if (ageHours > 24) {
        notifications.push({
          id: `${id}-stale`,
          category: 'task',
          title: 'Task in progress',
          message: `"${task.title}" has been in progress for ${Math.round(ageHours / 24)}d`,
          timestamp: created,
          read: false,
          dismissed: false,
          link: '/dashboard',
          sourceId: task.id,
          priority: 'low',
        });
      }
    }
  }

  return notifications;
}

/** Only scan the current user's message cache key. */
function scanMessages(userId: string, dismissed: Set<string>): AppNotification[] {
  try {
    const key = `palmcare_messages_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const conversations = data.conversations || [];
    let totalUnread = 0;
    const unreadNames: string[] = [];

    for (const conv of conversations) {
      if (conv.unread && conv.unread > 0) {
        totalUnread += conv.unread;
        if (unreadNames.length < 3) unreadNames.push(conv.name || 'Unknown');
      }
    }

    if (totalUnread === 0) return [];
    const id = `msg-unread-${userId}`;
    if (dismissed.has(id)) return [];
    return [{
      id,
      category: 'message',
      title: `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`,
      message: `From ${unreadNames.join(', ')}${totalUnread > 3 ? ` and ${totalUnread - 3} more` : ''}`,
      timestamp: Date.now(),
      read: false,
      dismissed: false,
      link: '/messages',
      priority: 'medium',
    }];
  } catch { return []; }
}

function scanTeamChat(userId: string, dismissed: Set<string>): AppNotification[] {
  try {
    const key = `palmcare_teamchat_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const channels = data.channels || [];
    let unreadChannels = 0;
    const channelNames: string[] = [];

    for (const ch of channels) {
      if (ch.unread && ch.unread > 0) {
        unreadChannels++;
        if (channelNames.length < 3) channelNames.push(ch.name || ch.id);
      }
    }

    if (unreadChannels === 0) return [];
    const id = `chat-unread-${userId}`;
    if (dismissed.has(id)) return [];
    return [{
      id,
      category: 'message',
      title: `${unreadChannels} unread channel${unreadChannels > 1 ? 's' : ''}`,
      message: `#${channelNames.join(', #')}`,
      timestamp: Date.now(),
      read: false,
      dismissed: false,
      link: '/team-chat',
      priority: 'medium',
    }];
  } catch { return []; }
}

function scanEmails(userId: string, dismissed: Set<string>): AppNotification[] {
  try {
    const key = `palmcare_teamchat_${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const emails = data.emails || [];
    let unreadEmails = 0;
    const subjects: string[] = [];

    for (const email of emails) {
      if (email.unread) {
        unreadEmails++;
        if (subjects.length < 2) subjects.push(email.subject || 'No subject');
      }
    }

    if (unreadEmails === 0) return [];
    const id = `email-unread-${userId}`;
    if (dismissed.has(id)) return [];
    return [{
      id,
      category: 'email',
      title: `${unreadEmails} unread email${unreadEmails > 1 ? 's' : ''}`,
      message: subjects.join(', '),
      timestamp: Date.now(),
      read: false,
      dismissed: false,
      link: '/team-chat',
      priority: 'medium',
    }];
  } catch { return []; }
}

/* ─── Helpers ─── */
function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

const API_URL = '/api';

/* ─── Provider ─── */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, token, hydrated } = useAuth();
  const userId = user?.id ?? null;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [manualNotifs, setManualNotifs] = useState<AppNotification[]>([]);
  const [apiNotifs, setApiNotifs] = useState<AppNotification[]>([]);
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  // Reload per-user read/dismissed sets when the logged-in user changes
  useEffect(() => {
    setReadIds(loadReadSet(userId));
    setDismissedIds(loadDismissed(userId));
    setManualNotifs([]);
    setApiNotifs([]);
    setAppointments([]);
    setTasks([]);
  }, [userId]);

  // Fetch server appointments + tasks (never unscoped localStorage)
  useEffect(() => {
    if (!hydrated || !token || !userId) return;

    let cancelled = false;
    const load = async () => {
      try {
        const [aptRows, taskRows] = await Promise.all([
          api.getAppointments(token).catch(() => []),
          api.getTasks(token).catch(() => []),
        ]);
        if (cancelled) return;
        setAppointments(
          (aptRows || []).map((row: Record<string, unknown>) => {
            const apt = appointmentFromApi(row);
            return { id: apt.id, title: apt.title, client: apt.client, date: apt.date, time: apt.time };
          }),
        );
        setTasks(
          (taskRows || []).map((row: any) => ({
            id: String(row.id),
            title: String(row.title || ''),
            status: row.status,
            dueDate: row.due_date || undefined,
            createdAt: row.created_at || undefined,
          })),
        );
      } catch {
        /* silent */
      }
    };

    load();
    const interval = setInterval(load, SCAN_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hydrated, token, userId]);

  // Poll API for server-side notifications (messages, etc.)
  useEffect(() => {
    if (!token) return;

    const fetchApiNotifs = async () => {
      try {
        const authToken = getStoredToken() || token;
        if (!authToken) return;
        const res = await fetch(`${API_URL}/messaging/notifications?unread_only=true&limit=50`, {
          headers: { Authorization: `Bearer ${authToken}` },
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        const mapped: AppNotification[] = (data || []).map((n: any) => ({
          id: `api-${n.id}`,
          category: 'message' as NotificationCategory,
          title: n.title,
          message: n.body || '',
          timestamp: new Date(n.created_at).getTime(),
          read: n.is_read,
          dismissed: false,
          link: n.link || '/team-chat',
          priority: 'high' as const,
        }));
        setApiNotifs(mapped);
      } catch { /* silent */ }
    };
    fetchApiNotifs();
    const interval = setInterval(fetchApiNotifs, 10_000);
    return () => clearInterval(interval);
  }, [token]);

  const scan = useCallback(() => {
    if (typeof window === 'undefined' || !userId) {
      setNotifications([]);
      return;
    }
    const now = new Date();
    const dismissed = dismissedIds;

    const all = [
      ...buildScheduleNotifications(appointments, now, dismissed),
      ...buildTaskNotifications(tasks, now, dismissed),
      ...scanMessages(userId, dismissed),
      ...scanTeamChat(userId, dismissed),
      ...scanEmails(userId, dismissed),
      ...apiNotifs,
      ...manualNotifs.filter(n => !n.dismissed),
    ];

    const withReadState = all.map(n => ({
      ...n,
      read: readIds.has(n.id),
      dismissed: dismissedIds.has(n.id),
    })).filter(n => !n.dismissed);

    withReadState.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      const pa = pOrder[a.priority || 'low'];
      const pb = pOrder[b.priority || 'low'];
      if (pa !== pb) return pa - pb;
      return b.timestamp - a.timestamp;
    });

    setNotifications(withReadState);
  }, [userId, dismissedIds, readIds, manualNotifs, apiNotifs, appointments, tasks]);

  useEffect(() => {
    scan();
    const timer = setInterval(scan, SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [scan]);

  useEffect(() => {
    const handleFocus = () => scan();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [scan]);

  useEffect(() => {
    if (!userId) return;
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === `palmcare_messages_${userId}` ||
        e.key === `palmcare_teamchat_${userId}`
      ) {
        scan();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [scan, userId]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadSet(userId, next);
      return next;
    });
  }, [userId]);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      saveReadSet(userId, next);
      return next;
    });
  }, [notifications, userId]);

  const dismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(userId, next);
      return next;
    });
    setManualNotifs(prev => prev.filter(n => n.id !== id));
  }, [userId]);

  const clearAll = useCallback(() => {
    const allIds = new Set(dismissedIds);
    notifications.forEach(n => allIds.add(n.id));
    setDismissedIds(allIds);
    saveDismissed(userId, allIds);
    setManualNotifs([]);
  }, [notifications, dismissedIds, userId]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => {
    const notif: AppNotification = {
      ...n,
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      read: false,
      dismissed: false,
    };
    setManualNotifs(prev => [notif, ...prev]);
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
    addNotification,
  }), [notifications, unreadCount, markRead, markAllRead, dismiss, clearAll, addNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [] as AppNotification[],
      unreadCount: 0,
      markRead: () => {},
      markAllRead: () => {},
      dismiss: () => {},
      clearAll: () => {},
      addNotification: () => {},
    };
  }
  return ctx;
}
