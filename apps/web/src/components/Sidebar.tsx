'use client';

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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

// Sales & Pipeline
const salesNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, description: 'Overview & stats' },
  { href: '/pipeline', label: 'Deals Pipeline', icon: Target, description: 'Track opportunities' },
  { href: '/leads', label: 'Leads', icon: Users, description: 'Potential clients' },
  { href: '/schedule', label: 'My Schedule', icon: CalendarDays, description: 'Appointments' },
];

// Clients section
const clientsNavItems = [
  { href: '/clients', label: 'All Clients', icon: Users, description: 'Client records' },
  { href: '/visits', label: 'Assessments', icon: Calendar, description: 'Intakes & visits' },
  { href: '/policies', label: 'Policies & Renewals', icon: RefreshCw, description: 'Care agreements' },
];

// Communication
const communicationNavItems = [
  { href: '/messages', label: 'Messages', icon: MessageSquare, description: 'Client comms' },
  { href: '/team-chat', label: 'Team Chat', icon: MessagesSquare, description: 'Internal chat' },
];

// Resources
const resourcesNavItems = [
  { href: '/documents', label: 'Documents', icon: FolderOpen, description: 'Files & contracts' },
  { href: '/reports', label: 'Reports', icon: BarChart3, description: 'Analytics' },
];

// Agency Admin
const agencyAdminNavItems = [
  { href: '/caregivers', label: 'Team Members', icon: UserCheck, description: 'Staff management' },
  { href: '/activity', label: 'Activity Monitor', icon: Eye, description: 'Track actions' },
  { href: '/integrations', label: 'Integrations', icon: Link2, description: 'Connect apps' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Agency settings' },
];

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3, description: 'Platform overview' },
  { href: '/admin/approvals', label: 'Approvals', icon: Building2, description: 'Review applications' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard, description: 'Active subs' },
  { href: '/admin/billing', label: 'Stripe Config', icon: DollarSign, description: 'Price IDs' },
  { href: '/admin/compliance', label: 'Compliance', icon: AlertTriangle, description: 'License tracking' },
  { href: '/admin/support', label: 'Support', icon: Ticket, description: 'Help tickets' },
  { href: '/admin/audit', label: 'Audit Logs', icon: FileText, description: 'Activity tracking' },
  { href: '/admin/users', label: 'Platform Users', icon: UserCheck, description: 'Admin accounts' },
  { href: '/admin/system', label: 'System Health', icon: Activity, description: 'Infrastructure' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, hydrated } = useAuth();

  // Debug: log user data to understand why admin section might not show
  const isAdmin = user?.role === 'admin';
  if (typeof window !== 'undefined') {
    console.log('[Sidebar] hydrated:', hydrated, '| user exists:', !!user, '| user.role:', user?.role, '| isAdmin:', isAdmin);
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const NavItem = ({ item }: { item: typeof salesNavItems[0] }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/dashboard' && pathname.startsWith(item.href));
    
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
          isActive 
            ? 'bg-primary-500/15 text-white border border-primary-500/30' 
            : 'text-dark-300 hover:bg-dark-700/50 hover:text-white border border-transparent'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          isActive 
            ? 'bg-primary-500/20' 
            : 'bg-dark-700/50 group-hover:bg-dark-600/50'
        }`}>
          <item.icon className={`w-4 h-4 ${
            isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-white'
          }`} />
        </div>
        <span className={`font-medium text-sm ${isActive ? 'text-white' : ''}`}>
          {item.label}
        </span>
        {isActive && (
          <ChevronRight className="w-3.5 h-3.5 text-primary-400 ml-auto" />
        )}
      </Link>
    );
  };

  return (
    <aside className="w-72 bg-dark-800/80 backdrop-blur-md border-r border-dark-700/50 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/dashboard" className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white block">Homecare AI</span>
            <span className="text-xs text-dark-400">Contracts & proposals</span>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto">
        {/* Sales Section */}
        <div className="mb-5">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              Sales
            </span>
          </div>
          <div className="space-y-1">
            {salesNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Clients Section */}
        <div className="mb-5">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              Clients
            </span>
          </div>
          <div className="space-y-1">
            {clientsNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Communication Section */}
        <div className="mb-5">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              Communication
            </span>
          </div>
          <div className="space-y-1">
            {communicationNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Resources Section */}
        <div className="mb-5">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              Resources
            </span>
          </div>
          <div className="space-y-1">
            {resourcesNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Agency Admin Section */}
        <div className="mb-5">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="space-y-1">
            {agencyAdminNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Admin Section - Only visible to platform admins */}
        {isAdmin && (
          <div className="mb-6">
            <div className="px-4 py-2 mb-2">
              <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Platform Admin
              </span>
            </div>
            <div className="space-y-1.5">
              {adminNavItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-dark-700/50 bg-dark-800/50">
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
              {user?.email || 'admin@homecare.ai'}
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
  );
}
