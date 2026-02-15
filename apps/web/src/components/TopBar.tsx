'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, Settings, ChevronDown, LogOut, User, X,
  CalendarDays, CheckSquare, MessageSquare, Mail, AlertTriangle,
  Clock, ChevronRight, BellOff, Check, BookOpen
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNotifications, type AppNotification, type NotificationCategory } from '@/lib/notifications';
import { useWalkthrough } from '@/lib/walkthrough';

/* ─── Category config ─── */
const CATEGORY_META: Record<NotificationCategory, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  schedule:  { label: 'Schedule',  icon: CalendarDays,  color: 'text-blue-400',   bg: 'bg-blue-500/15' },
  task:      { label: 'Tasks',     icon: CheckSquare,   color: 'text-amber-400',  bg: 'bg-amber-500/15' },
  message:   { label: 'Messages',  icon: MessageSquare, color: 'text-green-400',  bg: 'bg-green-500/15' },
  email:     { label: 'Email',     icon: Mail,          color: 'text-purple-400', bg: 'bg-purple-500/15' },
  follow_up: { label: 'Follow-Up', icon: Clock,         color: 'text-orange-400', bg: 'bg-orange-500/15' },
  system:    { label: 'System',    icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/15' },
};

const PRIORITY_INDICATOR: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-dark-500',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─── Notification Panel ─── */
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } = useNotifications();
  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.category === filter);

  // Category tabs with counts
  const categoryCounts = notifications.reduce<Record<string, number>>((acc, n) => {
    if (!n.read) acc[n.category] = (acc[n.category] || 0) + 1;
    return acc;
  }, {});

  const handleClick = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.link) {
      router.push(notif.link);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-500 text-white rounded-full min-w-[18px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
              title="Mark all as read"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
              title="Clear all"
            >
              <BellOff className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-dark-700/50 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
            filter === 'all' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
          }`}
        >
          All{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </button>
        {(Object.entries(CATEGORY_META) as [NotificationCategory, typeof CATEGORY_META[NotificationCategory]][]).map(([key, meta]) => {
          const count = categoryCounts[key] || 0;
          const hasItems = notifications.some(n => n.category === key);
          if (!hasItems && filter !== key) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                filter === key ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              <meta.icon className={`w-3 h-3 ${filter === key ? meta.color : ''}`} />
              {meta.label}
              {count > 0 && <span className={`ml-0.5 px-1 py-px text-[9px] rounded ${meta.bg} ${meta.color}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-8 h-8 text-dark-600 mx-auto mb-2" />
            <p className="text-sm text-dark-400">No notifications</p>
            <p className="text-[11px] text-dark-500 mt-0.5">
              {filter === 'all' ? "You're all caught up!" : `No ${CATEGORY_META[filter as NotificationCategory]?.label.toLowerCase()} notifications`}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((notif) => {
              const meta = CATEGORY_META[notif.category];
              const IconComponent = meta.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-dark-700/30 transition-colors hover:bg-dark-700/30 ${
                    !notif.read ? 'bg-dark-700/15' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg} mt-0.5`}>
                    <IconComponent className={`w-4 h-4 ${meta.color}`} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {!notif.read && (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_INDICATOR[notif.priority || 'low']}`} />
                      )}
                      <p className={`text-xs font-medium truncate ${!notif.read ? 'text-white' : 'text-dark-300'}`}>
                        {notif.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-dark-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-dark-500">{timeAgo(notif.timestamp)}</span>
                      {notif.link && (
                        <span className="text-[10px] text-primary-400 flex items-center gap-0.5">
                          View <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                    className="shrink-0 p-1 text-dark-600 hover:text-dark-300 transition-colors opacity-0 group-hover:opacity-100"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-dark-700 text-center">
          <button
            onClick={() => { router.push('/schedule'); onClose(); }}
            className="text-[11px] text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            View full schedule
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── TopBar ─── */
export default function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { open: openTour } = useWalkthrough();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    if (showUserMenu || showNotifications) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showNotifications]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      const authData = localStorage.getItem('homecare-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token;
        if (token) {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    } catch { /* Best-effort */ }
    logout();
    router.push('/login');
  };

  const initials = (user?.full_name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const agencyName = user?.agency_name || user?.business_name || 'Homecare AI';

  return (
    <div className="sticky top-0 z-20 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700/50">
      <div className="flex items-center justify-between px-4 lg:px-8 py-3">
        {/* Left: Agency Logo / Name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">
              {agencyName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block">{agencyName}</span>
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-lg transition-colors ${
                showNotifications ? 'text-white bg-dark-700' : 'text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full border-2 border-dark-900">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-dark-700 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xs">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white leading-tight">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-dark-400 leading-tight">{user?.role === 'admin' ? 'Admin' : 'Manager'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-dark-400 hidden sm:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4 text-dark-400" />
                  Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4 text-dark-400" />
                  Settings
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); openTour(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-dark-400" />
                  App Tour
                </button>
                <div className="border-t border-dark-600 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
