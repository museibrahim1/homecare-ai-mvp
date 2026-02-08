'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Search,
  Phone,
  MapPin,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Heart,
  LayoutGrid,
  List,
  BarChart3,
  Zap,
  Link2,
  X,
  Mail,
  User,
  Loader2,
  Filter,
  MoreHorizontal,
  Activity,
  Trash2,
  Building2,
  Shield
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ClientModal from '@/components/ClientModal';

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
}

type ViewMode = 'table' | 'pipeline' | 'forecast';
type InsuranceFilter = 'all' | 'medicaid' | 'medicare' | 'private';

// Status configuration with colors
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  intake: { label: 'Intake', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-l-blue-500' },
  assessment: { label: 'Assessment', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-l-purple-500' },
  pending: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-l-yellow-500' },
  proposal: { label: 'Proposal Sent', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-l-orange-500' },
  active: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-l-green-500' },
  assigned: { label: 'Assigned', color: 'text-teal-400', bgColor: 'bg-teal-500/20', borderColor: 'border-l-teal-500' },
  follow_up: { label: 'Follow-up', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-l-purple-500' },
  inactive: { label: 'Inactive', color: 'text-slate-400', bgColor: 'bg-slate-500/20', borderColor: 'border-l-slate-500' },
  discharged: { label: 'Discharged', color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-l-red-500' },
};

const CARE_SPECIALTY_OPTIONS = [
  'General Care',
  'Dementia Care',
  'Post-Surgery',
  'Cardiac Care',
  'Diabetes Management',
  'Hospice Support',
  'Physical Therapy',
  'Wound Care',
  'Respiratory Care',
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-green-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
];

// Quick Add Modal Component
function QuickAddModal({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSave: (data: Partial<Client>) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    care_level: '',
    status: 'intake',
    primary_diagnosis: '',
    insurance_type: '' as '' | 'medicaid' | 'medicare' | 'private',
    insurance_provider: '',
    medicaid_id: '',
    medicare_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;
    
    setLoading(true);
    try {
      // Build the client data with insurance fields
      const clientData: Partial<Client> = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        care_level: formData.care_level,
        status: formData.status,
        primary_diagnosis: formData.primary_diagnosis,
      };
      
      // Add insurance fields based on type
      if (formData.insurance_type === 'medicaid') {
        clientData.medicaid_id = formData.medicaid_id || 'PENDING';
      } else if (formData.insurance_type === 'medicare') {
        clientData.medicare_id = formData.medicare_id || 'PENDING';
      } else if (formData.insurance_type === 'private') {
        clientData.insurance_provider = formData.insurance_provider || 'Private Insurance';
      }
      
      await onSave(clientData);
      setFormData({ 
        full_name: '', email: '', phone: '', care_level: '', status: 'intake', 
        primary_diagnosis: '', insurance_type: '', insurance_provider: '', 
        medicaid_id: '', medicare_id: '' 
      });
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-dark-800 rounded-2xl w-full max-w-md shadow-2xl border border-dark-600 mt-20 mr-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-600 sticky top-0 bg-dark-800 z-10">
          <h3 className="text-lg font-semibold text-white">Add New Client</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="input-dark"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="input-dark"
              placeholder="john@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="input-dark"
              placeholder="+1 555 123 4567"
            />
          </div>

          {/* Insurance Type Selection */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Insurance Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'medicaid' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'medicaid'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                }`}
              >
                Medicaid
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'medicare' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'medicare'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                }`}
              >
                Medicare
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'private' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'private'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                }`}
              >
                Private
              </button>
            </div>
          </div>

          {/* Insurance ID field based on type */}
          {formData.insurance_type === 'medicaid' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Medicaid ID</label>
              <input
                type="text"
                value={formData.medicaid_id}
                onChange={(e) => setFormData(prev => ({ ...prev, medicaid_id: e.target.value }))}
                className="input-dark"
                placeholder="MCD123456789"
              />
            </div>
          )}
          {formData.insurance_type === 'medicare' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Medicare ID</label>
              <input
                type="text"
                value={formData.medicare_id}
                onChange={(e) => setFormData(prev => ({ ...prev, medicare_id: e.target.value }))}
                className="input-dark"
                placeholder="MCR123456789"
              />
            </div>
          )}
          {formData.insurance_type === 'private' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Insurance Provider</label>
              <input
                type="text"
                value={formData.insurance_provider}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))}
                className="input-dark"
                placeholder="Blue Cross Blue Shield"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Care Level</label>
            <select
              value={formData.care_level}
              onChange={(e) => setFormData(prev => ({ ...prev, care_level: e.target.value }))}
              className="input-dark"
            >
              <option value="">Select level...</option>
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Care Specialty</label>
            <select
              value={formData.primary_diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_diagnosis: e.target.value }))}
              className="input-dark"
            >
              <option value="">Select specialty...</option>
              {CARE_SPECIALTY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !formData.full_name.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Client
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Avatar component with initials or image
function ClientAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
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
    lg: 'w-12 h-12 text-base',
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center font-semibold text-white`}>
      {initials}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

// Insurance type badge component - shows all applicable insurance types
function InsuranceBadge({ client }: { client: Client }) {
  const badges = [];
  
  if (client.medicaid_id) {
    badges.push(
      <span key="medicaid" className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
        Medicaid
      </span>
    );
  }
  if (client.medicare_id) {
    badges.push(
      <span key="medicare" className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30">
        Medicare
      </span>
    );
  }
  if (client.insurance_provider && !client.medicaid_id && !client.medicare_id) {
    badges.push(
      <span key="private" className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
        Private
      </span>
    );
  }
  
  if (badges.length === 0) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-dark-600 text-dark-400 border border-dark-500">
        No Insurance
      </span>
    );
  }
  
  return <div className="flex gap-1">{badges}</div>;
}

// Grouped Client Row Component
function ClientRow({ 
  client, 
  onClick,
  onDelete,
  isConfirmingDelete = false
}: { 
  client: Client; 
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isConfirmingDelete?: boolean;
}) {
  const status = client.status || 'active';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 bg-dark-800/50 hover:bg-dark-700/80 cursor-pointer transition-all border-l-4 ${config.borderColor} group ${isConfirmingDelete ? 'bg-red-500/5' : ''}`}
    >
      <ClientAvatar name={client.full_name} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-white truncate">{client.full_name}</p>
          <InsuranceBadge client={client} />
        </div>
      </div>
      
      <StatusBadge status={status} />
      
      <div className="w-32 text-sm text-dark-300">
        {client.phone || '-'}
      </div>
      
      <div className="w-36 text-sm text-dark-300 truncate">
        {client.primary_diagnosis || 'General Care'}
      </div>
      
      {isConfirmingDelete ? (
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs font-medium text-red-400 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all animate-pulse"
        >
          Confirm?
        </button>
      ) : (
        <button
          onClick={onDelete}
          className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Delete client"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      
      <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [insuranceFilter, setInsuranceFilter] = useState<InsuranceFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAutomationsModal, setShowAutomationsModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup delete timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);
  
  // Client automations
  const [automations, setAutomations] = useState([
    { id: 1, name: 'Auto-assign caregiver by specialty', description: 'Automatically match caregivers based on client care needs', enabled: true, trigger: 'New client added' },
    { id: 2, name: 'Follow-up reminder', description: 'Send reminder when client needs follow-up assessment', enabled: true, trigger: 'Status changes to follow-up' },
    { id: 3, name: 'Care plan review alert', description: 'Alert team when care plan needs review (every 90 days)', enabled: false, trigger: '90 days since last review' },
    { id: 4, name: 'Birthday notification', description: 'Send birthday wishes to clients', enabled: false, trigger: 'Client birthday' },
    { id: 5, name: 'Status change notification', description: 'Notify team when client status changes', enabled: false, trigger: 'Status change' },
  ]);

  const toggleAutomation = (id: number) => {
    setAutomations(automations.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  };

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadClients();
    }
  }, [token]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients(token!);
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    const url = clientData.id 
      ? `${API_BASE}/clients/${clientData.id}`
      : `${API_BASE}/clients`;
    
    const response = await fetch(url, {
      method: clientData.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(clientData),
    });

    if (!response.ok) {
      throw new Error('Failed to save client');
    }

    await loadClients();
  };

  const handleDeleteClient = async (clientId: string) => {
    const response = await fetch(
      `${API_BASE}/clients/${clientId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete client');
    }

    await loadClients();
  };

  // Filter by search and insurance type
  const filteredClients = clients.filter(client => {
    // Search filter
    const matchesSearch = (client.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.phone || '').includes(searchQuery);
    
    if (!matchesSearch) return false;
    
    // Insurance filter
    if (insuranceFilter === 'medicaid') return !!client.medicaid_id;
    if (insuranceFilter === 'medicare') return !!client.medicare_id;
    if (insuranceFilter === 'private') return !!client.insurance_provider && !client.medicaid_id && !client.medicare_id;
    
    return true; // 'all'
  });

  // Count clients by insurance type
  const medicaidCount = clients.filter(c => c.medicaid_id).length;
  const medicareCount = clients.filter(c => c.medicare_id).length;
  const privateCount = clients.filter(c => c.insurance_provider && !c.medicaid_id && !c.medicare_id).length;

  // Handler for inline delete with confirmation
  const handleInlineDelete = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    if (deleteConfirm === clientId) {
      // Second click - actually delete
      try {
        await handleDeleteClient(clientId);
        setDeleteConfirm(null);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    } else {
      // First click - show confirmation
      setDeleteConfirm(clientId);
      // Auto-reset after 3 seconds (clear previous timeout first)
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // Pipeline columns config
  const pipelineColumns = [
    { key: 'intake', label: 'Intake', color: 'blue', statuses: ['intake', 'pending'] },
    { key: 'assessment', label: 'Assessment', color: 'purple', statuses: ['assessment'] },
    { key: 'proposal', label: 'Proposal', color: 'orange', statuses: ['proposal', 'pending_review'] },
    { key: 'active', label: 'Active', color: 'green', statuses: ['active', 'assigned'] },
    { key: 'follow_up', label: 'Follow-up', color: 'yellow', statuses: ['follow_up', 'review', 'discharged', 'inactive'] },
  ];

  // Group clients by pipeline column
  const getPipelineClients = (statuses: string[]) => {
    return filteredClients.filter(c => {
      if (!c.status) return statuses.includes('active'); // default to active
      return statuses.includes(c.status);
    });
  };

  // Computed pipeline groups for table view
  const intakeClients = getPipelineClients(['intake', 'pending']);
  const assessmentClients = getPipelineClients(['assessment']);
  const proposalClients = getPipelineClients(['proposal', 'pending_review']);
  const assignedClients = getPipelineClients(['active', 'assigned']);
  const followUpClients = getPipelineClients(['follow_up', 'review', 'discharged', 'inactive']);
  
  // Catch-all for clients with unexpected/missing status not covered above
  const allGroupedStatuses = ['intake', 'pending', 'assessment', 'proposal', 'pending_review', 'active', 'assigned', 'follow_up', 'review', 'discharged', 'inactive'];
  const ungroupedClients = filteredClients.filter(c => {
    const status = c.status || 'active';
    return !allGroupedStatuses.includes(status);
  });

  // Move a client to a new status
  const handleMoveClient = async (clientId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE}/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        // Update local state immediately for snappy feel
        setClients(prev => prev.map(c => 
          c.id === clientId ? { ...c, status: newStatus } : c
        ));
      }
    } catch (err) {
      console.error('Failed to move client:', err);
    }
  };

  // Stats
  const activeCount = clients.filter(c => c.status === 'active' || !c.status).length;
  const intakeCount = clients.filter(c => c.status === 'intake' || c.status === 'pending').length;
  const highCareCount = clients.filter(c => c.care_level === 'HIGH').length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-300">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Clients</h1>
              <p className="text-dark-400">Manage your client pipeline</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/integrations')}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Link2 className="w-4 h-4" />
                Integrate
              </button>
              <button 
                onClick={() => setShowAutomationsModal(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Zap className="w-4 h-4" />
                Automate / {automations.filter(a => a.enabled).length}
              </button>
              <button className="p-2 text-dark-400 hover:text-white">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Insurance Type Filter Tabs */}
          <div className="flex items-center gap-2 mb-4 border-b border-dark-700 pb-4">
            <button
              onClick={() => setInsuranceFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'all' 
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                  : 'text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <Users className="w-4 h-4" />
              All Clients
              <span className="text-xs bg-dark-600 px-2 py-0.5 rounded-full">{clients.length}</span>
            </button>
            <button
              onClick={() => setInsuranceFilter('medicaid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'medicaid' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Medicaid
              <span className="text-xs bg-dark-600 px-2 py-0.5 rounded-full">{medicaidCount}</span>
            </button>
            <button
              onClick={() => setInsuranceFilter('medicare')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'medicare' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <Shield className="w-4 h-4" />
              Medicare
              <span className="text-xs bg-dark-600 px-2 py-0.5 rounded-full">{medicareCount}</span>
            </button>
            <button
              onClick={() => setInsuranceFilter('private')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'private' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <Heart className="w-4 h-4" />
              Private Insurance
              <span className="text-xs bg-dark-600 px-2 py-0.5 rounded-full">{privateCount}</span>
            </button>
          </div>

          {/* View Tabs & Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 bg-dark-800/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'table' 
                    ? 'bg-dark-700 text-white' 
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                Main table
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'pipeline' 
                    ? 'bg-dark-700 text-white' 
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Pipeline
              </button>
              <button
                onClick={() => setViewMode('forecast')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'forecast' 
                    ? 'bg-dark-700 text-white' 
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Forecast
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-dark-400 hover:text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-xl text-white text-sm placeholder-dark-400 focus:outline-none focus:border-primary-500"
                />
              </div>
              <button className="p-2 bg-dark-800 border border-dark-600 rounded-xl text-dark-400 hover:text-white">
                <Filter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setQuickAddOpen(true)}
                className="btn-primary flex items-center gap-2 py-2"
              >
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            </div>
          </div>

          {/* Main Content */}
          {loading ? (
            <div className="card p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-400">Loading clients...</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View - Grouped by Status */
            <div className="space-y-8">
              {/* Intake Queue Section */}
              {intakeClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-teal-400">Intake queue</h2>
                    <span className="text-sm text-dark-400">({intakeClients.length})</span>
                  </div>
                  
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-dark-800/30 rounded-xl overflow-hidden border border-dark-700/50">
                    {intakeClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => handleEditClient(client)}
                        onDelete={(e) => handleInlineDelete(e, client.id)}
                        isConfirmingDelete={deleteConfirm === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Assessment Section */}
              {assessmentClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-purple-400">In Assessment</h2>
                    <span className="text-sm text-dark-400">({assessmentClients.length})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-dark-800/30 rounded-xl overflow-hidden border border-dark-700/50">
                    {assessmentClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => handleEditClient(client)}
                        onDelete={(e) => handleInlineDelete(e, client.id)}
                        isConfirmingDelete={deleteConfirm === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Proposal Sent Section */}
              {proposalClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-orange-400">Awaiting signature</h2>
                    <span className="text-sm text-dark-400">({proposalClients.length})</span>
                  </div>
                  
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-dark-800/30 rounded-xl overflow-hidden border border-dark-700/50">
                    {proposalClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => handleEditClient(client)}
                        onDelete={(e) => handleInlineDelete(e, client.id)}
                        isConfirmingDelete={deleteConfirm === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned to Care Team Section */}
              {assignedClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-green-400">Active clients</h2>
                    <span className="text-sm text-dark-400">({assignedClients.length})</span>
                  </div>
                  
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-dark-800/30 rounded-xl overflow-hidden border border-dark-700/50">
                    {assignedClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => handleEditClient(client)}
                        onDelete={(e) => handleInlineDelete(e, client.id)}
                        isConfirmingDelete={deleteConfirm === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up Section */}
              {followUpClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-purple-400">Follow-up required</h2>
                    <span className="text-sm text-dark-400">({followUpClients.length})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-dark-800/30 rounded-xl overflow-hidden border border-dark-700/50">
                    {followUpClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => handleEditClient(client)}
                        onDelete={(e) => handleInlineDelete(e, client.id)}
                        isConfirmingDelete={deleteConfirm === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ungrouped Clients (catch-all for unexpected statuses) */}
              {ungroupedClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-dark-300">Other Clients</h2>
                    <span className="text-sm text-dark-400">({ungroupedClients.length})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-dark-800/30 rounded-xl overflow-hidden border border-dark-700/50">
                    {ungroupedClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => handleEditClient(client)}
                        onDelete={(e) => handleInlineDelete(e, client.id)}
                        isConfirmingDelete={deleteConfirm === client.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredClients.length === 0 && (
                <div className="card p-12 text-center">
                  <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-dark-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchQuery ? 'No clients found' : 'No clients yet'}
                  </h3>
                  <p className="text-dark-400 mb-4">
                    {searchQuery ? 'Try a different search term' : 'Add your first client to get started'}
                  </p>
                  {!searchQuery && (
                    <button onClick={() => setQuickAddOpen(true)} className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Client
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : viewMode === 'pipeline' ? (
            /* Pipeline / Kanban View */
            <div className="grid grid-cols-5 gap-3">
              {pipelineColumns.map((col, colIdx) => {
                const columnClients = getPipelineClients(col.statuses);
                const colorMap: Record<string, { header: string; text: string }> = {
                  blue: { header: 'bg-blue-500/10', text: 'text-blue-400' },
                  purple: { header: 'bg-purple-500/10', text: 'text-purple-400' },
                  orange: { header: 'bg-orange-500/10', text: 'text-orange-400' },
                  green: { header: 'bg-green-500/10', text: 'text-green-400' },
                  yellow: { header: 'bg-yellow-500/10', text: 'text-yellow-400' },
                };
                const colors = colorMap[col.color] || colorMap.blue;
                
                return (
                  <div key={col.key} className="bg-dark-800/30 rounded-xl border border-dark-700/50 overflow-hidden">
                    <div className={`p-3 border-b border-dark-700 ${colors.header}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-sm ${colors.text}`}>{col.label}</h3>
                        <span className="text-xs text-dark-400">{columnClients.length}</span>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                      {columnClients.map(client => {
                        // Determine which columns this client can move to
                        const canMoveLeft = colIdx > 0;
                        const canMoveRight = colIdx < pipelineColumns.length - 1;
                        const prevCol = colIdx > 0 ? pipelineColumns[colIdx - 1] : null;
                        const nextCol = colIdx < pipelineColumns.length - 1 ? pipelineColumns[colIdx + 1] : null;
                        
                        return (
                          <div 
                            key={client.id}
                            className="p-2.5 bg-dark-800 rounded-lg border border-dark-600 hover:border-primary-500/50 transition-all group"
                          >
                            <div 
                              className="flex items-center gap-2 mb-1.5 cursor-pointer"
                              onClick={() => handleEditClient(client)}
                            >
                              <ClientAvatar name={client.full_name} size="sm" />
                              <p className="font-medium text-white text-xs truncate flex-1">{client.full_name}</p>
                            </div>
                            {client.phone && (
                              <p className="text-xs text-dark-400 truncate mb-2">{client.phone}</p>
                            )}
                            {/* Move buttons - visible on hover */}
                            <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1 border-t border-dark-700/50">
                              {canMoveLeft ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMoveClient(client.id, prevCol!.statuses[0]); }}
                                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-dark-400 hover:text-white hover:bg-dark-700 rounded transition-colors"
                                  title={`Move to ${prevCol!.label}`}
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                  <span className="truncate max-w-[50px]">{prevCol!.label}</span>
                                </button>
                              ) : <span />}
                              {canMoveRight ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMoveClient(client.id, nextCol!.statuses[0]); }}
                                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-dark-400 hover:text-white hover:bg-dark-700 rounded transition-colors"
                                  title={`Move to ${nextCol!.label}`}
                                >
                                  <span className="truncate max-w-[50px]">{nextCol!.label}</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : <span />}
                            </div>
                          </div>
                        );
                      })}
                      {columnClients.length === 0 && (
                        <div className="text-center py-6 text-dark-500 text-xs">
                          No clients
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Forecast View */
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-400">Total Clients</p>
                      <p className="text-2xl font-bold text-white">{clients.length}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-400">Active</p>
                      <p className="text-2xl font-bold text-green-400">{activeCount}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-400">In Intake</p>
                      <p className="text-2xl font-bold text-orange-400">{intakeCount}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                      <Heart className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-dark-400">High Care</p>
                      <p className="text-2xl font-bold text-red-400">{highCareCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple Chart Placeholder */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Client Pipeline Forecast</h3>
                <div className="h-64 flex items-end justify-around gap-4">
                  {['Intake', 'Assessment', 'Active', 'Follow-up'].map((stage, i) => {
                    const heights = [intakeCount, 
                      clients.filter(c => c.status === 'assessment').length || 1,
                      activeCount,
                      followUpClients.length || 1
                    ];
                    const maxHeight = Math.max(...heights, 1);
                    const height = (heights[i] / maxHeight) * 100;
                    const colors = ['bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500'];
                    
                    return (
                      <div key={stage} className="flex flex-col items-center gap-2 flex-1">
                        <div 
                          className={`w-full max-w-[80px] ${colors[i]} rounded-t-lg transition-all duration-500`}
                          style={{ height: `${Math.max(height, 10)}%` }}
                        />
                        <span className="text-sm text-dark-400">{stage}</span>
                        <span className="text-lg font-bold text-white">{heights[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Full Client Modal */}
      <ClientModal
        client={selectedClient}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveClient}
        onDelete={handleDeleteClient}
      />

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSave={handleSaveClient}
      />

      {/* Automations Modal */}
      {showAutomationsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <div>
                <h2 className="text-xl font-bold text-white">Client Automations</h2>
                <p className="text-dark-400 text-sm mt-1">Manage workflow automations for client management</p>
              </div>
              <button 
                onClick={() => setShowAutomationsModal(false)} 
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {automations.map((automation) => (
                <div 
                  key={automation.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    automation.enabled 
                      ? 'bg-primary-500/10 border-primary-500/30' 
                      : 'bg-dark-700/50 border-dark-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${automation.enabled ? 'text-primary-400' : 'text-dark-400'}`} />
                        <h3 className="font-medium text-white">{automation.name}</h3>
                      </div>
                      <p className="text-dark-400 text-sm mt-1">{automation.description}</p>
                      <p className="text-dark-500 text-xs mt-2">Trigger: {automation.trigger}</p>
                    </div>
                    <button
                      onClick={() => toggleAutomation(automation.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        automation.enabled ? 'bg-primary-500' : 'bg-dark-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          automation.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-dark-700 bg-dark-800/50">
              <div className="flex items-center justify-between">
                <p className="text-dark-400 text-sm">
                  {automations.filter(a => a.enabled).length} of {automations.length} automations active
                </p>
                <button
                  onClick={() => setShowAutomationsModal(false)}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
