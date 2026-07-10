'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import {
  Users, Loader2, Shield, Mail, Key, UserPlus,
  ToggleLeft, ToggleRight, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Activity, Clock, Eye, LogIn, BarChart3, Trash2, LogOut, ListTodo,
  Plus, X, Phone, Target,
} from 'lucide-react';

const API = '/api';

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
  last_login: string | null;
  last_active: string | null;
  executive_title: string | null;
}

const EXECUTIVE_TITLES = [
  'CEO', 'CFO', 'CMO', 'CSO', 'CTO', 'COO', 'CIO', 'CPO',
  'VP Sales', 'VP Marketing', 'VP Engineering', 'VP Operations',
  'Sales Director', 'Marketing Director', 'Engineering Director',
  'Director of Operations', 'Director of Finance',
  'Head of Sales', 'Head of Marketing', 'Head of Product',
];

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
  const [editingPerms, setEditingPerms] = useState<TeamMember | null>(null);
  const [editPermsSelection, setEditPermsSelection] = useState<string[]>([]);
  const [activityData, setActivityData] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [activityDays, setActivityDays] = useState(7);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleSelection, setTitleSelection] = useState<string>('');
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', assigned_to_id: '' });
  const [taskSaving, setTaskSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);

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
          loadActivity(7);
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

  const loadActivity = useCallback(async (days: number = 7) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`${API}/admin/team/activity?days=${days}`, { headers: authHeaders() });
      if (res.ok) setActivityData(await res.json());
    } catch { /* ignore */ }
    setActivityLoading(false);
  }, [authHeaders]);

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

  const resendInvite = async (member: TeamMember) => {
    setActionLoading(member.id);
    try {
      const res = await fetch(`${API}/admin/team/${member.id}/resend-invite`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        setToast(`Invite resent to ${member.email} with new credentials`);
        setTimeout(() => setToast(''), 4000);
        loadMembers();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const permanentlyDelete = async (member: TeamMember) => {
    setActionLoading(member.id);
    try {
      const res = await fetch(`${API}/admin/team/${member.id}/delete-permanently`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        setToast(`${member.full_name} permanently deleted`);
        setTimeout(() => setToast(''), 4000);
        loadMembers();
      } else {
        const data = await res.json();
        setToast(`Error: ${data.detail || 'Failed to delete'}`);
      }
    } catch { setToast('Failed to delete — network error'); }
    setActionLoading(null);
    setConfirmDelete(null);
  };

  const forceLogout = async (member: TeamMember) => {
    setActionLoading(member.id);
    try {
      const res = await fetch(`${API}/admin/team/${member.id}/force-logout`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        setToast(`${member.full_name} has been forced to log out`);
        setTimeout(() => setToast(''), 4000);
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const assignTask = async () => {
    if (!taskForm.title.trim()) return;
    setTaskSaving(true);
    try {
      const res = await fetch(`${API}/admin/team/assign-task`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          due_date: taskForm.due_date || null,
          assigned_to_id: taskForm.assigned_to_id || null,
        }),
      });
      if (res.ok) {
        setShowAssignTask(false);
        setTaskForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to_id: '' });
        setToast('Task assigned successfully');
        setTimeout(() => setToast(''), 4000);
      }
    } catch { /* ignore */ }
    setTaskSaving(false);
  };

  const formatTimeAgo = (iso: string | null) => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
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
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-7 h-7 text-indigo-500" /> Team Management
              </h1>
              <p className="text-slate-500 mt-1">Create and manage admin team member accounts with granular permissions</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAssignTask(true)}
                className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-600 transition">
                <ListTodo className="w-4 h-4" /> Assign Task
              </button>
              <button onClick={() => setShowInvite(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                <UserPlus className="w-4 h-4" /> Invite Member
              </button>
            </div>
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
                    <th className="px-5 py-3 text-left text-slate-500 font-semibold">Title</th>
                    <th className="px-5 py-3 text-left text-slate-500 font-semibold">Permissions</th>
                    <th className="px-5 py-3 text-left text-slate-500 font-semibold">Activity</th>
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
                        {editingTitle === m.id ? (
                          <div className="flex items-center gap-1.5">
                            <select value={titleSelection} onChange={e => setTitleSelection(e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:border-teal-500 focus:outline-none">
                              <option value="">No title</option>
                              {EXECUTIVE_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button onClick={async () => {
                              try {
                                const res = await fetch(`${API}/admin/team/${m.id}/title`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ executive_title: titleSelection || null }) });
                                if (res.ok) {
                                  setMembers(prev => prev.map(x => x.id === m.id ? { ...x, executive_title: titleSelection || null } : x));
                                  setToast(`Title updated for ${m.full_name}`);
                                }
                              } catch {} finally { setEditingTitle(null); }
                            }} className="text-teal-600 hover:bg-teal-50 p-1 rounded"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => setEditingTitle(null)} className="text-slate-400 hover:bg-slate-50 p-1 rounded"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingTitle(m.id); setTitleSelection(m.executive_title || ''); }}
                            className="text-xs font-medium px-2.5 py-1 rounded-full transition hover:bg-slate-100"
                            style={{ background: m.executive_title ? '#f0fdfa' : undefined, color: m.executive_title ? '#0d9488' : '#94a3b8' }}>
                            {m.executive_title || 'Assign title'}
                          </button>
                        )}
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
                        <div className="text-xs text-slate-500">
                          <div>Login: <span className="font-medium text-slate-700">{formatTimeAgo(m.last_login)}</span></div>
                          <div>Active: <span className={`font-medium ${m.last_active && (Date.now() - new Date(m.last_active).getTime()) < 300000 ? 'text-green-600' : 'text-slate-700'}`}>{formatTimeAgo(m.last_active)}</span></div>
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
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => resendInvite(m)} disabled={actionLoading === m.id}
                            className="text-slate-400 hover:text-teal-600 transition p-1.5 rounded-lg hover:bg-teal-50" title="Resend invite email">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button onClick={() => resetPassword(m)} disabled={actionLoading === m.id}
                            className="text-slate-400 hover:text-indigo-600 transition p-1.5 rounded-lg hover:bg-indigo-50" title="Reset password">
                            <Key className="w-4 h-4" />
                          </button>
                          <button onClick={() => forceLogout(m)} disabled={actionLoading === m.id}
                            className="text-slate-400 hover:text-amber-600 transition p-1.5 rounded-lg hover:bg-amber-50" title="Force logout">
                            <LogOut className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleActive(m)} disabled={actionLoading === m.id}
                            className={`p-1.5 rounded-lg transition ${m.is_active ? 'text-green-500 hover:text-red-500 hover:bg-red-50' : 'text-red-400 hover:text-green-500 hover:bg-green-50'}`}
                            title={m.is_active ? 'Deactivate' : 'Activate'}>
                            {m.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button onClick={() => { setEditingPerms(m); setEditPermsSelection([...(m.permissions || [])]); }}
                            className="text-slate-400 hover:text-indigo-600 transition p-1.5 rounded-lg hover:bg-indigo-50" title="Edit permissions">
                            <Shield className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(m)} disabled={actionLoading === m.id}
                            className="text-slate-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-red-50" title="Permanently delete">
                            <Trash2 className="w-4 h-4" />
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

        {/* Team Activity Dashboard */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" /> Team Activity
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={activityDays}
                  onChange={(e) => { const d = Number(e.target.value); setActivityDays(d); loadActivity(d); }}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value={1}>Today</option>
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
                <button
                  onClick={() => loadActivity(activityDays)}
                  className="p-1.5 text-slate-400 hover:text-teal-600 transition rounded-lg hover:bg-teal-50"
                  title="Refresh activity"
                >
                  <RefreshCw className={`w-4 h-4 ${activityLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {activityLoading && !activityData ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
            ) : activityData ? (
              <div className="space-y-4">
                {/* Member Activity Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(activityData.members || []).map((m: any) => (
                    <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${m.online ? 'bg-green-400 animate-pulse' : 'bg-slate-300'}`} />
                          <span className="font-semibold text-slate-800 text-sm">{m.name}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.online ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          {m.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-teal-600">{m.login_count}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Logins</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-indigo-600">{m.action_count}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Actions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-600">{m.total_session_minutes > 60 ? `${Math.round(m.total_session_minutes / 60)}h` : `${m.total_session_minutes}m`}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Time</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <LogIn className="w-3 h-3" /> Last login: <span className="text-slate-600 font-medium">{formatTimeAgo(m.last_login)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Last active: <span className="text-slate-600 font-medium">{formatTimeAgo(m.last_active)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Activity Log */}
                {(activityData.recent_actions || []).length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-700">Recent Activity Log</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {(activityData.recent_actions || []).slice(0, 50).map((a: any) => (
                        <div key={a.id} className="px-5 py-2.5 flex items-start gap-3 hover:bg-slate-50/50 text-xs">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            a.action === 'user_login' ? 'bg-green-400' :
                            a.action.includes('page_view') ? 'bg-blue-400' :
                            a.action.includes('email') ? 'bg-purple-400' :
                            a.action.includes('call') ? 'bg-amber-400' :
                            'bg-slate-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-700">
                              <span className="font-semibold text-slate-800">{a.user_name}</span>{' '}
                              {a.action === 'user_login' ? 'logged in' :
                               a.action === 'team_page_view' ? `viewed ${a.description?.split('visited ')?.[1] || 'a page'}` :
                               a.description || a.action.replace(/_/g, ' ')}
                            </div>
                          </div>
                          <div className="text-slate-400 flex-shrink-0">
                            {a.timestamp ? formatTimeAgo(a.timestamp) : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

        {/* Edit Permissions Modal */}
        {editingPerms && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingPerms(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Edit Permissions</h2>
                <p className="text-slate-500 text-sm mt-1">{editingPerms.full_name} ({editingPerms.email})</p>
              </div>
              <div className="p-6 space-y-2">
                {PERMISSION_OPTIONS.map(opt => (
                  <label
                    key={opt.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      editPermsSelection.includes(opt.key)
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editPermsSelection.includes(opt.key)}
                      onChange={() => setEditPermsSelection(prev =>
                        prev.includes(opt.key) ? prev.filter(p => p !== opt.key) : [...prev, opt.key]
                      )}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                      <div className="text-xs text-slate-400">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button onClick={() => setEditingPerms(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingPerms) {
                      updatePermissions(editingPerms, editPermsSelection);
                      setToast(`Permissions updated for ${editingPerms.full_name}`);
                      setTimeout(() => setToast(''), 4000);
                    }
                    setEditingPerms(null);
                  }}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Permanently Delete?</h2>
                <p className="text-sm text-slate-500 mb-1">
                  This will permanently remove <strong>{confirmDelete.full_name}</strong> and all their data.
                </p>
                <p className="text-xs text-red-500 font-semibold">This action cannot be undone.</p>
              </div>
              <div className="p-4 border-t border-slate-200 flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition">Cancel</button>
                <button onClick={() => permanentlyDelete(confirmDelete)} disabled={actionLoading === confirmDelete.id}
                  className="flex-1 px-4 py-2.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {actionLoading === confirmDelete.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Task Modal */}
        {showAssignTask && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAssignTask(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-teal-500" /> Assign Task
                </h2>
                <p className="text-slate-500 text-sm mt-1">Create and assign a task to yourself or a team member</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Task Title *</label>
                  <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="e.g. Call 10 agencies in Florida" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                  <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none" rows={2}
                    placeholder="Optional details..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                    <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                      <option value="low">Low</option><option value="medium">Medium</option>
                      <option value="high">High</option><option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                    <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Assign To</label>
                  <select value={taskForm.assigned_to_id} onChange={e => setTaskForm(f => ({ ...f, assigned_to_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="">Myself (CEO)</option>
                    {members.filter(m => m.is_active).map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}{m.executive_title ? ` (${m.executive_title})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button onClick={() => setShowAssignTask(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition">Cancel</button>
                <button onClick={assignTask} disabled={taskSaving || !taskForm.title.trim()}
                  className="flex items-center gap-2 bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-600 transition disabled:opacity-50">
                  {taskSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  Assign Task
                </button>
              </div>
            </div>
          </div>
        )}

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
