'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { FileText, Download, Edit3, Eye, Loader2, Search, Calendar, DollarSign, Clock, User, Filter, RefreshCw, Printer, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Contract = {
  id: string;
  client_id: string;
  title: string;
  services: any[];
  schedule: any;
  hourly_rate: number;
  weekly_hours: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  contract_number: string | null;
  created_at: string;
  updated_at: string;
};

type Client = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  care_level: string | null;
  status: string;
};

type ProposalWithClient = Contract & {
  client?: Client;
};

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function ProposalsPage() {
  const { token } = useAuth();
  const [proposals, setProposals] = useState<ProposalWithClient[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch contracts and clients in parallel
        const [contractsRes, clientsRes] = await Promise.all([
          fetch(`${API_URL}/visits/contracts`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${API_URL}/clients`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ]);

        if (contractsRes.ok) {
          const contractsData = await contractsRes.json();
          setProposals(contractsData);
        }

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const clientsMap: Record<string, Client> = {};
          clientsData.forEach((client: Client) => {
            clientsMap[client.id] = client;
          });
          setClients(clientsMap);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [token]);

  // Merge client data with proposals
  const proposalsWithClients = proposals.map(proposal => ({
    ...proposal,
    client: clients[proposal.client_id],
  }));

  // Filter proposals
  const filteredProposals = proposalsWithClients.filter(proposal => {
    const matchesSearch = 
      proposal.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.contract_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort by most recent
  const sortedProposals = [...filteredProposals].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const handleExportPDF = async (proposal: ProposalWithClient) => {
    if (!token) return;
    
    setExporting(proposal.id);
    try {
      // Find the visit associated with this contract
      const visitsRes = await fetch(`${API_URL}/visits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (visitsRes.ok) {
        const visits = await visitsRes.json();
        const visit = visits.find((v: any) => v.client_id === proposal.client_id);
        
        if (visit) {
          // Open the visit page with contract tab
          window.open(`/visits/${visit.id}?tab=contract`, '_blank');
        } else {
          alert('No associated visit found. Please create a visit for this client first.');
        }
      }
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export proposal');
    }
    setExporting(null);
  };

  const handleViewProposal = async (proposal: ProposalWithClient) => {
    if (!token) return;
    
    try {
      const visitsRes = await fetch(`${API_URL}/visits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (visitsRes.ok) {
        const visits = await visitsRes.json();
        const visit = visits.find((v: any) => v.client_id === proposal.client_id);
        
        if (visit) {
          window.location.href = `/visits/${visit.id}?tab=contract`;
        } else {
          alert('No associated visit found. Please create a visit for this client first.');
        }
      }
    } catch (error) {
      console.error('Failed to navigate:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Contract Proposals</h1>
            <p className="text-dark-400">View, edit, and export client service agreements</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/visits/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              New Proposal
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client name, title, or contract number..."
                className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-dark-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <p className="text-dark-400 text-sm mb-1">Total Proposals</p>
            <p className="text-2xl font-bold text-white">{proposals.length}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <p className="text-dark-400 text-sm mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">
              {proposals.filter(p => p.status === 'active').length}
            </p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <p className="text-dark-400 text-sm mb-1">Pending</p>
            <p className="text-2xl font-bold text-blue-400">
              {proposals.filter(p => p.status === 'pending').length}
            </p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <p className="text-dark-400 text-sm mb-1">Draft</p>
            <p className="text-2xl font-bold text-yellow-400">
              {proposals.filter(p => p.status === 'draft').length}
            </p>
          </div>
        </div>

        {/* Proposals Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : sortedProposals.length === 0 ? (
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-12 text-center">
            <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Proposals Found</h3>
            <p className="text-dark-400 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create a new visit and run the pipeline to generate contract proposals'}
            </p>
            <Link
              href="/visits/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              Create New Proposal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProposals.map(proposal => (
              <div
                key={proposal.id}
                className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden hover:border-dark-600 transition-colors"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-dark-700/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <span className="text-primary-400 font-semibold">
                          {proposal.client?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {proposal.client?.full_name || 'Unknown Client'}
                        </h3>
                        <p className="text-sm text-dark-400">
                          {proposal.contract_number || `Proposal #${proposal.id.slice(0, 8)}`}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[proposal.status] || statusColors.draft}`}>
                      {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-dark-300 line-clamp-1">{proposal.title}</p>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-dark-400">Rate:</span>
                    <span className="text-white font-medium">
                      {formatCurrency(proposal.hourly_rate)}/hr
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-dark-400">Hours:</span>
                    <span className="text-white font-medium">
                      {proposal.weekly_hours || 0} hrs/week
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-dark-400">Updated:</span>
                    <span className="text-white">
                      {formatDate(proposal.updated_at)}
                    </span>
                  </div>
                  {proposal.services && proposal.services.length > 0 && (
                    <div className="flex items-start gap-3 text-sm">
                      <FileText className="w-4 h-4 text-orange-400 mt-0.5" />
                      <span className="text-dark-400">Services:</span>
                      <span className="text-white flex-1 line-clamp-2">
                        {proposal.services.map(s => s.name || s).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer - Actions */}
                <div className="p-4 bg-dark-900/50 border-t border-dark-700/50 flex gap-2">
                  <button
                    onClick={() => handleViewProposal(proposal)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleViewProposal(proposal)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleExportPDF(proposal)}
                    disabled={exporting === proposal.id}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    {exporting === proposal.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
