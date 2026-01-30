'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Users, Plus, Phone, Mail, Calendar, MoreVertical, Search, Filter } from 'lucide-react';

const mockLeads = [
  { id: 1, name: 'Susan Martinez', email: 'susan.m@email.com', phone: '(555) 123-4567', source: 'Website', status: 'New', created: '2 hours ago' },
  { id: 2, name: 'William Johnson', email: 'w.johnson@email.com', phone: '(555) 234-5678', source: 'Referral', status: 'Contacted', created: '1 day ago' },
  { id: 3, name: 'Barbara White', email: 'b.white@email.com', phone: '(555) 345-6789', source: 'Google Ads', status: 'Qualified', created: '2 days ago' },
  { id: 4, name: 'Michael Brown', email: 'm.brown@email.com', phone: '(555) 456-7890', source: 'Website', status: 'New', created: '3 hours ago' },
  { id: 5, name: 'Linda Davis', email: 'l.davis@email.com', phone: '(555) 567-8901', source: 'Facebook', status: 'Contacted', created: '5 days ago' },
];

const statusColors: Record<string, string> = {
  'New': 'bg-blue-500/20 text-blue-400',
  'Contacted': 'bg-yellow-500/20 text-yellow-400',
  'Qualified': 'bg-green-500/20 text-green-400',
};

export default function LeadsPage() {
  const [leads] = useState(mockLeads);

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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
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
              {leads.map(lead => (
                <tr key={lead.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors">
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
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-dark-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
