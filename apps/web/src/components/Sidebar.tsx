'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Users, 
  UserCheck,
  BarChart3, 
  Settings, 
  LogOut,
  Mic,
  Link2,
  FileText,
  ChevronRight,
  Shield,
  Building2,
  CreditCard,
  AlertTriangle,
  Ticket,
  Activity,
  DollarSign,
  Target,
  CalendarDays,
  MessageSquare,
  MessagesSquare,
  FolderOpen,
  UserCog,
  Eye,
  RefreshCw,
  HelpCircle,
  HeartPulse,
  FilePlus,
  Layers,
  Menu,
  X,
  Sun,
  Moon,
  Zap,
  LucideIcon
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

// Nav item type
interface NavItemData {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

// Sales & Pipeline
const salesNavItems: NavItemData[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, description: 'Overview & stats' },
  { href: '/pipeline', label: 'Deals Pipeline', icon: Target, description: 'Track opportunities' },
  { href: '/leads', label: 'Leads', icon: Users, description: 'Potential clients' },
  { href: '/schedule', label: 'My Schedule', icon: CalendarDays, description: 'Appointments' },
];

// Clients section
const clientsNavItems: NavItemData[] = [
  { href: '/clients', label: 'All Clients', icon: Users, description: 'Client records' },
  { href: '/visits', label: 'Assessments', icon: Calendar, description: 'Intakes & visits' },
  { href: '/care-tracker', label: 'Care Tracker', icon: Activity, description: 'Post-visit follow-ups' },
  { href: '/adl-logging', label: 'ADL Logging', icon: HeartPulse, description: 'Activities of daily living' },
  { href: '/policies', label: 'Policies & Renewals', icon: RefreshCw, description: 'Care agreements' },
];

// Communication
const communicationNavItems: NavItemData[] = [
  { href: '/team-chat', label: 'Team Chat', icon: MessagesSquare, description: 'Internal chat' },
  { href: '/notes', label: 'Notes & Tasks', icon: FileText, description: 'AI-powered notes' },
];

// Resources
const resourcesNavItems: NavItemData[] = [
  { href: '/proposals', label: 'Proposals', icon: FileText, description: 'Contract proposals' },
  { href: '/contracts/new', label: 'Create Contract', icon: FilePlus, description: 'Manual contract' },
  { href: '/templates', label: 'OCR Templates', icon: Layers, description: 'Upload & scan templates' },
  { href: '/documents', label: 'Documents', icon: FolderOpen, description: 'Files & contracts' },
  { href: '/reports', label: 'Reports', icon: BarChart3, description: 'Analytics' },
  { href: '/help', label: 'Help & Support', icon: HelpCircle, description: 'Get help' },
];

// Agency Admin
const agencyAdminNavItems: NavItemData[] = [
  { href: '/caregivers', label: 'Team Members', icon: UserCheck, description: 'Staff management' },
  { href: '/billing', label: 'Billing', icon: CreditCard, description: 'Plans & payments' },
  { href: '/activity', label: 'Activity Monitor', icon: Eye, description: 'Track actions' },
  { href: '/integrations', label: 'Integrations', icon: Link2, description: 'Connect apps' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Agency settings' },
];

const adminNavItems: NavItemData[] = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3, description: 'Platform overview' },
  { href: '/admin/quick-setup', label: 'Quick Setup', icon: Zap, description: 'Onboard new agency' },
  { href: '/admin/approvals', label: 'Approvals', icon: Building2, description: 'Review applications' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, description: 'Active subs' },
  { href: '/admin/billing', label: 'Stripe Config', icon: DollarSign, description: 'Price IDs' },
  { href: '/admin/compliance', label: 'Compliance', icon: AlertTriangle, description: 'License tracking' },
  { href: '/admin/support', label: 'Support', icon: Ticket, description: 'Help tickets' },
  { href: '/admin/audit', label: 'Audit Logs', icon: FileText, description: 'Activity tracking' },
  { href: '/admin/users', label: 'Platform Users', icon: UserCheck, description: 'Admin accounts' },
  { href: '/admin/system', label: 'System Health', icon: Activity, description: 'Infrastructure' },
  { href: '/admin/incidents', label: 'Status Page', icon: AlertTriangle, description: 'Incident management' },
  { href: '/admin/sales-leads', label: 'Sales Leads', icon: Target, description: 'Outbound CRM' },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, description: 'Churn & engagement' },
];

