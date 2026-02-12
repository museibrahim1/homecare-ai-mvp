'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { formatLocalDate } from './api';

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

/* ─── Storage ─── */
const NOTIF_STORAGE_KEY = 'homecare-notifications';
const NOTIF_DISMISSED_KEY = 'homecare-notif-dismissed';
const SCAN_INTERVAL_MS = 30_000; // scan every 30s

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIF_DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(dismissed: Set<string>) {
  if (typeof window === 'undefined') return;
  // Keep only the last 200 dismissed IDs to prevent unbounded growth
  const arr = Array.from(dismissed).slice(-200);
  localStorage.setItem(NOTIF_DISMISSED_KEY, JSON.stringify(arr));
}

function loadReadSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveReadSet(readIds: Set<string>) {
  if (typeof window === 'undefined') return;
  const arr = Array.from(readIds).slice(-200);
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(arr));
}

/* ─── Scanning Functions ─── */

/** Scan schedule (localStorage: homecare-schedule) for upcoming appointments */
function scanSchedule(now: Date, dismissed: Set<string>): AppNotification[] {
  try {
    const raw = localStorage.getItem('homecare-schedule');
    if (!raw) return [];
    const appointments: any[] = JSON.parse(raw);
    const notifications: AppNotification[] = [];
    const todayStr = formatLocalDate(now);
    const nowMs = now.getTime();

    for (const apt of appointments) {
      if (!apt.date || !apt.time) continue;

      const aptDateTime = new Date(`${apt.date}T${apt.time}:00`);
      const aptMs = aptDateTime.getTime();
      const diffMs = aptMs - nowMs;
      const diffMin = diffMs / 60000;
      const id = `sched-${apt.id}`;

      if (dismissed.has(id)) continue;

      // Appointment happening right now (within window)
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
      }
      // Starting soon (next 30 minutes)
      else if (diffMin > 0 && diffMin <= 30) {
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
      }
      // Starting in next 2 hours
      else if (diffMin > 30 && diffMin <= 120) {
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
      }
      // Today's appointments (reminder at start of day)
      else if (apt.date === todayStr && diffMin > 120) {
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
      }
      // Tomorrow's appointments
      else if (diffMin > 0 && diffMin <= 24 * 60 && apt.date !== todayStr) {
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
  } catch { return []; }
}

/** Scan tasks (localStorage: homecare-tasks) for overdue and due-today items */
function scanTasks(now: Date, dismissed: Set<string>): AppNotification[] {
  try {
    const raw = localStorage.getItem('homecare-tasks');
    if (!raw) return [];
    const tasks: any[] = JSON.parse(raw);
    const notifications: AppNotification[] = [];
    const todayStr = formatLocalDate(now);

    for (const task of tasks) {
      if (task.status === 'completed') continue;
      const id = `task-${task.id}`;
      if (dismissed.has(id)) continue;

      if (task.dueDate) {
        if (task.dueDate < todayStr) {
          // Overdue
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
          // Due today
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
          // Due tomorrow
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

      // In-progress tasks without due dates get a gentle reminder
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
  } catch { return []; }
}

/** Scan messages (localStorage: homecare_messages_*) for unread conversations */
function scanMessages(dismissed: Set<string>): AppNotification[] {
  try {
    const notifications: AppNotification[] = [];
    // Scan all localStorage keys matching message patterns
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('homecare_messages_')) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const conversations = data.conversations || [];
        let totalUnread = 0;
        const unreadNames: string[] = [];

        for (const conv of conversations) {
          if (conv.unread && conv.unread > 0) {
            totalUnread += conv.unread;
            if (unreadNames.length < 3) unreadNames.push(conv.name || 'Unknown');
          }
        }

        if (totalUnread > 0) {
          const id = `msg-unread-${key}`;
          if (!dismissed.has(id)) {
            notifications.push({
              id,
              category: 'message',
              title: `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`,
              message: `From ${unreadNames.join(', ')}${totalUnread > 3 ? ` and ${totalUnread - 3} more` : ''}`,
              timestamp: Date.now(),
              read: false,
              dismissed: false,
              link: '/messages',
              priority: 'medium',
            });
          }
        }
      } catch { /* skip malformed entries */ }
    }
    return notifications;
  } catch { return []; }
}

/** Scan team chat (localStorage: homecare_teamchat_*) for unread channels */
function scanTeamChat(dismissed: Set<string>): AppNotification[] {
  try {
    const notifications: AppNotification[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('homecare_teamchat_')) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const channels = data.channels || [];
        let unreadChannels = 0;
        const channelNames: string[] = [];

        for (const ch of channels) {
          if (ch.unread && ch.unread > 0) {
            unreadChannels++;
            if (channelNames.length < 3) channelNames.push(ch.name || ch.id);
          }
        }

        if (unreadChannels > 0) {
          const id = `chat-unread-${key}`;
          if (!dismissed.has(id)) {
            notifications.push({
              id,
              category: 'message',
              title: `${unreadChannels} unread channel${unreadChannels > 1 ? 's' : ''}`,
              message: `#${channelNames.join(', #')}`,
              timestamp: Date.now(),
              read: false,
              dismissed: false,
              link: '/team-chat',
              priority: 'medium',
            });
          }
        }
      } catch { /* skip */ }
    }
    return notifications;
  } catch { return []; }
}

