'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Shield,
  Calendar,
  FileText,
  FileSignature,
  AlertCircle,
  Edit3,
  Trash2,
  Clock,
  Activity,
  ChevronRight,
  Loader2,
  Building,
  CreditCard,
  Eye,
  Send,
  Plus,
  Stethoscope,
  Home,
  Pill,
  UserCheck,
  X,
  Save,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Client {
  id: string;
  full_name: string;
  preferred_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_2_relationship?: string;
  primary_diagnosis?: string;
  secondary_diagnoses?: string;
  allergies?: string;
  medications?: string;
  physician_name?: string;
  physician_phone?: string;
  medical_notes?: string;
  mobility_status?: string;
  cognitive_status?: string;
  living_situation?: string;
  care_level?: string;
  care_plan?: string;
  special_requirements?: string;
  insurance_provider?: string;
  insurance_id?: string;
  medicaid_id?: string;
  medicare_id?: string;
  preferred_days?: string;
  preferred_times?: string;
  status?: string;
  notes?: string;
  created_at: string;
  intake_date?: string;
  discharge_date?: string;
}

interface Visit {
  id: string;
  client_name: string;
  caregiver_name?: string;
  status: string;
  scheduled_date?: string;
  created_at: string;
  contract_generated?: boolean;
  note_generated?: boolean;
}

interface Contract {
  id: string;
  client_id: string;
  contract_number?: string;
  title?: string;
  services?: any[];
  schedule?: any;
  hourly_rate?: number;
  weekly_hours?: number;
  status: string;
  start_date?: string;
  created_at: string;
}

// Pipeline stages
const PIPELINE_STAGES = [
  { key: 'intake', label: 'Intake', color: 'blue' },
  { key: 'assessment', label: 'Assessment', color: 'purple' },
  { key: 'proposal', label: 'Proposal', color: 'orange' },
  { key: 'active', label: 'Active', color: 'green' },
  { key: 'follow_up', label: 'Follow-up', color: 'yellow' },
  { key: 'discharged', label: 'Discharged', color: 'red' },
];

const STATUS_MAP: Record<string, string> = {
  intake: 'intake',
  pending: 'intake',
  assessment: 'assessment',
  proposal: 'proposal',
  pending_review: 'proposal',
  active: 'active',
  assigned: 'active',
  follow_up: 'follow_up',
  review: 'follow_up',
  inactive: 'follow_up',
  discharged: 'discharged',
};

function ClientAvatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-teal-500 to-green-500',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-bold text-white shadow-lg`}>
      {initials}
    </div>
  );
}

function InsuranceBadges({ client }: { client: Client }) {
  const badges = [];

  if (client.medicaid_id) {
    badges.push(
      <span key="medicaid" className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
        Medicaid
      </span>
    );
  }
  if (client.medicare_id) {
    badges.push(
      <span key="medicare" className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
        Medicare
      </span>
    );
  }
  if (client.insurance_provider && !client.medicaid_id && !client.medicare_id) {
    badges.push(
      <span key="private" className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
        Private
      </span>
    );
  }

  if (badges.length === 0) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-dark-600 text-dark-400 border border-dark-500">
        No Insurance
      </span>
    );
  }

  return <div className="flex gap-2 flex-wrap">{badges}</div>;
}

