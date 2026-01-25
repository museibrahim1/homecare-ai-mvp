'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  Mic,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Visits', href: '/visits', icon: Calendar },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-72 bg-dark-800/50 backdrop-blur-xl border-r border-dark-700/50 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center shadow-glow">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Homecare AI</h1>
            <p className="text-xs text-dark-400">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/10 text-primary-400 border border-primary-500/30'
                      : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : ''}`} />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-dark-700/50">
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-pink rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-dark-400 truncate">admin@homecare.ai</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-dark-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
