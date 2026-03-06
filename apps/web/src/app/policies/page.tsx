'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, Plus, AlertCircle, CheckCircle, Clock, Search, Filter, X, User, Calendar, FileText, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Policy = {
  id: string;
  client: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expiring' | 'expired';
  monthlyValue: number;
  notes: string;
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  active: { color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle, label: 'Active' },
  expiring: { color: 'bg-amber-50 text-amber-600', icon: AlertCircle, label: 'Expiring Soon' },
  expired: { color: 'bg-red-50 text-red-600', icon: Clock, label: 'Expired' },
};

const policyTypes = ['Care Agreement', 'Service Contract', 'Family Agreement', 'Respite Care'];

export default function PoliciesPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPolicy, setNewPolicy] = useState({
    client: '',
    type: 'Care Agreement',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    monthlyValue: '',
    notes: '',
  });

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    return user?.id ? `palmcare_policies_${user.id}` : null;
  }, [user?.id]);

  // Load policies from localStorage (user-specific)
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) {
      setLoading(false);
      return;
    }
    
    try {
      const savedPolicies = localStorage.getItem(storageKey);
      if (savedPolicies) {
        setPolicies(JSON.parse(savedPolicies));
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
    }
    setLoading(false);
  }, [getStorageKey]);

  // Save policies to localStorage when they change
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey || loading) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(policies));
    } catch (error) {
      console.error('Failed to save policies:', error);
    }
  }, [policies, getStorageKey, loading]);

  const filteredPolicies = policies.filter(policy =>
    policy.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysUntilRenewal = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const activeCount = policies.filter(p => p.status === 'active').length;
  const expiringCount = policies.filter(p => p.status === 'expiring').length;
  const expiredCount = policies.filter(p => p.status === 'expired').length;

  const handleAddPolicy = () => {
    if (!newPolicy.client || !newPolicy.endDate) return;
    
    const endDate = new Date(newPolicy.endDate);
    const today = new Date();
    const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let status: 'active' | 'expiring' | 'expired' = 'active';
    if (daysUntil < 0) status = 'expired';
    else if (daysUntil < 30) status = 'expiring';

    const policy: Policy = {
      id: `policy_${Date.now()}`,
      client: newPolicy.client,
      type: newPolicy.type,
      startDate: newPolicy.startDate,
      endDate: newPolicy.endDate,
      status,
      monthlyValue: parseInt(newPolicy.monthlyValue) || 0,
      notes: newPolicy.notes,
    };
    setPolicies([...policies, policy]);
    setNewPolicy({
      client: '',
      type: 'Care Agreement',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      monthlyValue: '',
      notes: '',
    });
    setShowAddModal(false);
  };

  const handleDeletePolicy = (policyId: string) => {
    setPolicies(policies.filter(p => p.id !== policyId));
    setShowRenewModal(false);
    setSelectedPolicy(null);
  };

  const handleRenewPolicy = () => {
    if (!selectedPolicy) return;
    
    // Calculate new end date (1 year from current end date)
    const currentEnd = new Date(selectedPolicy.endDate);
    const newEnd = new Date(currentEnd);
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    
    setPolicies(policies.map(p => 
      p.id === selectedPolicy.id 
        ? { ...p, startDate: selectedPolicy.endDate, endDate: newEnd.toISOString().split('T')[0], status: 'active' as const }
        : p
    ));
    setShowRenewModal(false);
    setSelectedPolicy(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Policies & Renewals</h1>
            <p className="text-slate-500">Manage care agreements and contract renewals</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Policy
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span className="text-slate-500">Active Policies</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{activeCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="text-slate-500">Expiring Soon</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{expiringCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-red-600" />
              <span className="text-slate-500">Expired</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{expiredCount}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        {/* Empty State */}
        {policies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Policies Yet</h3>
            <p className="text-slate-500 mb-6">Create and manage care agreements and service contracts</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Policy
            </button>
          </div>
        ) : (
          /* Policies Table */
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Client</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Start Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">End Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Monthly Value</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map(policy => {
                  const config = statusConfig[policy.status];
                  const daysUntil = getDaysUntilRenewal(policy.endDate);
                  return (
                    <tr key={policy.id} className="border-b border-slate-200/30 hover:bg-slate-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                            <span className="text-primary-400 font-medium">{policy.client.charAt(0)}</span>
                          </div>
                          <span className="font-medium text-slate-800">{policy.client}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{policy.type}</td>
                      <td className="px-6 py-4 text-slate-500">{policy.startDate}</td>
                      <td className="px-6 py-4 text-slate-500">{policy.endDate}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          <config.icon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-600 font-medium">${policy.monthlyValue.toLocaleString()}</span>
                        <span className="text-slate-400 text-sm ml-1">/mo</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setSelectedPolicy(policy); setShowRenewModal(true); }}
                            className="px-3 py-1.5 bg-primary-50 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors flex items-center gap-1"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Renew
                          </button>
                          <button 
                            onClick={() => handleDeletePolicy(policy.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Policy Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">New Policy</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Client Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={newPolicy.client}
                      onChange={(e) => setNewPolicy({ ...newPolicy, client: e.target.value })}
                      placeholder="Enter client name"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Policy Type</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <select
                      value={newPolicy.type}
                      onChange={(e) => setNewPolicy({ ...newPolicy, type: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-primary-500 focus:outline-none appearance-none"
                    >
                      {policyTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={newPolicy.startDate}
                      onChange={(e) => setNewPolicy({ ...newPolicy, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={newPolicy.endDate}
                      onChange={(e) => setNewPolicy({ ...newPolicy, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Monthly Value ($)</label>
                  <input
                    type="number"
                    value={newPolicy.monthlyValue}
                    onChange={(e) => setNewPolicy({ ...newPolicy, monthlyValue: e.target.value })}
                    placeholder="3000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Notes</label>
                  <textarea
                    value={newPolicy.notes}
                    onChange={(e) => setNewPolicy({ ...newPolicy, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPolicy}
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Create Policy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Renew Policy Modal */}
        {showRenewModal && selectedPolicy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Renew Policy</h2>
                <button onClick={() => setShowRenewModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-slate-900 mb-2">{selectedPolicy.client}</h3>
                <p className="text-slate-500 text-sm">{selectedPolicy.type}</p>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Current End Date</span>
                    <span className="text-slate-800">{selectedPolicy.endDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">New End Date</span>
                    <span className="text-emerald-600">
                      {new Date(new Date(selectedPolicy.endDate).setFullYear(new Date(selectedPolicy.endDate).getFullYear() + 1)).toISOString().split('T')[0]}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                This will extend the policy for 1 year from the current end date.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenewPolicy}
                  className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Confirm Renewal
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
