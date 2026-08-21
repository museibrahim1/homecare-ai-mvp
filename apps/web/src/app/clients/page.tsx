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
  X,
  Loader2,
  Filter,
  MoreHorizontal,
  Activity,
  Trash2,
  FileSpreadsheet,
  UserPlus,
  Check
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import ClientModal from '@/components/ClientModal';
import PalmAgent from '@/components/PalmAgent';
import GlassShell from '@/components/GlassShell';
import GlassTabs from '@/components/GlassTabs';
import LeadsPanel from '@/components/panels/LeadsPanel';
import AssessmentsPanel from '@/components/panels/AssessmentsPanel';
import CareTrackerPanel from '@/components/panels/CareTrackerPanel';

import { Client, ViewMode, InsuranceFilter } from './types';
import { API_BASE, STATUS_CONFIG, CARE_SPECIALTY_OPTIONS, PRIORITY_OPTIONS } from './constants';
import { QuickAddModal, ClientAvatar, StatusBadge, InsuranceBadge, ClientRow } from './components';

function GlassBoardHeader() {
  return (
    <div className="flex items-center h-7 px-[18px] gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
      <div className="w-1 shrink-0" />
      <div className="w-[min(304px,32%)] shrink-0">Client</div>
      <div className="w-[140px] shrink-0">Visit Status</div>
      <div className="w-[140px] shrink-0">Phone</div>
      <div className="grow">Care Specialty</div>
      <div className="w-4 shrink-0" />
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { token, isReady } = useRequireAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'clients' | 'leads' | 'assessments' | 'care'>('clients');
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

  // Read the active section from the URL so deep links like ?section=care work
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section === 'leads' || section === 'assessments' || section === 'care' || section === 'clients') {
      setActiveSection(section);
    }
  }, []);

  const handleSectionChange = (key: string) => {
    const section = (['leads', 'assessments', 'care'].includes(key) ? key : 'clients') as typeof activeSection;
    setActiveSection(section);
    const params = new URLSearchParams(window.location.search);
    params.set('section', section);
    router.replace(`/clients?${params.toString()}`);
  };

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
      <div className="min-h-screen flex items-center justify-center glass-page">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <GlassShell
      title="Clients"
      subtitle="Board, leads, assessments, and care in one place."
      action={
        activeSection === 'clients' ? (
          <div className="flex items-center gap-3">
            <div className="relative" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className="p-2.5 text-[#64748B] hover:text-[#10211F] glass-panel rounded-xl transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {showPlusMenu && (
                <div className="absolute top-full right-0 mt-2 w-52 glass-panel z-50 py-1.5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setQuickAddOpen(true); setShowPlusMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#4B6B66] hover:bg-white/60 hover:text-[#10211F] transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-primary-500" />
                    Add New Client
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPlusMenu(false); csvInputRef.current?.click(); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#4B6B66] hover:bg-white/60 hover:text-[#10211F] transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-500" />
                    {csvImporting ? 'Importing...' : 'Import from CSV'}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="glass-btn-primary"
              data-testid="open-quick-add-client"
            >
              <Plus className="w-4 h-4" />
              Add client
            </button>
          </div>
        ) : undefined
      }
    >
          {activeSection === 'leads' ? (
            <>
              <div className="glass-toolbar flex-wrap py-2 sm:py-0">
                <GlassTabs
                  tabs={[
                    { key: 'clients', label: 'Clients', icon: Users },
                    { key: 'leads', label: 'Leads', icon: UserPlus },
                    { key: 'assessments', label: 'Assessments', icon: BarChart3 },
                    { key: 'care', label: 'Care Tracker', icon: Activity },
                  ]}
                  active={activeSection}
                  onChange={handleSectionChange}
                  variant="toolbar"
                />
              </div>
              <LeadsPanel />
            </>
          ) : activeSection === 'assessments' ? (
            <>
              <div className="glass-toolbar flex-wrap py-2 sm:py-0">
                <GlassTabs
                  tabs={[
                    { key: 'clients', label: 'Clients', icon: Users },
                    { key: 'leads', label: 'Leads', icon: UserPlus },
                    { key: 'assessments', label: 'Assessments', icon: BarChart3 },
                    { key: 'care', label: 'Care Tracker', icon: Activity },
                  ]}
                  active={activeSection}
                  onChange={handleSectionChange}
                  variant="toolbar"
                />
              </div>
              <AssessmentsPanel />
            </>
          ) : activeSection === 'care' ? (
            <>
              <div className="glass-toolbar flex-wrap py-2 sm:py-0">
                <GlassTabs
                  tabs={[
                    { key: 'clients', label: 'Clients', icon: Users },
                    { key: 'leads', label: 'Leads', icon: UserPlus },
                    { key: 'assessments', label: 'Assessments', icon: BarChart3 },
                    { key: 'care', label: 'Care Tracker', icon: Activity },
                  ]}
                  active={activeSection}
                  onChange={handleSectionChange}
                  variant="toolbar"
                />
              </div>
              <CareTrackerPanel />
            </>
          ) : (
          <>
          {/* Insurance pills — Paper order: under header, above toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {(
              [
                { key: 'all' as const, label: 'All Clients', count: clients.length },
                { key: 'medicaid' as const, label: 'Medicaid', count: medicaidCount },
                { key: 'medicare' as const, label: 'Medicare', count: medicareCount },
                { key: 'private' as const, label: 'Private Insurance', count: privateCount },
              ]
            ).map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setInsuranceFilter(pill.key)}
                className={`glass-pill ${insuranceFilter === pill.key ? 'glass-pill-active' : ''}`}
              >
                {pill.label}
                <span className="ml-1.5 text-[11px] opacity-70">{pill.count}</span>
              </button>
            ))}
          </div>

          {/* Paper glass toolbar: section tabs + search */}
          <div className="glass-toolbar flex-wrap py-2 sm:py-0">
            <GlassTabs
              tabs={[
                { key: 'clients', label: 'Clients', icon: Users },
                { key: 'leads', label: 'Leads', icon: UserPlus },
                { key: 'assessments', label: 'Assessments', icon: BarChart3 },
                { key: 'care', label: 'Care Tracker', icon: Activity },
              ]}
              active={activeSection}
              onChange={handleSectionChange}
              variant="toolbar"
            />
            <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-white/70 border border-white rounded-xl text-[#10211F] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>

          {/* Main Content — Paper Clients board (grouped rows; no Main table / Pipeline / Forecast switcher) */}
          {loading ? (
            <div className="glass-panel p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#64748B]">Loading clients...</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View - Grouped by Status */
            <div className="flex flex-col gap-5">
              {/* Intake Queue Section */}
              {intakeClients.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-sm font-bold leading-[18px] text-[#0D9488]">Intake queue</h2>
                    <span className="text-xs font-medium text-[#94A3B8]">({intakeClients.length})</span>
                  </div>
                  <GlassBoardHeader />
                  <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-sm font-bold leading-[18px] text-[#7C3AED]">In Assessment</h2>
                    <span className="text-xs font-medium text-[#94A3B8]">({assessmentClients.length})</span>
                  </div>
                  <GlassBoardHeader />
                  <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-sm font-bold leading-[18px] text-[#EA580C]">Awaiting signature</h2>
                    <span className="text-xs font-medium text-[#94A3B8]">({proposalClients.length})</span>
                  </div>
                  <GlassBoardHeader />
                  <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-sm font-bold leading-[18px] text-[#059669]">Active clients</h2>
                    <span className="text-xs font-medium text-[#94A3B8]">({assignedClients.length})</span>
                  </div>
                  <GlassBoardHeader />
                  <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-sm font-bold leading-[18px] text-[#7C3AED]">Follow-up required</h2>
                    <span className="text-xs font-medium text-[#94A3B8]">({followUpClients.length})</span>
                  </div>
                  <GlassBoardHeader />
                  <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <h2 className="text-sm font-bold leading-[18px] text-[#64748B]">Other Clients</h2>
                    <span className="text-xs font-medium text-[#94A3B8]">({ungroupedClients.length})</span>
                  </div>
                  <div className="flex flex-col gap-2">
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
                <div className="glass-panel p-12 text-center">
                  <div className="w-16 h-16 bg-white/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-[#94A3B8]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#10211F] mb-2">
                    {searchQuery ? 'No clients found' : 'No clients yet'}
                  </h3>
                  <p className="text-[#64748B] mb-4">
                    {searchQuery ? 'Try a different search term' : 'Add your first client to get started'}
                  </p>
                  {!searchQuery && (
                    <button type="button" onClick={() => setQuickAddOpen(true)} className="glass-btn-primary mx-auto">
                      <Plus className="w-4 h-4" />
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
          </>
          )}
    </GlassShell>

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
    </>
  );
}
