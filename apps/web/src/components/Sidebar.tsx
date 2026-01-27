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
  Building2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

// Main navigation items grouped by category
const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: Home, description: 'Overview & stats' },
  { href: '/visits', label: 'Assessments', icon: Calendar, description: 'Intakes & visits' },
  { href: '/clients', label: 'Clients', icon: Users, description: 'Client records' },
];

const managementNavItems = [
  { href: '/caregivers', label: 'Caregivers', icon: UserCheck, description: 'Staff management' },
  { href: '/reports', label: 'Reports', icon: BarChart3, description: 'Analytics' },
];

const systemNavItems = [
  { href: '/integrations', label: 'Integrations', icon: Link2, description: 'Connect apps' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Agency settings' },
];

const adminNavItems = [
  { href: '/admin/businesses', label: 'Business Approvals', icon: Building2, description: 'Review applications' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const NavItem = ({ item }: { item: typeof mainNavItems[0] }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/' && pathname.startsWith(item.href));
    
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
          isActive 
            ? 'bg-primary-500/15 text-white border border-primary-500/30' 
            : 'text-dark-300 hover:bg-dark-700/50 hover:text-white border border-transparent'
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          isActive 
            ? 'bg-primary-500/20' 
            : 'bg-dark-700/50 group-hover:bg-dark-600/50'
        }`}>
          <item.icon className={`w-5 h-5 ${
            isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-white'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-medium block ${isActive ? 'text-white' : ''}`}>
            {item.label}
          </span>
          <span className="text-xs text-dark-500 block">
            {item.description}
          </span>
        </div>
        {isActive && (
          <ChevronRight className="w-4 h-4 text-primary-400" />
        )}
      </Link>
    );
  };

  return (
    <aside className="w-72 bg-dark-800/80 backdrop-blur-md border-r border-dark-700/50 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/" className="flex items-center gap-4">
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
        {/* Primary Section */}
        <div className="mb-6">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              Main
            </span>
          </div>
          <div className="space-y-1.5">
            {mainNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Management Section */}
        <div className="mb-6">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              Management
            </span>
          </div>
          <div className="space-y-1.5">
            {managementNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* System Section */}
        <div className="mb-6">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider">
              System
            </span>
          </div>
          <div className="space-y-1.5">
            {systemNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Admin Section */}
        <div className="mb-6">
          <div className="px-4 py-2 mb-2">
            <span className="text-[11px] font-semibold text-dark-500 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          </div>
          <div className="space-y-1.5">
            {adminNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>
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
