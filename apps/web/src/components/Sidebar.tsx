'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Users, 
  FileText, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Visits', href: '/visits', icon: Calendar },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Reports', href: '/reports', icon: FileText },
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
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">Homecare AI</h1>
        <p className="text-sm text-gray-500">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
