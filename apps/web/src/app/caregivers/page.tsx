'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Search, Phone, ChevronRight, ChevronLeft,
  MapPin, Star, Clock, Upload, AlertCircle, MessagesSquare, UserPlus, X, Loader2, Mail
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import GlassShell from '@/components/GlassShell';
import CaregiverModal from '@/components/CaregiverModal';
import GlassTabs from '@/components/GlassTabs';
import TeamChatPanel from '@/components/panels/TeamChatPanel';

const API_BASE = '/api';

interface Caregiver {
  id?: string;
  full_name: string;
  preferred_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  certification_level?: string;
  certifications?: string[];
  certification_expiry_dates?: Record<string, string>;
  specializations?: string[];
  languages?: string[];
  can_handle_high_care?: boolean;
  can_handle_moderate_care?: boolean;
  can_handle_low_care?: boolean;
  years_experience?: number;
  rating?: number;
  current_client_count?: number;
  max_clients?: number;
  available_days?: string;
  available_hours?: string;
  status?: string;
  notes?: string;
  background_check_status?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string | null;
  is_active: boolean;
}

interface ExpiringCert {
  caregiver_id: string;
  caregiver_name: string;
  certification: string;
  expiry_date: string;
  days_until_expiry: number;
  badge: 'expired' | 'expiring_soon' | 'warning';
}

function getCertBadge(caregiver: Caregiver): { badge: 'expired' | 'expiring_soon' | 'current' | null; label: string | null } {
  const expiry = caregiver.certification_expiry_dates;
  if (!expiry || Object.keys(expiry).length === 0) return { badge: null, label: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let worstBadge: 'expired' | 'expiring_soon' | 'current' = 'current';
  let worstLabel = '';
  for (const [cert, dateStr] of Object.entries(expiry)) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const daysLeft = Math.round((d.getTime() - today.getTime()) / 86400000);
      if (daysLeft < 0 && (worstBadge === 'current' || worstBadge === 'expiring_soon')) {
        worstBadge = 'expired';
        worstLabel = `${cert} expired`;
      } else if (daysLeft >= 0 && daysLeft <= 30 && worstBadge === 'current') {
        worstBadge = 'expiring_soon';
        worstLabel = `${cert} expires in ${daysLeft}d`;
      }
    } catch { /* skip */ }
  }
  if (worstBadge === 'current') return { badge: null, label: null };
  return { badge: worstBadge, label: worstLabel };
}

