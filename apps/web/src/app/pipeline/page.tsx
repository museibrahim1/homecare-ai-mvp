'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Target, Plus, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

const stages = [
  { id: 'lead', name: 'New Lead', color: 'bg-blue-500' },
  { id: 'contacted', name: 'Contacted', color: 'bg-yellow-500' },
  { id: 'assessment', name: 'Assessment', color: 'bg-purple-500' },
  { id: 'proposal', name: 'Proposal Sent', color: 'bg-orange-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-pink-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
];

const mockDeals = [
  { id: 1, name: 'Margaret Thompson', value: 3200, stage: 'lead', daysInStage: 2 },
  { id: 2, name: 'Robert Williams', value: 4800, stage: 'contacted', daysInStage: 5 },
  { id: 3, name: 'Eleanor Davis', value: 2800, stage: 'assessment', daysInStage: 3 },
  { id: 4, name: 'James Wilson', value: 5200, stage: 'proposal', daysInStage: 1 },
  { id: 5, name: 'Patricia Moore', value: 3600, stage: 'negotiation', daysInStage: 4 },
  { id: 6, name: 'Charles Brown', value: 4200, stage: 'won', daysInStage: 0 },
  { id: 7, name: 'Dorothy Taylor', value: 3800, stage: 'lead', daysInStage: 1 },
  { id: 8, name: 'Richard Anderson', value: 5600, stage: 'assessment', daysInStage: 2 },
];

export default function PipelinePage() {
  const [deals] = useState(mockDeals);

  const getDealsForStage = (stageId: string) => deals.filter(d => d.stage === stageId);
  const getStageValue = (stageId: string) => getDealsForStage(stageId).reduce((sum, d) => sum + d.value, 0);

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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
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
                {/* Stage Header */}
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

                {/* Deal Cards */}
                <div className="space-y-3">
                  {getDealsForStage(stage.id).map(deal => (
                    <div
                      key={deal.id}
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
      </main>
    </div>
  );
}