/** Scan emails (localStorage: homecare_teamchat_* which includes gmail) for unread emails */
function scanEmails(dismissed: Set<string>): AppNotification[] {
  try {
    const notifications: AppNotification[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('homecare_teamchat_')) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const emails = data.emails || [];
        let unreadEmails = 0;
        const subjects: string[] = [];

        for (const email of emails) {
          if (email.unread) {
            unreadEmails++;
            if (subjects.length < 2) subjects.push(email.subject || 'No subject');
          }
        }

        if (unreadEmails > 0) {
          const id = `email-unread-${key}`;
          if (!dismissed.has(id)) {
            notifications.push({
              id,
              category: 'email',
              title: `${unreadEmails} unread email${unreadEmails > 1 ? 's' : ''}`,
              message: subjects.join(', '),
              timestamp: Date.now(),
              read: false,
              dismissed: false,
              link: '/team-chat',
              priority: 'medium',
            });
          }
        }
      } catch { /* skip */ }
    }
    return notifications;
  } catch { return []; }
}

/* ─── Helpers ─── */
function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* ─── Provider ─── */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [manualNotifs, setManualNotifs] = useState<AppNotification[]>([]);

  // Load read/dismissed state from localStorage on mount
  useEffect(() => {
    setReadIds(loadReadSet());
    setDismissedIds(loadDismissed());
  }, []);

  // Scan all sources and build notification list
  const scan = useCallback(() => {
    if (typeof window === 'undefined') return;
    const now = new Date();
    const dismissed = dismissedIds;

    const scheduleNotifs = scanSchedule(now, dismissed);
    const taskNotifs = scanTasks(now, dismissed);
    const messageNotifs = scanMessages(dismissed);
    const chatNotifs = scanTeamChat(dismissed);
    const emailNotifs = scanEmails(dismissed);

    const all = [
      ...scheduleNotifs,
      ...taskNotifs,
      ...messageNotifs,
      ...chatNotifs,
      ...emailNotifs,
      ...manualNotifs.filter(n => !n.dismissed),
    ];

    // Apply read state
    const withReadState = all.map(n => ({
      ...n,
      read: readIds.has(n.id),
      dismissed: dismissedIds.has(n.id),
    })).filter(n => !n.dismissed);

    // Sort: high priority first, then by timestamp (newest first)
    withReadState.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      const pa = pOrder[a.priority || 'low'];
      const pb = pOrder[b.priority || 'low'];
      if (pa !== pb) return pa - pb;
      return b.timestamp - a.timestamp;
    });

    setNotifications(withReadState);
  }, [dismissedIds, readIds, manualNotifs]);

  // Run scan on mount and on interval
  useEffect(() => {
    scan();
    const timer = setInterval(scan, SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [scan]);

  // Also re-scan when window regains focus
  useEffect(() => {
    const handleFocus = () => scan();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [scan]);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'homecare-schedule' ||
        e.key === 'homecare-tasks' ||
        e.key?.startsWith('homecare_messages_') ||
        e.key?.startsWith('homecare_teamchat_')
      ) {
        scan();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [scan]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveReadSet(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      saveReadSet(next);
      return next;
    });
  }, [notifications]);

  const dismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
    setManualNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    const allIds = new Set(dismissedIds);
    notifications.forEach(n => allIds.add(n.id));
    setDismissedIds(allIds);
    saveDismissed(allIds);
    setManualNotifs([]);
  }, [notifications, dismissedIds]);

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
    // Return a safe default so components outside the provider don't crash
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
