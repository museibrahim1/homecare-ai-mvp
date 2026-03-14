'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Search,
  AlertCircle,
  ChevronRight,
  Heart,
  LayoutGrid,
  List,
  BarChart3,
  Link2,
  X,
  Loader2,
  Filter,
  MoreHorizontal,
  Activity,
  Trash2,
  Building2,
  Shield,
  FileSpreadsheet,
  UserPlus,
  Check
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ClientModal from '@/components/ClientModal';
import PalmAgent from '@/components/PalmAgent';

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
  intake: { label: 'Intake', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-l-blue-500' },
  assessment: { label: 'Assessment', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-l-purple-500' },
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-l-yellow-500' },
  proposal: { label: 'Proposal Sent', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-l-orange-500' },
  active: { label: 'Active', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-l-emerald-500' },
  assigned: { label: 'Assigned', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-l-teal-500' },
  follow_up: { label: 'Follow-up', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-l-purple-500' },
  inactive: { label: 'Inactive', color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-l-slate-400' },
  discharged: { label: 'Discharged', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-l-red-500' },
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
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
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
    address: '',
    care_level: '',
    status: 'intake',
    primary_diagnosis: '',
    notes: '',
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
        address: formData.address,
        care_level: formData.care_level,
        status: formData.status,
        primary_diagnosis: formData.primary_diagnosis,
        notes: formData.notes,
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
        full_name: '', email: '', phone: '', address: '', care_level: '', status: 'intake', 
        primary_diagnosis: '', notes: '', insurance_type: '', insurance_provider: '', 
        medicaid_id: '', medicare_id: '' 
      });
      onClose();
    } catch {
      // Error is handled by onSave caller
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-lg border border-slate-200 mt-0 sm:mt-20 mr-0 sm:mr-4 h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto"
        data-testid="quick-add-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-slate-900">Add New Client</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close add client modal"
            data-testid="quick-add-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="input-dark"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="input-dark"
              placeholder="john@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="input-dark"
              placeholder="+1 555 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input-dark"
              placeholder="123 Main St, City, State"
            />
          </div>

          {/* Priority / Care Level */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Priority</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, care_level: opt.value.toUpperCase() }))}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                    formData.care_level === opt.value.toUpperCase()
                      ? `${opt.color} bg-slate-50 border border-current`
                      : 'text-slate-500 bg-white border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-1 h-3 rounded-full ${
                    opt.value === 'urgent' ? 'bg-red-500' : opt.value === 'high' ? 'bg-orange-500' : opt.value === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Insurance Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Insurance Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'medicaid' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'medicaid'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                Medicaid
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'medicare' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'medicare'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                Medicare
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'private' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'private'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                Private
              </button>
            </div>
          </div>

          {/* Insurance ID field based on type */}
          {formData.insurance_type === 'medicaid' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Medicaid ID</label>
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
              <label className="block text-sm font-medium text-slate-600 mb-2">Medicare ID</label>
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
              <label className="block text-sm font-medium text-slate-600 mb-2">Insurance Provider</label>
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
            <label className="block text-sm font-medium text-slate-600 mb-2">Care Specialty</label>
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

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Referral Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input-dark resize-none"
              rows={2}
              placeholder="Referral source, special requirements..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !formData.full_name.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2"
              data-testid="quick-add-submit"
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
    'bg-blue-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full ${colors[colorIndex]} flex items-center justify-center font-semibold text-slate-900`}>
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
      <span key="medicaid" className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
        Medicaid
      </span>
    );
  }
  if (client.medicare_id) {
    badges.push(
      <span key="medicare" className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
        Medicare
      </span>
    );
  }
  if (client.insurance_provider && !client.medicaid_id && !client.medicare_id) {
    badges.push(
      <span key="private" className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
        Private
      </span>
    );
  }
  
  if (badges.length === 0) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
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
      className={`flex items-center gap-4 px-4 py-3 bg-white hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${config.borderColor} group ${isConfirmingDelete ? 'bg-red-50' : ''}`}
    >
      <ClientAvatar name={client.full_name} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 truncate">{client.full_name}</p>
          <InsuranceBadge client={client} />
        </div>
      </div>
      
      <StatusBadge status={status} />
      
      <div className="w-32 text-sm text-slate-500">
        {client.phone || '-'}
      </div>
      
      <div className="w-36 text-sm text-slate-500 truncate">
        {client.primary_diagnosis || 'General Care'}
      </div>
      
      {isConfirmingDelete ? (
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all animate-pulse"
        >
          Confirm?
        </button>
      ) : (
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Delete client"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { token, isReady } = useRequireAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [insuranceFilter, setInsuranceFilter] = useState<InsuranceFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{ success: number; failed: number } | null>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    if (showPlusMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlusMenu]);

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
    } catch {
      // Failed to load clients — empty list will be shown
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

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setCsvImporting(true);
    setCsvImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setCsvImporting(false); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      let success = 0;
      let failed = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { if (values[idx]) row[h] = values[idx]; });

        if (!row.full_name && !row.name) { failed++; continue; }

        const clientData: Record<string, string> = {
          full_name: row.full_name || row.name || '',
        };
        const fieldMap: Record<string, string> = {
          phone: 'phone', email: 'email', address: 'address',
          city: 'city', state: 'state', zip_code: 'zip_code', zip: 'zip_code',
          date_of_birth: 'date_of_birth', dob: 'date_of_birth',
          gender: 'gender', insurance_provider: 'insurance_provider',
          insurance_id: 'insurance_id', medicaid_id: 'medicaid_id',
          medicare_id: 'medicare_id', care_level: 'care_level',
          emergency_contact_name: 'emergency_contact_name',
          emergency_contact_phone: 'emergency_contact_phone',
          primary_diagnosis: 'primary_diagnosis', notes: 'notes',
        };
        Object.entries(row).forEach(([k, v]) => {
          const mapped = fieldMap[k];
          if (mapped && v) clientData[mapped] = v;
        });

        try {
          const res = await fetch(`${API_BASE}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(clientData),
          });
          if (res.ok) success++; else failed++;
        } catch { failed++; }
      }

      setCsvImportResult({ success, failed });
      if (success > 0) await loadClients();
    } catch {
      setCsvImportResult({ success: 0, failed: -1 });
    } finally {
      setCsvImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
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
      } catch {
        // Delete failed — state remains unchanged
      }
    } else {
      // First click - show confirmation
      setDeleteConfirm(clientId);
      // Auto-reset after 3 seconds (clear previous timeout first)
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  // Drag-and-drop state for pipeline
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Pipeline columns config - homecare tailored
  const pipelineColumns = [
    { key: 'intake', label: 'New Referrals', color: 'blue', statuses: ['intake', 'pending'] },
    { key: 'assessment', label: 'In Assessment', color: 'purple', statuses: ['assessment'] },
    { key: 'proposal', label: 'Awaiting Approval', color: 'orange', statuses: ['proposal', 'pending_review'] },
    { key: 'active', label: 'Active Care', color: 'green', statuses: ['active', 'assigned'] },
    { key: 'follow_up', label: 'Follow-up Required', color: 'yellow', statuses: ['follow_up', 'review', 'discharged', 'inactive'] },
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
    } catch {
      // Failed to move client — reload to restore correct state
      loadClients();
    }
  };

  // Stats
  const activeCount = clients.filter(c => c.status === 'active' || !c.status).length;
  const intakeCount = clients.filter(c => c.status === 'intake' || c.status === 'pending').length;
  const highCareCount = clients.filter(c => c.care_level === 'HIGH').length;

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">Clients</h1>
              <p className="text-slate-500">Manage your client pipeline</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/integrations')}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Link2 className="w-4 h-4" />
                Integrate
              </button>
              <div className="relative" ref={plusMenuRef}>
                <button 
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showPlusMenu && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                    <button
                      onClick={() => { setQuickAddOpen(true); setShowPlusMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 text-primary-500" />
                      Add New Client
                    </button>
                    <button
                      onClick={() => { setShowPlusMenu(false); csvInputRef.current?.click(); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-500" />
                      {csvImporting ? 'Importing...' : 'Import from CSV'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insurance Type Filter Tabs */}
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-4">
            <button
              onClick={() => setInsuranceFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'all' 
                  ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              All Clients
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{clients.length}</span>
            </button>
            <button
              onClick={() => setInsuranceFilter('medicaid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'medicaid' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Medicaid
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{medicaidCount}</span>
            </button>
            <button
              onClick={() => setInsuranceFilter('medicare')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'medicare' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-4 h-4" />
              Medicare
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{medicareCount}</span>
            </button>
            <button
              onClick={() => setInsuranceFilter('private')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                insuranceFilter === 'private' 
                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Heart className="w-4 h-4" />
              Private Insurance
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{privateCount}</span>
            </button>
          </div>

          {/* View Tabs & Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'table' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="w-4 h-4" />
                Main table
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'pipeline' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Pipeline
              </button>
              <button
                onClick={() => setViewMode('forecast')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'forecast' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Forecast
              </button>
              <button
                onClick={() => setQuickAddOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                title="Add new client"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-primary-500"
                />
              </div>
              <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600">
                <Filter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setQuickAddOpen(true)}
                className="btn-primary flex items-center gap-2 py-2"
                data-testid="open-quick-add-client"
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
              <p className="text-slate-500">Loading clients...</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View - Grouped by Status */
            <div className="space-y-8">
              {/* Intake Queue Section */}
              {intakeClients.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-teal-700">Intake queue</h2>
                    <span className="text-sm text-slate-500">({intakeClients.length})</span>
                  </div>
                  
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                    {intakeClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => router.push(`/clients/${client.id}`)}
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
                    <h2 className="text-lg font-semibold text-purple-700">In Assessment</h2>
                    <span className="text-sm text-slate-500">({assessmentClients.length})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                    {assessmentClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => router.push(`/clients/${client.id}`)}
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
                    <h2 className="text-lg font-semibold text-orange-700">Awaiting signature</h2>
                    <span className="text-sm text-slate-500">({proposalClients.length})</span>
                  </div>
                  
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                    {proposalClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => router.push(`/clients/${client.id}`)}
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
                    <h2 className="text-lg font-semibold text-emerald-700">Active clients</h2>
                    <span className="text-sm text-slate-500">({assignedClients.length})</span>
                  </div>
                  
                  {/* Table Header */}
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                    {assignedClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => router.push(`/clients/${client.id}`)}
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
                    <h2 className="text-lg font-semibold text-purple-700">Follow-up required</h2>
                    <span className="text-sm text-slate-500">({followUpClients.length})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                    {followUpClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => router.push(`/clients/${client.id}`)}
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
                    <h2 className="text-lg font-semibold text-slate-600">Other Clients</h2>
                    <span className="text-sm text-slate-500">({ungroupedClients.length})</span>
                  </div>
                  
                  <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <div className="w-10" />
                    <div className="flex-1">Client</div>
                    <div className="w-28">Visit status</div>
                    <div className="w-32">Phone</div>
                    <div className="w-36">Care specialty</div>
                    <div className="w-8" />
                    <div className="w-4" />
                  </div>

                  <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
                    {ungroupedClients.map((client) => (
                      <ClientRow 
                        key={client.id} 
                        client={client} 
                        onClick={() => router.push(`/clients/${client.id}`)}
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
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {searchQuery ? 'No clients found' : 'No clients yet'}
                  </h3>
                  <p className="text-slate-400 mb-4">
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
            /* Pipeline / Kanban View — Drag & Drop */
            <div className="grid grid-cols-5 gap-3 items-start">
              {pipelineColumns.map((col) => {
                const columnClients = getPipelineClients(col.statuses);
                const colorMap: Record<string, { header: string; headerBorder: string; text: string; dot: string }> = {
                  blue:   { header: 'bg-blue-500',   headerBorder: 'border-blue-500',   text: 'text-blue-700',   dot: 'bg-blue-500' },
                  purple: { header: 'bg-purple-500', headerBorder: 'border-purple-500', text: 'text-purple-700', dot: 'bg-purple-500' },
                  orange: { header: 'bg-orange-500', headerBorder: 'border-orange-500', text: 'text-orange-700', dot: 'bg-orange-500' },
                  green:  { header: 'bg-green-500',  headerBorder: 'border-green-500',  text: 'text-green-700',  dot: 'bg-green-500' },
                  yellow: { header: 'bg-yellow-500', headerBorder: 'border-yellow-500', text: 'text-yellow-700', dot: 'bg-yellow-500' },
                };
                const colors = colorMap[col.color] || colorMap.blue;
                const isOver = dragOverColumn === col.key;
                
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.key); }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      if (draggedClientId) {
                        handleMoveClient(draggedClientId, col.statuses[0]);
                        setDraggedClientId(null);
                      }
                    }}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isOver
                        ? `border-2 ${colors.headerBorder} bg-slate-50 scale-[1.01]`
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* Column header with colored top bar */}
                    <div className={`h-1 ${colors.header}`} />
                    <div className="px-3 py-2.5 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          <h3 className="font-semibold text-sm text-slate-800">{col.label}</h3>
                        </div>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${colors.text} bg-slate-100`}>
                          {columnClients.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 max-h-[65vh] overflow-y-auto">
                      {columnClients.map(client => {
                        const isDragging = draggedClientId === client.id;
                        const careLevel = client.care_level?.toLowerCase();
                        const priorityBorder = careLevel === 'high' ? 'border-l-red-500' :
                          careLevel === 'moderate' ? 'border-l-orange-400' : 'border-l-transparent';
                        const priorityLabel = careLevel === 'high' ? 'High' :
                          careLevel === 'moderate' ? 'Moderate' : careLevel === 'low' ? 'Routine' : null;
                        const priorityColor = careLevel === 'high' ? 'text-red-600' :
                          careLevel === 'moderate' ? 'text-orange-600' : 'text-green-600';

                        return (
                          <div
                            key={client.id}
                            draggable
                            onDragStart={() => setDraggedClientId(client.id)}
                            onDragEnd={() => { setDraggedClientId(null); setDragOverColumn(null); }}
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className={`p-3 bg-white rounded-lg border-l-[3px] ${priorityBorder} border border-slate-200 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all group ${
                              isDragging ? 'opacity-40 scale-95' : ''
                            }`}
                          >
                            {/* Client name row */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="font-medium text-slate-800 text-xs truncate flex-1">{client.full_name}</p>
                            </div>

                            {/* Priority badge */}
                            {priorityLabel && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className={`w-1 h-3 rounded-full ${
                                  careLevel === 'high' ? 'bg-red-500' : careLevel === 'moderate' ? 'bg-orange-400' : 'bg-green-400'
                                }`} />
                                <span className={`text-[10px] font-medium ${priorityColor}`}>{priorityLabel}</span>
                              </div>
                            )}

                            {/* Meta row: avatar, specialty */}
                            <div className="flex items-center justify-between mt-2">
                              <ClientAvatar name={client.full_name} size="sm" />
                              <div className="flex items-center gap-2 text-slate-500">
                                {client.primary_diagnosis && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 truncate max-w-[80px]">
                                    {client.primary_diagnosis}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {columnClients.length === 0 && (
                        <div className={`text-center py-8 text-slate-400 text-xs rounded-lg border border-dashed transition-colors ${
                          isOver ? `${colors.headerBorder} border-opacity-50` : 'border-slate-200'
                        }`}>
                          {isOver ? 'Drop here' : 'No clients'}
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
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Clients</p>
                      <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Active</p>
                      <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">In Intake</p>
                      <p className="text-2xl font-bold text-orange-600">{intakeCount}</p>
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                      <Heart className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">High Care</p>
                      <p className="text-2xl font-bold text-red-600">{highCareCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple Chart Placeholder */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Client Pipeline Forecast</h3>
                <div className="h-64 flex items-end justify-around gap-4">
                  {['Intake', 'Assessment', 'Active', 'Follow-up'].map((stage, i) => {
                    const heights = [intakeCount, 
                      clients.filter(c => c.status === 'assessment').length,
                      activeCount,
                      followUpClients.length
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
                        <span className="text-sm text-slate-500">{stage}</span>
                        <span className="text-lg font-bold text-slate-900">{heights[i]}</span>
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

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        onChange={handleCsvImport}
        className="hidden"
      />

      {csvImportResult && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${csvImportResult.success > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {csvImportResult.success > 0 ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <X className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">CSV Import Complete</p>
              <p className="text-sm text-slate-500">
                {csvImportResult.success} imported{csvImportResult.failed > 0 ? `, ${csvImportResult.failed} failed` : ''}
              </p>
            </div>
            <button onClick={() => setCsvImportResult(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <PalmAgent />
    </div>
  );
}