export default function CaregiversPage() {
  const router = useRouter();
  const { token, isReady } = useRequireAuth();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'staff' | 'chat'>('members');
  const pageSize = 25;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [canInvite, setCanInvite] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'caregiver'>('user');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadCaregivers();
      loadExpiringCerts();
      loadStaff();
    }
  }, [token]);

  const loadStaff = async () => {
    if (!token) return;
    setStaffLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/business/team`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(Array.isArray(data.members) ? data.members : []);
        setCanInvite(data.limits?.can_invite !== false);
      }
    } catch {
      /* ignore */
    } finally {
      setStaffLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!token || !inviteEmail.trim() || !inviteName.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch(
        `${API_BASE}/auth/business/team/invite?email=${encodeURIComponent(inviteEmail.trim())}&full_name=${encodeURIComponent(inviteName.trim())}&role=${inviteRole}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Failed to send invitation');
      setInviteSuccess(
        data.temp_password
          ? `Invite sent to ${inviteEmail}. Temporary password: ${data.temp_password}`
          : `Invite sent to ${inviteEmail}.`
      );
      setInviteName('');
      setInviteEmail('');
      await loadStaff();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Read the active tab from the URL so ?tab=chat deep links (and the retired
  // /team-chat redirect) land on the chat surface
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'chat' || tab === 'members' || tab === 'staff') setActiveTab(tab);
  }, []);

  const handleTabChange = (key: string) => {
    const tab = key === 'chat' || key === 'staff' ? key : 'members';
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/caregivers?${params.toString()}`);
  };

  const loadExpiringCerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/caregivers/expiring?days=90`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setExpiringCerts(await response.json());
      }
    } catch { /* ignore */ }
  };

  const loadCaregivers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/caregivers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCaregivers(data);
      }
    } catch (err: any) {
      console.error('Failed to load caregivers:', err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedCaregiver(null);
    setModalOpen(true);
  };

  const handleEditCaregiver = (caregiver: Caregiver) => {
    setSelectedCaregiver(caregiver);
    setModalOpen(true);
  };

  const handleSaveCaregiver = async (caregiverData: Caregiver) => {
    const url = caregiverData.id 
      ? `${API_BASE}/caregivers/${caregiverData.id}`
      : `${API_BASE}/caregivers`;
    
    const response = await fetch(url, {
      method: caregiverData.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(caregiverData),
    });

    if (!response.ok) {
      throw new Error('Failed to save caregiver');
    }

    await loadCaregivers();
  };

  const handleDeleteCaregiver = async (caregiverId: string) => {
    if (!confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) return;
    const response = await fetch(`${API_BASE}/caregivers/${caregiverId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to delete caregiver');
    }

    await loadCaregivers();
  };

  const filteredCaregivers = caregivers.filter(cg =>
    cg.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cg.phone?.includes(searchQuery) ||
    cg.certification_level?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedCaregivers = filteredCaregivers.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center glass-page">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <GlassShell
      title="Team"
      subtitle="Manage your caregiver team and chat with staff"
      fill={activeTab === 'chat'}
      action={
        activeTab === 'members' ? (
          <>
            <button
              type="button"
              onClick={() => router.push('/integrations')}
              className="inline-flex items-center gap-2 h-11 px-[18px] rounded-xl bg-white/70 hover:bg-white text-[#4B6B66] hover:text-[#10211F] border border-white text-sm font-medium transition-colors"
            >
              <Upload className="w-5 h-5" />Import
            </button>
            <button type="button" onClick={handleAddNew} className="glass-btn-primary">
              <Plus className="w-5 h-5" />Add Caregiver
            </button>
          </>
        ) : activeTab === 'staff' ? (
          <button
            type="button"
            onClick={() => {
              setInviteError(null);
              setInviteSuccess(null);
              setShowInviteModal(true);
            }}
            className="glass-btn-primary"
            disabled={!canInvite}
            title={canInvite ? undefined : 'Plan seat limit reached. Upgrade in Settings.'}
          >
            <UserPlus className="w-5 h-5" />Invite teammate
          </button>
        ) : undefined
      }
    >
          {/* Tabs */}
          <div className={`mb-6 ${activeTab === 'chat' ? 'shrink-0' : ''}`}>
            <GlassTabs
              tabs={[
                { key: 'members', label: 'Caregivers', icon: Users },
                { key: 'staff', label: 'Staff', icon: UserPlus },
                { key: 'chat', label: 'Chat', icon: MessagesSquare },
              ]}
              active={activeTab}
              onChange={handleTabChange}
            />
          </div>

          {activeTab === 'chat' ? (
            <div className="flex-1 min-h-0 min-w-0">
              <TeamChatPanel />
            </div>
          ) : activeTab === 'staff' ? (
          <>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-red-600 text-sm flex-1">{error}</p>
              <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-300 text-sm underline">Dismiss</button>
            </div>
          )}
          <div className="glass-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#10211F] mb-1">Office staff</h2>
            <p className="text-sm text-[#64748B] mb-5">
              Invite coordinators and office teammates. They can sign in and use Team Chat.
            </p>
            {staffLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-[#10211F] font-medium">No staff accounts yet</p>
                <p className="text-sm text-[#64748B] mt-1 mb-4">Invite a teammate to get started</p>
                <button type="button" onClick={() => setShowInviteModal(true)} className="glass-btn-primary mx-auto" disabled={!canInvite}>
                  <UserPlus className="w-4 h-4" />Invite teammate
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#10211F12]">
                {staff.map((m) => (
                  <div key={m.id} className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary-500/15 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary-600">
                          {m.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#10211F] truncate">{m.full_name}</p>
                        <p className="text-sm text-[#64748B] truncate flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          {m.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/80 text-[#4B6B66] border border-[#FFFFFFE0] capitalize">
                        {m.role === 'user' ? 'Coordinator' : m.role}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          ) : (
          <>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-red-600 text-sm flex-1">{error}</p>
              <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-300 text-sm underline">Dismiss</button>
            </div>
          )}

          {/* Certification Compliance Alert */}
          {expiringCerts.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-semibold text-amber-600">Certification Compliance Alert</h3>
                <span className="text-xs text-amber-600/70 ml-auto">{expiringCerts.length} cert{expiringCerts.length > 1 ? 's' : ''} need attention</span>
              </div>
              <div className="space-y-1.5">
                {expiringCerts.slice(0, 5).map((cert, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      cert.badge === 'expired' ? 'bg-red-50 text-red-600' :
                      cert.badge === 'expiring_soon' ? 'bg-amber-50 text-amber-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {cert.badge === 'expired' ? 'EXPIRED' : cert.days_until_expiry <= 30 ? 'EXPIRING SOON' : `${cert.days_until_expiry}d left`}
                    </span>
                    <span className="text-slate-900 font-medium">{cert.caregiver_name}</span>
                    <span className="text-slate-500">— {cert.certification} (expires {cert.expiry_date})</span>
                  </div>
                ))}
                {expiringCerts.length > 5 && (
                  <p className="text-xs text-amber-600/60">+{expiringCerts.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-5">
              <p className="text-slate-500 text-sm mb-1">Total Caregivers</p>
              <p className="text-3xl font-bold text-[#10211F]">{caregivers.length}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-slate-500 text-sm mb-1">Active</p>
              <p className="text-3xl font-bold text-accent-green">
                {caregivers.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-slate-500 text-sm mb-1">High Care Qualified</p>
              <p className="text-3xl font-bold text-primary-400">
                {caregivers.filter(c => c.can_handle_high_care).length}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-slate-500 text-sm mb-1">Available</p>
              <p className="text-3xl font-bold text-accent-cyan">
                {caregivers.filter(c => (c.current_client_count || 0) < (c.max_clients || 5)).length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or certification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-12"
            />
          </div>

          {/* Caregiver List */}
          {loading ? (
            <div className="glass-panel p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredCaregivers.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <div className="w-16 h-16 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-lg font-semibold text-[#10211F] mb-2">
                {searchQuery ? 'No caregivers found' : 'No caregivers yet'}
              </h3>
              <p className="text-slate-500 mb-4">Add caregivers to assign them to clients</p>
              {!searchQuery && (
                <button onClick={handleAddNew} className="glass-btn-primary mx-auto">Add Caregiver</button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedCaregivers.map((caregiver) => (
                <div
                  key={caregiver.id}
                  onClick={() => handleEditCaregiver(caregiver)}
                  className="p-5 rounded-2xl bg-[#FFFFFFB8] border border-[#FFFFFFE0] shadow-[0_8px_20px_#0D948814] hover:bg-white transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      caregiver.can_handle_high_care ? 'bg-primary-50' : 'bg-white/70'
                    }`}>
                      <span className={`font-bold text-lg ${
                        caregiver.can_handle_high_care ? 'text-primary-400' : 'text-slate-600'
                      }`}>{caregiver.full_name.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-slate-900">{caregiver.full_name}</h3>
                        {caregiver.certification_level && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-400">
                            {caregiver.certification_level}
                          </span>
                        )}
                        {caregiver.can_handle_high_care && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                            High Care
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          caregiver.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                          caregiver.status === 'on_leave' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {caregiver.status || 'active'}
                        </span>
                        {(() => {
                          const { badge, label } = getCertBadge(caregiver);
                          if (!badge) return null;
                          return (
                            <span title={label || ''} className={`px-2 py-0.5 rounded text-xs font-medium ${
                              badge === 'expired' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {badge === 'expired' ? 'Cert Expired' : 'Cert Expiring'}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {caregiver.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />{caregiver.phone}
                          </div>
                        )}
                        {caregiver.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />{caregiver.city}, {caregiver.state}
                          </div>
                        )}
                        {caregiver.years_experience !== undefined && caregiver.years_experience > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />{caregiver.years_experience} yrs exp
                          </div>
                        )}
                        {caregiver.rating !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-600" />{Number(caregiver.rating).toFixed(1)}
                          </div>
                        )}
                      </div>
                      {caregiver.specializations && caregiver.specializations.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {caregiver.specializations.slice(0, 4).map((spec, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-50 rounded text-xs text-slate-600">
                              {spec}
                            </span>
                          ))}
                          {caregiver.specializations.length > 4 && (
                            <span className="text-xs text-slate-400">+{caregiver.specializations.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-sm text-slate-500">Clients</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {caregiver.current_client_count || 0}/{caregiver.max_clients || 5}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-400 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {filteredCaregivers.length > pageSize && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between mt-4">
              <p className="text-slate-500 text-sm">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredCaregivers.length)} of {filteredCaregivers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <span className="text-slate-500 px-3 text-sm">Page {page + 1}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * pageSize >= filteredCaregivers.length}
                  className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}
          </>
          )}
    </GlassShell>

      {/* Caregiver Modal */}
      <CaregiverModal
        caregiver={selectedCaregiver}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCaregiver}
        onDelete={handleDeleteCaregiver}
      />

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#10211F]/40 backdrop-blur-sm" onClick={() => !inviting && setShowInviteModal(false)} />
          <div className="relative glass-card w-full max-w-md !rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFFFFFE0]">
              <h2 className="text-base font-semibold text-[#10211F]">Invite teammate</h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 text-slate-500 hover:text-[#10211F] rounded-lg"
                disabled={inviting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-[#64748B]">
                They get an account under your agency and can use Team Chat.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#4B6B66]">Full name</span>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="glass-input"
                  placeholder="Jordan Lee"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#4B6B66]">Email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="glass-input"
                  placeholder="jordan@agency.com"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#4B6B66]">Role</span>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'user' | 'caregiver')}
                  className="glass-input"
                >
                  <option value="user">Coordinator</option>
                  <option value="caregiver">Caregiver (login)</option>
                </select>
              </label>
              {inviteError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{inviteError}</div>
              )}
              {inviteSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm break-all">{inviteSuccess}</div>
              )}
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
                className="glass-btn-primary w-full disabled:opacity-50"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
