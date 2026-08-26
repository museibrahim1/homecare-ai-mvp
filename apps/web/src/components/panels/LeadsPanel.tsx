'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Phone, Mail, Search, Filter, X, User, Globe, Loader2, UserPlus, Trash2, Building2, Shield, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { migrateLocalCrmToServer } from '@/lib/crmMigrate';
import { leadFromApi, leadToApi } from '@/lib/crmAdapters';

const API_URL = '/api';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  notes: string;
  created: string;
  insurance_type?: 'medicaid' | 'medicare' | 'private' | '';
  insurance_id?: string;
};

const statusColors: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-600',
  'Contacted': 'bg-amber-50 text-amber-600',
  'Qualified': 'bg-emerald-50 text-emerald-600',
};

const sources = ['Website', 'Referral', 'Google Ads', 'Facebook', 'Instagram', 'Phone Call', 'Other'];
const statuses = ['New', 'Contacted', 'Qualified'];

/**
 * Leads management surface (list, add, convert to client). Shared between the
 * Sales page (Leads tab) and the Clients page (Leads tab). Persists to the
 * agency CRM API; migrates legacy localStorage on first load.
 */
export default function LeadsPanel() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', source: 'Website', status: 'New', notes: '', insurance_type: '' as '' | 'medicaid' | 'medicare' | 'private', insurance_id: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertData, setConvertData] = useState({ insurance_type: '' as '' | 'medicaid' | 'medicare' | 'private', insurance_id: '', care_level: '', estimated_monthly_value: '' });

  const loadLeads = useCallback(async () => {
    if (!token || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await migrateLocalCrmToServer(token, user.id);
      const rows = await api.getLeads(token);
      setLeads((rows || []).map((r: Record<string, unknown>) => leadFromApi(r)));
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddLead = async () => {
    if (!newLead.name || !token) return;
    try {
      const created = await api.createLead(token, leadToApi(newLead));
      setLeads([leadFromApi(created), ...leads]);
      setNewLead({ name: '', email: '', phone: '', source: 'Website', status: 'New', notes: '', insurance_type: '', insurance_id: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add lead:', error);
      alert('Failed to save lead. Please try again.');
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    if (!token) return;
    try {
      const updated = await api.updateLead(token, leadId, { status: newStatus.toLowerCase() });
      setLeads(leads.map(l => l.id === leadId ? leadFromApi(updated) : l));
    } catch (error) {
      console.error('Failed to update lead status:', error);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!token) return;
    setDeletingId(leadId);
    try {
      await api.deleteLead(token, leadId);
      setLeads(leads.filter(l => l.id !== leadId));
      setShowDetailModal(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Failed to delete lead:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvertToDeal = (lead: Lead) => {
    setSelectedLead(lead);
    setConvertData({ insurance_type: lead.insurance_type || '', insurance_id: lead.insurance_id || '', care_level: '', estimated_monthly_value: '' });
    setShowDetailModal(false);
    setShowConvertModal(true);
  };

  const handleConfirmConvert = async () => {
    if (!selectedLead || !token) return;
    setConverting(true);
    try {
      await api.convertLead(token, selectedLead.id, {
        insurance_type: convertData.insurance_type || null,
        insurance_id: convertData.insurance_id || null,
        care_level: convertData.care_level || null,
        estimated_monthly_value: convertData.estimated_monthly_value
          ? parseInt(convertData.estimated_monthly_value, 10)
          : null,
      });

      setLeads(leads.filter(l => l.id !== selectedLead.id));
      setShowConvertModal(false);
      setSelectedLead(null);
      router.push('/clients?section=clients');
    } catch (error) {
      console.error('Failed to convert lead:', error);
      alert('Failed to convert lead to client. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leads</h2>
          <p className="text-slate-500 text-sm">Manage and track potential clients</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="glass-btn-primary"
        >
          <Plus className="w-5 h-5" />
          Add Lead
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-10 pr-4 py-2.5 glass-card text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 glass-card text-slate-600 hover:text-slate-900 transition-colors">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Leads Yet</h3>
          <p className="text-slate-500 mb-6">Start tracking potential clients by adding your first lead</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="glass-btn-primary mx-auto"
          >
            <Plus className="w-5 h-5" />
            Add Your First Lead
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Name</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Source</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Created</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr
                  key={lead.id}
                  className="border-b border-slate-200/40 hover:bg-white/40 transition-colors cursor-pointer"
                  onClick={() => { setSelectedLead(lead); setShowDetailModal(true); }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                        <span className="text-primary-400 font-medium">{lead.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-slate-800">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4" />
                        {lead.email || 'No email'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="w-4 h-4" />
                        {lead.phone || 'No phone'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{lead.source}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{lead.created}</td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      disabled={deletingId === lead.id}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {deletingId === lead.id ? (
                        <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-slate-500 hover:text-red-600" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add New Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Source</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-primary-500 focus:outline-none appearance-none"
                  >
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Insurance Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['medicaid', 'medicare', 'private'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewLead({ ...newLead, insurance_type: t })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                        newLead.insurance_type === t
                          ? 'bg-primary-50 text-primary-600 border border-primary-500/50'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Notes</label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Additional notes about this lead..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleAddLead} className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
                Add Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">{selectedLead.name}</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail className="w-5 h-5 text-slate-500" />
                {selectedLead.email || 'No email'}
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone className="w-5 h-5 text-slate-500" />
                {selectedLead.phone || 'No phone'}
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Globe className="w-5 h-5 text-slate-500" />
                Source: {selectedLead.source}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-2">Update Status</label>
              <div className="flex gap-2">
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={() => handleUpdateStatus(selectedLead.id, s)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedLead.status === s ? 'bg-primary-500 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteLead(selectedLead.id)}
                className="flex-1 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium"
              >
                Delete Lead
              </button>
              <button
                onClick={() => handleConvertToDeal(selectedLead)}
                className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Convert to Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Client Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Convert to Client</h2>
              <button onClick={() => setShowConvertModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-900 font-medium">{selectedLead.name}</p>
              <p className="text-slate-500 text-sm">{selectedLead.email || 'No email'}</p>
              <p className="text-slate-500 text-sm">{selectedLead.phone || 'No phone'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Insurance Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertData(prev => ({ ...prev, insurance_type: 'medicaid' }))}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                      convertData.insurance_type === 'medicaid'
                        ? 'bg-blue-50 text-blue-600 border-2 border-blue-500/50'
                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    Medicaid
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertData(prev => ({ ...prev, insurance_type: 'medicare' }))}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                      convertData.insurance_type === 'medicare'
                        ? 'bg-emerald-50 text-emerald-600 border-2 border-green-500/50'
                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-300'
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                    Medicare
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertData(prev => ({ ...prev, insurance_type: 'private' }))}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                      convertData.insurance_type === 'private'
                        ? 'bg-purple-50 text-purple-600 border-2 border-purple-500/50'
                        : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-300'
                    }`}
                  >
                    <Heart className="w-5 h-5" />
                    Private
                  </button>
                </div>
              </div>

              {convertData.insurance_type && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    {convertData.insurance_type === 'medicaid' ? 'Medicaid ID' :
                     convertData.insurance_type === 'medicare' ? 'Medicare ID' : 'Insurance Provider'}
                  </label>
                  <input
                    type="text"
                    value={convertData.insurance_id}
                    onChange={(e) => setConvertData(prev => ({ ...prev, insurance_id: e.target.value }))}
                    placeholder={convertData.insurance_type === 'private' ? 'Blue Cross Blue Shield' : 'Enter ID (optional)'}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Care Level</label>
                <select
                  value={convertData.care_level}
                  onChange={(e) => setConvertData(prev => ({ ...prev, care_level: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Select care level...</option>
                  <option value="LOW">Low - Companionship</option>
                  <option value="MODERATE">Moderate - Daily Assistance</option>
                  <option value="HIGH">High - Medical Care</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowConvertModal(false)} className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmConvert}
                disabled={converting || !convertData.insurance_type}
                className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-100 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {converting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Converting...</>
                ) : (
                  <><UserPlus className="w-4 h-4" />Create Client</>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4 text-center">
              Client will be added to Intake with their insurance info and appear in the Clients tab
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
