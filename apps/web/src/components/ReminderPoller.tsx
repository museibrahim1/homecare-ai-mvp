'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '@/lib/notifications';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const POLL_INTERVAL_MS = 60_000; // poll every 60 seconds
const EMAIL_INTERVAL_MS = 300_000; // send email check every 5 minutes

/**
 * Background poller that fetches upcoming reminders from the API
 * and pushes them into the in-app notification system.
 * Also periodically triggers email notifications for due reminders.
 */
export default function ReminderPoller() {
  const { addNotification } = useNotifications();
  const { token } = useAuth();
  const seenIds = useRef<Set<string>>(new Set());
  const emailTimer = useRef<NodeJS.Timeout | null>(null);

  const pollReminders = useCallback(async () => {
    if (!token) return;
    try {
      const reminders = await api.getReminders(token, { upcoming: true });
      for (const rem of reminders) {
        if (rem.is_dismissed) continue;
        const notifId = `reminder-${rem.id}`;
        if (seenIds.current.has(notifId)) continue;
        seenIds.current.add(notifId);

        const remindAt = new Date(rem.remind_at);
        const now = new Date();
        const isOverdue = remindAt <= now;

        addNotification({
          category: 'follow_up',
          title: isOverdue ? 'Reminder Due' : 'Upcoming Reminder',
          message: rem.title,
          link: '/notes',
          priority: isOverdue ? 'high' : 'medium',
          sourceId: rem.id,
        });
      }
    } catch {
      // silently ignore — may not be authenticated or API may be down
    }
  }, [token, addNotification]);

  const triggerEmailNotifications = useCallback(async () => {
    if (!token) return;
    try {
      await api.sendDueNotifications(token);
    } catch {
      // best-effort
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    // Initial poll
    pollReminders();
    triggerEmailNotifications();

    // Set up intervals
    const pollTimer = setInterval(pollReminders, POLL_INTERVAL_MS);
    emailTimer.current = setInterval(triggerEmailNotifications, EMAIL_INTERVAL_MS);

    return () => {
      clearInterval(pollTimer);
      if (emailTimer.current) clearInterval(emailTimer.current);
    };
  }, [token, pollReminders, triggerEmailNotifications]);

  // Re-poll when window regains focus
  useEffect(() => {
    const handleFocus = () => pollReminders();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [pollReminders]);

  return null; // headless component
}
