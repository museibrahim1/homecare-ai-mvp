'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  Target,
  Calendar,
  FolderOpen,
  CalendarDays,
  UserCheck,
  CreditCard,
  HelpCircle,
  Settings,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import PalmOrb from '@/components/glass/PalmOrb';

const NAV: { href: string; label: string; icon: LucideIcon; match?: string[] }[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/clients', label: 'Clients', icon: Users, match: ['/clients'] },
  { href: '/pipeline', label: 'Sales', icon: Target, match: ['/pipeline', '/leads'] },
  { href: '/visits', label: 'Visits', icon: Calendar },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/schedule', label: 'Calendar', icon: CalendarDays },
  { href: '/caregivers', label: 'Team', icon: UserCheck },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/help', label: 'Help', icon: HelpCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(pathname: string, item: (typeof NAV)[number]) {
  if (item.match) return item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

export default function GlassRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = useCallback(
    (href: string) => {
      setMobileOpen(false);
      router.push(href, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const initials =
    user?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'MS';

  const rail = (
    <aside className="glass-rail w-[240px] h-full flex flex-col justify-between py-7 px-5 overflow-hidden">
      <div className="flex flex-col gap-[30px] min-h-0 flex-1">
        <Link
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            go('/dashboard');
          }}
          className="flex items-center px-1 gap-3 shrink-0"
        >
          <PalmOrb size={48} className="shrink-0" />
          <span className="text-[22px] tracking-[0.12em] font-extrabold leading-tight text-[#10211F]">
            PALM
          </span>
        </Link>

        <nav className="flex flex-col gap-1 overflow-y-auto min-h-0 pr-0.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                scroll={false}
                onClick={(e) => {
                  e.preventDefault();
                  go(item.href);
                }}
                className={`relative flex items-center h-11 px-3.5 rounded-xl gap-3 shrink-0 transition-colors ${
                  active
                    ? 'bg-[#0D94881F] text-primary-600 font-semibold'
                    : 'text-[#4B6B66] font-medium hover:bg-white/50'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary-500" />
                )}
                <Icon
                  className={`w-5 h-5 shrink-0 ${active ? 'text-primary-500' : 'text-[#7A8C88]'}`}
                />
                <span className="text-[15px] leading-[18px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 shrink-0 pt-4">
        <div className="flex items-center py-2.5 px-3 rounded-2xl gap-2.5 bg-[#FFFFFF99] border border-[#FFFFFFE0]">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-primary-500">
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="text-sm font-semibold leading-[18px] text-[#10211F] truncate">
              {user?.full_name || 'Maria Santos'}
            </div>
            <div className="text-xs font-medium leading-4 text-slate-500 truncate">
              {(user as { business_name?: string })?.business_name || 'Sunrise Home Care'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            } catch {
              /* best-effort */
            }
            logout();
            router.push('/login', { scroll: false });
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#4B6B66] hover:text-[#10211F] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/80 border border-white rounded-xl text-[#10211F] shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[#10211F]/25 z-[55]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Fixed rail: html/body overflow-x:hidden breaks position:sticky */}
      <div className="hidden md:block w-[240px] shrink-0" aria-hidden="true" />
      <div className="hidden md:block fixed top-0 left-0 h-screen z-20">
        {rail}
      </div>

      <div
        className={`md:hidden fixed top-0 left-0 h-screen z-[60] transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 z-10 p-1.5 text-slate-400"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        {rail}
      </div>
    </>
  );
}
