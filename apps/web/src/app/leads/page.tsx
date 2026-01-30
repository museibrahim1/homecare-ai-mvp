'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, Phone, Mail, MoreVertical, Search, Filter, X, User, Globe, MessageSquare } from 'lucide-react';

type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  notes: string;
  created: string;
};

const initialLeads: Lead[] = [
  { id: 1, name: 'Susan Martinez', email: 'susan.m@email.com', phone: '(555) 123-4567', source: 'Website', status: 'New', notes: '', created: '2 hours ago' },
  { id: 2, name: 'William Johnson', email: 'w.johnson@email.com', phone: '(555) 234-5678', source: 'Referral', status: 'Contacted', notes: '', created: '1 day ago' },
  { id: 3, name: 'Barbara White', email: 'b.white@email.com', phone: '(555) 345-6789', source: 'Google Ads', status: 'Qualified', notes: '', created: '2 days ago' },
  { id: 4, name: 'Michael Brown', email: 'm.brown@email.com', phone: '(555) 456-7890', source: 'Website', status: 'New', notes: '', created: '3 hours ago' },
  { id: 5, name: 'Linda Davis', email: 'l.davis@email.com', phone: '(555) 567-8901', source: 'Facebook', status: 'Contacted', notes: '', created: '5 days ago' },
];

const statusColors: Record<string, string> = {
  'New': 'bg-blue-500/20 text-blue-400',
  'Contacted': 'bg-yellow-500/20 text-yellow-400',
  'Qualified': 'bg-green-500/20 text-green-400',
};

const sources = ['Website', 'Referral', 'Google Ads', 'Facebook', 'Instagram', 'Phone Call', 'Other'];
const statuses = ['New', 'Contacted', 'Qualified'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', source: 'Website', status: 'New', notes: '' });

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddLead = () => {
    if (!newLead.name) return;
    const lead: Lead = {
      id: Date.now(),
      ...newLead,
      created: 'Just now',
    };
    setLeads([lead, ...leads]);
    setNewLead({ name: '', email: '', phone: '', source: 'Website', status: 'New', notes: '' });
    setShowAddModal(false);
  };

  const handleUpdateStatus = (leadId: number, newStatus: string) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
  };

  const handleConvertToDeal = (lead: Lead) => {
    // In a real app, this would navigate to pipeline with the lead data
    alert(`Converting ${lead.name} to deal - would navigate to pipeline`);
    setShowDetailModal(false);
  };

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

        {/* Leads Table */}
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
                        {lead.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-dark-400">
                        <Phone className="w-4 h-4" />
                        {lead.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-dark-300">{lead.source}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-dark-400 text-sm">{lead.created}</td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-dark-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
              <button
                onClick={() => handleConvertToDeal(selectedLead)}
                className="w-full px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
              >
                Convert to Deal
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
