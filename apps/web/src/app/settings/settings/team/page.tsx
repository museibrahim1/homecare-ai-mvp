'use client';

import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Mail, Shield, Trash2, Edit, 
  Loader2, CheckCircle, AlertCircle, Clock, MoreVertical
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_owner: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
}

const ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full access to all features' },
  { value: 'admin', label: 'Admin', description: 'Can manage users and settings' },
  { value: 'manager', label: 'Manager', description: 'Can manage clients and visits' },
  { value: 'staff', label: 'Staff', description: 'Basic access to assigned tasks' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-blue-500/20 text-blue-400',
  manager: 'bg-green-500/20 text-green-400',
  staff: 'bg-dark-600 text-dark-300',
};

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'staff',
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/business/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.full_name) {
      setError('Please fill in all required fields');
      return;
    }

    setInviteLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/business/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inviteForm),
      });

      if (response.ok) {
        setShowInviteModal(false);
        setInviteForm({ email: '', full_name: '', phone: '', role: 'staff' });
        fetchMembers();
      } else {
        const err = await response.json();
        setError(err.detail || 'Failed to invite user');
      }
    } catch (err) {
      setError('Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/business/users/${memberId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        fetchMembers();
        setShowEditModal(false);
        setSelectedMember(null);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/business/users/${memberId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error('Failed to toggle active:', err);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/business/users/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error('Failed to remove user:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="flex h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Team Management</h1>
              <p className="text-dark-400 mt-1">Manage your team members and their roles</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Invite Member
            </button>
          </div>

          {/* Team Members */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-medium text-white">Team Members ({members.length})</h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">No team members yet</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-4 text-primary-400 hover:text-primary-300"
                >
                  Invite your first team member
                </button>
              </div>
            ) : (
              <div className="divide-y divide-dark-700">
                {members.map(member => (
                  <div key={member.id} className="p-4 hover:bg-dark-700/30 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {member.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{member.full_name}</span>
                            {member.is_owner && (
                              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                Owner
                              </span>
                            )}
                            {!member.is_active && (
                              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-dark-400">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>

                        <div className="flex items-center gap-1">
                          {member.email_verified ? (
                            <CheckCircle className="w-4 h-4 text-green-400" title="Email verified" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-400" title="Pending verification" />
                          )}
                        </div>

                        {!member.is_owner && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setSelectedMember(member); setShowEditModal(true); }}
                              className="p-2 hover:bg-dark-600 rounded-lg transition"
                              title="Edit role"
                            >
                              <Edit className="w-4 h-4 text-dark-400" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(member.id, member.is_active)}
                              className={`p-2 hover:bg-dark-600 rounded-lg transition ${
                                member.is_active ? 'text-dark-400' : 'text-green-400'
                              }`}
                              title={member.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemove(member.id)}
                              className="p-2 hover:bg-dark-600 rounded-lg transition text-red-400"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {member.last_login && (
                      <p className="text-xs text-dark-500 mt-2 ml-14">
                        Last login: {new Date(member.last_login).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Roles Legend */}
          <div className="mt-8 p-6 bg-dark-800 rounded-xl border border-dark-700">
            <h3 className="font-medium text-white mb-4">Role Permissions</h3>
            <div className="grid grid-cols-2 gap-4">
              {ROLES.map(role => (
                <div key={role.value} className="flex items-start gap-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[role.value]}`}>
                    {role.label}
                  </span>
                  <p className="text-sm text-dark-400">{role.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Invite Team Member</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={inviteForm.phone}
                  onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                  className="input-dark w-full"
                >
                  {ROLES.filter(r => r.value !== 'owner').map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowInviteModal(false); setError(null); }}
                className="flex-1 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Edit Role</h3>
            <p className="text-dark-400 mb-4">
              Change the role for <span className="text-white">{selectedMember.full_name}</span>
            </p>

            <div className="space-y-2">
              {ROLES.filter(r => r.value !== 'owner').map(role => (
                <button
                  key={role.value}
                  onClick={() => handleUpdateRole(selectedMember.id, role.value)}
                  className={`w-full p-3 rounded-lg border text-left transition ${
                    selectedMember.role === role.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{role.label}</span>
                    {selectedMember.role === role.value && (
                      <CheckCircle className="w-5 h-5 text-primary-400" />
                    )}
                  </div>
                  <p className="text-sm text-dark-400 mt-1">{role.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setShowEditModal(false); setSelectedMember(null); }}
              className="w-full mt-4 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
