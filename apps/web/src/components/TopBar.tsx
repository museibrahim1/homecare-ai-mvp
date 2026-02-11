'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, Settings, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

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
    } catch {
      // Best-effort
    }
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
          {/* Notifications */}
          <button
            className="relative p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {/* Notification dot - shown when there are unread items */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

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
