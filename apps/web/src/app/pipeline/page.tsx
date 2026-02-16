'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Target, Plus, DollarSign, Clock, CheckCircle, X, User, Phone, Mail, RefreshCw, FileText, GripVertical } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

type Deal = {
  id: string;
  name: string;
  email: string;
  phone: string;
  value: number;
  stage: string;
  daysInStage: number;
  notes: string;
  clientId: string;
  hasContract: boolean;
  visitId?: string;
};

const stages = [
  { id: 'intake', name: 'Intake', color: 'bg-blue-500', statuses: ['intake', 'new'] },
  { id: 'assessment', name: 'Assessment', color: 'bg-purple-500', statuses: ['assessment', 'pending'] },
  { id: 'proposal', name: 'Proposal Sent', color: 'bg-orange-500', statuses: ['proposal', 'pending_review'] },
  { id: 'active', name: 'Active Client', color: 'bg-green-500', statuses: ['active', 'assigned'] },
  { id: 'follow_up', name: 'Follow-up', color: 'bg-yellow-500', statuses: ['follow_up', 'review'] },
];

export default function PipelinePage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [newDeal, setNewDeal] = useState({ name: '', email: '', phone: '', value: '', stage: 'intake', notes: '' });
  
  // Drag and drop state
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', deal.id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDeal(null);
    setDragOverStage(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedDeal && draggedDeal.stage !== targetStageId) {
      // Update the stage
      await handleUpdateStage(draggedDeal, targetStageId);
    }
    setDraggedDeal(null);
  };

  useEffect(() => {
    if (!authLoading && token) {
      loadPipelineData();
    }
  }, [token, authLoading]);

  const loadPipelineData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch clients
      const clients = await api.getClients(token) || [];
      
      // Fetch visits to get contract info
      const visitsData = await api.getVisits(token);
      const visits = visitsData.items || [];
      
      // Map clients to deals based on their status
      const pipelineDeals: Deal[] = clients.map((client: any) => {
        // Find the latest visit for this client
        const clientVisits = visits.filter((v: any) => v.client_id === client.id);
        const latestVisit = clientVisits.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        // Determine pipeline stage from client status
        let stage = 'intake';
        const status = (client.status || '').toLowerCase();
        
        if (['active', 'assigned'].includes(status)) {
          stage = 'active';
        } else if (['assessment', 'pending'].includes(status)) {
          stage = 'assessment';
        } else if (['proposal', 'pending_review'].includes(status)) {
          stage = 'proposal';
        } else if (['follow_up', 'review'].includes(status)) {
          stage = 'follow_up';
        } else {
          stage = 'intake';
        }
        
        // Check if client has a contract with value
        const hasContract = latestVisit?.pipeline_state?.contract?.status === 'completed';
        const contractValue = latestVisit?.pipeline_state?.contract?.monthly_value || 
                             (client.care_level === 'HIGH' ? 4500 : client.care_level === 'MODERATE' ? 3200 : 2000);
        
        // Calculate days in stage
        const updatedAt = client.updated_at ? new Date(client.updated_at) : new Date();
        const daysInStage = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: client.id,
          name: client.full_name || 'Unknown Client',
          email: client.email || '',
          phone: client.phone || '',
          value: contractValue,
          stage,
          daysInStage,
          notes: client.medical_notes || '',
          clientId: client.id,
          hasContract,
          visitId: latestVisit?.id,
        };
      });
      
      setDeals(pipelineDeals);
    } catch (error) {
      console.error('Failed to load pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDealsForStage = (stageId: string) => deals.filter(d => d.stage === stageId);
  const getStageValue = (stageId: string) => getDealsForStage(stageId).reduce((sum, d) => sum + d.value, 0);

  const handleAddDeal = async () => {
    if (!newDeal.name || !token) return;
    
    try {
      // Create a new client
      const clientData = await api.createClient(token, {
        full_name: newDeal.name,
        email: newDeal.email,
        phone: newDeal.phone,
        status: newDeal.stage,
        notes: newDeal.notes,
      });
      
      // Reload pipeline data
      await loadPipelineData();
      setNewDeal({ name: '', email: '', phone: '', value: '', stage: 'intake', notes: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add deal:', error);
    }
  };

  const handleUpdateStage = async (deal: Deal, newStage: string) => {
    if (!token) return;
    
    try {
      // Update client status
      await api.updateClient(token, deal.clientId, {
        status: newStage,
      });
      
      // Reload pipeline data
      await loadPipelineData();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Failed to update stage:', error);
    }
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  const handleViewAssessment = (deal: Deal) => {
    if (deal.visitId) {
      router.push(`/visits/${deal.visitId}`);
    }
  };

  const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('homecare-auth');

  if (authLoading && !hasStoredToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!token && !hasStoredToken) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Deals Pipeline</h1>
            <p className="text-dark-400">Track your clients through the care process</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={loadPipelineData}
              className="flex items-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Deal
            </button>
          </div>
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
            <p className="text-2xl font-bold text-white">{deals.filter(d => d.stage !== 'active').length}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-dark-400 text-sm">Active Clients</span>
            </div>
            <p className="text-2xl font-bold text-white">{deals.filter(d => d.stage === 'active').length}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-dark-400 text-sm">Avg Deal Value</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${deals.length > 0 ? Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length).toLocaleString() : 0}
            </p>
          </div>
        </div>

        {/* Stage Legend */}
        <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/50 mb-6">
          <h3 className="text-sm font-medium text-dark-400 mb-3">
            Client Journey: <span className="text-primary-400">Drag and drop</span> clients between stages, or click to edit
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${stage.color}`}>
                  {stage.name}
                </div>
                {idx < stages.length - 1 && (
                  <span className="text-dark-500">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div 
                className={`bg-dark-800/30 rounded-xl p-4 border-2 transition-all min-h-[400px] ${
                  dragOverStage === stage.id 
                    ? 'border-primary-500 bg-primary-500/10' 
                    : 'border-dark-700/50'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
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
                  {getDealsForStage(stage.id).map(deal => {
                    // Find next stage for quick-advance button
                    const currentStageIdx = stages.findIndex(s => s.id === stage.id);
                    const nextStage = stages[currentStageIdx + 1];
                    const prevStage = stages[currentStageIdx - 1];
                    
                    return (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      onDragEnd={handleDragEnd}
                      className={`bg-dark-800 border border-dark-700/50 rounded-lg p-4 hover:border-primary-500/30 transition-all cursor-grab active:cursor-grabbing group ${
                        draggedDeal?.id === deal.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <div 
                        onClick={() => handleDealClick(deal)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-dark-500 group-hover:text-dark-300 flex-shrink-0 mt-0.5" />
                          <h3 className="font-medium text-white mb-2 flex-1">{deal.name}</h3>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-400 font-medium">${deal.value.toLocaleString()}/mo</span>
                          <span className="text-xs text-dark-500">{deal.daysInStage}d</span>
                        </div>
                        {deal.hasContract && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-primary-400">
                            <FileText className="w-3 h-3" />
                            Contract Ready
                          </div>
                        )}
                      </div>
                      
                      {/* Quick Stage Move Buttons */}
                      <div className="flex gap-1 mt-3 pt-3 border-t border-dark-700/50">
                        {prevStage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStage(deal, prevStage.id); }}
                            className="flex-1 px-2 py-1.5 text-xs bg-dark-700/50 hover:bg-dark-600 text-dark-300 rounded transition-colors"
                            title={`Move to ${prevStage.name}`}
                          >
                            ← {prevStage.name.split(' ')[0]}
                          </button>
                        )}
                        {nextStage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateStage(deal, nextStage.id); }}
                            className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                              nextStage.id === 'active' 
                                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                                : 'bg-primary-500/20 hover:bg-primary-500/30 text-primary-400'
                            }`}
                            title={`Move to ${nextStage.name}`}
                          >
                            {nextStage.name.split(' ')[0]} →
                          </button>
                        )}
                      </div>
                    </div>
                  );})}
                  {getDealsForStage(stage.id).length === 0 && (
                    <div className="text-center py-8 text-dark-500 text-sm">
                      No clients in this stage
                    </div>
                  )}
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
                <h2 className="text-xl font-bold text-white">Add New Client</h2>
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
                  Add Client
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
                {selectedDeal.hasContract && (
                  <div className="flex items-center gap-3 text-primary-400">
                    <FileText className="w-5 h-5" />
                    Contract Generated
                  </div>
                )}
              </div>
              
              {selectedDeal.visitId && (
                <button
                  onClick={() => handleViewAssessment(selectedDeal)}
                  className="w-full mb-4 px-4 py-2.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  View Assessment
                </button>
              )}
              
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Move to Stage</label>
                <div className="grid grid-cols-2 gap-2">
                  {stages.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleUpdateStage(selectedDeal, s.id)}
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
