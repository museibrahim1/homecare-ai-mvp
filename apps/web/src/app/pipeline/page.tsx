'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Target, Plus, DollarSign, Clock, CheckCircle, X, User, Phone, Mail } from 'lucide-react';

type Deal = {
  id: number;
  name: string;
  email: string;
  phone: string;
  value: number;
  stage: string;
  daysInStage: number;
  notes: string;
};

const stages = [
  { id: 'lead', name: 'New Lead', color: 'bg-blue-500' },
  { id: 'contacted', name: 'Contacted', color: 'bg-yellow-500' },
  { id: 'assessment', name: 'Assessment', color: 'bg-purple-500' },
  { id: 'proposal', name: 'Proposal Sent', color: 'bg-orange-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-pink-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
];

const initialDeals: Deal[] = [
  { id: 1, name: 'Margaret Thompson', email: 'margaret@email.com', phone: '(555) 123-4567', value: 3200, stage: 'lead', daysInStage: 2, notes: '' },
  { id: 2, name: 'Robert Williams', email: 'robert@email.com', phone: '(555) 234-5678', value: 4800, stage: 'contacted', daysInStage: 5, notes: '' },
  { id: 3, name: 'Eleanor Davis', email: 'eleanor@email.com', phone: '(555) 345-6789', value: 2800, stage: 'assessment', daysInStage: 3, notes: '' },
  { id: 4, name: 'James Wilson', email: 'james@email.com', phone: '(555) 456-7890', value: 5200, stage: 'proposal', daysInStage: 1, notes: '' },
  { id: 5, name: 'Patricia Moore', email: 'patricia@email.com', phone: '(555) 567-8901', value: 3600, stage: 'negotiation', daysInStage: 4, notes: '' },
  { id: 6, name: 'Charles Brown', email: 'charles@email.com', phone: '(555) 678-9012', value: 4200, stage: 'won', daysInStage: 0, notes: '' },
];

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [newDeal, setNewDeal] = useState({ name: '', email: '', phone: '', value: '', stage: 'lead', notes: '' });

  const getDealsForStage = (stageId: string) => deals.filter(d => d.stage === stageId);
  const getStageValue = (stageId: string) => getDealsForStage(stageId).reduce((sum, d) => sum + d.value, 0);

  const handleAddDeal = () => {
    if (!newDeal.name || !newDeal.value) return;
    const deal: Deal = {
      id: Date.now(),
      name: newDeal.name,
      email: newDeal.email,
      phone: newDeal.phone,
      value: parseInt(newDeal.value),
      stage: newDeal.stage,
      daysInStage: 0,
      notes: newDeal.notes,
    };
    setDeals([...deals, deal]);
    setNewDeal({ name: '', email: '', phone: '', value: '', stage: 'lead', notes: '' });
    setShowAddModal(false);
  };

  const handleUpdateStage = (dealId: number, newStage: string) => {
    setDeals(deals.map(d => d.id === dealId ? { ...d, stage: newStage, daysInStage: 0 } : d));
    setShowDetailModal(false);
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Deals Pipeline</h1>
            <p className="text-dark-400">Track your client opportunities through the sales process</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Deal
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-dark-400 text-sm">Total Pipeline</span>
            </div>
            <p className="text-2xl font-bold text-white">${deals.reduce((s, d) => s + d.value, 0).toLocaleString()}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-dark-400 text-sm">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-white">{deals.filter(d => d.stage !== 'won').length}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-dark-400 text-sm">Won This Month</span>
            </div>
            <p className="text-2xl font-bold text-white">{deals.filter(d => d.stage === 'won').length}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-dark-400 text-sm">Avg Deal Value</span>
            </div>
            <p className="text-2xl font-bold text-white">${Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length).toLocaleString()}</p>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="font-medium text-white">{stage.name}</span>
                    <span className="text-xs bg-dark-700 text-dark-300 px-2 py-0.5 rounded-full">
                      {getDealsForStage(stage.id).length}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-dark-400 mb-4">
                  ${getStageValue(stage.id).toLocaleString()} total
                </div>
                <div className="space-y-3">
                  {getDealsForStage(stage.id).map(deal => (
                    <div
                      key={deal.id}
                      onClick={() => handleDealClick(deal)}
                      className="bg-dark-800 border border-dark-700/50 rounded-lg p-4 hover:border-primary-500/30 transition-colors cursor-pointer"
                    >
                      <h3 className="font-medium text-white mb-2">{deal.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-green-400 font-medium">${deal.value.toLocaleString()}/mo</span>
                        <span className="text-xs text-dark-500">{deal.daysInStage}d</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Deal Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Add New Deal</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Client Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      value={newDeal.name}
                      onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                      placeholder="Full name"
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
                      value={newDeal.email}
                      onChange={(e) => setNewDeal({ ...newDeal, email: e.target.value })}
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
                      value={newDeal.phone}
                      onChange={(e) => setNewDeal({ ...newDeal, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Monthly Value *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="number"
                      value={newDeal.value}
                      onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                      placeholder="3000"
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Stage</label>
                  <select
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  >
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Notes</label>
                  <textarea
                    value={newDeal.notes}
                    onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                    placeholder="Additional notes..."
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
                  onClick={handleAddDeal}
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Add Deal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deal Detail Modal */}
        {showDetailModal && selectedDeal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{selectedDeal.name}</h2>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-dark-300">
                  <Mail className="w-5 h-5 text-dark-400" />
                  {selectedDeal.email || 'No email'}
                </div>
                <div className="flex items-center gap-3 text-dark-300">
                  <Phone className="w-5 h-5 text-dark-400" />
                  {selectedDeal.phone || 'No phone'}
                </div>
                <div className="flex items-center gap-3 text-dark-300">
                  <DollarSign className="w-5 h-5 text-dark-400" />
                  ${selectedDeal.value.toLocaleString()}/month
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Move to Stage</label>
                <div className="grid grid-cols-2 gap-2">
                  {stages.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleUpdateStage(selectedDeal.id, s.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedDeal.stage === s.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
