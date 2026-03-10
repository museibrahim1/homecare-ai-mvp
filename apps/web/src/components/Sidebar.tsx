'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Calendar, Users, UserCheck, BarChart3, Settings, LogOut,
  Mic, Link2, FileText, ChevronRight, Shield, Building2, CreditCard,
  AlertTriangle, Ticket, Activity, DollarSign, Target, CalendarDays, TrendingUp,
  MessageSquare, MessagesSquare, FolderOpen, UserCog, Eye, RefreshCw,
  HelpCircle, HeartPulse, FilePlus, Layers, Menu, X, Zap,
  ChevronDown, LucideIcon, Rocket, Phone
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NavItemData {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
}

interface NavSectionData {
  title: string;
  items: NavItemData[];
  defaultOpen?: boolean;
}

const salesNavItems: NavItemData[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/pipeline', label: 'Deals Pipeline', icon: Target },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/schedule', label: 'My Schedule', icon: CalendarDays },
];

const clientsNavItems: NavItemData[] = [
  { href: '/clients', label: 'All Clients', icon: Users },
  { href: '/visits', label: 'Assessments', icon: Calendar },
  { href: '/care-tracker', label: 'Care Tracker', icon: Activity },
  { href: '/adl-logging', label: 'ADL Logging', icon: HeartPulse },
  { href: '/policies', label: 'Policies & Renewals', icon: RefreshCw },
];

const communicationNavItems: NavItemData[] = [
  { href: '/team-chat', label: 'Team Chat', icon: MessagesSquare },
  { href: '/notes', label: 'Notes & Tasks', icon: FileText },
];

const resourcesNavItems: NavItemData[] = [
  { href: '/proposals', label: 'Proposals', icon: FileText },
  { href: '/contracts/new', label: 'Create Contract', icon: FilePlus },
  { href: '/templates', label: 'OCR Templates', icon: Layers },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/help', label: 'Help & Support', icon: HelpCircle },
];

const agencyAdminNavItems: NavItemData[] = [
  { href: '/caregivers', label: 'Team Members', icon: UserCheck },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/activity', label: 'Activity Monitor', icon: Eye },
  { href: '/integrations', label: 'Integrations', icon: Link2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminCoreNavItems: NavItemData[] = [
  { href: '/admin/command-center', label: 'Command Center', icon: Rocket },
  { href: '/admin/sales-leads', label: 'Sales Leads', icon: Target },
  { href: '/admin/investors', label: 'Investors', icon: TrendingUp },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const adminSystemNavItems: NavItemData[] = [
  { href: '/admin', label: 'Overview', icon: BarChart3 },
  { href: '/admin/approvals', label: 'Approvals', icon: Building2 },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/users', label: 'Users', icon: UserCheck },
  { href: '/admin/system', label: 'System', icon: Activity },
  { href: '/admin/audit', label: 'Audit', icon: FileText },
];

const NavItem = memo(function NavItem({ 
  item, isActive, onNavigate 
}: { 
  item: NavItemData; isActive: boolean; onNavigate: (href: string) => void;
}) {
  const ItemIcon = item.icon;
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigate(item.href);
  };
  
  return (
    <Link
      href={item.href}
      scroll={false}
      prefetch={true}
      onClick={handleClick}
      className={`flex items-center gap-2.5 px-3 py-[7px] rounded-md transition-all group cursor-pointer select-none text-[13px] ${
        isActive 
          ? 'bg-primary-50 text-primary-700 font-semibold' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 font-medium'
      }`}
    >
      <ItemIcon className={`w-4 h-4 flex-shrink-0 ${
        isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-500'
      }`} />
      <span className="truncate flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          isActive ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {item.badge}
        </span>
      )}
    </Link>
  );
});

const CollapsibleSection = memo(function CollapsibleSection({ 
  title, items, pathname, onNavigate, defaultOpen = true 
}: { 
  title: string; items: NavItemData[]; pathname: string; onNavigate: (href: string) => void; defaultOpen?: boolean;
}) {
  const hasActiveItem = items.some(item => 
    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  );
  const [open, setOpen] = useState(defaultOpen || hasActiveItem);

  useEffect(() => {
    if (hasActiveItem && !open) setOpen(true);
  }, [hasActiveItem, open]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 group"
      >
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest group-hover:text-slate-500 transition-colors">
          {title}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-300 group-hover:text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="space-y-px pb-2">
          {items.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <NavItem key={item.href} item={item} isActive={isActive} onNavigate={onNavigate} />
            );
          })}
        </div>
      )}
    </div>
  );
});

let _sidebarScrollTop = 0;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, hydrated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isAdmin = user?.role === 'admin';

  const handleNavigate = useCallback((href: string) => {
    if (navRef.current) _sidebarScrollTop = navRef.current.scrollTop;
    setMobileOpen(false);
    router.push(href, { scroll: false });
  }, [router]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (_sidebarScrollTop > 0) nav.scrollTop = _sidebarScrollTop;
    const handleScroll = () => { _sidebarScrollTop = nav.scrollTop; };
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = useCallback(async () => {
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
  }, [logout, router]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 z-[55]" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        w-60 bg-white border-r border-slate-200 flex flex-col h-screen flex-shrink-0
        fixed lg:sticky top-0 left-0 z-[60] pointer-events-auto
        transition-transform duration-200 ease-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="px-4 py-4 flex-shrink-0 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={(e) => { e.preventDefault(); handleNavigate('/dashboard'); }}>
            <div className="w-8 h-8 flex-shrink-0 bg-primary-500 rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="Palm Technologies" width={22} height={22} className="object-contain" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-slate-900 block leading-tight">PalmCare AI</span>
              <span className="text-[10px] text-slate-400 leading-tight">Home Care Platform</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav ref={navRef} data-tour="sidebar-nav" className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden min-h-0">
          <CollapsibleSection title="Overview" items={salesNavItems} pathname={pathname} onNavigate={handleNavigate} defaultOpen={true} />
          <CollapsibleSection title="Clients" items={clientsNavItems} pathname={pathname} onNavigate={handleNavigate} defaultOpen={true} />
          <CollapsibleSection title="Communication" items={communicationNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <CollapsibleSection title="Resources" items={resourcesNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <CollapsibleSection title="Administration" items={agencyAdminNavItems} pathname={pathname} onNavigate={handleNavigate} />

          {isAdmin && (
            <>
              <div className="mb-1">
                <button
                  onClick={() => {}}
                  className="flex items-center justify-between w-full px-3 py-2"
                >
                  <span className="text-[10px] font-semibold text-primary-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Rocket className="w-3 h-3" />
                    CEO Workspace
                  </span>
                </button>
                <div className="space-y-px pb-2">
                  {adminCoreNavItems.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== '/admin' && item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return <NavItem key={item.href} item={item} isActive={isActive} onNavigate={handleNavigate} />;
                  })}
                </div>
              </div>
              <CollapsibleSection title="System Admin" items={adminSystemNavItems} pathname={pathname} onNavigate={handleNavigate} defaultOpen={false} />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 flex-shrink-0">
          {/* User */}
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="font-semibold text-[11px]" style={{ color: '#fff' }}>
                {user?.full_name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-medium truncate text-[12px] leading-tight">
                {user?.full_name || 'Admin User'}
              </p>
              <p className="text-slate-400 text-[10px] truncate leading-tight">
                {user?.email || 'User'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
