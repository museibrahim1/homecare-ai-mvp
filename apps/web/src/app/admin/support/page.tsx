'use client';

import { getStoredToken, useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ticket, Shield, Loader2, RefreshCw, Search, MessageSquare,
  Clock, CheckCircle, AlertCircle, User, Send, X, Filter, ArrowLeft,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface TicketSummary {
  id: string;
  ticket_number: string;
  subject: string;
  business_name: string | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

interface TicketDetail {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  business_name: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  responses: Array<{
    id: string;
    message: string;
    responder_name: string | null;
    responder_email: string;
    is_admin: boolean;
    created_at: string;
  }>;
  created_at: string;
  first_response_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-50 text-amber-600',
  in_progress: 'bg-blue-50 text-blue-600',
  waiting_on_customer: 'bg-purple-50 text-purple-600',
  resolved: 'bg-emerald-50 text-emerald-600',
  closed: 'bg-slate-200/20 text-slate-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export default function SupportTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [responseText, setResponseText] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          if (user.role === 'admin' && (user.email.endsWith('@palmtai.com'))) {
            setIsAuthorized(true);
            fetchTickets();
          } else {
            router.push('/visits');
          }
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const fetchTickets = async () => {
    setLoading(true);
    const token = getStoredToken();
    
    let url = `${API_BASE}/platform/support/tickets`;
    const params = [];
    if (filter.status) params.push(`status=${filter.status}`);
    if (filter.priority) params.push(`priority=${filter.priority}`);
    if (params.length) url += `?${params.join('&')}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setTickets(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetail = async (id: string) => {
    setDetailLoading(true);
    const token = getStoredToken();

    try {
      const response = await fetch(`${API_BASE}/platform/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSelectedTicket(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ticket detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const sendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;
    
    setSendingResponse(true);
    const token = getStoredToken();

    try {
      const response = await fetch(`${API_BASE}/platform/support/tickets/${selectedTicket.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: responseText }),
      });
      
      if (response.ok) {
        setResponseText('');
        fetchTicketDetail(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to send response:', err);
      setError(err instanceof Error ? err.message : 'Failed to send response');
    } finally {
      setSendingResponse(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;
    const token = getStoredToken();

    try {
      await fetch(`${API_BASE}/platform/support/tickets/${selectedTicket.id}/status?new_status=${status}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTicketDetail(selectedTicket.id);
      fetchTickets();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchTickets();
  }, [filter.status, filter.priority, isAuthorized]);

  const paginatedTickets = tickets.slice(page * pageSize, (page + 1) * pageSize);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-600 font-medium">Support Ticket Management</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Handle support requests from businesses. No client data is shared in tickets.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
              <p className="text-slate-500 mt-1">Manage support requests</p>
            </div>
          </div>
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="p-2 bg-white rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-red-600 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-300 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filter.status}
            onChange={e => { setFilter({ ...filter, status: e.target.value }); setPage(0); }}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_customer">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filter.priority}
            onChange={e => { setFilter({ ...filter, priority: e.target.value }); setPage(0); }}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[calc(100vh-300px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-20">
                <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No tickets found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {paginatedTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => fetchTicketDetail(ticket.id)}
                    className={`p-4 hover:bg-slate-100 cursor-pointer transition ${
                      selectedTicket?.id === ticket.id ? 'bg-slate-100' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-slate-400 text-xs font-mono">{ticket.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-slate-900 text-sm font-medium truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</span>
                      <span>{ticket.business_name || 'Unknown'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tickets.length > pageSize && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-slate-500 text-sm">
                  Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, tickets.length)} of {tickets.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </button>
                  <span className="text-slate-500 px-3 text-sm">Page {page + 1}</span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= tickets.length}
                    className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ticket Detail */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-300px)]">
            {detailLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : selectedTicket ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-mono mb-1">{selectedTicket.ticket_number}</p>
                      <h2 className="text-lg font-medium text-slate-900">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span>{selectedTicket.business_name || 'No Business'}</span>
                        <span className={PRIORITY_COLORS[selectedTicket.priority]}>
                          {selectedTicket.priority} priority
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={e => updateStatus(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting_on_customer">Waiting</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Original Message */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-900 text-sm font-medium">
                        {selectedTicket.submitted_by_name || selectedTicket.submitted_by_email}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {new Date(selectedTicket.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  {/* Responses */}
                  {selectedTicket.responses.map(response => (
                    <div
                      key={response.id}
                      className={`p-4 rounded-lg ${
                        response.is_admin 
                          ? 'bg-primary-50 border border-primary-200 ml-8' 
                          : 'bg-slate-50 mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className={`w-4 h-4 ${response.is_admin ? 'text-primary-400' : 'text-slate-500'}`} />
                        <span className={`text-sm font-medium ${response.is_admin ? 'text-primary-400' : 'text-white'}`}>
                          {response.responder_name || response.responder_email}
                          {response.is_admin && ' (Support)'}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {new Date(response.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm whitespace-pre-wrap">{response.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                <div className="p-4 border-t border-slate-200">
                  <div className="flex gap-3">
                    <textarea
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      placeholder="Type your response..."
                      rows={3}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 resize-none"
                    />
                    <button
                      onClick={sendResponse}
                      disabled={sendingResponse || !responseText.trim()}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 self-end"
                    >
                      {sendingResponse ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-500">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a ticket to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