// Info row helper
function InfoRow({ icon: Icon, label, value, href }: { icon: any; label: string; value?: string; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-dark-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-dark-400">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-primary-400 hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-sm text-white truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const { token, isLoading: authLoading } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'contracts' | 'care' | 'medical'>('overview');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token && clientId) {
      loadClientData();
    }
  }, [token, clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch client, visits, and contracts in parallel
      const [clientRes, visitsRes, contractsRes] = await Promise.all([
        fetch(`${API_BASE}/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/visits?client_id=${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${API_BASE}/visits/clients/${clientId}/contracts`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (!clientRes.ok) {
        throw new Error('Client not found');
      }

      const clientData = await clientRes.json();
      setClient(clientData);

      // Parse visits
      if (visitsRes && visitsRes.ok) {
        const visitsData = await visitsRes.json();
        const visitsList = Array.isArray(visitsData) ? visitsData : (visitsData?.items || []);
        setVisits(visitsList);
      }

      // Parse contracts
      if (contractsRes && contractsRes.ok) {
        const contractsData = await contractsRes.json();
        setContracts(Array.isArray(contractsData) ? contractsData : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!client || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const response = await fetch(`${API_BASE}/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setClient(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      // Silent fail for status update
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/clients/${client.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        router.push('/clients');
      } else {
        setError('Failed to delete client');
      }
    } catch {
      setError('Failed to delete client');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Get current pipeline stage index
  const currentStageKey = STATUS_MAP[client?.status || 'active'] || 'active';
  const currentStageIndex = PIPELINE_STAGES.findIndex(s => s.key === currentStageKey);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-dark-300">Loading client details...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex min-h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Client Not Found</h2>
            <p className="text-dark-400 mb-6">{error || 'The client you are looking for does not exist.'}</p>
            <button onClick={() => router.push('/clients')} className="btn-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </button>
          </div>
        </main>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: User },
    { id: 'visits' as const, label: 'Visits', icon: Activity, count: visits.length },
    { id: 'contracts' as const, label: 'Contracts', icon: FileSignature, count: contracts.length },
    { id: 'care' as const, label: 'Care Plan', icon: FileText },
    { id: 'medical' as const, label: 'Medical', icon: Heart },
  ];

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/clients')}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-dark-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <ClientAvatar name={client.full_name} size="md" />
                  <div>
                    <h1 className="text-xl font-bold text-white">{client.full_name}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <InsuranceBadges client={client} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/visits?client=${client.id}`)}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Assessment
                </button>
                <button
                  onClick={() => router.push(`/clients?edit=${client.id}`)}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete client"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Progress Bar */}
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">Client Pipeline</h3>
              {updatingStatus && <Loader2 className="w-4 h-4 animate-spin text-primary-400" />}
            </div>

            {/* Progress Track */}
            <div className="relative">
              {/* Background track */}
              <div className="absolute top-4 left-0 right-0 h-1.5 bg-dark-600 rounded-full" />
              {/* Filled track */}
              <div
                className="absolute top-4 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(((currentStageIndex) / (PIPELINE_STAGES.length - 1)) * 100, 5)}%` }}
              />

              {/* Stage dots */}
              <div className="relative flex justify-between">
                {PIPELINE_STAGES.map((stage, index) => {
                  const isActive = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const colorMap: Record<string, string> = {
                    blue: 'bg-blue-500 shadow-blue-500/50',
                    purple: 'bg-purple-500 shadow-purple-500/50',
                    orange: 'bg-orange-500 shadow-orange-500/50',
                    green: 'bg-green-500 shadow-green-500/50',
                    yellow: 'bg-yellow-500 shadow-yellow-500/50',
                    red: 'bg-red-500 shadow-red-500/50',
                  };
                  const textColorMap: Record<string, string> = {
                    blue: 'text-blue-400',
                    purple: 'text-purple-400',
                    orange: 'text-orange-400',
                    green: 'text-green-400',
                    yellow: 'text-yellow-400',
                    red: 'text-red-400',
                  };

                  return (
                    <button
                      key={stage.key}
                      onClick={() => handleStatusChange(stage.key)}
                      disabled={updatingStatus}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isCurrent
                            ? `${colorMap[stage.color]} shadow-lg scale-110 ring-4 ring-dark-800`
                            : isActive
                            ? `${colorMap[stage.color]} opacity-80`
                            : 'bg-dark-600 group-hover:bg-dark-500'
                        }`}
                      >
                        {isActive && (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs font-medium transition-colors ${
                        isCurrent ? textColorMap[stage.color] : isActive ? 'text-dark-300' : 'text-dark-500 group-hover:text-dark-300'
                      }`}>
                        {stage.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center gap-1 border-b border-dark-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-xs bg-dark-600 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Client Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Contact Info Card */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Contact Information</h3>
                  <div className="space-y-1 divide-y divide-dark-700/50">
                    <InfoRow icon={Phone} label="Primary Phone" value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
                    <InfoRow icon={Phone} label="Secondary Phone" value={client.phone_secondary} href={client.phone_secondary ? `tel:${client.phone_secondary}` : undefined} />
                    <InfoRow icon={Mail} label="Email" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
                    <InfoRow icon={MapPin} label="Address" value={[client.address, client.city, client.state, client.zip_code].filter(Boolean).join(', ') || undefined} />
                    <InfoRow icon={Home} label="Living Situation" value={client.living_situation?.replace(/_/g, ' ')} />
                  </div>
                </div>

                {/* Personal Details Card */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Personal Details</h3>
                  <div className="space-y-1 divide-y divide-dark-700/50">
                    <InfoRow icon={User} label="Preferred Name" value={client.preferred_name} />
                    <InfoRow icon={Calendar} label="Date of Birth" value={client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : undefined} />
                    <InfoRow icon={User} label="Gender" value={client.gender ? client.gender.charAt(0).toUpperCase() + client.gender.slice(1) : undefined} />
                    <InfoRow icon={Calendar} label="Client Since" value={new Date(client.created_at).toLocaleDateString()} />
                    <InfoRow icon={Calendar} label="Intake Date" value={client.intake_date ? new Date(client.intake_date).toLocaleDateString() : undefined} />
                  </div>
                </div>

                {/* Insurance Card */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Insurance</h3>
                  <div className="space-y-1 divide-y divide-dark-700/50">
                    <InfoRow icon={Shield} label="Provider" value={client.insurance_provider} />
                    <InfoRow icon={CreditCard} label="Insurance ID" value={client.insurance_id} />
                    <InfoRow icon={Building} label="Medicaid ID" value={client.medicaid_id} />
                    <InfoRow icon={Building} label="Medicare ID" value={client.medicare_id} />
                  </div>
                </div>
              </div>

              {/* Right Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Emergency Contacts */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    Emergency Contacts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {client.emergency_contact_name ? (
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <p className="text-xs text-dark-400 mb-1">Primary Contact</p>
                        <p className="font-medium text-white">{client.emergency_contact_name}</p>
                        <p className="text-sm text-dark-300">{client.emergency_contact_relationship || 'Relationship N/A'}</p>
                        {client.emergency_contact_phone && (
                          <a href={`tel:${client.emergency_contact_phone}`} className="text-sm text-primary-400 hover:underline mt-1 block">
                            {client.emergency_contact_phone}
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                        <p className="text-dark-500 text-sm">No primary emergency contact</p>
                      </div>
                    )}
                    {client.emergency_contact_2_name ? (
                      <div className="bg-dark-700/50 rounded-lg p-4">
                        <p className="text-xs text-dark-400 mb-1">Secondary Contact</p>
                        <p className="font-medium text-white">{client.emergency_contact_2_name}</p>
                        <p className="text-sm text-dark-300">{client.emergency_contact_2_relationship || 'Relationship N/A'}</p>
                        {client.emergency_contact_2_phone && (
                          <a href={`tel:${client.emergency_contact_2_phone}`} className="text-sm text-primary-400 hover:underline mt-1 block">
                            {client.emergency_contact_2_phone}
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="bg-dark-700/50 rounded-lg p-4 text-center">
                        <p className="text-dark-500 text-sm">No secondary emergency contact</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Visits */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary-400" />
                      Recent Assessments
                    </h3>
                    {visits.length > 0 && (
                      <button
                        onClick={() => setActiveTab('visits')}
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        View all ({visits.length})
                      </button>
                    )}
                  </div>

                  {visits.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                      <p className="text-dark-400 text-sm mb-3">No assessments yet</p>
                      <button
                        onClick={() => router.push(`/visits?client=${client.id}`)}
                        className="text-sm text-primary-400 hover:text-primary-300"
                      >
                        Schedule first assessment
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visits.slice(0, 5).map((visit) => (
                        <div
                          key={visit.id}
                          onClick={() => router.push(`/visits/${visit.id}`)}
                          className="flex items-center justify-between p-3 bg-dark-700/50 hover:bg-dark-700 rounded-lg cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              visit.status === 'completed' ? 'bg-green-400' :
                              visit.status === 'processing' ? 'bg-yellow-400 animate-pulse' :
                              visit.status === 'failed' ? 'bg-red-400' :
                              'bg-dark-400'
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-white">{visit.caregiver_name || 'Assessment'}</p>
                              <p className="text-xs text-dark-400">
                                {new Date(visit.scheduled_date || visit.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              visit.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              visit.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                              visit.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-dark-600 text-dark-300'
                            }`}>
                              {(visit.status || 'pending').replace(/_/g, ' ')}
                            </span>
                            <div className="flex gap-1">
                              {visit.note_generated && (
                                <span className="text-xs text-dark-400" title="Note generated">
                                  <FileText className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {visit.contract_generated && (
                                <span className="text-xs text-dark-400" title="Contract generated">
                                  <FileSignature className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Contracts */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-green-400" />
                      Contracts
                    </h3>
                    {contracts.length > 0 && (
                      <button
                        onClick={() => setActiveTab('contracts')}
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        View all ({contracts.length})
                      </button>
                    )}
                  </div>

                  {contracts.length === 0 ? (
                    <div className="text-center py-8">
                      <FileSignature className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                      <p className="text-dark-400 text-sm">No contracts yet</p>
                      <p className="text-dark-500 text-xs mt-1">Contracts are generated from assessments</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contracts.slice(0, 3).map((contract) => (
                        <div
                          key={contract.id}
                          className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {contract.title || `Contract #${contract.contract_number || contract.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-dark-400">
                              ${Number(contract.hourly_rate || 0).toFixed(2)}/hr - {Number(contract.weekly_hours || 0)} hrs/week
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            contract.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            contract.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-dark-600 text-dark-300'
                          }`}>
                            {contract.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {client.notes && (
                  <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Notes</h3>
                    <p className="text-sm text-dark-300 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">All Assessments</h2>
                <button
                  onClick={() => router.push(`/visits?client=${client.id}`)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Assessment
                </button>
              </div>

              {visits.length === 0 ? (
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-12 text-center">
                  <Activity className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No assessments</h3>
                  <p className="text-dark-400 text-sm">Start the first assessment for {client.full_name}</p>
                </div>
              ) : (
                <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                  <div className="grid grid-cols-5 gap-4 px-4 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div>Date</div>
                    <div>Caregiver</div>
                    <div>Status</div>
                    <div>Outputs</div>
                    <div></div>
                  </div>
                  {visits.map((visit) => (
                    <div
                      key={visit.id}
                      onClick={() => router.push(`/visits/${visit.id}`)}
                      className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-dark-700/50 cursor-pointer transition-colors border-b border-dark-700/50 last:border-0"
                    >
                      <div className="text-sm text-white">
                        {new Date(visit.scheduled_date || visit.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-dark-300">{visit.caregiver_name || '-'}</div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          visit.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          visit.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                          visit.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-dark-600 text-dark-300'
                        }`}>
                          {(visit.status || 'pending').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {visit.note_generated && (
                          <span className="text-xs text-dark-400 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> Note
                          </span>
                        )}
                        {visit.contract_generated && (
                          <span className="text-xs text-dark-400 flex items-center gap-1">
                            <FileSignature className="w-3.5 h-3.5" /> Contract
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <ChevronRight className="w-4 h-4 text-dark-500 inline" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Service Contracts</h2>
                <span className="text-sm text-dark-400">{contracts.length} contract{contracts.length !== 1 ? 's' : ''}</span>
              </div>

              {contracts.length === 0 ? (
                <div className="bg-dark-800 rounded-xl border border-dark-700 p-12 text-center">
                  <FileSignature className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No contracts</h3>
                  <p className="text-dark-400 text-sm">Contracts are generated from completed assessments</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contracts.map((contract) => (
                    <div key={contract.id} className="bg-dark-800 rounded-xl border border-dark-700 p-5 hover:border-primary-500/50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-white">
                            {contract.title || `Contract #${contract.contract_number || contract.id.slice(0, 8)}`}
                          </h4>
                          <p className="text-xs text-dark-400 mt-1">
                            Created {new Date(contract.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          contract.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          contract.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-dark-600 text-dark-300'
                        }`}>
                          {contract.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-dark-700/50 rounded-lg p-3">
                          <p className="text-xs text-dark-400">Hourly Rate</p>
                          <p className="text-lg font-bold text-green-400">${Number(contract.hourly_rate || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-dark-700/50 rounded-lg p-3">
                          <p className="text-xs text-dark-400">Weekly Hours</p>
                          <p className="text-lg font-bold text-white">{Number(contract.weekly_hours || 0)} hrs</p>
                        </div>
                        <div className="bg-dark-700/50 rounded-lg p-3">
                          <p className="text-xs text-dark-400">Weekly Cost</p>
                          <p className="text-base font-semibold text-white">
                            ${(Number(contract.hourly_rate || 0) * Number(contract.weekly_hours || 0)).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-dark-700/50 rounded-lg p-3">
                          <p className="text-xs text-dark-400">Monthly Est.</p>
                          <p className="text-base font-semibold text-white">
                            ${(Number(contract.hourly_rate || 0) * Number(contract.weekly_hours || 0) * 4.33).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {contract.services && contract.services.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-dark-400 mb-2">Services</p>
                          <div className="flex flex-wrap gap-1">
                            {contract.services.map((s: any, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded text-xs">
                                {typeof s === 'string' ? s : s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'care' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-purple-400" />
                  Care Requirements
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Care Level</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      client.care_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      client.care_level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                      client.care_level === 'LOW' ? 'bg-green-500/20 text-green-400' :
                      'bg-dark-600 text-dark-300'
                    }`}>
                      {client.care_level || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Primary Diagnosis</p>
                    <p className="text-sm text-white">{client.primary_diagnosis || 'Not specified'}</p>
                  </div>
                  {client.secondary_diagnoses && (
                    <div>
                      <p className="text-xs text-dark-400 mb-1">Secondary Diagnoses</p>
                      <p className="text-sm text-white">{client.secondary_diagnoses}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Mobility Status</p>
                    <p className="text-sm text-white">{client.mobility_status?.replace(/_/g, ' ') || 'Not assessed'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Cognitive Status</p>
                    <p className="text-sm text-white">{client.cognitive_status?.replace(/_/g, ' ') || 'Not assessed'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Care Plan
                </h3>
                {client.care_plan ? (
                  <p className="text-sm text-dark-300 whitespace-pre-wrap">{client.care_plan}</p>
                ) : (
                  <p className="text-dark-500 text-sm">No care plan documented</p>
                )}

                {client.special_requirements && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <p className="text-xs text-dark-400 mb-2">Special Requirements</p>
                    <p className="text-sm text-dark-300 whitespace-pre-wrap">{client.special_requirements}</p>
                  </div>
                )}
              </div>

              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-400" />
                  Scheduling Preferences
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Preferred Days</p>
                    <p className="text-sm text-white">{client.preferred_days || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Preferred Times</p>
                    <p className="text-sm text-white">{client.preferred_times || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  Physician
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Physician Name</p>
                    <p className="text-sm text-white">{client.physician_name || 'Not specified'}</p>
                  </div>
                  {client.physician_phone && (
                    <div>
                      <p className="text-xs text-dark-400 mb-1">Physician Phone</p>
                      <a href={`tel:${client.physician_phone}`} className="text-sm text-primary-400 hover:underline">
                        {client.physician_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  Diagnoses
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-dark-400 mb-1">Primary Diagnosis</p>
                    <p className="text-sm text-white">{client.primary_diagnosis || 'None recorded'}</p>
                  </div>
                  {client.secondary_diagnoses && (
                    <div>
                      <p className="text-xs text-dark-400 mb-1">Secondary Diagnoses</p>
                      <p className="text-sm text-white">{client.secondary_diagnoses}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400" />
                  Allergies
                </h3>
                {client.allergies ? (
                  <div className="flex flex-wrap gap-2">
                    {client.allergies.split(',').map((allergy, i) => (
                      <span key={i} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm border border-red-500/20">
                        {allergy.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-500 text-sm">No known allergies</p>
                )}
              </div>

              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-400" />
                  Current Medications
                </h3>
                {client.medications ? (
                  <p className="text-sm text-dark-300 whitespace-pre-wrap">{client.medications}</p>
                ) : (
                  <p className="text-dark-500 text-sm">No medications recorded</p>
                )}
              </div>

              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Medical Notes
                </h3>
                {client.medical_notes ? (
                  <p className="text-sm text-dark-300 whitespace-pre-wrap">{client.medical_notes}</p>
                ) : (
                  <p className="text-dark-500 text-sm">No additional medical notes</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-dark-800 rounded-2xl w-full max-w-md p-6 border border-dark-600">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Client</h3>
              <p className="text-dark-400 mb-6">
                Are you sure you want to delete <strong className="text-white">{client.full_name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
