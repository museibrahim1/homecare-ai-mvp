'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell, Settings, ChevronDown, LogOut, User, X,
  CalendarDays, CheckSquare, MessageSquare, Mail, AlertTriangle,
  Clock, ChevronRight, BellOff, Check, BookOpen, Search,
  Home, Users, FileText, BarChart3, Zap, CreditCard,
  Shield, Headphones, Layout, PlusCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNotifications, type AppNotification, type NotificationCategory } from '@/lib/notifications';
import { useWalkthrough } from '@/lib/walkthrough';

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  schedule:  { label: 'Schedule',  icon: CalendarDays,  color: 'text-blue-600',   bg: 'bg-blue-50' },
  task:      { label: 'Tasks',     icon: CheckSquare,   color: 'text-amber-600',  bg: 'bg-amber-50' },
  message:   { label: 'Messages',  icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  email:     { label: 'Email',     icon: Mail,          color: 'text-purple-600', bg: 'bg-purple-50' },
  follow_up: { label: 'Follow-Up', icon: Clock,         color: 'text-orange-600', bg: 'bg-orange-50' },
  system:    { label: 'System',    icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50' },
};

const PRIORITY_INDICATOR: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pipeline': 'Deals Pipeline',
  '/leads': 'Leads',
  '/schedule': 'Schedule',
  '/clients': 'Clients',
  '/visits': 'Assessments',
  '/visits/new': 'New Assessment',
  '/care-tracker': 'Care Tracker',
  '/adl-logging': 'ADL Logging',
  '/policies': 'Policies & Renewals',
  '/team-chat': 'Team Chat',
  '/notes': 'Notes & Tasks',
  '/proposals': 'Proposals',
  '/contracts/new': 'Create Contract',
  '/templates': 'OCR Templates',
  '/documents': 'Documents',
  '/reports': 'Reports',
  '/help': 'Help & Support',
  '/caregivers': 'Team Members',
  '/billing': 'Billing',
  '/activity': 'Activity Monitor',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
  '/admin': 'Admin Dashboard',
  '/admin/quick-setup': 'Quick Setup',
  '/admin/approvals': 'Approvals',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/billing': 'Stripe Config',
  '/admin/compliance': 'Compliance',
  '/admin/support': 'Support',
  '/admin/audit': 'Audit Logs',
  '/admin/users': 'Platform Users',
  '/admin/system': 'System Health',
  '/admin/incidents': 'Status Page',
  '/admin/sales-leads': 'Sales Leads',
  '/admin/analytics': 'Analytics',
  '/messages': 'Messages',
  '/welcome': 'Welcome',
};

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [];

  if (BREADCRUMB_MAP[pathname]) {
    crumbs.push({ label: BREADCRUMB_MAP[pathname], href: pathname });
  } else {
    const segments = pathname.split('/').filter(Boolean);
    let path = '';
    for (const seg of segments) {
      path += `/${seg}`;
      const label = BREADCRUMB_MAP[path] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
      crumbs.push({ label, href: path });
    }
  }

  return crumbs;
}

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

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } = useNotifications();
  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.category === filter);
  const categoryCounts = notifications.reduce<Record<string, number>>((acc, n) => {
    if (!n.read) acc[n.category] = (acc[n.category] || 0) + 1;
    return acc;
  }, {});

  const handleClick = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.link) {
      router.push(notif.link, { scroll: false });
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-full mt-1 w-[380px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-500 rounded-full min-w-[18px] text-center" style={{ color: '#fff' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-slate-50 rounded transition-colors" title="Mark all as read">
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Clear all">
              <BellOff className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
            filter === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                filter === key ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <meta.icon className={`w-3 h-3 ${filter === key ? meta.color : ''}`} />
              {meta.label}
              {count > 0 && <span className={`ml-0.5 px-1 py-px text-[9px] rounded ${meta.bg} ${meta.color}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No notifications</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
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
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                    !notif.read ? 'bg-primary-50/40' : ''
                  }`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg} mt-0.5`}>
                    <IconComponent className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {!notif.read && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_INDICATOR[notif.priority || 'low']}`} />}
                      <p className={`text-xs font-medium truncate ${!notif.read ? 'text-slate-800' : 'text-slate-500'}`}>{notif.title}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{timeAgo(notif.timestamp)}</span>
                      {notif.link && (
                        <span className="text-[10px] text-primary-500 flex items-center gap-0.5">View <ChevronRight className="w-2.5 h-2.5" /></span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                    className="shrink-0 p-1 text-slate-300 hover:text-slate-500 transition-colors"
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

      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 text-center">
          <button
            onClick={() => { router.push('/schedule', { scroll: false }); onClose(); }}
            className="text-[11px] text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            View full schedule
          </button>
        </div>
      )}
    </div>
  );
}