// NavItem defined OUTSIDE the Sidebar to prevent re-creation on every render
const NavItem = memo(function NavItem({ 
  item, 
  isActive, 
  onNavigate 
}: { 
  item: NavItemData; 
  isActive: boolean; 
  onNavigate: (href: string) => void;
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
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group cursor-pointer select-none ${
        isActive 
          ? 'bg-primary-50 text-primary-700 border-l-[3px] border-l-primary-500 -ml-px' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <ItemIcon className={`w-[18px] h-[18px] flex-shrink-0 ${
        isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-600'
      }`} />
      <span className={`text-[13px] truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
        {item.label}
      </span>
    </Link>
  );
});

// NavSection to reduce boilerplate
const NavSection = memo(function NavSection({ 
  title, 
  items, 
  pathname, 
  onNavigate 
}: { 
  title: string; 
  items: NavItemData[]; 
  pathname: string; 
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="px-3 py-1.5 mb-1">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <NavItem 
              key={item.href} 
              item={item} 
              isActive={isActive} 
              onNavigate={onNavigate} 
            />
          );
        })}
      </div>
    </div>
  );
});

// Module-level: survives component remounts across page navigations
let _sidebarScrollTop = 0;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, hydrated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const isAdmin = user?.role === 'admin';

  // Stable navigate callback that won't change on re-renders
  const handleNavigate = useCallback((href: string) => {
    // Save scroll before navigating
    if (navRef.current) {
      _sidebarScrollTop = navRef.current.scrollTop;
    }
    setMobileOpen(false);
    router.push(href, { scroll: false });
  }, [router]);

  // Restore sidebar scroll position after mount / navigation
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // Restore saved position
    if (_sidebarScrollTop > 0) {
      nav.scrollTop = _sidebarScrollTop;
    }

    // Track scroll changes
    const handleScroll = () => {
      _sidebarScrollTop = nav.scrollTop;
    };
    nav.addEventListener('scroll', handleScroll, { passive: true });

    return () => nav.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = useCallback(async () => {
    // Call backend to clear Google tokens so user must reconnect next login
    try {
      const authData = localStorage.getItem('palmcare-auth');
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
    } catch {
      // Best-effort — proceed with frontend logout regardless
    }
    logout();
    router.push('/login', { scroll: false });
  }, [logout, router]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 z-[55]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 bg-white border-r border-slate-200 flex flex-col h-screen flex-shrink-0
        fixed lg:sticky top-0 left-0 z-[60] pointer-events-auto
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="px-5 py-5 flex-shrink-0 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={(e) => { e.preventDefault(); handleNavigate('/dashboard'); }}>
            <div className="w-9 h-9 flex-shrink-0 bg-primary-500 rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/hand-icon-white.png" alt="Palm Technologies" width={26} height={26} className="object-contain" />
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold text-slate-900 block leading-tight">PalmCare AI</span>
              <span className="text-[11px] text-slate-400 leading-tight">Home Care Platform</span>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav ref={navRef} data-tour="sidebar-nav" className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden min-h-0">
          <NavSection title="Sales" items={salesNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Clients" items={clientsNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Communication" items={communicationNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Resources" items={resourcesNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Admin" items={agencyAdminNavItems} pathname={pathname} onNavigate={handleNavigate} />

          {/* Platform Admin Section */}
          {isAdmin && (
            <div className="mb-4">
              <div className="px-3 py-2 mb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Platform Admin
                </span>
              </div>
              <div className="space-y-0.5">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <NavItem key={item.href} item={item} isActive={isActive} onNavigate={handleNavigate} />
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Theme Toggle */}
        <div className="px-3 pb-2 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors text-[13px] font-medium"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-400" />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* User Section */}
        <div className="px-3 pb-3 pt-2 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-slate-50">
            <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm" style={{ color: '#fff' }}>
                {user?.full_name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 font-medium truncate text-[13px]">
                {user?.full_name || 'Admin User'}
              </p>
              <p className="text-slate-400 text-[11px] truncate">
                {user?.email || 'admin@palmtai.com'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 w-full rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors text-[13px] font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
