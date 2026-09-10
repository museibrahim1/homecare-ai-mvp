'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Users,
  Bell,
  Shield,
  Database,
  Building2,
  DollarSign,
  CheckCircle2,
  Save,
  Check,
  Upload,
  Image,
  FileText,
  File,
  X,
  Loader2,
  AlertCircle,
  Trash2,
  UserPlus,
  Mail,
  LogOut,
  Laptop,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Lock,
  KeyRound,
  LifeBuoy,
  Palette,
  Hash,
  CreditCard,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import GlassShell from '@/components/GlassShell';

import { UploadedDocument, AgencySettings } from './types';
import { API_BASE, defaultAgency, documentCategories } from './constants';

type SettingsView = 'hub' | 'company' | 'documents' | 'plan' | 'profile' | 'team' | 'security';

export default function SettingsPage() {
  const router = useRouter();
  const { token, isReady, logout, user, setUser } = useRequireAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [view, setView] = useState<SettingsView>('hub');

  // Team state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLimits, setTeamLimits] = useState<{
    current_users: number;
    max_users: number;
    plan_name: string;
    can_invite: boolean;
    remaining_seats?: number;
    upgrade_options?: Array<{
      name: string;
      tier: string;
      max_users: number;
      monthly_price: number;
      additional_users: number;
    }>;
  } | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('caregiver');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Plan summary for the hub card (best-effort)
  const [planSummary, setPlanSummary] = useState<{ name: string; status: string } | null>(null);

  // Integrations (client-side stub, no API yet)
  const [calendarConnected, setCalendarConnected] = useState(false);

  // Agency settings state
  const [agency, setAgency] = useState<AgencySettings>(defaultAgency);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('policy');

  // MFA state
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaUri, setMfaUri] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  const defaultNotifications = {
    email_notifications: true,
    visit_reminders: true,
    weekly_summary: false,
    new_client_alerts: true,
    contract_expiration_alerts: true,
  };
  const [notifications, setNotifications] = useState(defaultNotifications);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const extractInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('palmcare_notification_prefs');
      if (saved) setNotifications(JSON.parse(saved));
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => {
    localStorage.setItem('palmcare_notification_prefs', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (token) {
      loadAgencySettings();
      fetch(`${API_BASE}/auth/mfa/status`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setMfaEnabled(!!d.mfa_enabled); })
        .catch(() => {});
      fetch(`${API_BASE}/billing/subscription`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setPlanSummary({
              name: d.plan?.name || 'No active plan',
              status: d.subscription?.status || 'none',
            });
          }
        })
        .catch(() => {});
    }
  }, [token]);

  // Load team when the team view opens - must be before any early returns.
  useEffect(() => {
    if (view === 'team' && token) {
      loadTeamMembersInternal();
    }
  }, [view, token]);

  const loadTeamMembersInternal = async () => {
    if (!token) return;
    setLoadingTeam(true);
    try {
      const response = await fetch(`${API_BASE}/auth/business/team`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array) and new format (object with members and limits)
        if (Array.isArray(data)) {
          setTeamMembers(data);
        } else {
          setTeamMembers(data.members || []);
          if (data.limits) {
            setTeamLimits(data.limits);
          }
        }
      }

      // Also fetch detailed limits
      const limitsResponse = await fetch(`${API_BASE}/auth/business/team/limits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        setTeamLimits(limitsData);
      }
    } catch (err) {
    } finally {
      setLoadingTeam(false);
    }
  };


  const loadAgencySettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/agency`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAgency({ ...defaultAgency, ...data, documents: data.documents || [] });
        if (data.logo) {
          setLogoPreview(data.logo);
        }
      }
    } catch (err) {
    }
  };

  const handleMfaSetup = async () => {
    if (!token) return;
    setMfaLoading(true);
    setMfaError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/mfa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to set up 2FA');
      }
      const data = await res.json();
      setMfaSecret(data.secret);
      setMfaUri(data.otpauth_uri);
      setMfaStep('setup');
    } catch (err: any) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaEnable = async () => {
    if (!token || mfaCode.length < 6) return;
    setMfaLoading(true);
    setMfaError(null);
    try {
      const verifyRes = await fetch(`${API_BASE}/auth/mfa/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.detail || 'Invalid code');
      }
      const enableRes = await fetch(`${API_BASE}/auth/mfa/enable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      if (!enableRes.ok) {
        const data = await enableRes.json();
        throw new Error(data.detail || 'Failed to enable 2FA');
      }
      setMfaEnabled(true);
      setMfaStep('idle');
      setMfaCode('');
    } catch (err: any) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisable = async () => {
    if (!token || mfaCode.length < 6) return;
    setMfaLoading(true);
    setMfaError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/mfa/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to disable 2FA');
      }
      setMfaEnabled(false);
      setMfaStep('idle');
      setMfaCode('');
    } catch (err: any) {
      setMfaError(err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setLogoPreview(base64);
      setAgency(prev => ({ ...prev, logo: base64 }));

      // Try to extract company info from the logo or letterhead.
      if (file.type.includes('image')) {
        await extractCompanyInfoFromFile(file, 'letterhead');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('Document must be under 25MB');
      return;
    }

    setUploadingDoc(true);

    // Service contracts and assessment sheets go through the OCR replicator
    // so exports fill the agency's own document instead of a PALM template.
    const isReplicable =
      selectedCategory === 'contract_template' || selectedCategory === 'assessment_sheet';

    if (isReplicable && token) {
      try {
        const docKind =
          selectedCategory === 'assessment_sheet' ? 'assessment' : 'contract';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name.replace(/\.[^.]+$/, '') || file.name);
        formData.append('doc_kind', docKind);
        formData.append(
          'description',
          docKind === 'assessment'
            ? 'Agency care plan / assessment sheet'
            : 'Agency service contract',
        );

        const res = await fetch(`${API_BASE}/contract-templates/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.detail === 'string' ? data.detail : 'Upload failed',
          );
        }

        const uploaded = await res.json();
        const newDoc: UploadedDocument = {
          id: uploaded.id || Date.now().toString(),
          name: uploaded.name || file.name,
          type: file.type,
          category: selectedCategory as any,
          content: '',
          uploaded_at: new Date().toISOString(),
        };
        setAgency((prev) => ({
          ...prev,
          documents: [...prev.documents, newDoc],
        }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        await extractCompanyInfoFromFile(file, selectedCategory);
      } catch (err: any) {
        setError(err?.message || 'Could not upload and scan this document.');
      } finally {
        setUploadingDoc(false);
        if (docInputRef.current) docInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const keepContent = false;

      const newDoc: UploadedDocument = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        category: selectedCategory as any,
        // Full files in JSON blow past API body limits. Keep bytes only for
        // Word templates that the contract generator actually needs.
        content: keepContent ? base64 : '',
        uploaded_at: new Date().toISOString(),
      };

      const updatedDocs = [...agency.documents, newDoc];

      setAgency(prev => ({
        ...prev,
        documents: updatedDocs,
      }));

      await extractCompanyInfoFromFile(file, selectedCategory);

      try {
        const res = await fetch(`${API_BASE}/agency`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ documents: updatedDocs }),
        });

        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(typeof data.detail === 'string' ? data.detail : 'Document saved on this screen but not to the server. Try a smaller file.');
        }
      } catch (err) {
        setError('Could not save the document. Check your connection and try again.');
      }

      setUploadingDoc(false);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (docInputRef.current) {
      docInputRef.current.value = '';
    }
  };

  const applyExtractedInfo = (extracted: Record<string, string | null>, persist: boolean) => {
    const filled = Object.values(extracted).some((v) => typeof v === 'string' && v.trim());
    if (!filled) {
      setExtractionMessage('Could not extract info. Fill the fields manually.');
      setTimeout(() => setExtractionMessage(null), 4000);
      return;
    }

    setAgency(prev => {
      const next = {
        ...prev,
        name: extracted.name || prev.name,
        address: extracted.address || prev.address,
        city: extracted.city || prev.city,
        state: extracted.state || prev.state,
        zip_code: extracted.zip_code || prev.zip_code,
        phone: extracted.phone || prev.phone,
        email: extracted.email || prev.email,
        website: extracted.website || prev.website,
        license_number: extracted.license_number || prev.license_number,
        npi_number: extracted.npi_number || prev.npi_number,
        contact_person: extracted.contact_person || prev.contact_person,
        contact_title: extracted.contact_title || prev.contact_title,
        cancellation_policy: extracted.cancellation_policy || prev.cancellation_policy,
        terms_and_conditions: extracted.terms_and_conditions || prev.terms_and_conditions,
      };
      if (persist) {
        void persistAgency(next);
      }
      return next;
    });

    setExtractionMessage('Company information extracted and filled.');
    setTimeout(() => setExtractionMessage(null), 3000);
  };

  const persistAgency = async (payload: AgencySettings) => {
    const res = await fetch(`${API_BASE}/agency`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const extractCompanyInfoFromFile = async (file: File, docType: string) => {
    setExtracting(true);
    setExtractionMessage('Reading the document for company information.');

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('document_type', docType);
      const res = await fetch(`${API_BASE}/agency/extract-info/file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: form,
      });

      if (res.ok) {
        const extracted = await res.json();
        applyExtractedInfo(extracted, true);
      } else {
        const data = await res.json().catch(() => ({}));
        const detail = typeof data.detail === 'string' ? data.detail : 'Could not extract info. Fill the fields manually.';
        setExtractionMessage(detail);
        setTimeout(() => setExtractionMessage(null), 4000);
      }
    } catch (err) {
      setExtractionMessage('Could not extract info. Check your connection and try again.');
      setTimeout(() => setExtractionMessage(null), 4000);
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB');
      return;
    }
    await extractCompanyInfoFromFile(file, 'letterhead');
    if (extractInputRef.current) {
      extractInputRef.current.value = '';
    }
  };

  const removeDocument = (docId: string) => {
    setAgency(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== docId),
    }));
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setAgency(prev => ({ ...prev, logo: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/agency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(agency),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Keep sidebar / profile card in sync with the saved agency name + logo.
        if (token && setUser) {
          try {
            const { api } = await import('@/lib/api');
            const me = await api.getMe(token);
            setUser({ ...user, ...me } as any);
          } catch {
            /* non-fatal */
          }
        }
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
    router.push('/login');
  };

  const handleLogoutAllDevices = async () => {
    if (!token) return;
    if (!confirm('This will sign you out of ALL devices, including this one. You will need to sign in again. Continue?')) return;

    setLoggingOutAll(true);
    try {
      const res = await fetch(`${API_BASE}/auth/logout-all-devices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Clear local session and redirect to login
        logout();
        router.push('/login');
      } else {
        setError('Failed to log out of all devices. Please try again.');
      }
    } catch (err) {
      setError('Failed to log out of all devices. Please try again.');
    } finally {
      setLoggingOutAll(false);
    }
  };

  // Invite team member
  const handleInvite = async () => {
    if (!token || !inviteEmail || !inviteName) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/auth/business/team/invite?email=${encodeURIComponent(inviteEmail)}&full_name=${encodeURIComponent(inviteName)}&role=${inviteRole}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send invitation');
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}. Temporary password: ${data.temp_password}`);
      setInviteEmail('');
      setInviteName('');
      loadTeamMembersInternal();

      // Auto-close modal after 5 seconds
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 5000);

    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // Update team member
  const handleUpdateMember = async (memberId: string, updates: { role?: string; is_active?: boolean }) => {
    if (!token) return;

    try {
      const params = new URLSearchParams();
      if (updates.role) params.set('role', updates.role);
      if (updates.is_active !== undefined) params.set('is_active', String(updates.is_active));

      const response = await fetch(`${API_BASE}/auth/business/team/${memberId}?${params}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        loadTeamMembersInternal();
      }
    } catch (err) {
    }
  };

  if (!isReady) {
    return (
      <GlassShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </GlassShell>
    );
  }

  const showSave = view === 'hub' || view === 'company' || view === 'profile';

  const initials = (user?.full_name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const agencyDisplayName =
    agency.name || user?.business_name || user?.agency_name || user?.company_name || 'Your agency';

  const backButton = (
    <button
      type="button"
      onClick={() => setView('hub')}
      className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0F766E] hover:text-[#0D9488] transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      Settings
    </button>
  );

  return (
    <GlassShell
      title="Settings"
      subtitle={agencyDisplayName}
      action={
        showSave ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="glass-btn-primary disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <Check className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving' : saved ? 'Saved' : 'Save changes'}
          </button>
        ) : undefined
      }
    >
      <div className="w-full min-w-0 space-y-6 pb-4">
        {/* Error banner (shown across all views) */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================== HUB ============================== */}
        {view === 'hub' && (
          <div className="space-y-6">
            {/* Profile card */}
            <div className="glass-card flex flex-col sm:flex-row sm:items-center gap-5 p-6">
              {logoPreview || user?.agency_logo ? (
                <img
                  src={logoPreview || user?.agency_logo || ''}
                  alt=""
                  className="w-16 h-16 shrink-0 rounded-full object-cover bg-white border border-[#10211F14]"
                />
              ) : (
                <div className="w-16 h-16 shrink-0 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
                  {initials || '—'}
                </div>
              )}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-lg font-bold text-[#10211F]">{user?.full_name || 'Your profile'}</p>
                <p className="text-sm font-medium text-[#64748B] truncate">{user?.email || ''}</p>
                <p className="text-sm font-medium text-[#7A8C88]">
                  {[user?.role || 'Admin', agencyDisplayName, agency.state].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('profile')}
                className="h-[42px] px-5 rounded-[21px] bg-[#0D94881A] text-sm font-semibold text-[#0F766E] hover:bg-[#0D948826] transition-colors shrink-0"
              >
                Edit profile
              </button>
            </div>

            {/* Two-column section grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* -------- Left column -------- */}
              <div className="space-y-6">
                {/* COMPANY */}
                <SectionCard label="Company">
                  <HubRow
                    icon={<Building2 className="w-[18px] h-[18px] text-primary-500" />}
                    title="Agency profile"
                    subtitle="Name, address, and contact details"
                    onClick={() => setView('company')}
                  />
                  <HubRow
                    icon={<Hash className="w-[18px] h-[18px] text-primary-500" />}
                    title="License and NPI"
                    subtitle="Registration numbers used on contracts"
                    onClick={() => setView('company')}
                  />
                  <HubRow
                    icon={<Palette className="w-[18px] h-[18px] text-primary-500" />}
                    title="Branding colors"
                    subtitle="Logo and brand colors"
                    onClick={() => setView('company')}
                  />
                </SectionCard>

                {/* NOTIFICATIONS */}
                <SectionCard label="Notifications">
                  <ToggleRow
                    title="Email alerts"
                    subtitle="Get notified about new clients and visits"
                    checked={notifications.email_notifications}
                    onToggle={() => setNotifications(prev => ({ ...prev, email_notifications: !prev.email_notifications }))}
                  />
                  <ToggleRow
                    title="Weekly digest"
                    subtitle="A summary of activity every Monday"
                    checked={notifications.weekly_summary}
                    onToggle={() => setNotifications(prev => ({ ...prev, weekly_summary: !prev.weekly_summary }))}
                  />
                </SectionCard>

                {/* INTEGRATIONS */}
                <SectionCard label="Integrations">
                  <HubRow
                    icon={<Calendar className="w-[18px] h-[18px] text-primary-500" />}
                    title="Google Calendar"
                    subtitle={calendarConnected ? 'Connected' : 'Sync visits to your calendar'}
                    trailing={
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCalendarConnected(v => !v); }}
                        className={`h-8 px-3.5 rounded-[16px] text-[13px] font-semibold transition-colors ${
                          calendarConnected
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-[#0D94881A] text-[#0F766E] hover:bg-[#0D948826]'
                        }`}
                      >
                        {calendarConnected ? 'Connected' : 'Connect'}
                      </button>
                    }
                  />
                </SectionCard>
              </div>

              {/* -------- Right column -------- */}
              <div className="space-y-6">
                {/* PLAN */}
                <SectionCard label="Plan">
                    <HubRow
                    icon={<CreditCard className="w-[18px] h-[18px] text-primary-500" />}
                    title={planSummary?.name || 'Your plan'}
                    subtitle="Manage subscription, payment method, and invoices"
                    trailing={
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push('/billing#manage-subscription'); }}
                        className="h-8 px-3.5 rounded-[16px] text-[13px] font-semibold bg-[#0D94881A] text-[#0F766E] hover:bg-[#0D948826] transition-colors"
                      >
                        Billing
                      </button>
                    }
                    onClick={() => router.push('/billing#manage-subscription')}
                  />
                </SectionCard>

                {/* DOCUMENTS */}
                <SectionCard label="Documents">
                  <HubRow
                    icon={<FileText className="w-[18px] h-[18px] text-primary-500" />}
                    title="Contract template"
                    subtitle="Policies and terms used in contracts"
                    onClick={() => setView('documents')}
                  />
                  <HubRow
                    icon={<Image className="w-[18px] h-[18px] text-primary-500" />}
                    title="Agency logo"
                    subtitle="Appears on contracts and invoices"
                    onClick={() => setView('company')}
                  />
                  <HubRow
                    icon={<DollarSign className="w-[18px] h-[18px] text-primary-500" />}
                    title="Rate sheet"
                    subtitle="Hourly rates used to build contracts"
                    onClick={() => setView('plan')}
                  />
                </SectionCard>

                {/* ACCOUNT */}
                <SectionCard label="Account">
                  <HubRow
                    icon={<Lock className="w-[18px] h-[18px] text-primary-500" />}
                    title="Password"
                    subtitle="Update your account password"
                    onClick={() => setView('security')}
                  />
                  <HubRow
                    icon={<KeyRound className="w-[18px] h-[18px] text-primary-500" />}
                    title="Two-factor authentication"
                    subtitle={mfaEnabled ? 'On' : 'Off'}
                    onClick={() => setView('security')}
                  />
                  <HubRow
                    icon={<Users className="w-[18px] h-[18px] text-primary-500" />}
                    title="Team members"
                    subtitle="Invite and manage your team"
                    onClick={() => setView('team')}
                  />
                  <HubRow
                    icon={<LifeBuoy className="w-[18px] h-[18px] text-primary-500" />}
                    title="Support"
                    subtitle="Get help from our team"
                    trailing={<ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
                    onClick={() => { window.location.href = 'mailto:sales@palmtai.com'; }}
                  />
                </SectionCard>

                {/* DANGER */}
                <SectionCard label="Danger">
                  <HubRow
                    icon={<LogOut className="w-[18px] h-[18px] text-[#DC2626]" />}
                    title="Sign out"
                    subtitle="Sign out of this device"
                    trailing={<ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
                    danger
                    onClick={handleSignOut}
                  />
                  <HubRow
                    icon={<Trash2 className="w-[18px] h-[18px] text-[#DC2626]" />}
                    title="Delete account"
                    subtitle="Permanently delete your account and data"
                    trailing={<ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
                    danger
                    onClick={() => { setShowDeleteForm(true); setView('security'); }}
                  />
                </SectionCard>
              </div>
            </div>
          </div>
        )}

        {/* ============================ COMPANY ============================ */}
        {view === 'company' && (
          <div className="space-y-6">
            {backButton}

            {/* Extraction status */}
            {extractionMessage && (
              <div className="p-4 rounded-xl bg-primary-50 border border-primary-200 flex items-center gap-3">
                {extracting ? (
                  <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                )}
                <span className="text-primary-600 text-sm">{extractionMessage}</span>
              </div>
            )}

            {/* Fill from a document */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-1">Fill from a document</h2>
              <p className="text-[#4B6B66] text-sm mb-3">
                Upload a document with your letterhead and we will fill your business details for you.
              </p>
              <button
                onClick={() => extractInputRef.current?.click()}
                className="btn-primary text-sm flex items-center gap-2"
                disabled={extracting}
                type="button"
              >
                {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload a document
              </button>
              <input
                ref={extractInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleExtractUpload}
                className="hidden"
              />
            </div>

            {/* Logo */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary-400" />
                Company logo
              </h2>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="w-32 h-32 object-contain bg-white/60 rounded-xl border border-white/70"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="w-32 h-32 bg-white/50 rounded-xl border-2 border-dashed border-[#10211F1A] hover:border-primary-500 flex flex-col items-center justify-center cursor-pointer transition"
                    >
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-slate-500 text-xs">Upload logo</span>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-slate-600 text-sm mb-2">
                    Upload your company logo. This appears on contracts, invoices, and documents.
                  </p>
                  <p className="text-slate-400 text-xs">
                    PNG, JPG, or SVG. At least 200x200px. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Company information */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-400" />
                Company information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-slate-600 text-sm mb-1">Company name</label>
                  <input
                    type="text"
                    value={agency.name}
                    onChange={(e) => setAgency(prev => ({ ...prev, name: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="Your Home Care Agency"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 text-sm mb-1">Street address</label>
                  <input
                    type="text"
                    value={agency.address}
                    onChange={(e) => setAgency(prev => ({ ...prev, address: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="123 Main Street, Suite 100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">City</label>
                  <input
                    type="text"
                    value={agency.city}
                    onChange={(e) => setAgency(prev => ({ ...prev, city: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 text-sm mb-1">State</label>
                    <input
                      type="text"
                      value={agency.state}
                      onChange={(e) => setAgency(prev => ({ ...prev, state: e.target.value }))}
                      className="glass-input w-full"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-sm mb-1">ZIP</label>
                    <input
                      type="text"
                      value={agency.zip_code}
                      onChange={(e) => setAgency(prev => ({ ...prev, zip_code: e.target.value }))}
                      className="glass-input w-full"
                      placeholder="12345"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Phone</label>
                  <input
                    type="tel"
                    value={agency.phone}
                    onChange={(e) => setAgency(prev => ({ ...prev, phone: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={agency.email}
                    onChange={(e) => setAgency(prev => ({ ...prev, email: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="contact@agency.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 text-sm mb-1">Website</label>
                  <input
                    type="url"
                    value={agency.website}
                    onChange={(e) => setAgency(prev => ({ ...prev, website: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="https://www.youragency.com"
                  />
                </div>
              </div>
            </div>

            {/* Business identifiers */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4">Business identifiers</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-sm mb-1">License number</label>
                  <input
                    type="text"
                    value={agency.license_number}
                    onChange={(e) => setAgency(prev => ({ ...prev, license_number: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="License number"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">NPI number</label>
                  <input
                    type="text"
                    value={agency.npi_number}
                    onChange={(e) => setAgency(prev => ({ ...prev, npi_number: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="NPI number"
                  />
                </div>
              </div>
            </div>

            {/* Primary contact */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4">Primary contact</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Contact name</label>
                  <input
                    type="text"
                    value={agency.contact_person}
                    onChange={(e) => setAgency(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Title or position</label>
                  <input
                    type="text"
                    value={agency.contact_title}
                    onChange={(e) => setAgency(prev => ({ ...prev, contact_title: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="Administrator"
                  />
                </div>
              </div>
            </div>

            {/* Brand colors */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4">Brand colors</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 text-sm mb-2">Primary color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={agency.primary_color}
                      onChange={(e) => setAgency(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={agency.primary_color}
                      onChange={(e) => setAgency(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="glass-input flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-2">Secondary color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={agency.secondary_color}
                      onChange={(e) => setAgency(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={agency.secondary_color}
                      onChange={(e) => setAgency(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="glass-input flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================= PLAN ============================= */}
        {view === 'plan' && (
          <div className="space-y-6">
            {backButton}

            {/* Current plan summary + full billing link */}
            <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0D94881A] flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-[#10211F]">{planSummary?.name || 'Your plan'}</p>
                <p className="text-sm font-medium text-[#64748B]">
                  Rates below feed contract generation. Purchases and cancellations happen in the PalmCare app.
                </p>
              </div>
              <a href="/billing" className="glass-btn-primary shrink-0">
                Open billing
              </a>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-1 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary-500" />
                Pay sources
              </h2>
              <p className="text-sm text-slate-500 mb-4">Which payment types does your agency accept?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'medicaid', label: 'Medicaid', flag: 'accepts_medicaid' },
                  { id: 'medicare', label: 'Medicare', flag: 'accepts_medicare' },
                  { id: 'private_pay', label: 'Private Pay', flag: 'accepts_private_pay' },
                  { id: 'insurance', label: 'Private Insurance', flag: 'accepts_insurance' },
                  { id: 'va', label: 'VA Benefits', flag: 'accepts_va' },
                ].map(ps => {
                  const isActive = agency.pay_sources?.includes(ps.id);
                  return (
                    <button
                      key={ps.id}
                      type="button"
                      onClick={() => {
                        const arr = agency.pay_sources || [];
                        const next = arr.includes(ps.id) ? arr.filter((x: string) => x !== ps.id) : [...arr, ps.id];
                        setAgency({ ...agency, pay_sources: next, [ps.flag]: next.includes(ps.id) } as any);
                      }}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition w-full min-w-0 justify-start text-left ${
                        isActive ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {isActive ? <CheckCircle2 className="w-4 h-4" /> : null}
                      </span>
                      <span className="truncate">{ps.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-1">Service types</h2>
              <p className="text-sm text-slate-500 mb-4">What services does your agency provide?</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'personal_care', label: 'Personal Care' },
                  { id: 'companion', label: 'Companion Care' },
                  { id: 'skilled_nursing', label: 'Skilled Nursing' },
                  { id: 'homemaker', label: 'Homemaker' },
                  { id: 'respite', label: 'Respite Care' },
                  { id: 'hospice', label: 'Hospice Support' },
                  { id: 'medication_mgmt', label: 'Medication Mgmt' },
                  { id: 'meal_prep', label: 'Meal Preparation' },
                  { id: 'transportation', label: 'Transportation' },
                ].map(svc => {
                  const isActive = agency.service_types?.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => {
                        const arr = agency.service_types || [];
                        const next = arr.includes(svc.id) ? arr.filter((x: string) => x !== svc.id) : [...arr, svc.id];
                        setAgency({ ...agency, service_types: next });
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        isActive ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {svc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-1">Hourly rates</h2>
              <p className="text-sm text-slate-500 mb-4">These rates are used when generating contracts. Leave blank for system defaults.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'default_hourly_rate', label: 'Default Hourly Rate' },
                  { key: 'private_pay_rate', label: 'Private Pay Rate' },
                ].map(r => (
                  <div key={r.key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{r.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={(agency as any)[r.key] ?? ''}
                        onChange={e => setAgency({ ...agency, [r.key]: e.target.value === '' ? null : parseFloat(e.target.value) } as any)}
                        placeholder="0.00"
                        className="glass-input pl-7 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {agency.accepts_medicaid && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-3">Medicaid rates</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'medicaid_companion_rate', label: 'Companion' },
                      { key: 'medicaid_personal_care_rate', label: 'Personal Care' },
                      { key: 'medicaid_respite_rate', label: 'Respite' },
                    ].map(r => (
                      <div key={r.key}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{r.label}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={(agency as any)[r.key] ?? ''}
                            onChange={e => setAgency({ ...agency, [r.key]: e.target.value === '' ? null : parseFloat(e.target.value) } as any)}
                            placeholder="0.00"
                            className="glass-input pl-7 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agency.accepts_medicare && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-3">Medicare rates</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'medicare_skilled_rate', label: 'Skilled Nursing' },
                      { key: 'medicare_aide_rate', label: 'Home Health Aide' },
                    ].map(r => (
                      <div key={r.key}>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{r.label}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={(agency as any)[r.key] ?? ''}
                            onChange={e => setAgency({ ...agency, [r.key]: e.target.value === '' ? null : parseFloat(e.target.value) } as any)}
                            placeholder="0.00"
                            className="glass-input pl-7 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className="glass-btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving' : saved ? 'Saved' : 'Save rates'}
              </button>
            </div>
          </div>
        )}

        {/* =========================== DOCUMENTS =========================== */}
        {view === 'documents' && (
          <div className="space-y-6">
            {backButton}

            {/* Upload new document */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-400" />
                Upload documents
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                Upload your service contract and care plan assessment sheets as Word (.docx) files.
                PALM reads the form with OCR and fills your original document for each client.
                Policies and other files can be stored here too.
              </p>

              {/* Category selection */}
              <div className="mb-4">
                <label className="block text-slate-600 text-sm mb-2">Document category</label>
                <div className="flex flex-wrap gap-2">
                  {documentCategories.map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-primary-50 text-primary-400 border border-primary-500/50'
                            : 'bg-white/60 text-[#4B6B66] border border-white/70 hover:border-[#0D948855]'
                        }`}
                      >
                        <CatIcon className="w-4 h-4" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload area */}
              <div
                onClick={() => docInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  uploadingDoc
                    ? 'border-primary-500/50 bg-primary-500/5'
                    : 'border-[#10211F1A] hover:border-primary-500 bg-white/40'
                }`}
              >
                {uploadingDoc ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
                    <p className="text-primary-400 font-medium">Uploading and reading the document.</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-900 font-medium mb-1">Click to upload a document</p>
                    <p className="text-slate-500 text-sm">PDF, DOCX, DOC, PNG, JPG. Max 25MB.</p>
                  </>
                )}
              </div>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.rtf"
                onChange={handleDocumentUpload}
                className="hidden"
              />
            </div>

            {/* Uploaded documents list */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4">Uploaded documents</h2>

              {agency.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No documents uploaded yet</p>
                  <p className="text-slate-400 text-sm">Upload policies and procedures above</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agency.documents.map((doc) => {
                    const category = documentCategories.find(c => c.id === doc.category);
                    const CatIcon = category?.icon || File;

                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                            <CatIcon className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <p className="text-slate-900 font-medium">{doc.name}</p>
                            <p className="text-slate-500 text-sm">{category?.label} · Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDocument(doc.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Default policies */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-4">Default policies</h2>
              <p className="text-slate-500 text-sm mb-4">
                These are used as defaults when generating contracts. You can also upload policy documents above.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-600 text-sm mb-2">Cancellation policy</label>
                  <textarea
                    value={agency.cancellation_policy}
                    onChange={(e) => setAgency(prev => ({ ...prev, cancellation_policy: e.target.value }))}
                    className="glass-input w-full h-24 resize-none"
                    placeholder="24-hour notice required for cancellations..."
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-2">Terms and conditions</label>
                  <textarea
                    value={agency.terms_and_conditions}
                    onChange={(e) => setAgency(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                    className="glass-input w-full h-32 resize-none"
                    placeholder="Standard terms and conditions for your services..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSave} disabled={saving} className="glass-btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving' : saved ? 'Saved' : 'Save documents'}
              </button>
            </div>
          </div>
        )}

        {/* ============================ PROFILE ============================ */}
        {view === 'profile' && (
          <div className="space-y-6">
            {backButton}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-400" />
                Profile
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Full name</label>
                  <input
                    type="text"
                    value={agency.contact_person}
                    onChange={(e) => setAgency(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={agency.email}
                    onChange={(e) => setAgency(prev => ({ ...prev, email: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-sm mb-1">Phone</label>
                  <input
                    type="tel"
                    value={agency.phone}
                    onChange={(e) => setAgency(prev => ({ ...prev, phone: e.target.value }))}
                    className="glass-input w-full"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================= TEAM ============================= */}
        {view === 'team' && (
          <div className="space-y-6">
            {backButton}

            {/* Plan usage banner */}
            {teamLimits && (
              <div className={`p-4 rounded-xl border ${
                teamLimits.can_invite
                  ? 'bg-white/60 border-white/70'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      teamLimits.can_invite ? 'bg-primary-50' : 'bg-amber-50'
                    }`}>
                      <Users className={`w-5 h-5 ${teamLimits.can_invite ? 'text-primary-400' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="text-slate-900 font-medium">
                        {teamLimits.current_users} / {teamLimits.max_users} team members
                      </p>
                      <p className="text-slate-500 text-sm">
                        {teamLimits.plan_name} plan
                        {teamLimits.remaining_seats !== undefined && teamLimits.remaining_seats > 0 && (
                          <span> · {teamLimits.remaining_seats} seat{teamLimits.remaining_seats !== 1 ? 's' : ''} available</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!teamLimits.can_invite && teamLimits.upgrade_options && teamLimits.upgrade_options.length > 0 && (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition"
                    >
                      Upgrade plan
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      teamLimits.can_invite ? 'bg-primary-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(100, (teamLimits.current_users / teamLimits.max_users) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Team header */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-[#10211F] flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-400" />
                    Team members
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Manage your team and their permissions</p>
                </div>
                {teamLimits?.can_invite ? (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite member
                  </button>
                ) : (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="btn-secondary flex items-center gap-2"
                    title="Upgrade your plan to invite more team members"
                  >
                    <UserPlus className="w-4 h-4" />
                    Upgrade to invite
                  </button>
                )}
              </div>

              {/* Team list */}
              {loadingTeam ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No team members yet</p>
                  <p className="text-slate-400 text-sm">Invite your first team member to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/50">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                          <span className="text-primary-400 font-medium">
                            {member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-900 font-medium">{member.full_name}</p>
                          <p className="text-slate-500 text-sm">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMember(member.id, { role: e.target.value })}
                          className="bg-white/70 border border-[#10211F1A] rounded-lg px-3 py-1.5 text-sm text-[#4B6B66]"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="caregiver">Caregiver</option>
                        </select>
                        <button
                          onClick={() => handleUpdateMember(member.id, { is_active: !member.is_active })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            member.is_active
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voice ID setup tip */}
            <div className="glass-card p-6">
              <h3 className="text-[#10211F] font-medium mb-1">Voice ID for team members</h3>
              <p className="text-[#4B6B66] text-sm">
                Each team member can set up their Voice ID in the app. This lets the system identify who is speaking during assessments.
              </p>
            </div>
          </div>
        )}

        {/* Invite modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#10211F] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary-400" />
                  Invite team member
                </h3>
                <button onClick={() => { setShowInviteModal(false); setInviteError(null); setInviteSuccess(null); }} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                  <p className="text-emerald-600 text-sm">{inviteSuccess}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Full name</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="glass-input w-full"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Email address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="glass-input w-full"
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="glass-input w-full"
                    >
                      <option value="caregiver">Caregiver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {inviteError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-600 text-sm">{inviteError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail || !inviteName}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {inviting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Send invite
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upgrade modal */}
        {showUpgradeModal && teamLimits?.upgrade_options && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#10211F]">
                  Upgrade your plan
                </h3>
                <button onClick={() => setShowUpgradeModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <p className="text-slate-500 text-sm mb-6">
                Your current <span className="text-slate-900 font-medium">{teamLimits.plan_name}</span> plan
                allows {teamLimits.max_users} team member{teamLimits.max_users !== 1 ? 's' : ''}.
                Upgrade to add more users and unlock more features.
              </p>

              <div className="space-y-4">
                {teamLimits.upgrade_options.map((plan, index) => (
                  <div
                    key={plan.name}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      index === 0
                        ? 'bg-primary-50 border-primary-200 hover:border-primary-500/50'
                        : 'bg-slate-100 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold ${index === 0 ? 'text-primary-400' : 'text-slate-800'}`}>
                          {plan.name}
                        </h4>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-primary-50 text-primary-400 text-xs rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 font-bold">
                        ${plan.monthly_price}<span className="text-slate-500 font-normal text-sm">/mo</span>
                      </p>
                    </div>
                    <p className="text-slate-500 text-sm">
                      Up to {plan.max_users} team members
                      <span className="text-emerald-600 ml-1">
                        (+{plan.additional_users} more than current)
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <a
                  href="/pricing"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  View all plans and pricing
                </a>
                <p className="text-slate-400 text-xs text-center mt-3">
                  Contact us for custom enterprise pricing
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================== SECURITY =========================== */}
        {view === 'security' && (
          <div className="space-y-6">
            {backButton}

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-400" />
                Security
              </h2>
              <div className="space-y-4">
                <div className="py-3 border-b border-[#10211F12]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-md flex items-center justify-center bg-[#0D94881A]">
                        <Shield className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-[#10211F]">Two-factor authentication</p>
                        <p className="text-[13px] font-medium text-[#7A8C88]">
                          {mfaEnabled ? 'Enabled. Your account is protected with a TOTP code.' : 'Add an extra layer of security'}
                        </p>
                      </div>
                    </div>
                    {mfaStep === 'idle' && (
                      <button
                        onClick={mfaEnabled ? () => setMfaStep('verify') : handleMfaSetup}
                        disabled={mfaLoading}
                        className={`text-sm ${mfaEnabled ? 'btn-secondary text-red-600 border-red-200 hover:bg-red-50' : 'btn-secondary'}`}
                      >
                        {mfaLoading ? 'Loading...' : mfaEnabled ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </div>

                  {mfaError && (
                    <p className="text-red-500 text-sm mt-2">{mfaError}</p>
                  )}

                  {mfaStep === 'setup' && (
                    <div className="mt-4 p-4 bg-white/60 rounded-xl border border-white/70 space-y-4">
                      <p className="text-sm text-slate-700 font-medium">Scan this QR code with your authenticator app:</p>
                      <div className="flex justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaUri)}`}
                          alt="MFA QR Code"
                          className="w-48 h-48 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400 mb-1">Or enter this key manually:</p>
                        <code className="text-sm bg-white px-3 py-1 rounded border border-slate-200 select-all font-mono">{mfaSecret}</code>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600 mb-1 block">Enter the 6-digit code from your app:</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            className="flex-1 input-primary text-center text-lg tracking-widest font-mono"
                          />
                          <button
                            onClick={handleMfaEnable}
                            disabled={mfaCode.length < 6 || mfaLoading}
                            className="btn-primary text-sm px-4"
                          >
                            {mfaLoading ? 'Verifying...' : 'Verify and enable'}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => { setMfaStep('idle'); setMfaCode(''); setMfaError(null); }} className="text-sm text-slate-400 hover:text-slate-600">
                        Cancel
                      </button>
                    </div>
                  )}

                  {mfaStep === 'verify' && mfaEnabled && (
                    <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
                      <p className="text-sm text-red-700 font-medium">Enter your authenticator code to disable 2FA:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="flex-1 input-primary text-center text-lg tracking-widest font-mono"
                        />
                        <button
                          onClick={handleMfaDisable}
                          disabled={mfaCode.length < 6 || mfaLoading}
                          className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg"
                        >
                          {mfaLoading ? 'Disabling...' : 'Disable 2FA'}
                        </button>
                      </div>
                      <button onClick={() => { setMfaStep('idle'); setMfaCode(''); setMfaError(null); }} className="text-sm text-slate-400 hover:text-slate-600">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="py-3">
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-10 h-10 shrink-0 rounded-md flex items-center justify-center bg-[#0D94881A]">
                      <Lock className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#10211F]">Change password</p>
                      <p className="text-[13px] font-medium text-[#7A8C88]">Update your account password</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input type="password" placeholder="Current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="glass-input" />
                    <input type="password" placeholder="New password (min 8 characters)" value={newPw} onChange={e => setNewPw(e.target.value)} className="glass-input" />
                    <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="glass-input" />
                    {pwMsg && <p className={`text-sm ${pwMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg.text}</p>}
                    <button
                      disabled={pwLoading || !currentPw || !newPw || newPw !== confirmPw || newPw.length < 8}
                      onClick={async () => {
                        setPwLoading(true); setPwMsg(null);
                        try {
                          const res = await fetch(`${API_BASE}/auth/change-password`, {
                            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
                          });
                          const d = await res.json();
                          if (!res.ok) throw new Error(d.detail || 'Failed');
                          setPwMsg({ type: 'success', text: 'Password changed successfully.' });
                          setCurrentPw(''); setNewPw(''); setConfirmPw('');
                        } catch (e: any) {
                          setPwMsg({ type: 'error', text: e.message });
                        } finally { setPwLoading(false); }
                      }}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      {pwLoading ? 'Saving...' : 'Update password'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Active sessions */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-[#10211F] mb-2 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-primary-400" />
                Active sessions
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                If you suspect unauthorized access or left your account signed in on another device,
                you can sign out of all devices at once. You will need to sign in again everywhere.
              </p>
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-slate-900 font-medium">Log out of all devices</p>
                    <p className="text-slate-500 text-sm">Invalidates all active sessions including this one</p>
                  </div>
                </div>
                <button
                  onClick={handleLogoutAllDevices}
                  disabled={loggingOutAll}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {loggingOutAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  {loggingOutAll ? 'Signing out...' : 'Log out all'}
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="glass-card p-6" style={{ borderColor: '#DC262640' }}>
              <h2 className="text-lg font-semibold text-[#10211F] mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-red-600" />
                Danger zone
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#10211F] font-medium">Delete account</p>
                  <p className="text-[#7A8C88] text-sm">Permanently delete your account and all data</p>
                </div>
                {!showDeleteForm && (
                  <button onClick={() => setShowDeleteForm(true)} className="px-4 h-[42px] rounded-xl text-sm font-semibold text-[#DC2626] bg-[#DC26260F] border border-[#DC262640] hover:bg-[#DC26261A] transition">
                    Delete account
                  </button>
                )}
              </div>
              {showDeleteForm && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
                  <p className="text-sm text-red-700 font-semibold">This action is permanent and cannot be undone.</p>
                  <p className="text-sm text-red-600">All your data, clients, assessments, contracts, and team members will be permanently deleted.</p>
                  <input type="password" placeholder="Enter your password" value={deletePw} onChange={e => setDeletePw(e.target.value)} className="w-full bg-white border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none" />
                  <input type="text" placeholder='Type "DELETE MY ACCOUNT" to confirm' value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} className="w-full bg-white border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none" />
                  <div className="flex gap-2">
                    <button
                      disabled={deleteLoading || deleteConfirmation !== 'DELETE MY ACCOUNT' || !deletePw}
                      onClick={async () => {
                        setDeleteLoading(true);
                        try {
                          const res = await fetch(`${API_BASE}/auth/delete-account`, {
                            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: deletePw, confirmation: deleteConfirmation }),
                          });
                          const d = await res.json();
                          if (!res.ok) throw new Error(d.detail || 'Deletion failed');
                          // Clear the real session (zustand 'palmcare-auth' store) —
                          // a stale 'token' key removal left the session alive.
                          logout();
                          router.push('/login?deleted=1');
                        } catch (e: any) {
                          setError(e.message);
                          setDeleteLoading(false);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 transition"
                    >
                      {deleteLoading ? 'Deleting...' : 'Permanently delete my account'}
                    </button>
                    <button onClick={() => { setShowDeleteForm(false); setDeletePw(''); setDeleteConfirmation(''); }} className="btn-secondary text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GlassShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Hub building blocks                                                        */
/* -------------------------------------------------------------------------- */

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <p className="text-[12px] font-semibold tracking-[0.06em] uppercase text-[#4B6B66] mb-1">{label}</p>
      <div className="divide-y divide-[#10211F0F]">{children}</div>
    </div>
  );
}

function HubRow({
  icon,
  title,
  subtitle,
  onClick,
  trailing,
  danger,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-3.5 py-3.5 text-left"
    >
      {icon && (
        <div className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${danger ? 'bg-[#DC26260F]' : 'bg-[#0D94881A]'}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-semibold ${danger ? 'text-[#DC2626]' : 'text-[#10211F]'}`}>{title}</p>
        {subtitle && <p className="text-[13px] font-medium text-[#64748B] truncate">{subtitle}</p>}
      </div>
      {trailing ?? <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#64748B] transition-colors" />}
    </button>
  );
}

function ToggleRow({
  title,
  subtitle,
  checked,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#10211F]">{title}</p>
        {subtitle && <p className="text-[13px] font-medium text-[#64748B] truncate">{subtitle}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onToggle}
        className={`glass-toggle ${checked ? 'glass-toggle-on' : 'glass-toggle-off'}`}
      >
        <div className="glass-toggle-knob" />
      </button>
    </div>
  );
}
