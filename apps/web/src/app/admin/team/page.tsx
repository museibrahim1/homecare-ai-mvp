'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import {
  Users, Plus, Loader2, Shield, Mail, Key, UserPlus,
  ToggleLeft, ToggleRight, RefreshCw, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const PERMISSION_OPTIONS = [
  { key: 'command_center', label: 'Command Center', desc: 'Weekly outreach, email drafts, calls' },
  { key: 'sales_leads', label: 'Sales & Leads', desc: 'Agency CRM, campaigns, sequences' },
  { key: 'investors', label: 'Investors', desc: 'Investor pipeline, bulk email' },
  { key: 'marketing', label: 'Marketing', desc: 'Asset gallery, marketing tools' },
  { key: 'analytics', label: 'Analytics', desc: 'Churn, funnel, platform activity' },
  { key: 'admin_full', label: 'Full Admin Access', desc: 'Everything — equivalent to CEO' },
];

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  phone: string | null;
  temp_password: boolean;
  created_at: string | null;
}

export default function TeamManagementPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', phone: '', permissions: [] as string[] });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const token = typeof window !== 'undefined' ? getStoredToken() : null;

  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { router.push('/login'); return; }
        const user = await res.json();
        if (user.role === 'admin' && user.email?.endsWith('@palmtai.com')) {
          setAuthorized(true);
          loadMembers();
        } else {
          router.push('/dashboard');
        }
      } catch { router.push('/login'); }
    })();
  }, [token, router]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/team`, { headers: authHeaders() });
      if (res.ok) setMembers(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleInvite = async () => {
    setInviteError('');
    if (!inviteForm.full_name || !inviteForm.email) { setInviteError('Name and email are required'); return; }
    if (inviteForm.permissions.length === 0) { setInviteError('Select at least one permission'); return; }
    setInviteLoading(true);
    try {
      const res = await fetch(`${API}/admin/team/invite`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        setShowInvite(false);
        setInviteForm({ full_name: '', email: '', phone: '', permissions: [] });
        setToast('Team member invited — credentials emailed');
        setTimeout(() => setToast(''), 4000);
        loadMembers();
      } else {
        const data = await res.json();
        setInviteError(data.detail || 'Failed to invite');
      }
    } catch { setInviteError('Network error'); }
    setInviteLoading(false);
  };

  const togglePermission = (key: string) => {
    setInviteForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const toggleActive = async (member: TeamMember) => {
    setActionLoading(member.id);
    try {
      await fetch(`${API}/admin/team/${member.id}`, { method: 'DELETE', headers: authHeaders() });
      loadMembers();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const resetPassword = async (member: TeamMember) => {
    if (!confirm(`Reset password for ${member.full_name}?`)) return;
    setActionLoading(member.id);
    try {
      const res = await fetch(`${API}/admin/team/${member.id}/reset-password`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        setToast(`Password reset — new credentials emailed to ${member.email}`);
        setTimeout(() => setToast(''), 4000);
        loadMembers();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const updatePermissions = async (member: TeamMember, permissions: string[]) => {
    try {
      await fetch(`${API}/admin/team/${member.id}/permissions`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ permissions }),
      });
      loadMembers();
    } catch { /* ignore */ }
  };

  if (!authorized) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 ml-0 md:ml-64">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-7 h-7 text-indigo-500" /> Team Management
              </h1>
              <p className="text-slate-500 mt-1">Create and manage admin team member accounts with granular permissions</p>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              <UserPlus className="w-4 h-4" /> Invite Member
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> {toast}
            </div>
          )}

          {/* Members table */}
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-lg font-medium">No team members yet</p>
              <p className="text-slate-400 text-sm mt-1">Invite your first team member to get started</p>
              <button onClick={() => setShowInvite(true)} className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
                <UserPlus className="w-4 h-4 inline mr-1" /> Invite Member
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3 text-left text-slate-500 font-semibold">Member</th>
                    <th className="px-5 py-3 text-left text-slate-500 font-semibold">Permissions</th>
                    <th className="px-5 py-3 text-left text-slate-500 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right text-slate-500 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{m.full_name}</div>
                        <div className="text-slate-400 text-xs">{m.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(m.permissions || []).map(p => (
                            <span key={p} className="inline-block bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-medium">
                              {PERMISSION_OPTIONS.find(o => o.key === p)?.label || p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {m.is_active ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Disabled
                          </span>
                        )}
                        {m.temp_password && (
                          <span className="text-amber-500 text-xs mt-0.5 block">Pending password change</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => resetPassword(m)}
                            disabled={actionLoading === m.id}
                            className="text-slate-400 hover:text-indigo-600 transition p-1.5 rounded-lg hover:bg-indigo-50"
                            title="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleActive(m)}
                            disabled={actionLoading === m.id}
                            className={`p-1.5 rounded-lg transition ${m.is_active ? 'text-green-500 hover:text-red-500 hover:bg-red-50' : 'text-red-400 hover:text-green-500 hover:bg-green-50'}`}
                            title={m.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {m.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => {
                              const newPerms = prompt(
                                'Edit permissions (comma-separated):\nOptions: command_center, sales_leads, investors, marketing, analytics, admin_full',
                                (m.permissions || []).join(', ')
                              );
                              if (newPerms !== null) {
                                updatePermissions(m, newPerms.split(',').map(s => s.trim()).filter(Boolean));
                              }
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition p-1.5 rounded-lg hover:bg-indigo-50"
                            title="Edit permissions"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-500" /> Invite Team Member
                </h2>
                <p className="text-slate-500 text-sm mt-1">They will receive an email with login credentials</p>
              </div>
              <div className="p-6 space-y-4">
                {inviteError && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4" /> {inviteError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text" placeholder="Jane Smith"
                    value={inviteForm.full_name}
                    onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email" placeholder="jane@example.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel" placeholder="(555) 000-0000"
                    value={inviteForm.phone}
                    onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Permissions</label>
                  <div className="space-y-2">
                    {PERMISSION_OPTIONS.map(opt => (
                      <label
                        key={opt.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          inviteForm.permissions.includes(opt.key)
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={inviteForm.permissions.includes(opt.key)}
                          onChange={() => togglePermission(opt.key)}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                          <div className="text-xs text-slate-400">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
