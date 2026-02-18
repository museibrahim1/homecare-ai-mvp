'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Plus, Phone, Mail, MoreVertical, Search, Filter, X, User, Globe, MessageSquare, Loader2, UserPlus, Trash2, Building2, Shield, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  'New': 'bg-blue-500/20 text-blue-400',
  'Contacted': 'bg-yellow-500/20 text-yellow-400',
  'Qualified': 'bg-green-500/20 text-green-400',
};

const sources = ['Website', 'Referral', 'Google Ads', 'Facebook', 'Instagram', 'Phone Call', 'Other'];
const statuses = ['New', 'Contacted', 'Qualified'];

export default function LeadsPage() {
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
  const [convertData, setConvertData] = useState({ insurance_type: '' as '' | 'medicaid' | 'medicare' | 'private', insurance_id: '', care_level: '' });

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    return user?.id ? `palmcare_leads_${user.id}` : null;
  }, [user?.id]);

  // Load leads from localStorage (user-specific)
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) {
      setLoading(false);
      return;
    }
    
    try {
      const savedLeads = localStorage.getItem(storageKey);
      if (savedLeads) {
        setLeads(JSON.parse(savedLeads));
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    }
    setLoading(false);
  }, [getStorageKey]);

  // Save leads to localStorage when they change
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey || loading) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(leads));
    } catch (error) {
      console.error('Failed to save leads:', error);
    }
  }, [leads, getStorageKey, loading]);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddLead = () => {
    if (!newLead.name) return;
    const lead: Lead = {
      id: `lead_${Date.now()}`,
      ...newLead,
      created: 'Just now',
    };
    setLeads([lead, ...leads]);
    setNewLead({ name: '', email: '', phone: '', source: 'Website', status: 'New', notes: '', insurance_type: '', insurance_id: '' });
    setShowAddModal(false);
  };

  const handleUpdateStatus = (leadId: string, newStatus: string) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
  };

  const handleDeleteLead = (leadId: string) => {
    setDeletingId(leadId);
    setTimeout(() => {
      setLeads(leads.filter(l => l.id !== leadId));
      setDeletingId(null);
      setShowDetailModal(false);
      setSelectedLead(null);
    }, 300);
  };

  const handleConvertToDeal = (lead: Lead) => {
    setSelectedLead(lead);
    setConvertData({ 
      insurance_type: lead.insurance_type || '', 
      insurance_id: lead.insurance_id || '',
      care_level: ''
    });
    setShowDetailModal(false);
    setShowConvertModal(true);
  };

  const handleConfirmConvert = async () => {
    if (!selectedLead || !token) return;
    
    setConverting(true);
    try {
      // Build client data from lead
      const clientData: any = {
        full_name: selectedLead.name,
        email: selectedLead.email || null,
        phone: selectedLead.phone || null,
        status: 'intake', // New clients start in intake
        notes: selectedLead.notes,
        care_level: convertData.care_level || null,
      };

      // Add insurance data based on type
      if (convertData.insurance_type === 'medicaid') {
        clientData.medicaid_id = convertData.insurance_id || 'PENDING';
      } else if (convertData.insurance_type === 'medicare') {
        clientData.medicare_id = convertData.insurance_id || 'PENDING';
      } else if (convertData.insurance_type === 'private') {
        clientData.insurance_provider = convertData.insurance_id || 'Private Insurance';
      }

      // Create the client via API
      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      const newClient = await response.json();
      
      // Remove the lead from the list
      setLeads(leads.filter(l => l.id !== selectedLead.id));
      
      // Close modals and navigate to clients
      setShowConvertModal(false);
      setSelectedLead(null);
      
      // Navigate to the new client in the pipeline
      router.push('/clients');
    } catch (error) {
      console.error('Failed to convert lead:', error);
      alert('Failed to convert lead to client. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Leads</h1>
            <p className="text-dark-400">Manage and track potential clients</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Lead
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-white transition-colors">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        {/* Empty State */}
        {leads.length === 0 ? (
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-12 text-center">
            <UserPlus className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Leads Yet</h3>
            <p className="text-dark-400 mb-6">Start tracking potential clients by adding your first lead</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Lead
            </button>
          </div>
        ) : (
          /* Leads Table */
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Contact</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Source</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Created</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors cursor-pointer"
                    onClick={() => { setSelectedLead(lead); setShowDetailModal(true); }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <span className="text-primary-400 font-medium">{lead.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-white">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-dark-300">
                          <Mail className="w-4 h-4" />
                          {lead.email || 'No email'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-dark-400">
                          <Phone className="w-4 h-4" />
                          {lead.phone || 'No phone'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-dark-300">{lead.source}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-dark-600 text-dark-300'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-400 text-sm">{lead.created}</td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDeleteLead(lead.id)}
                        disabled={deletingId === lead.id}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5 text-dark-400 hover:text-red-400" />
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Add New Lead</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      value={newLead.name}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      placeholder="Enter full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="tel"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Source</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <select
                      value={newLead.source}
                      onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none appearance-none"
                    >
                      {sources.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Insurance Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewLead({ ...newLead, insurance_type: 'medicaid' })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        newLead.insurance_type === 'medicaid'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      Medicaid
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLead({ ...newLead, insurance_type: 'medicare' })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        newLead.insurance_type === 'medicare'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      Medicare
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLead({ ...newLead, insurance_type: 'private' })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        newLead.insurance_type === 'private'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      Private
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Notes</label>
                  <textarea
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    placeholder="Additional notes about this lead..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Add Lead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Detail Modal */}
        {showDetailModal && selectedLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedLead.name}</h2>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-dark-300">
                  <Mail className="w-5 h-5 text-dark-400" />
                  {selectedLead.email || 'No email'}
                </div>
                <div className="flex items-center gap-3 text-dark-300">
                  <Phone className="w-5 h-5 text-dark-400" />
                  {selectedLead.phone || 'No phone'}
                </div>
                <div className="flex items-center gap-3 text-dark-300">
                  <Globe className="w-5 h-5 text-dark-400" />
                  Source: {selectedLead.source}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-300 mb-2">Update Status</label>
                <div className="flex gap-2">
                  {statuses.map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(selectedLead.id, s)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedLead.status === s
                          ? 'bg-primary-500 text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
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
                  className="flex-1 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors font-medium"
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Convert to Client</h2>
                <button onClick={() => setShowConvertModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-dark-900 rounded-lg">
                <p className="text-white font-medium">{selectedLead.name}</p>
                <p className="text-dark-400 text-sm">{selectedLead.email || 'No email'}</p>
                <p className="text-dark-400 text-sm">{selectedLead.phone || 'No phone'}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Insurance Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setConvertData(prev => ({ ...prev, insurance_type: 'medicaid' }))}
                      className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                        convertData.insurance_type === 'medicaid'
                          ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/50'
                          : 'bg-dark-700 text-dark-300 border-2 border-transparent hover:border-dark-500'
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
                          ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                          : 'bg-dark-700 text-dark-300 border-2 border-transparent hover:border-dark-500'
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
                          ? 'bg-purple-500/20 text-purple-400 border-2 border-purple-500/50'
                          : 'bg-dark-700 text-dark-300 border-2 border-transparent hover:border-dark-500'
                      }`}
                    >
                      <Heart className="w-5 h-5" />
                      Private
                    </button>
                  </div>
                </div>

                {convertData.insurance_type && (
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      {convertData.insurance_type === 'medicaid' ? 'Medicaid ID' : 
                       convertData.insurance_type === 'medicare' ? 'Medicare ID' : 'Insurance Provider'}
                    </label>
                    <input
                      type="text"
                      value={convertData.insurance_id}
                      onChange={(e) => setConvertData(prev => ({ ...prev, insurance_id: e.target.value }))}
                      placeholder={convertData.insurance_type === 'private' ? 'Blue Cross Blue Shield' : 'Enter ID (optional)'}
                      className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Care Level</label>
                  <select
                    value={convertData.care_level}
                    onChange={(e) => setConvertData(prev => ({ ...prev, care_level: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Select care level...</option>
                    <option value="LOW">Low - Companionship</option>
                    <option value="MODERATE">Moderate - Daily Assistance</option>
                    <option value="HIGH">High - Medical Care</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmConvert}
                  disabled={converting || !convertData.insurance_type}
                  className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-dark-600 disabled:text-dark-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {converting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Client
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-dark-500 mt-4 text-center">
                Client will be added to Intake with their insurance info and appear in All Clients tab
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
