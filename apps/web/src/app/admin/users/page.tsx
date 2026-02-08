'use client';

import { getStoredToken, useAuth } from '@/lib/auth';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Shield, Loader2, RefreshCw, Plus, UserPlus,
  MoreVertical, CheckCircle, XCircle, Mail, Clock, ArrowLeft, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface PlatformUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export default function PlatformUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          if (user.role === 'admin' && (user.email.endsWith('@palmtai.com'))) {
            setIsAuthorized(true);
            fetchUsers();
          } else {
            router.push('/visits');
          }
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    const token = getStoredToken();

    try {
      const response = await fetch(`${API_BASE}/platform/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[Admin Users] Fetched users:', data?.length);
        setUsers(data || []);
      } else {
        const errorText = await response.text();
        console.error('[Admin Users] API error:', response.status, errorText);
      }
    } catch (err) {
      console.error('[Admin Users] Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async () => {
    if (!inviteForm.email || !inviteForm.full_name) return;
    if (!inviteForm.email.endsWith('@palmtai.com')) {
      setInviteError('Platform admins must use @palmtai.com email');
      return;
    }
    
    setInviteLoading(true);
    setInviteError('');
    const token = getStoredToken();

    try {
      const response = await fetch(`${API_BASE}/platform/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteForm.email,
          full_name: inviteForm.full_name,
          role: 'admin',
        }),
      });
      
      if (response.ok) {
        setShowInviteModal(false);
        setInviteForm({ email: '', full_name: '' });
        fetchUsers();
      } else {
        const data = await response.json();
        setInviteError(data.detail || 'Failed to invite user');
      }
    } catch (err) {
      setInviteError('Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${email}? This cannot be undone.`)) return;
    const token = getStoredToken();
    try {
      const response = await fetch(`${API_BASE}/platform/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Platform User Management</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Manage platform administrator accounts. Only @palmtai.com emails can be platform admins.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-dark-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Platform Users</h1>
              <p className="text-dark-400 mt-1">Manage platform administrator accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
            >
              <UserPlus className="w-4 h-4" />
              Invite Admin
            </button>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Users List */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">No platform users found</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {users.map(user => (
                <div key={user.id} className="p-5 hover:bg-dark-700/30 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{user.full_name}</p>
                          {user.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <p className="text-dark-400 text-sm">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-dark-400 text-xs">Last Login</p>
                        <p className="text-white text-sm">
                          {user.last_login 
                            ? new Date(user.last_login).toLocaleDateString() 
                            : 'Never'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-dark-400 text-xs">Role</p>
                        <p className="text-primary-400 text-sm capitalize">{user.role}</p>
                      </div>
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="p-2 hover:bg-dark-600 rounded-lg text-dark-400 hover:text-red-400 transition"
                        title="Delete user"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-400" />
              Invite Platform Admin
            </h3>
            
            {inviteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">
                {inviteError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">Full Name</label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={e => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="john@palmtai.com"
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
                />
                <p className="text-dark-500 text-xs mt-1">Must be @palmtai.com email</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowInviteModal(false); setInviteError(''); }}
                className="flex-1 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={inviteUser}
                disabled={inviteLoading || !inviteForm.email || !inviteForm.full_name}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
