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
  Link2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/visits', label: 'Visits', icon: Calendar },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/caregivers', label: 'Caregivers', icon: UserCheck },
  { href: '/integrations', label: 'Integrations', icon: Link2 },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-dark-800/50 backdrop-blur-sm border-r border-dark-700/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-dark-700/50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-button rounded-xl flex items-center justify-center shadow-glow">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Homecare AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary-500/20 text-primary-400 shadow-glow' 
                  : 'text-dark-300 hover:bg-dark-700/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-white'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-dark-700/50">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">
              {user?.full_name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{user?.full_name || 'Admin'}</p>
            <p className="text-dark-400 text-sm truncate">{user?.email || 'admin@homecare.ai'}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
