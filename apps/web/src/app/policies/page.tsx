'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, Plus, Calendar, AlertCircle, CheckCircle, Clock, Search, Filter } from 'lucide-react';

const mockPolicies = [
  { id: 1, client: 'Margaret Thompson', type: 'Care Agreement', startDate: '2025-06-15', endDate: '2026-06-15', status: 'active', daysUntilRenewal: 137 },
  { id: 2, client: 'Robert Williams', type: 'Service Contract', startDate: '2025-08-01', endDate: '2026-02-01', status: 'expiring', daysUntilRenewal: 2 },
  { id: 3, client: 'Eleanor Davis', type: 'Care Agreement', startDate: '2025-03-10', endDate: '2026-03-10', status: 'active', daysUntilRenewal: 39 },
  { id: 4, client: 'James Wilson', type: 'Service Contract', startDate: '2024-12-01', endDate: '2025-12-01', status: 'expired', daysUntilRenewal: -60 },
  { id: 5, client: 'Patricia Moore', type: 'Care Agreement', startDate: '2025-09-20', endDate: '2026-09-20', status: 'active', daysUntilRenewal: 233 },
];

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  active: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle, label: 'Active' },
  expiring: { color: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle, label: 'Expiring Soon' },
  expired: { color: 'bg-red-500/20 text-red-400', icon: Clock, label: 'Expired' },
};

export default function PoliciesPage() {
  const [policies] = useState(mockPolicies);

  const activeCount = policies.filter(p => p.status === 'active').length;
  const expiringCount = policies.filter(p => p.status === 'expiring').length;
  const expiredCount = policies.filter(p => p.status === 'expired').length;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Policies & Renewals</h1>
            <p className="text-dark-400">Manage care agreements and contract renewals</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
            New Policy
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-dark-400">Active Policies</span>
            </div>
            <p className="text-3xl font-bold text-white">{activeCount}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-dark-400">Expiring Soon</span>
            </div>
            <p className="text-3xl font-bold text-white">{expiringCount}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-red-400" />
              <span className="text-dark-400">Expired</span>
            </div>
            <p className="text-3xl font-bold text-white">{expiredCount}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search policies..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-white transition-colors">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        {/* Policies Table */}
        <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Client</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Start Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">End Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Days Until Renewal</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {policies.map(policy => {
                const config = statusConfig[policy.status];
                return (
                  <tr key={policy.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <span className="text-primary-400 font-medium">{policy.client.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-white">{policy.client}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-dark-300">{policy.type}</td>
                    <td className="px-6 py-4 text-dark-400">{policy.startDate}</td>
                    <td className="px-6 py-4 text-dark-400">{policy.endDate}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        <config.icon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${
                        policy.daysUntilRenewal < 0 ? 'text-red-400' :
                        policy.daysUntilRenewal < 30 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {policy.daysUntilRenewal < 0 ? `${Math.abs(policy.daysUntilRenewal)} days overdue` : `${policy.daysUntilRenewal} days`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors">
                        <RefreshCw className="w-4 h-4 inline mr-1" />
                        Renew
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
