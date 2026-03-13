'use client';

import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Check, X, Send, Clock, Plus, Trash2,
  Target, TrendingUp, Users, Calendar, Eye,
  CheckCircle2, Circle, AlertCircle, ChevronLeft, ChevronRight,
  DollarSign, Mail, MailOpen, Building2, User, Globe,
  MapPin, Tag, Briefcase, Database, Sparkles,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Investor {
  id: string;
  fund_name: string;
  investor_type: string | null;
  website: string | null;
  focus_sectors: string[];
  focus_stages: string[];
  check_size_display: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  priority: string;
  email_send_count: number;
  email_open_count: number;
  last_email_sent_at: string | null;
  campaign_tag: string | null;
  source: string | null;
  relevance_reason: string | null;
  created_at: string | null;
}

interface InvestorStats {
  total: number;
  has_email: number;
  vc_funds: number;
  angels: number;
  new: number;
  email_sent: number;
  responded: number;
  interested: number;
  contacted: number;
  meeting_scheduled: number;
  passed: number;
  committed: number;
  avg_priority_score: number;
}

const STATUS_OPTIONS = [
  'new', 'researched', 'contacted', 'email_sent', 'responded',
  'meeting_scheduled', 'interested', 'passed', 'committed',
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  new: { label: 'New', color: 'bg-slate-500/20 text-slate-600', icon: Circle },
  researched: { label: 'Researched', color: 'bg-blue-500/20 text-blue-400', icon: Eye },
  contacted: { label: 'Contacted', color: 'bg-indigo-500/20 text-indigo-400', icon: Mail },
  email_sent: { label: 'Email Sent', color: 'bg-violet-500/20 text-violet-400', icon: Send },
  responded: { label: 'Responded', color: 'bg-cyan-500/20 text-cyan-400', icon: MailOpen },
  meeting_scheduled: { label: 'Meeting', color: 'bg-amber-500/20 text-amber-400', icon: Calendar },
  interested: { label: 'Interested', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  passed: { label: 'Passed', color: 'bg-red-500/20 text-red-400', icon: X },
  committed: { label: 'Committed', color: 'bg-green-500/20 text-green-300', icon: DollarSign },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-500/15 border-red-500/30',
  medium: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

const TYPE_OPTIONS = ['vc_fund', 'angel', 'accelerator', 'syndicate'] as const;
const TYPE_LABELS: Record<string, string> = {
  vc_fund: 'VC Fund',
  angel: 'Angel',
  accelerator: 'Accelerator',
  syndicate: 'Syndicate',
};

export default function InvestorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [stats, setStats] = useState<InvestorStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    investor_type: '',
    sector: '',
    has_email: '',
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = investors.length > 0 && investors.every(inv => selectedIds.has(inv.id));

  // Detail panel
  const [detailInvestor, setDetailInvestor] = useState<Investor | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Bulk email modal
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkEmailForm, setBulkEmailForm] = useState({ subject: '', html_body: '' });
  const [bulkEmailSending, setBulkEmailSending] = useState(false);

  // Individual email
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', html_body: '', to_email: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string; subject: string; description: string }[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    fund_name: '',
    investor_type: 'vc_fund',
    website: '',
    focus_sectors: '',
    focus_stages: '',
    check_size_display: '',
    location: '',
    contact_name: '',
    contact_email: '',
    priority: 'medium',
    source: '',
    relevance_reason: '',
  });
  const [creating, setCreating] = useState(false);

  // Bulk status
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');

  // Seeding
  const [seeding, setSeeding] = useState(false);

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
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.investor_type) params.set('investor_type', filters.investor_type);
      if (filters.sector) params.set('sector', filters.sector);
      if (filters.has_email) params.set('has_email', filters.has_email);
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);
      params.set('skip', String(page * pageSize));
      params.set('limit', String(pageSize));

      const [investorData, statsData] = await Promise.all([
        fetchWithAuth(`/platform/investors/?${params}`),
        fetchWithAuth('/platform/investors/stats'),
      ]);
      setInvestors(investorData);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) loadData();
  }, [filters, sortBy, sortDir, page]);

  const loadTemplates = async () => {
    try {
      const data = await fetchWithAuth('/platform/investors/email-templates');
      setEmailTemplates(data);
    } catch { /* ignore */ }
  };

  const loadTemplate = async (templateId: string, target: 'bulk' | 'individual') => {
    try {
      const tmpl = await fetchWithAuth(`/platform/investors/email-templates/${templateId}`);
      if (target === 'bulk') {
        setBulkEmailForm({ subject: tmpl.subject, html_body: tmpl.body });
      } else {
        setEmailForm({ ...emailForm, subject: tmpl.subject, html_body: tmpl.body });
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isAuthorized) loadTemplates();
  }, [isAuthorized]);

  const seedData = async () => {
    if (!confirm('Add 60+ curated investors with contact info? Existing investors will be kept.')) return;
    setSeeding(true);
    try {
      const result = await fetchWithAuth('/platform/investors/seed-data', { method: 'POST' });
      alert(result.message || 'Seed data loaded successfully');
      loadData();
    } catch (e) {
      alert(`Seed failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const data = await fetchWithAuth(`/platform/investors/${id}`);
      setDetailInvestor(data);
      setShowDetail(true);
    } catch (e) {
      alert(`Failed to load: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const updateInvestor = async (id: string, update: Record<string, unknown>) => {
    try {
      await fetchWithAuth(`/platform/investors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(update),
      });
      loadData();
      if (detailInvestor?.id === id) {
        const refreshed = await fetchWithAuth(`/platform/investors/${id}`);
        setDetailInvestor(refreshed);
      }
    } catch (e) {
      alert(`Update failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const deleteInvestor = async (id: string) => {
    if (!confirm('Delete this investor?')) return;
    try {
      await fetchWithAuth(`/platform/investors/${id}`, { method: 'DELETE' });
      setShowDetail(false);
      setDetailInvestor(null);
      loadData();
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const createInvestor = async () => {
    setCreating(true);
    try {
      await fetchWithAuth('/platform/investors/', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          focus_sectors: createForm.focus_sectors ? createForm.focus_sectors.split(',').map(s => s.trim()) : [],
          focus_stages: createForm.focus_stages ? createForm.focus_stages.split(',').map(s => s.trim()) : [],
        }),
      });
      setShowCreate(false);
      setCreateForm({
        fund_name: '', investor_type: 'vc_fund', website: '', focus_sectors: '',
        focus_stages: '', check_size_display: '', location: '', contact_name: '',
        contact_email: '', priority: 'medium', source: '', relevance_reason: '',
      });
      loadData();
    } catch (e) {
      alert(`Create failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const sendIndividualEmail = async () => {
    if (!detailInvestor) return;
    setSendingEmail(true);
    try {
      const result = await fetchWithAuth(`/platform/investors/${detailInvestor.id}/email`, {
        method: 'POST',
        body: JSON.stringify({
          subject: emailForm.subject,
          html_body: emailForm.html_body,
          to_email: emailForm.to_email || undefined,
        }),
      });
      if (result.success !== false) {
        alert('Email sent!');
        setShowEmailCompose(false);
        setEmailForm({ subject: '', html_body: '', to_email: '' });
        const refreshed = await fetchWithAuth(`/platform/investors/${detailInvestor.id}`);
        setDetailInvestor(refreshed);
        loadData();
      } else {
        alert(`Failed: ${result.error}`);
      }
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const sendBulkEmail = async () => {
    if (selectedIds.size === 0) return;
    setBulkEmailSending(true);
    try {
      const result = await fetchWithAuth('/platform/investors/bulk-email', {
        method: 'POST',
        body: JSON.stringify({
          investor_ids: Array.from(selectedIds),
          subject: bulkEmailForm.subject,
          html_body: bulkEmailForm.html_body,
        }),
      });
      alert(result.message || `Bulk email sent to ${result.sent || selectedIds.size} investors`);
      setShowBulkEmail(false);
      setBulkEmailForm({ subject: '', html_body: '' });
      setSelectedIds(new Set());
      loadData();
    } catch (e) {
      alert(`Bulk email failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setBulkEmailSending(false);
    }
  };

  const applyBulkStatus = async () => {
    if (selectedIds.size === 0 || !bulkStatus) return;
    try {
      await fetchWithAuth('/platform/investors/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ investor_ids: Array.from(selectedIds), status: bulkStatus }),
      });
      setShowBulkStatus(false);
      setBulkStatus('');
      setSelectedIds(new Set());
      loadData();
    } catch (e) {
      alert(`Bulk update failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(investors.map(i => i.id)));
    }
  };

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary-500" />
              Investor CRM
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage investor pipeline — track outreach, meetings, and commitments
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={seedData}
              disabled={seeding}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Seed Data
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2 text-sm font-semibold shadow-lg shadow-primary-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Investor
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-slate-900' },
              { label: 'Has Email', value: stats.has_email, color: 'text-emerald-400' },
              { label: 'VC Funds', value: stats.vc_funds, color: 'text-violet-400' },
              { label: 'Angels', value: stats.angels, color: 'text-amber-400' },
              { label: 'New', value: stats.new, color: 'text-slate-600' },
              { label: 'Email Sent', value: stats.email_sent, color: 'text-indigo-400' },
              { label: 'Responded', value: stats.responded, color: 'text-cyan-400' },
              { label: 'Interested', value: stats.interested, color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search investors..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filters.investor_type}
              onChange={(e) => setFilters({ ...filters, investor_type: e.target.value })}
              className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Sector filter..."
              value={filters.sector}
              onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
              className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none w-36"
            />
            <select
              value={filters.has_email}
              onChange={(e) => setFilters({ ...filters, has_email: e.target.value })}
              className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">All Contacts</option>
              <option value="true">Has Email</option>
              <option value="false">No Email</option>
            </select>
            <button
              onClick={() => setFilters({ search: '', status: '', priority: '', investor_type: '', sector: '', has_email: '' })}
              className="px-3 py-2 text-slate-500 hover:text-slate-900 text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-primary-400 font-medium">
              {selectedIds.size} investor{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkStatus(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5" /> Update Status
              </button>
              <button
                onClick={() => setShowBulkEmail(true)}
                className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send Bulk Email
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-900 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Investors Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-primary-500 bg-slate-100"
                        />
                      </th>
                      {[
                        { key: 'fund_name', label: 'Fund Name' },
                        { key: 'investor_type', label: 'Type' },
                        { key: '', label: 'Sectors' },
                        { key: '', label: 'Stages' },
                        { key: 'check_size_display', label: 'Check Size' },
                        { key: 'location', label: 'Location' },
                        { key: 'contact_email', label: 'Contact Email' },
                        { key: 'status', label: 'Status' },
                        { key: 'priority', label: 'Priority' },
                        { key: '', label: 'Actions' },
                      ].map(({ key, label }) => (
                        <th
                          key={label}
                          onClick={() => key && handleSort(key)}
                          className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${key ? 'cursor-pointer hover:text-slate-900' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {key && sortBy === key && (
                              sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {investors.map((inv) => {
                      const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.new;
                      const StatusIcon = sc.icon;
                      return (
                        <tr
                          key={inv.id}
                          className="border-b border-slate-200 hover:bg-white/80 cursor-pointer transition-colors"
                          onClick={() => openDetail(inv.id)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(inv.id)}
                              onChange={() => toggleSelect(inv.id)}
                              className="w-4 h-4 rounded border-slate-300 text-primary-500 bg-slate-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900">{inv.fund_name}</p>
                            {inv.contact_name && (
                              <p className="text-xs text-slate-500 mt-0.5">{inv.contact_name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {inv.investor_type ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/30">
                                {TYPE_LABELS[inv.investor_type] || inv.investor_type}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(inv.focus_sectors || []).slice(0, 3).map((s, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                                  {s}
                                </span>
                              ))}
                              {(inv.focus_sectors || []).length > 3 && (
                                <span className="text-[10px] text-slate-500">+{inv.focus_sectors.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {(inv.focus_stages || []).slice(0, 2).map((s, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  {s}
                                </span>
                              ))}
                              {(inv.focus_stages || []).length > 2 && (
                                <span className="text-[10px] text-slate-500">+{inv.focus_stages.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {inv.check_size_display || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {inv.location ? (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {inv.location}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {inv.contact_email ? (
                              <span className="text-xs text-emerald-400 font-mono">{inv.contact_email}</span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">No email</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[inv.priority] || PRIORITY_COLORS.low}`}>
                              {inv.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); openDetail(inv.id); }}
                              className="text-primary-400 hover:text-primary-600 text-xs"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {investors.length === 0 && !loading && (
                      <tr>
                        <td colSpan={11} className="px-4 py-16 text-center">
                          <Briefcase className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                          <p className="text-slate-600 font-medium">No investors found</p>
                          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or seed some data</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Showing {investors.length > 0 ? page * pageSize + 1 : 0}–{page * pageSize + investors.length}
                  {stats ? ` of ${stats.total}` : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-slate-600 text-sm disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={investors.length < pageSize}
                    className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-slate-600 text-sm disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========== DETAIL SLIDE-OVER ========== */}
        {showDetail && detailInvestor && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowDetail(false)} />
            <div className="relative w-full max-w-xl bg-slate-50 border-l border-slate-200 overflow-y-auto">
              <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-slate-900 truncate">{detailInvestor.fund_name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteInvestor(detailInvestor.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Delete investor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowDetail(false)} className="text-slate-500 hover:text-slate-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Priority */}
                <div className="flex items-center gap-3">
                  <select
                    value={detailInvestor.status}
                    onChange={(e) => updateInvestor(detailInvestor.id, { status: e.target.value })}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                    ))}
                  </select>
                  <select
                    value={detailInvestor.priority}
                    onChange={(e) => updateInvestor(detailInvestor.id, { priority: e.target.value })}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                {/* Fund Info */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Fund Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Type</span>
                      <p className="text-slate-900">{TYPE_LABELS[detailInvestor.investor_type || ''] || detailInvestor.investor_type || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Check Size</span>
                      <p className="text-slate-900">{detailInvestor.check_size_display || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location</span>
                      <p className="text-slate-900">{detailInvestor.location || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Source</span>
                      <p className="text-slate-900">{detailInvestor.source || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Website</span>
                      {detailInvestor.website ? (
                        <a href={detailInvestor.website} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Visit
                        </a>
                      ) : (
                        <p className="text-slate-900">—</p>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500">Campaign</span>
                      <p className="text-slate-900">{detailInvestor.campaign_tag || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Sectors & Stages */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-500">Focus Areas</h3>
                  <div>
                    <span className="text-slate-500 text-xs">Sectors</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(detailInvestor.focus_sectors || []).length > 0 ? detailInvestor.focus_sectors.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded border border-primary-500/20">{s}</span>
                      )) : <span className="text-slate-500 text-xs italic">None specified</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Stages</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(detailInvestor.focus_stages || []).length > 0 ? detailInvestor.focus_stages.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">{s}</span>
                      )) : <span className="text-slate-500 text-xs italic">None specified</span>}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-500">Contact</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Name</span>
                      <p className="text-slate-900 flex items-center gap-1"><User className="w-3 h-3 text-slate-500" />{detailInvestor.contact_name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Email</span>
                      <p className="text-slate-900 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-500" />{detailInvestor.contact_email || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Relevance */}
                {detailInvestor.relevance_reason && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Relevance</h3>
                    <p className="text-sm text-slate-600">{detailInvestor.relevance_reason}</p>
                  </div>
                )}

                {/* Email Actions */}
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-500">Email Activity</h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-slate-100 rounded p-2">
                      <p className="text-indigo-400 font-bold">{detailInvestor.email_send_count}</p>
                      <p className="text-slate-500 text-xs">Sent</p>
                    </div>
                    <div className="bg-slate-100 rounded p-2">
                      <p className="text-purple-400 font-bold">{detailInvestor.email_open_count}</p>
                      <p className="text-slate-500 text-xs">Opened</p>
                    </div>
                    <div className="bg-slate-100 rounded p-2">
                      <p className="text-slate-600 font-bold text-xs">
                        {detailInvestor.last_email_sent_at ? new Date(detailInvestor.last_email_sent_at).toLocaleDateString() : '—'}
                      </p>
                      <p className="text-slate-500 text-xs">Last Sent</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEmailCompose(!showEmailCompose)}
                    className="w-full px-3 py-2 bg-primary-500 text-white rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-primary-600"
                  >
                    <Send className="w-4 h-4" /> Send Email
                  </button>

                  {showEmailCompose && (
                    <div className="bg-slate-100 rounded-lg p-3 space-y-2 border border-slate-300">
                      {emailTemplates.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {emailTemplates.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => loadTemplate(t.id, 'individual')}
                              className="px-2 py-1 bg-primary-500/10 border border-primary-500/30 rounded text-primary-400 text-xs hover:bg-primary-500/20 flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" /> {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <input
                        placeholder="To (leave empty to use contact email)"
                        value={emailForm.to_email}
                        onChange={(e) => setEmailForm({ ...emailForm, to_email: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm placeholder-slate-400"
                      />
                      <input
                        placeholder="Subject"
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm placeholder-slate-400"
                      />
                      <textarea
                        placeholder="Email body (HTML) — use {fund_name} and {contact_name} for personalization"
                        value={emailForm.html_body}
                        onChange={(e) => setEmailForm({ ...emailForm, html_body: e.target.value })}
                        rows={5}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm placeholder-slate-400 resize-none"
                      />
                      <button
                        onClick={sendIndividualEmail}
                        disabled={sendingEmail || !emailForm.subject || !emailForm.html_body}
                        className="w-full py-2 bg-primary-500 text-white rounded text-sm flex items-center justify-center gap-2 hover:bg-primary-600 disabled:opacity-50"
                      >
                        {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sendingEmail ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Timeline</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created</span>
                      <span className="text-slate-600">{detailInvestor.created_at ? new Date(detailInvestor.created_at).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Email</span>
                      <span className="text-slate-600">{detailInvestor.last_email_sent_at ? new Date(detailInvestor.last_email_sent_at).toLocaleString() : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== BULK EMAIL MODAL ========== */}
        {showBulkEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBulkEmail(false)} />
            <div className="relative w-full max-w-lg bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
              <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Send className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Bulk Email</h2>
                    <p className="text-xs text-slate-500">Send to {selectedIds.size} selected investor{selectedIds.size > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkEmail(false)} className="text-slate-500 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {emailTemplates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {emailTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => loadTemplate(t.id, 'bulk')}
                        className="px-3 py-1.5 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-400 text-xs font-medium hover:bg-primary-500/20 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" /> {t.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                    Personalization: <code className="text-primary-400">{'{fund_name}'}</code> and <code className="text-primary-400">{'{contact_name}'}</code> are auto-replaced per investor.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Subject</label>
                  <input
                    value={bulkEmailForm.subject}
                    onChange={(e) => setBulkEmailForm({ ...bulkEmailForm, subject: e.target.value })}
                    placeholder="e.g., Partnership Opportunity — {fund_name}"
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Email Body (HTML)</label>
                  <textarea
                    value={bulkEmailForm.html_body}
                    onChange={(e) => setBulkEmailForm({ ...bulkEmailForm, html_body: e.target.value })}
                    placeholder="<p>Hi {contact_name},</p><p>...</p>"
                    rows={8}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none resize-none font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-4 flex justify-between">
                <button
                  onClick={() => setShowBulkEmail(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-900 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={sendBulkEmail}
                  disabled={bulkEmailSending || !bulkEmailForm.subject || !bulkEmailForm.html_body}
                  className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
                >
                  {bulkEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {bulkEmailSending ? 'Sending...' : `Send to ${selectedIds.size} Investors`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== BULK STATUS MODAL ========== */}
        {showBulkStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBulkStatus(false)} />
            <div className="relative w-full max-w-sm bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">Update Status</h2>
                <p className="text-xs text-slate-500 mt-1">Apply to {selectedIds.size} selected investor{selectedIds.size > 1 ? 's' : ''}</p>
              </div>
              <div className="p-6">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Select status...</option>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                  ))}
                </select>
              </div>
              <div className="border-t border-slate-200 px-6 py-4 flex justify-between">
                <button
                  onClick={() => setShowBulkStatus(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-900 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={applyBulkStatus}
                  disabled={!bulkStatus}
                  className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-semibold disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== CREATE INVESTOR MODAL ========== */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-lg">
              <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-violet-500 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Add Investor</h2>
                    <p className="text-xs text-slate-500">Create a new investor record</p>
                  </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Fund Name *</label>
                  <input
                    value={createForm.fund_name}
                    onChange={(e) => setCreateForm({ ...createForm, fund_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                    placeholder="e.g., Sequoia Capital"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Type</label>
                    <select
                      value={createForm.investor_type}
                      onChange={(e) => setCreateForm({ ...createForm, investor_type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-primary-500 focus:outline-none"
                    >
                      {TYPE_OPTIONS.map(t => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Priority</label>
                    <select
                      value={createForm.priority}
                      onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-primary-500 focus:outline-none"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Contact Name</label>
                    <input
                      value={createForm.contact_name}
                      onChange={(e) => setCreateForm({ ...createForm, contact_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Contact Email</label>
                    <input
                      value={createForm.contact_email}
                      onChange={(e) => setCreateForm({ ...createForm, contact_email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                      placeholder="john@fund.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Location</label>
                    <input
                      value={createForm.location}
                      onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Check Size</label>
                    <input
                      value={createForm.check_size_display}
                      onChange={(e) => setCreateForm({ ...createForm, check_size_display: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                      placeholder="$500K - $2M"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Website</label>
                  <input
                    value={createForm.website}
                    onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                    placeholder="https://fund.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Focus Sectors (comma-separated)</label>
                  <input
                    value={createForm.focus_sectors}
                    onChange={(e) => setCreateForm({ ...createForm, focus_sectors: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                    placeholder="Healthcare, AI, SaaS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Focus Stages (comma-separated)</label>
                  <input
                    value={createForm.focus_stages}
                    onChange={(e) => setCreateForm({ ...createForm, focus_stages: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                    placeholder="Seed, Series A, Series B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Source</label>
                  <input
                    value={createForm.source}
                    onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none"
                    placeholder="e.g., Crunchbase, referral, conference"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Relevance Reason</label>
                  <textarea
                    value={createForm.relevance_reason}
                    onChange={(e) => setCreateForm({ ...createForm, relevance_reason: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-primary-500 focus:outline-none resize-none"
                    placeholder="Why is this investor relevant?"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-4 flex justify-between">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-500 hover:text-slate-900 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createInvestor}
                  disabled={creating || !createForm.fund_name}
                  className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Investor'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