interface SearchableItem {
  label: string;
  href: string;
  keywords: string[];
  category: 'page' | 'action';
  icon: React.ComponentType<{ className?: string }>;
}

const SEARCHABLE_ITEMS: SearchableItem[] = [
  { label: 'Dashboard',        href: '/dashboard',        keywords: ['home', 'overview', 'summary'],                    category: 'page', icon: Layout },
  { label: 'Clients',          href: '/clients',          keywords: ['patients', 'contacts', 'people', 'customer'],     category: 'page', icon: Users },
  { label: 'Deals Pipeline',   href: '/pipeline',         keywords: ['deals', 'sales', 'funnel', 'opportunities'],      category: 'page', icon: BarChart3 },
  { label: 'Leads',            href: '/leads',            keywords: ['prospects', 'inquiries'],                          category: 'page', icon: Users },
  { label: 'Assessments',      href: '/visits',           keywords: ['visits', 'evaluations', 'intake'],                category: 'page', icon: Zap },
  { label: 'New Assessment',   href: '/visits/new',       keywords: ['create assessment', 'new visit', 'start'],        category: 'action', icon: PlusCircle },
  { label: 'Schedule',         href: '/schedule',         keywords: ['calendar', 'appointments', 'events'],             category: 'page', icon: CalendarDays },
  { label: 'Care Tracker',     href: '/care-tracker',     keywords: ['tracking', 'care plans', 'monitoring'],           category: 'page', icon: CheckSquare },
  { label: 'ADL Logging',      href: '/adl-logging',      keywords: ['activities daily living', 'adl'],                 category: 'page', icon: FileText },
  { label: 'Notes & Tasks',    href: '/notes',            keywords: ['notes', 'tasks', 'reminders', 'todo'],            category: 'page', icon: FileText },
  { label: 'Proposals',        href: '/proposals',        keywords: ['quotes', 'bids'],                                 category: 'page', icon: FileText },
  { label: 'Contracts',        href: '/contracts/new',    keywords: ['agreements', 'create contract'],                   category: 'action', icon: PlusCircle },
  { label: 'Documents',        href: '/documents',        keywords: ['files', 'uploads', 'records'],                    category: 'page', icon: FileText },
  { label: 'Templates',        href: '/templates',        keywords: ['ocr', 'forms', 'document templates'],             category: 'page', icon: FileText },
  { label: 'Team Chat',        href: '/team-chat',        keywords: ['messages', 'chat', 'communication'],              category: 'page', icon: MessageSquare },
  { label: 'Messages',         href: '/messages',         keywords: ['inbox', 'email', 'sms'],                          category: 'page', icon: Mail },
  { label: 'Team Members',     href: '/caregivers',       keywords: ['staff', 'caregivers', 'employees'],               category: 'page', icon: Users },
  { label: 'Reports',          href: '/reports',          keywords: ['analytics', 'metrics', 'data'],                   category: 'page', icon: BarChart3 },
  { label: 'Billing & Plans',  href: '/billing',          keywords: ['subscription', 'payment', 'invoice', 'stripe'],   category: 'page', icon: CreditCard },
  { label: 'Integrations',     href: '/integrations',     keywords: ['connect', 'api', 'google', 'calendar'],           category: 'page', icon: Shield },
  { label: 'Settings',         href: '/settings',         keywords: ['preferences', 'account', 'profile', 'config'],    category: 'page', icon: Settings },
  { label: 'Help & Support',   href: '/help',             keywords: ['faq', 'documentation', 'contact'],                category: 'page', icon: Headphones },
];

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { open: openTour } = useWalkthrough();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showNotifications]);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && searchFocused) {
        setSearchFocused(false);
        setSearchQuery('');
        searchRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_ITEMS.filter(item => {
      if (item.label.toLowerCase().includes(q)) return true;
      return item.keywords.some(kw => kw.includes(q));
    }).slice(0, 8);
  }, [searchQuery]);

  const showSearchDropdown = searchFocused && searchQuery.trim().length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      e.preventDefault();
      router.push(searchResults[selectedIndex].href, { scroll: false });
      setSearchQuery('');
      setSearchFocused(false);
      searchRef.current?.blur();
    }
  };

  const handleSearchSelect = (href: string) => {
    router.push(href, { scroll: false });
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      const authData = localStorage.getItem('palmcare-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token;
        if (token) {
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
          await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        }
      }
    } catch { /* Best-effort */ }
    logout();
    router.push('/login', { scroll: false });
  };

  const initials = (user?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        {/* Left: Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <button onClick={() => router.push('/dashboard', { scroll: false })} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
            <Home className="w-4 h-4" />
          </button>
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-slate-800 truncate">{crumb.label}</span>
              ) : (
                <button
                  onClick={() => router.push(crumb.href, { scroll: false })}
                  className="text-slate-400 hover:text-slate-600 transition-colors truncate"
                >
                  {crumb.label}
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Center: Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8 relative" ref={searchContainerRef}>
          <div className={`flex items-center w-full px-3 py-1.5 rounded-lg border transition-colors ${
            searchFocused ? 'border-primary-300 bg-white ring-2 ring-primary-50' : 'border-slate-200 bg-slate-50'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search pages, clients, actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              className="w-full ml-2 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
            {searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                className="p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
              {searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((item, i) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleSearchSelect(item.href)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          i === selectedIndex ? 'bg-primary-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                          i === selectedIndex ? 'bg-primary-100' : 'bg-slate-100'
                        }`}>
                          <IconComp className={`w-3.5 h-3.5 ${i === selectedIndex ? 'text-primary-600' : 'text-slate-500'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${i === selectedIndex ? 'text-primary-700' : 'text-slate-800'}`}>
                            {item.label}
                          </p>
                          <p className="text-[10px] text-slate-400 capitalize">{item.category}</p>
                        </div>
                        {i === selectedIndex && (
                          <span className="text-[10px] text-slate-400">↵</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <Search className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-sm text-slate-500">No results for &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try searching for pages or features</p>
                </div>
              )}
              <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] border border-slate-200">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] border border-slate-200">↵</kbd> select</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] border border-slate-200">esc</kbd> close</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef} data-tour="notifications">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-lg transition-colors ${
                showNotifications ? 'text-slate-700 bg-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[9px] font-bold bg-red-500 rounded-full border-2 border-white" style={{ color: '#fff' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
          </div>

          {/* Settings shortcut */}
          <button
            onClick={() => router.push('/settings', { scroll: false })}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors hidden sm:flex"
            title="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          {/* User Menu */}
          <div className="relative" ref={menuRef} data-tour="user-menu">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="font-semibold text-xs" style={{ color: '#fff' }}>{initials}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-800">{user?.full_name || 'User'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/settings', { scroll: false }); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Profile & Settings
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); openTour(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  App Tour
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
