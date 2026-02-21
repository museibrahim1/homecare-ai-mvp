'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
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
  FilePlus,
  Layers,
  Menu,
  X,
  Sun,
  Moon,
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
  { href: '/policies', label: 'Policies & Renewals', icon: RefreshCw, description: 'Care agreements' },
];

// Communication
const communicationNavItems: NavItemData[] = [
  { href: '/team-chat', label: 'Team Chat', icon: MessagesSquare, description: 'Internal chat' },
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
  { href: '/admin/approvals', label: 'Approvals', icon: Building2, description: 'Review applications' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, description: 'Active subs' },
  { href: '/admin/billing', label: 'Stripe Config', icon: DollarSign, description: 'Price IDs' },
  { href: '/admin/compliance', label: 'Compliance', icon: AlertTriangle, description: 'License tracking' },
  { href: '/admin/support', label: 'Support', icon: Ticket, description: 'Help tickets' },
  { href: '/admin/audit', label: 'Audit Logs', icon: FileText, description: 'Activity tracking' },
  { href: '/admin/users', label: 'Platform Users', icon: UserCheck, description: 'Admin accounts' },
  { href: '/admin/system', label: 'System Health', icon: Activity, description: 'Infrastructure' },
  { href: '/admin/incidents', label: 'Status Page', icon: AlertTriangle, description: 'Incident management' },
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer select-none ${
        isActive 
          ? 'bg-primary-500/15 text-white border border-primary-500/30' 
          : 'text-dark-300 hover:bg-dark-700/50 hover:text-white border border-transparent'
      }`}
    >
      <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center ${
        isActive 
          ? 'bg-primary-500/20' 
          : 'bg-dark-700/50 group-hover:bg-dark-600/50'
      }`}>
        <ItemIcon className={`w-4 h-4 ${
          isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-white'
        }`} />
      </div>
      <span className={`font-medium text-sm truncate ${isActive ? 'text-white' : ''}`}>
        {item.label}
      </span>
      {isActive && (
        <ChevronRight className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 ml-auto" />
      )}
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
    <div className="mb-5">
      <div className="px-4 py-2 mb-2">
        <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="space-y-1">
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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, hydrated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const isAdmin = user?.role === 'admin';

  // Stable navigate callback that won't change on re-renders
  const handleNavigate = useCallback((href: string) => {
    setMobileOpen(false);
    router.push(href, { scroll: false });
  }, [router]);

  // Preserve sidebar scroll position — only set up listener once (not on every pathname change)
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleScroll = () => {
      scrollPositionRef.current = nav.scrollTop;
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-800 border border-dark-700 rounded-lg text-white hover:bg-dark-700 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-[55]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-72 bg-dark-800 border-r border-dark-700/50 flex flex-col h-screen flex-shrink-0
        fixed lg:sticky top-0 left-0 z-[60] pointer-events-auto
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-dark-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="px-6 py-6 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-4" onClick={(e) => { e.preventDefault(); handleNavigate('/dashboard'); }}>
            <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-xl font-bold text-white block">PalmCare AI</span>
              <span className="text-xs text-dark-400">Contracts & proposals</span>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav ref={navRef} data-tour="sidebar-nav" className="flex-1 px-4 pb-4 overflow-y-auto overflow-x-hidden min-h-0">
          <NavSection title="Sales" items={salesNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Clients" items={clientsNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Communication" items={communicationNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Resources" items={resourcesNavItems} pathname={pathname} onNavigate={handleNavigate} />
          <NavSection title="Admin" items={agencyAdminNavItems} pathname={pathname} onNavigate={handleNavigate} />

          {/* Platform Admin Section */}
          {isAdmin && (
            <div className="mb-6">
              <div className="px-4 py-2 mb-2">
                <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Platform Admin
                </span>
              </div>
              <div className="space-y-1.5">
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
        <div className="px-4 pb-2 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-dark-300 hover:bg-dark-700/50 hover:text-white transition-all duration-200 border border-dark-700/50 hover:border-dark-600"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-dark-700/50">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </div>
            <span className="text-sm font-medium">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-dark-700/50 bg-dark-800/50 flex-shrink-0">
          <div className="flex items-center gap-4 px-3 py-3 mb-3 bg-dark-700/30 rounded-xl">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">
                {user?.full_name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm">
                {user?.full_name || 'Admin User'}
              </p>
              <p className="text-dark-400 text-xs truncate">
                {user?.email || 'admin@palmtai.com'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 w-full rounded-xl text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 border border-dark-700/50 hover:border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
