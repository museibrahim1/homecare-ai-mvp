'use client';

import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Mail, MailOpen, MessageSquare, Phone, MapPin, Star,
  Filter, Search, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Check, X, Send, Clock, ArrowUpDown, Download, Upload,
  Target, TrendingUp, Users, Calendar, ExternalLink, Eye,
  CheckCircle2, Circle, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Lead {
  id: string;
  provider_name: string;
  state: string;
  city: string | null;
  phone: string | null;
  ownership_type: string | null;
  years_in_operation: number | null;
  star_rating: string | null;
  status: string;
  priority: string;
  contact_email: string | null;
  contact_name: string | null;
  email_send_count: number;
  email_open_count: number;
  last_email_sent_at: string | null;
  is_contacted: boolean;
  is_converted: boolean;
  campaign_tag: string | null;
  created_at: string | null;
}

interface LeadDetail {
  id: string;
  provider_name: string;
  state: string;
  city: string | null;
  address: string | null;
  zip_code: string | null;
  phone: string | null;
  ownership_type: string | null;
  ccn: string | null;
  certification_date: string | null;
  years_in_operation: number | null;
  star_rating: string | null;
  offers_nursing: boolean;
  offers_pt: boolean;
  offers_ot: boolean;
  offers_speech: boolean;
  offers_social: boolean;
  offers_aide: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_title: string | null;
  website: string | null;
  status: string;
  priority: string;
  notes: string | null;
  last_email_sent_at: string | null;
  last_email_subject: string | null;
  email_send_count: number;
  email_open_count: number;
  last_email_opened_at: string | null;
  last_response_at: string | null;
  campaign_tag: string | null;
  source: string | null;
  is_contacted: boolean;
  is_converted: boolean;
  activity_log: any[];
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  email_sent: number;
  email_opened: number;
  responded: number;
  converted: number;
  not_interested: number;
  no_response: number;
  nebraska_count: number;
  iowa_count: number;
  last_5_years: number;
  last_10_years: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: 'New', color: 'bg-slate-500/20 text-slate-300', icon: Circle },
  contacted: { label: 'Contacted', color: 'bg-blue-500/20 text-blue-400', icon: Phone },
  email_sent: { label: 'Email Sent', color: 'bg-indigo-500/20 text-indigo-400', icon: Mail },
  email_opened: { label: 'Opened', color: 'bg-purple-500/20 text-purple-400', icon: MailOpen },
  responded: { label: 'Responded', color: 'bg-emerald-500/20 text-emerald-400', icon: MessageSquare },
  meeting_scheduled: { label: 'Meeting', color: 'bg-cyan-500/20 text-cyan-400', icon: Calendar },
  demo_given: { label: 'Demo Given', color: 'bg-amber-500/20 text-amber-400', icon: Eye },
  negotiating: { label: 'Negotiating', color: 'bg-orange-500/20 text-orange-400', icon: TrendingUp },
  converted: { label: 'Converted', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
  not_interested: { label: 'Not Interested', color: 'bg-red-500/20 text-red-400', icon: X },
  no_response: { label: 'No Response', color: 'bg-gray-500/20 text-gray-400', icon: Clock },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-500/10 border-red-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

export default function SalesLeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    state: '',
    status: '',
    priority: '',
    ownership: '',
    search: '',
    max_years: '',
    contacted: '',
    has_email: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('years_in_operation');
  const [sortOrder, setSortOrder] = useState('asc');

  // Email compose
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', to: '' });

  // Edit fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const getToken = () => getStoredToken();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) { router.push('/login'); return; }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const user = await res.json();
          if (user.role === 'admin' && user.email?.endsWith('@palmtai.com')) {
            setIsAuthorized(true);
            loadData();
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.state) params.set('state', filters.state);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.ownership) params.set('ownership', filters.ownership);
      if (filters.search) params.set('search', filters.search);
      if (filters.max_years) params.set('max_years', filters.max_years);
      if (filters.contacted) params.set('contacted', filters.contacted);
      if (filters.has_email) params.set('has_email', filters.has_email);
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);
      params.set('skip', String(page * pageSize));
      params.set('limit', String(pageSize));

      const [leadsData, statsData] = await Promise.all([
        fetchWithAuth(`/platform/sales/leads?${params}`),
        fetchWithAuth('/platform/sales/leads/stats'),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) loadData();
  }, [filters, sortBy, sortOrder, page]);

  const importCMS = async () => {
    setImporting(true);
    try {
      const result = await fetchWithAuth('/platform/sales/leads/import-cms', {
        method: 'POST',
        body: JSON.stringify({ states: ['NE', 'IA'] }),
      });
      alert(`Imported ${result.imported} leads, ${result.skipped} duplicates skipped`);
      loadData();
    } catch (e: any) {
      alert(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const openLeadDetail = async (id: string) => {
    try {
      const data = await fetchWithAuth(`/platform/sales/leads/${id}`);
      setSelectedLead(data);
      setShowDetail(true);
    } catch (e: any) {
      alert(`Failed to load: ${e.message}`);
    }
  };

  const updateLead = async (id: string, update: any) => {
    try {
      await fetchWithAuth(`/platform/sales/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify(update),
      });
      loadData();
      if (selectedLead?.id === id) {
        const refreshed = await fetchWithAuth(`/platform/sales/leads/${id}`);
        setSelectedLead(refreshed);
      }
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    }
  };

  const sendEmail = async () => {
    if (!selectedLead) return;
    setSendingEmail(true);
    try {
      const result = await fetchWithAuth(`/platform/sales/leads/${selectedLead.id}/send-email`, {
        method: 'POST',
        body: JSON.stringify({
          subject: emailForm.subject,
          html_body: emailForm.body,
          to_email: emailForm.to || selectedLead.contact_email,
        }),
      });
      if (result.success) {
        alert('Email sent!');
        setShowEmailCompose(false);
        setEmailForm({ subject: '', body: '', to: '' });
        const refreshed = await fetchWithAuth(`/platform/sales/leads/${selectedLead.id}`);
        setSelectedLead(refreshed);
        loadData();
      } else {
        alert(`Failed: ${result.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const logAction = async (action: string) => {
    if (!selectedLead) return;
    try {
      await fetchWithAuth(`/platform/sales/leads/${selectedLead.id}/${action}`, { method: 'POST' });
      const refreshed = await fetchWithAuth(`/platform/sales/leads/${selectedLead.id}`);
      setSelectedLead(refreshed);
      loadData();
    } catch (e: any) {
      alert(`Failed: ${e.message}`);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-400" />
              Sales Leads CRM
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Private outbound campaign tracker — NE & IA home care agencies
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadData()}
              className="px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-gray-300 hover:text-white flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={importCMS}
              disabled={importing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Import from CMS'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'New', value: stats.new, color: 'text-slate-300' },
              { label: 'Email Sent', value: stats.email_sent, color: 'text-indigo-400' },
              { label: 'Opened', value: stats.email_opened, color: 'text-purple-400' },
              { label: 'Responded', value: stats.responded, color: 'text-emerald-400' },
              { label: 'Converted', value: stats.converted, color: 'text-green-400' },
              { label: '<5 Yrs', value: stats.last_5_years, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#1a1a2e] border border-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search agencies..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="px-3 py-2 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All States</option>
              <option value="NE">Nebraska</option>
              <option value="IA">Iowa</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Priority</option>
              <option value="high">High (0-5 yrs)</option>
              <option value="medium">Medium (5-10 yrs)</option>
              <option value="low">Low (10+ yrs)</option>
            </select>
            <select
              value={filters.max_years}
              onChange={(e) => setFilters({ ...filters, max_years: e.target.value })}
              className="px-3 py-2 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Any Age</option>
              <option value="5">Last 5 years</option>
              <option value="10">Last 10 years</option>
              <option value="20">Last 20 years</option>
            </select>
            <button
              onClick={() => setFilters({ state: '', status: '', priority: '', ownership: '', search: '', max_years: '', contacted: '', has_email: '' })}
              className="px-3 py-2 text-gray-400 hover:text-white text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      {[
                        { key: 'provider_name', label: 'Agency' },
                        { key: 'city', label: 'Location' },
                        { key: 'years_in_operation', label: 'Age' },
                        { key: 'star_rating', label: 'Rating' },
                        { key: 'status', label: 'Status' },
                        { key: 'email_send_count', label: 'Emails' },
                        { key: '', label: 'Actions' },
                      ].map(({ key, label }) => (
                        <th
                          key={label}
                          onClick={() => key && (() => {
                            if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            else { setSortBy(key); setSortOrder('asc'); }
                          })()}
                          className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${key ? 'cursor-pointer hover:text-white' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {key && sortBy === key && (
                              sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                      const StatusIcon = sc.icon;
                      return (
                        <tr
                          key={lead.id}
                          className="border-b border-gray-800/50 hover:bg-[#12122a] cursor-pointer transition-colors"
                          onClick={() => openLeadDetail(lead.id)}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-white">{lead.provider_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lead.phone && <span className="text-xs text-gray-500">{lead.phone}</span>}
                                <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.low}`}>
                                  {lead.priority}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-gray-300">
                              <MapPin className="w-3 h-3 text-gray-500" />
                              {lead.city}, {lead.state}
                            </div>
                            <p className="text-xs text-gray-500">{lead.ownership_type}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {lead.years_in_operation ? `${lead.years_in_operation.toFixed(1)} yr` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {lead.star_rating && lead.star_rating !== '-' ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-yellow-400">{lead.star_rating}</span>
                              </div>
                            ) : <span className="text-gray-600 text-sm">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-xs">
                              {lead.email_send_count > 0 && (
                                <span className="flex items-center gap-1 text-indigo-400">
                                  <Send className="w-3 h-3" /> {lead.email_send_count}
                                </span>
                              )}
                              {lead.email_open_count > 0 && (
                                <span className="flex items-center gap-1 text-purple-400">
                                  <MailOpen className="w-3 h-3" /> {lead.email_open_count}
                                </span>
                              )}
                              {!lead.email_send_count && <span className="text-gray-600">None</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); openLeadDetail(lead.id); }}
                              className="text-indigo-400 hover:text-indigo-300 text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
                <p className="text-sm text-gray-400">
                  Showing {page * pageSize + 1}–{page * pageSize + leads.length}
                  {stats ? ` of ${stats.total}` : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 bg-[#0a0a1a] border border-gray-700 rounded text-gray-300 text-sm disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={leads.length < pageSize}
                    className="px-3 py-1 bg-[#0a0a1a] border border-gray-700 rounded text-gray-300 text-sm disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Slide-Over */}
        {showDetail && selectedLead && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowDetail(false)} />
            <div className="relative w-full max-w-xl bg-[#12122a] border-l border-gray-700 overflow-y-auto">
              <div className="sticky top-0 bg-[#12122a] border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-white truncate">{selectedLead.provider_name}</h2>
                <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Priority */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedLead.status}
                    onChange={(e) => updateLead(selectedLead.id, { status: e.target.value })}
                    className="px-3 py-1.5 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white text-sm"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedLead.priority}
                    onChange={(e) => updateLead(selectedLead.id, { priority: e.target.value })}
                    className="px-3 py-1.5 bg-[#0a0a1a] border border-gray-700 rounded-lg text-white text-sm"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                {/* Agency Info */}
                <div className="bg-[#0a0a1a] rounded-lg p-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Agency Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Location</span>
                      <p className="text-white">{selectedLead.address}</p>
                      <p className="text-gray-300">{selectedLead.city}, {selectedLead.state} {selectedLead.zip_code}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone</span>
                      <p className="text-white">{selectedLead.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ownership</span>
                      <p className="text-white">{selectedLead.ownership_type || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">CMS CCN</span>
                      <p className="text-white">{selectedLead.ccn || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Certified</span>
                      <p className="text-white">{selectedLead.certification_date || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Age</span>
                      <p className="text-white">{selectedLead.years_in_operation ? `${selectedLead.years_in_operation.toFixed(1)} years` : '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Star Rating</span>
                      <p className="text-white flex items-center gap-1">
                        {selectedLead.star_rating && selectedLead.star_rating !== '-' ? (
                          <><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {selectedLead.star_rating}</>
                        ) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-gray-500 text-sm">Services</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedLead.offers_nursing && <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">Nursing</span>}
                      {selectedLead.offers_pt && <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded">PT</span>}
                      {selectedLead.offers_ot && <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">OT</span>}
                      {selectedLead.offers_speech && <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">Speech</span>}
                      {selectedLead.offers_social && <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded">Social</span>}
                      {selectedLead.offers_aide && <span className="text-xs px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded">Aide</span>}
                    </div>
                  </div>
                </div>

                {/* Contact Info (Editable) */}
                <div className="bg-[#0a0a1a] rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">Contact Info</h3>
                  {['contact_name', 'contact_email', 'contact_title', 'website'].map((field) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm capitalize">{field.replace('contact_', '').replace('_', ' ')}</span>
                      {editingField === field ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateLead(selectedLead.id, { [field]: editValue });
                                setEditingField(null);
                              }
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            className="px-2 py-1 bg-[#1a1a2e] border border-indigo-500 rounded text-white text-sm w-48"
                          />
                          <button onClick={() => { updateLead(selectedLead.id, { [field]: editValue }); setEditingField(null); }}>
                            <Check className="w-4 h-4 text-green-400" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => { setEditingField(field); setEditValue((selectedLead as any)[field] || ''); }}
                          className="text-white text-sm cursor-pointer hover:text-indigo-400"
                        >
                          {(selectedLead as any)[field] || <span className="text-gray-600 italic">Click to add</span>}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Email Actions */}
                <div className="bg-[#0a0a1a] rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">Email Campaign</h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-[#1a1a2e] rounded p-2">
                      <p className="text-indigo-400 font-bold">{selectedLead.email_send_count}</p>
                      <p className="text-gray-500 text-xs">Sent</p>
                    </div>
                    <div className="bg-[#1a1a2e] rounded p-2">
                      <p className="text-purple-400 font-bold">{selectedLead.email_open_count}</p>
                      <p className="text-gray-500 text-xs">Opened</p>
                    </div>
                    <div className="bg-[#1a1a2e] rounded p-2">
                      <p className="text-emerald-400 font-bold">{selectedLead.last_response_at ? 'Yes' : 'No'}</p>
                      <p className="text-gray-500 text-xs">Replied</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEmailCompose(!showEmailCompose)}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-indigo-700"
                    >
                      <Send className="w-4 h-4" /> Send Email
                    </button>
                    <button
                      onClick={() => logAction('log-open')}
                      className="px-3 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-600/30"
                    >
                      <MailOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => logAction('log-response')}
                      className="px-3 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-600/30"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>

                  {showEmailCompose && (
                    <div className="bg-[#1a1a2e] rounded-lg p-3 space-y-2 border border-gray-700">
                      <input
                        placeholder="To (leave empty to use contact email)"
                        value={emailForm.to}
                        onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a0a1a] border border-gray-700 rounded text-white text-sm placeholder-gray-500"
                      />
                      <input
                        placeholder="Subject"
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0a0a1a] border border-gray-700 rounded text-white text-sm placeholder-gray-500"
                      />
                      <textarea
                        placeholder="Email body (HTML)"
                        value={emailForm.body}
                        onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                        rows={5}
                        className="w-full px-3 py-2 bg-[#0a0a1a] border border-gray-700 rounded text-white text-sm placeholder-gray-500 resize-none"
                      />
                      <button
                        onClick={sendEmail}
                        disabled={sendingEmail || !emailForm.subject || !emailForm.body}
                        className="w-full py-2 bg-indigo-600 text-white rounded text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sendingEmail ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-[#0a0a1a] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Notes</h3>
                  <textarea
                    value={selectedLead.notes || ''}
                    onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                    onBlur={() => updateLead(selectedLead.id, { notes: selectedLead.notes })}
                    placeholder="Add notes..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded text-white text-sm placeholder-gray-500 resize-none"
                  />
                </div>

                {/* Activity Log */}
                <div className="bg-[#0a0a1a] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Activity Log</h3>
                  {selectedLead.activity_log && selectedLead.activity_log.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {[...selectedLead.activity_log].reverse().map((entry: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <div>
                            <span className="text-white">{entry.action}</span>
                            {entry.subject && <span className="text-gray-500"> — {entry.subject}</span>}
                            {entry.notes && <span className="text-gray-500"> — {entry.notes}</span>}
                            <p className="text-gray-600">
                              {entry.at ? new Date(entry.at).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">No activity yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
