'use client';

import DOMPurify from 'dompurify';
import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, MailOpen, MessageSquare, Phone, MapPin, Star,
  Search, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Check, X, Send, Clock,
  Target, TrendingUp, Users, Calendar, Eye,
  CheckCircle2, Circle, AlertCircle, ChevronLeft, ChevronRight,
  Rocket, Sparkles, FileText, Zap, BarChart3, Play, Activity, Database,
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
  activity_log: { action: string; subject?: string; notes?: string; at?: string }[];
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
  has_email: number;
  has_website: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  body: string;
  sequence_day?: number;
}

interface CampaignPreview {
  total_recipients: number;
  sample: { provider_name: string; city: string; state: string; contact_email: string }[];
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  warm_open: Mail,
  pattern_interrupt: Zap,
  aspiration: Sparkles,
  proof_point: TrendingUp,
  graceful_exit: Send,
};

const TEMPLATE_COLORS: Record<string, string> = {
  warm_open: 'from-amber-500 to-orange-400',
  pattern_interrupt: 'from-violet-500 to-fuchsia-500',
  aspiration: 'from-indigo-500 to-purple-500',
  proof_point: 'from-emerald-500 to-cyan-500',
  graceful_exit: 'from-slate-500 to-gray-500',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  new: { label: 'New', color: 'bg-slate-500/20 text-slate-600', icon: Circle },
  contacted: { label: 'Contacted', color: 'bg-blue-50 text-blue-600', icon: Phone },
  email_sent: { label: 'Email Sent', color: 'bg-indigo-50 text-indigo-600', icon: Mail },
  email_opened: { label: 'Opened', color: 'bg-purple-50 text-purple-600', icon: MailOpen },
  responded: { label: 'Responded', color: 'bg-emerald-50 text-emerald-400', icon: MessageSquare },
  meeting_scheduled: { label: 'Meeting', color: 'bg-cyan-50 text-cyan-600', icon: Calendar },
  demo_given: { label: 'Demo Given', color: 'bg-amber-50 text-amber-600', icon: Eye },
  negotiating: { label: 'Negotiating', color: 'bg-orange-50 text-orange-600', icon: TrendingUp },
  converted: { label: 'Converted', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  not_interested: { label: 'Not Interested', color: 'bg-red-50 text-red-600', icon: X },
  no_response: { label: 'No Response', color: 'bg-gray-500/20 text-slate-500', icon: Clock },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
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
  const [sortBy, setSortBy] = useState('years_in_operation');
  const [sortOrder, setSortOrder] = useState('asc');

  // Email compose
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', to: '' });

  // Campaign launcher
  const [showCampaign, setShowCampaign] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignFilters, setCampaignFilters] = useState({
    state: '',
    priority: '',
    max_years: '',
    exclude_already_emailed: true,
  });
  const [campaignPreview, setCampaignPreview] = useState<CampaignPreview | null>(null);
  const [previewHtml, setPreviewHtml] = useState({ subject: '', body: '' });
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{ message?: string; sent?: number; failed?: number; errors?: { lead: string; error: string }[]; error?: string } | null>(null);
  const [campaignStep, setCampaignStep] = useState(0);

  const [activeTab, setActiveTab] = useState<'leads' | 'analytics' | 'sequences'>('leads');

  interface AnalyticsData {
    totals?: {
      total_sent: number;
      total_delivered: number;
      total_opened: number;
      total_clicked: number;
      total_replied: number;
      total_bounced: number;
      overall_open_rate: number;
      overall_click_rate: number;
      overall_reply_rate: number;
    };
    funnel?: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      replied: number;
      meeting_scheduled: number;
      converted: number;
    };
    per_template?: {
      template_id: string;
      name: string;
      sequence_day: number;
      sent: number;
      opened: number;
      open_rate: number;
      clicked: number;
      replied: number;
      reply_rate: number;
      bounced: number;
    }[];
  }
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);

  interface SequenceStatus {
    total_in_sequence: number;
    completed_sequences: number;
    pending_send_now: number;
    step_breakdown?: Record<string, number>;
  }
  const [sequenceStatus, setSequenceStatus] = useState<SequenceStatus | null>(null);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [sequenceLaunching, setSequenceLaunching] = useState(false);
  const [sequenceProcessing, setSequenceProcessing] = useState(false);
  const [sequenceResult, setSequenceResult] = useState<{ message?: string; sent?: number; failed?: number; skipped?: number; sequences_completed?: number; error?: string } | null>(null);
  const [showSequenceLauncher, setShowSequenceLauncher] = useState(false);
  const [sequenceFilters, setSequenceFilters] = useState({
    campaign_name: `sequence-${new Date().toISOString().slice(0, 10)}`,
    state: '',
    priority: '',
    max_years: '',
    exclude_already_emailed: true,
  });

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) loadData();
  }, [filters, sortBy, sortOrder, page]);

  const importCMS = async (allStates = false) => {
    if (allStates && !confirm('Import agencies from ALL 50+ US states? This may take a minute.')) return;
    setImporting(true);
    try {
      const result = await fetchWithAuth('/platform/sales/leads/import-cms', {
        method: 'POST',
        body: JSON.stringify(allStates
          ? { all_states: true, exclude_government: true, limit_per_state: 1000 }
          : { states: ['NE', 'IA'], exclude_government: true, limit_per_state: 1000 }
        ),
      });
      alert(`Imported ${result.imported} new leads from ${result.total_states || '?'} states.\n${result.skipped} duplicates skipped, ${result.government_excluded || 0} government agencies excluded.`);
      loadData();
    } catch (e) {
      alert(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const cleanupNoEmail = async () => {
    if (!confirm('Remove ALL leads without email addresses? This cannot be undone.')) return;
    try {
      const result = await fetchWithAuth('/platform/sales/leads/cleanup-no-email', { method: 'DELETE' });
      alert(result.message || `Removed ${result.deleted} leads`);
      loadData();
    } catch (e) {
      alert(`Cleanup failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const seedAgencies = async () => {
    if (!confirm('Seed 163 home care agencies with verified emails across 48 US states?')) return;
    setImporting(true);
    try {
      const result = await fetchWithAuth('/platform/sales/leads/seed-agencies', { method: 'POST' });
      alert(result.message || `Added ${result.imported} agencies`);
      loadData();
    } catch (e) {
      alert(`Seed failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const openLeadDetail = async (id: string) => {
    try {
      const data = await fetchWithAuth(`/platform/sales/leads/${id}`);
      setSelectedLead(data);
      setShowDetail(true);
    } catch (e) {
      alert(`Failed to load: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const updateLead = async (id: string, update: Record<string, unknown>) => {
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
    } catch (e) {
      alert(`Update failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
    } catch (e) {
      alert(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const openCampaign = async () => {
    setShowCampaign(true);
    setCampaignStep(0);
    setSelectedTemplate(null);
    setCampaignResult(null);
    setCampaignName(`campaign-${new Date().toISOString().slice(0, 10)}`);
    try {
      const data = await fetchWithAuth('/platform/sales/leads/email-templates');
      setTemplates(data);
    } catch (e) {
      alert(`Failed to load templates: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const loadCampaignPreview = async () => {
    const params = new URLSearchParams();
    params.set('template_id', selectedTemplate?.id || '');
    params.set('campaign_name', campaignName);
    if (campaignFilters.state) params.set('state', campaignFilters.state);
    if (campaignFilters.priority) params.set('priority', campaignFilters.priority);
    if (campaignFilters.max_years) params.set('max_years', campaignFilters.max_years);
    params.set('exclude_already_emailed', String(campaignFilters.exclude_already_emailed));

    try {
      const [preview, rendered] = await Promise.all([
        fetchWithAuth(`/platform/sales/leads/campaigns/send/preview?${params}`),
        fetchWithAuth(`/platform/sales/leads/email-templates/${selectedTemplate?.id}/preview`, {
          method: 'POST',
          body: JSON.stringify({}),
        }),
      ]);
      setCampaignPreview(preview);
      setPreviewHtml(rendered);
    } catch (e) {
      alert(`Preview failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const sendCampaign = async () => {
    if (!selectedTemplate) return;
    setCampaignSending(true);
    setCampaignResult(null);
    try {
      const result = await fetchWithAuth('/platform/sales/leads/campaigns/send', {
        method: 'POST',
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          campaign_name: campaignName,
          state: campaignFilters.state || null,
          priority: campaignFilters.priority || null,
          max_years: campaignFilters.max_years ? parseFloat(campaignFilters.max_years) : null,
          exclude_already_emailed: campaignFilters.exclude_already_emailed,
          has_email: true,
        }),
      });
      setCampaignResult(result);
      setCampaignStep(3);
      loadData();
    } catch (e) {
      setCampaignResult({ error: e instanceof Error ? e.message : 'Campaign failed' });
      setCampaignStep(3);
    } finally {
      setCampaignSending(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await fetchWithAuth(`/platform/sales/leads/campaigns/analytics?days=${analyticsDays}`);
      setAnalyticsData(data);
    } catch {
      // Analytics load is non-critical; silently continue
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadSequenceStatus = async () => {
    setSequenceLoading(true);
    try {
      const data = await fetchWithAuth('/platform/sales/leads/campaigns/sequence/status');
      setSequenceStatus(data);
    } catch {
      // Sequence status load is non-critical; silently continue
    } finally {
      setSequenceLoading(false);
    }
  };

  const launchSequence = async () => {
    setSequenceLaunching(true);
    setSequenceResult(null);
    try {
      const result = await fetchWithAuth('/platform/sales/leads/campaigns/sequence/launch', {
        method: 'POST',
        body: JSON.stringify({
          campaign_name: sequenceFilters.campaign_name,
          state: sequenceFilters.state || null,
          priority: sequenceFilters.priority || null,
          max_years: sequenceFilters.max_years ? parseFloat(sequenceFilters.max_years) : null,
          exclude_already_emailed: sequenceFilters.exclude_already_emailed,
        }),
      });
      setSequenceResult(result);
      loadSequenceStatus();
      loadData();
    } catch (e) {
      setSequenceResult({ error: e instanceof Error ? e.message : 'Launch failed' });
    } finally {
      setSequenceLaunching(false);
    }
  };

  const processScheduledEmails = async () => {
    setSequenceProcessing(true);
    try {
      const result = await fetchWithAuth('/platform/sales/leads/campaigns/sequence/process', { method: 'POST' });
      setSequenceResult(result);
      loadSequenceStatus();
      loadData();
    } catch (e) {
      alert(`Process failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSequenceProcessing(false);
    }
  };

  useEffect(() => {
    if (isAuthorized && activeTab === 'analytics') loadAnalytics();
  }, [activeTab, analyticsDays]);

  useEffect(() => {
    if (isAuthorized && activeTab === 'sequences') loadSequenceStatus();
  }, [activeTab]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
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
              <Target className="w-6 h-6 text-indigo-600" />
              Sales Leads CRM
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Private outbound campaign tracker — home care agencies across all US states
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { if (activeTab === 'leads') loadData(); else if (activeTab === 'analytics') loadAnalytics(); else loadSequenceStatus(); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => importCMS(true)}
              disabled={importing}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Import All States'}
            </button>
            <button
              onClick={seedAgencies}
              disabled={importing}
              className="px-3 py-2 bg-white border border-emerald-800/50 rounded-lg text-emerald-400 hover:text-emerald-600 hover:border-emerald-700 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Seed 163 Agencies
            </button>
            <button
              onClick={cleanupNoEmail}
              className="px-3 py-2 bg-white border border-red-800/50 rounded-lg text-red-400 hover:text-red-600 hover:border-red-700 flex items-center gap-2 text-sm"
            >
              <X className="w-4 h-4" />
              Remove No-Email
            </button>
            <button
              onClick={() => { setShowSequenceLauncher(true); setSequenceResult(null); }}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 flex items-center gap-2 text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Rocket className="w-4 h-4" />
              Send All Emails
            </button>
            <button
              onClick={openCampaign}
              className="px-4 py-2.5 bg-white text-[#0d0d1f] rounded-lg hover:bg-gray-100 flex items-center gap-2 text-sm font-semibold shadow-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Single Email
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white border border-slate-200 rounded-lg p-1 w-fit">
          {([
            { id: 'leads' as const, label: 'Leads', icon: Users },
            { id: 'analytics' as const, label: 'Campaign Analytics', icon: BarChart3 },
            { id: 'sequences' as const, label: 'Email Sequences', icon: Activity },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === id
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ========== LEADS TAB ========== */}
        {activeTab === 'leads' && (<>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-slate-900' },
              { label: 'Has Email', value: stats.has_email, color: 'text-emerald-400' },
              { label: 'Email Sent', value: stats.email_sent, color: 'text-indigo-600' },
              { label: 'Opened', value: stats.email_opened, color: 'text-purple-600' },
              { label: 'Responded', value: stats.responded, color: 'text-emerald-400' },
              { label: 'Converted', value: stats.converted, color: 'text-emerald-600' },
              { label: '<5 Yrs', value: stats.last_5_years, color: 'text-red-600' },
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search agencies..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All States</option>
              <option value="NE">Nebraska</option>
              <option value="IA">Iowa</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Priority</option>
              <option value="high">High (0-5 yrs)</option>
              <option value="medium">Medium (5-10 yrs)</option>
              <option value="low">Low (10+ yrs)</option>
            </select>
            <select
              value={filters.max_years}
              onChange={(e) => setFilters({ ...filters, max_years: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Any Age</option>
              <option value="5">Last 5 years</option>
              <option value="10">Last 10 years</option>
              <option value="20">Last 20 years</option>
            </select>
            <select
              value={filters.has_email}
              onChange={(e) => setFilters({ ...filters, has_email: e.target.value })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Contacts</option>
              <option value="true">Has Email</option>
              <option value="false">No Email</option>
            </select>
            <button
              onClick={() => setFilters({ state: '', status: '', priority: '', ownership: '', search: '', max_years: '', contacted: '', has_email: '' })}
              className="px-3 py-2 text-slate-500 hover:text-slate-900 text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
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
                          className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${key ? 'cursor-pointer hover:text-slate-900' : ''}`}
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
                          className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => openLeadDetail(lead.id)}
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-900">{lead.provider_name}</p>
                                {lead.contact_email ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <Mail className="w-2.5 h-2.5" /> email
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/15 text-slate-400 border border-slate-300">
                                    <Phone className="w-2.5 h-2.5" /> phone only
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lead.phone && <span className="text-xs text-slate-400">{lead.phone}</span>}
                                <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[lead.priority] || PRIORITY_COLORS.low}`}>
                                  {lead.priority}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {lead.city}, {lead.state}
                            </div>
                            <p className="text-xs text-slate-400">{lead.ownership_type}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {lead.years_in_operation ? `${lead.years_in_operation.toFixed(1)} yr` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {lead.star_rating && lead.star_rating !== '-' ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="w-3 h-3 text-amber-600 fill-yellow-400" />
                                <span className="text-amber-600">{lead.star_rating}</span>
                              </div>
                            ) : <span className="text-slate-500 text-sm">—</span>}
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
                                <span className="flex items-center gap-1 text-indigo-600">
                                  <Send className="w-3 h-3" /> {lead.email_send_count}
                                </span>
                              )}
                              {lead.email_open_count > 0 && (
                                <span className="flex items-center gap-1 text-purple-600">
                                  <MailOpen className="w-3 h-3" /> {lead.email_open_count}
                                </span>
                              )}
                              {!lead.email_send_count && <span className="text-slate-500">None</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); openLeadDetail(lead.id); }}
                              className="text-indigo-600 hover:text-indigo-600 text-xs"
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Showing {page * pageSize + 1}–{page * pageSize + leads.length}
                  {stats ? ` of ${stats.total}` : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={leads.length < pageSize}
                    className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm disabled:opacity-30"
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
            <div className="relative w-full max-w-xl bg-slate-50 border-l border-slate-200 overflow-y-auto">
              <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-slate-900 truncate">{selectedLead.provider_name}</h2>
                <button onClick={() => setShowDetail(false)} className="text-slate-500 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Priority */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedLead.status}
                    onChange={(e) => updateLead(selectedLead.id, { status: e.target.value })}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedLead.priority}
                    onChange={(e) => updateLead(selectedLead.id, { priority: e.target.value })}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                {/* Agency Info */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Agency Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400">Location</span>
                      <p className="text-slate-900">{selectedLead.address}</p>
                      <p className="text-slate-600">{selectedLead.city}, {selectedLead.state} {selectedLead.zip_code}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone</span>
                      <p className="text-slate-900">{selectedLead.phone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Ownership</span>
                      <p className="text-slate-900">{selectedLead.ownership_type || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">CMS CCN</span>
                      <p className="text-slate-900">{selectedLead.ccn || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Certified</span>
                      <p className="text-slate-900">{selectedLead.certification_date || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Age</span>
                      <p className="text-slate-900">{selectedLead.years_in_operation ? `${selectedLead.years_in_operation.toFixed(1)} years` : '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Star Rating</span>
                      <p className="text-slate-900 flex items-center gap-1">
                        {selectedLead.star_rating && selectedLead.star_rating !== '-' ? (
                          <><Star className="w-3 h-3 text-amber-600 fill-yellow-400" /> {selectedLead.star_rating}</>
                        ) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-slate-400 text-sm">Services</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedLead.offers_nursing && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">Nursing</span>}
                      {selectedLead.offers_pt && <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">PT</span>}
                      {selectedLead.offers_ot && <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded">OT</span>}
                      {selectedLead.offers_speech && <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-600 rounded">Speech</span>}
                      {selectedLead.offers_social && <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded">Social</span>}
                      {selectedLead.offers_aide && <span className="text-xs px-2 py-0.5 bg-pink-500/10 text-pink-600 rounded">Aide</span>}
                    </div>
                  </div>
                </div>

                {/* Contact Info (Editable) */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-500">Contact Info</h3>
                  {['contact_name', 'contact_email', 'contact_title', 'website'].map((field) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm capitalize">{field.replace('contact_', '').replace('_', ' ')}</span>
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
                            className="px-2 py-1 bg-white border border-indigo-500 rounded text-slate-900 text-sm w-48"
                          />
                          <button onClick={() => { updateLead(selectedLead.id, { [field]: editValue }); setEditingField(null); }}>
                            <Check className="w-4 h-4 text-emerald-600" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => { setEditingField(field); setEditValue(selectedLead[field as keyof LeadDetail] as string || ''); }}
                          className="text-slate-900 text-sm cursor-pointer hover:text-indigo-600"
                        >
                          {(selectedLead[field as keyof LeadDetail] as string) || <span className="text-slate-500 italic">Click to add</span>}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Email Actions */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-slate-500">Email Campaign</h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-white rounded p-2">
                      <p className="text-indigo-600 font-bold">{selectedLead.email_send_count}</p>
                      <p className="text-slate-400 text-xs">Sent</p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-purple-600 font-bold">{selectedLead.email_open_count}</p>
                      <p className="text-slate-400 text-xs">Opened</p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-emerald-400 font-bold">{selectedLead.last_response_at ? 'Yes' : 'No'}</p>
                      <p className="text-slate-400 text-xs">Replied</p>
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
                      className="px-3 py-2 bg-purple-600/20 text-purple-600 border border-purple-200 rounded-lg text-sm hover:bg-purple-600/30"
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
                    <div className="bg-white rounded-lg p-3 space-y-2 border border-slate-200">
                      <input
                        placeholder="To (leave empty to use contact email)"
                        value={emailForm.to}
                        onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 text-sm placeholder-slate-400"
                      />
                      <input
                        placeholder="Subject"
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 text-sm placeholder-slate-400"
                      />
                      <textarea
                        placeholder="Email body (HTML)"
                        value={emailForm.body}
                        onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                        rows={5}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 text-sm placeholder-slate-400 resize-none"
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
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Notes</h3>
                  <textarea
                    value={selectedLead.notes || ''}
                    onChange={(e) => setSelectedLead({ ...selectedLead, notes: e.target.value })}
                    onBlur={() => updateLead(selectedLead.id, { notes: selectedLead.notes })}
                    placeholder="Add notes..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-slate-900 text-sm placeholder-slate-400 resize-none"
                  />
                </div>

                {/* Activity Log */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Activity Log</h3>
                  {selectedLead.activity_log && selectedLead.activity_log.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {[...selectedLead.activity_log].reverse().map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <div>
                            <span className="text-slate-900">{entry.action}</span>
                            {entry.subject && <span className="text-slate-400"> — {entry.subject}</span>}
                            {entry.notes && <span className="text-slate-400"> — {entry.notes}</span>}
                            <p className="text-slate-500">
                              {entry.at ? new Date(entry.at).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No activity yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </>)}

        {/* ========== ANALYTICS TAB ========== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Campaign Performance</h2>
              <select
                value={analyticsDays}
                onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : analyticsData ? (
              <>
                {/* Overall stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Sent', value: analyticsData.totals?.total_sent || 0, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                    { label: 'Delivered', value: analyticsData.totals?.total_delivered || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Opened', value: analyticsData.totals?.total_opened || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Clicked', value: analyticsData.totals?.total_clicked || 0, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
                    { label: 'Replied', value: analyticsData.totals?.total_replied || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Bounced', value: analyticsData.totals?.total_bounced || 0, color: 'text-red-600', bg: 'bg-red-50' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} border border-slate-200/30 rounded-xl p-4`}>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Key rates */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Open Rate', value: `${analyticsData.totals?.overall_open_rate || 0}%`, target: '40%+', color: (analyticsData.totals?.overall_open_rate || 0) >= 40 ? 'text-emerald-400' : 'text-amber-600' },
                    { label: 'Click Rate', value: `${analyticsData.totals?.overall_click_rate || 0}%`, target: '3%+', color: (analyticsData.totals?.overall_click_rate || 0) >= 3 ? 'text-emerald-400' : 'text-amber-600' },
                    { label: 'Reply Rate', value: `${analyticsData.totals?.overall_reply_rate || 0}%`, target: '5%+', color: (analyticsData.totals?.overall_reply_rate || 0) >= 5 ? 'text-emerald-400' : 'text-amber-600' },
                  ].map(({ label, value, target, color }) => (
                    <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                      <p className="text-xs text-slate-400 mb-2">{label}</p>
                      <p className={`text-3xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-slate-500 mt-1">Target: {target}</p>
                    </div>
                  ))}
                </div>

                {/* Funnel */}
                {analyticsData.funnel && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-slate-500 mb-4">Email Funnel</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Sent', value: analyticsData.funnel.sent, color: 'bg-indigo-500' },
                        { label: 'Delivered', value: analyticsData.funnel.delivered, color: 'bg-blue-500' },
                        { label: 'Opened', value: analyticsData.funnel.opened, color: 'bg-purple-500' },
                        { label: 'Clicked', value: analyticsData.funnel.clicked, color: 'bg-cyan-500' },
                        { label: 'Replied', value: analyticsData.funnel.replied, color: 'bg-emerald-500' },
                        { label: 'Meeting Scheduled', value: analyticsData.funnel.meeting_scheduled, color: 'bg-amber-500' },
                        { label: 'Converted', value: analyticsData.funnel.converted, color: 'bg-green-500' },
                      ].map(({ label, value, color }) => {
                        const maxVal = analyticsData.funnel!.sent || 1;
                        const pct = Math.round((value / maxVal) * 100);
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
                            <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">
                              <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${Math.max(pct, 1)}%` }} />
                            </div>
                            <span className="text-xs text-slate-600 w-12 text-right font-mono">{value}</span>
                            <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Per-template performance */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Performance by Email Template</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">Template</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Day</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Sent</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Opened</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Open %</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Clicked</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Replied</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Reply %</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">Bounced</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.per_template || []).map((t) => {
                          const Icon = TEMPLATE_ICONS[t.template_id] || FileText;
                          const gradient = TEMPLATE_COLORS[t.template_id] || 'from-gray-500 to-gray-600';
                          return (
                            <tr key={t.template_id} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 bg-gradient-to-br ${gradient} rounded-md flex items-center justify-center`}>
                                    <Icon className="w-3.5 h-3.5 text-slate-900" />
                                  </div>
                                  <span className="text-sm text-slate-900 font-medium">{t.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-xs text-slate-400 font-mono">Day {t.sequence_day}</td>
                              <td className="px-3 py-3 text-right text-sm text-indigo-600 font-medium">{t.sent}</td>
                              <td className="px-3 py-3 text-right text-sm text-purple-600">{t.opened}</td>
                              <td className="px-3 py-3 text-right text-sm">
                                <span className={t.open_rate >= 40 ? 'text-emerald-400' : t.open_rate >= 20 ? 'text-amber-600' : 'text-slate-400'}>
                                  {t.open_rate}%
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right text-sm text-cyan-600">{t.clicked}</td>
                              <td className="px-3 py-3 text-right text-sm text-emerald-400">{t.replied}</td>
                              <td className="px-3 py-3 text-right text-sm">
                                <span className={t.reply_rate >= 5 ? 'text-emerald-400' : t.reply_rate >= 2 ? 'text-amber-600' : 'text-slate-400'}>
                                  {t.reply_rate}%
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right text-sm text-red-600">{t.bounced}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* No data state */}
                {analyticsData.totals?.total_sent === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No campaign data yet</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                      Launch your first email sequence or send a campaign to start tracking performance.
                      Analytics will show open rates, click rates, and reply rates for each template.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Loading analytics...</h3>
              </div>
            )}
          </div>
        )}

        {/* ========== SEQUENCES TAB ========== */}
        {activeTab === 'sequences' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Email Sequence Status</h2>
              <button
                onClick={processScheduledEmails}
                disabled={sequenceProcessing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                {sequenceProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Process Due Emails
              </button>
            </div>

            {sequenceLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : sequenceStatus ? (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs text-slate-400">In Sequence</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{sequenceStatus.total_in_sequence}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs text-slate-400">Completed</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">{sequenceStatus.completed_sequences}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs text-slate-400">Ready to Send</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{sequenceStatus.pending_send_now}</p>
                    {sequenceStatus.pending_send_now > 0 && (
                      <p className="text-xs text-amber-600/70 mt-1">Click "Process Due Emails" to send</p>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5">
                    <p className="text-xs text-indigo-600">5-Email Sequence</p>
                    <p className="text-sm text-slate-500 mt-1">Day 1, 3, 7, 14, 28</p>
                    <p className="text-xs text-slate-400 mt-1">Auto-scheduled after launch</p>
                  </div>
                </div>

                {/* Step breakdown */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Leads at Each Sequence Step</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { id: 'warm_open', label: 'Warm Open', day: 1 },
                      { id: 'pattern_interrupt', label: 'Pattern Interrupt', day: 3 },
                      { id: 'aspiration', label: 'Aspiration', day: 7 },
                      { id: 'proof_point', label: 'Proof Point', day: 14 },
                      { id: 'graceful_exit', label: 'Graceful Exit', day: 28 },
                    ].map(({ id, label, day }, i) => {
                      const Icon = TEMPLATE_ICONS[id] || FileText;
                      const gradient = TEMPLATE_COLORS[id] || 'from-gray-500 to-gray-600';
                      const count = sequenceStatus.step_breakdown?.[id] || 0;
                      return (
                        <div key={id} className="text-center">
                          <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                            <Icon className="w-5 h-5 text-slate-900" />
                          </div>
                          <p className="text-xl font-bold text-slate-900">{count}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Day {day}</p>
                          {i < 4 && (
                            <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2">
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {sequenceResult && (
                  <div className={`border rounded-xl p-4 ${sequenceResult.error ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    {sequenceResult.error ? (
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm text-red-600">{sequenceResult.error}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="text-sm text-emerald-400 font-medium">
                            {sequenceResult.message || `Processed: ${sequenceResult.sent || 0} sent, ${sequenceResult.skipped || 0} skipped`}
                          </p>
                          {sequenceResult.sent !== undefined && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {sequenceResult.sent} sent, {sequenceResult.failed || sequenceResult.skipped || 0} skipped
                              {sequenceResult.sequences_completed ? `, ${sequenceResult.sequences_completed} sequences completed` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No active sequences</h3>
                <p className="text-sm text-slate-400 mb-4">Launch a 5-email sequence to start automating your outreach.</p>
                <button
                  onClick={() => { setShowSequenceLauncher(true); setSequenceResult(null); }}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold mx-auto"
                >
                  <Rocket className="w-4 h-4 inline mr-2" />
                  Launch Sequence
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========== SEQUENCE LAUNCHER MODAL ========== */}
        {showSequenceLauncher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSequenceLauncher(false)} />
            <div className="relative w-full max-w-lg bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50">
              <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Launch Full Sequence</h2>
                    <p className="text-xs text-slate-400">5 emails over 28 days, fully automated</p>
                  </div>
                </div>
                <button onClick={() => setShowSequenceLauncher(false)} className="text-slate-400 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Timeline preview */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Sequence Timeline</p>
                  <div className="space-y-2">
                    {[
                      { day: 1, name: 'The Warm Open', desc: 'Personal intro, no pitch' },
                      { day: 3, name: 'The Pattern Interrupt', desc: 'One data point, soft CTA' },
                      { day: 7, name: 'The Aspiration', desc: 'Paint the picture' },
                      { day: 14, name: 'The Proof Point', desc: 'Data-driven follow-up' },
                      { day: 28, name: 'The Graceful Exit', desc: 'Respectful close' },
                    ].map(({ day, name, desc }) => (
                      <div key={day} className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-500/10 rounded px-2 py-0.5 w-14 text-center">Day {day}</span>
                        <span className="text-sm text-slate-900 font-medium">{name}</span>
                        <span className="text-xs text-slate-500 ml-auto">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Campaign Name</label>
                  <input
                    value={sequenceFilters.campaign_name}
                    onChange={(e) => setSequenceFilters({ ...sequenceFilters, campaign_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">State</label>
                    <select
                      value={sequenceFilters.state}
                      onChange={(e) => setSequenceFilters({ ...sequenceFilters, state: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm"
                    >
                      <option value="">All States</option>
                      <option value="NE">Nebraska</option>
                      <option value="IA">Iowa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Priority</label>
                    <select
                      value={sequenceFilters.priority}
                      onChange={(e) => setSequenceFilters({ ...sequenceFilters, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm"
                    >
                      <option value="">All</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sequenceFilters.exclude_already_emailed}
                    onChange={(e) => setSequenceFilters({ ...sequenceFilters, exclude_already_emailed: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-500"
                  />
                  <span className="text-sm text-slate-600">Skip leads already in a sequence</span>
                </label>

                {sequenceResult && (
                  <div className={`rounded-lg p-3 ${sequenceResult.error ? 'bg-red-50 border border-red-500/20 text-red-600' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'} text-sm`}>
                    {sequenceResult.error || `${sequenceResult.message} (${sequenceResult.sent} emails sent)`}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 px-6 py-4 flex justify-between">
                <button
                  onClick={() => setShowSequenceLauncher(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={launchSequence}
                  disabled={sequenceLaunching || !sequenceFilters.campaign_name}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  {sequenceLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {sequenceLaunching ? 'Launching...' : 'Launch Sequence'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Launcher Modal */}
        {showCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCampaign(false)} />
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-slate-200/50">
              {/* Modal Header with Palm branding */}
              <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Rocket className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Email Campaign</h2>
                    <p className="text-xs text-slate-400">
                      {['Choose Email', 'Configure', 'Preview & Send', 'Results'][campaignStep]}
                      <span className="text-slate-600 mx-1.5">/</span>
                      <span className="text-indigo-600">PalmCare AI</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowCampaign(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="px-6 py-3 border-b border-slate-200 flex gap-1">
                {['Template', 'Filters', 'Preview', 'Done'].map((label, i) => (
                  <div key={label} className="flex-1 flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i < campaignStep ? 'bg-indigo-500 text-white' :
                      i === campaignStep ? 'bg-white text-[#0d0d1f]' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {i < campaignStep ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${i <= campaignStep ? 'text-slate-600' : 'text-slate-500'}`}>{label}</span>
                    {i < 3 && <div className={`flex-1 h-px ${i < campaignStep ? 'bg-indigo-500/50' : 'bg-slate-200'}`} />}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Step 0: Choose Template */}
                {campaignStep === 0 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm text-slate-500">Select an email from the 5-email outreach sequence:</p>
                      <p className="text-xs text-slate-500 mt-1">Based on research from Apple, Nike, Tesla, and 7 other world-class brands.</p>
                    </div>
                    <div className="grid gap-3">
                      {templates.map((tmpl) => {
                        const Icon = TEMPLATE_ICONS[tmpl.id] || FileText;
                        const gradient = TEMPLATE_COLORS[tmpl.id] || 'from-gray-500 to-gray-600';
                        const isSelected = selectedTemplate?.id === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            onClick={() => setSelectedTemplate(tmpl)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center`}>
                                  <Icon className="w-5 h-5 text-slate-900" />
                                </div>
                                {tmpl.sequence_day && (
                                  <span className="text-[10px] font-mono text-slate-500">Day {tmpl.sequence_day}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-slate-900 font-medium text-sm">{tmpl.name}</h3>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{tmpl.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[11px] text-slate-500 bg-slate-200 rounded px-2 py-0.5 font-mono truncate">
                                    {tmpl.subject}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 1: Campaign Filters */}
                {campaignStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1.5">Campaign Name</label>
                      <input
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="e.g., feb-2026-ai-advantage"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">State</label>
                        <select
                          value={campaignFilters.state}
                          onChange={(e) => setCampaignFilters({ ...campaignFilters, state: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="">All States</option>
                          <option value="NE">Nebraska</option>
                          <option value="IA">Iowa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Priority</label>
                        <select
                          value={campaignFilters.priority}
                          onChange={(e) => setCampaignFilters({ ...campaignFilters, priority: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="">All Priorities</option>
                          <option value="high">High (newer agencies)</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">Max Age (years)</label>
                        <select
                          value={campaignFilters.max_years}
                          onChange={(e) => setCampaignFilters({ ...campaignFilters, max_years: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="">Any</option>
                          <option value="5">Under 5 years</option>
                          <option value="10">Under 10 years</option>
                          <option value="20">Under 20 years</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                          <input
                            type="checkbox"
                            checked={campaignFilters.exclude_already_emailed}
                            onChange={(e) => setCampaignFilters({ ...campaignFilters, exclude_already_emailed: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 bg-slate-50"
                          />
                          <span className="text-sm text-slate-600">Skip already emailed</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Preview */}
                {campaignStep === 2 && (
                  <div className="space-y-5">
                    {/* Recipient count */}
                    {campaignPreview && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{campaignPreview.total_recipients}</p>
                            <p className="text-xs text-slate-400">agencies will receive this email</p>
                          </div>
                        </div>
                        {campaignPreview.sample.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Sample recipients</p>
                            <div className="space-y-1.5">
                              {campaignPreview.sample.map((s, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-xs text-slate-600 font-medium">{s.provider_name}</span>
                                  <span className="text-[11px] text-slate-500 font-mono">{s.contact_email}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email preview — realistic email client mockup */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Email Preview</p>
                      <div className="bg-white rounded-xl overflow-hidden border border-gray-300 shadow-lg">
                        {/* Email client toolbar */}
                        <div className="bg-[#f8f9fa] px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[11px] text-slate-500 w-12 shrink-0">From</span>
                              <span className="text-xs text-slate-600">Muse Ibrahim &lt;sales@palmtai.com&gt;</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-[11px] text-slate-500 w-12 shrink-0">Subject</span>
                              <span className="text-xs text-gray-900 font-medium">{previewHtml.subject}</span>
                            </div>
                          </div>
                        </div>
                        {/* Email body */}
                        <div
                          className="px-6 py-5"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml.body) }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Results */}
                {campaignStep === 3 && campaignResult && (
                  <div className="space-y-5">
                    {campaignResult.error ? (
                      <div className="bg-slate-50 border border-red-500/20 rounded-xl p-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                          <AlertCircle className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Campaign Failed</h3>
                        <p className="text-sm text-slate-400">{campaignResult.error}</p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                          <Check className="w-7 h-7 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Campaign Sent</h3>
                        <p className="text-sm text-slate-400 mb-6">{campaignResult.message}</p>
                        <div className="flex justify-center gap-10">
                          <div>
                            <p className="text-4xl font-bold text-slate-900 tracking-tight">{campaignResult.sent}</p>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Delivered</p>
                          </div>
                          {(campaignResult.failed ?? 0) > 0 && (
                            <div>
                              <p className="text-4xl font-bold text-red-600 tracking-tight">{campaignResult.failed}</p>
                              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Failed</p>
                            </div>
                          )}
                        </div>
                        {(campaignResult.errors?.length ?? 0) > 0 && (
                          <div className="mt-6 text-left bg-slate-100 rounded-lg p-4 border border-slate-200">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Errors</p>
                            {campaignResult.errors!.map((err, i) => (
                              <p key={i} className="text-xs text-red-600/80 py-0.5">{err.lead}: {err.error}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
                <button
                  onClick={() => {
                    if (campaignStep === 0) setShowCampaign(false);
                    else setCampaignStep(campaignStep - 1);
                  }}
                  className="px-4 py-2.5 bg-transparent border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-300 text-sm transition-colors"
                >
                  {campaignStep === 0 ? 'Cancel' : 'Back'}
                </button>

                {campaignStep === 0 && (
                  <button
                    onClick={() => setCampaignStep(1)}
                    disabled={!selectedTemplate}
                    className="px-6 py-2.5 bg-white text-[#0d0d1f] rounded-lg hover:bg-gray-100 text-sm font-semibold disabled:opacity-30 flex items-center gap-2 transition-colors"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {campaignStep === 1 && (
                  <button
                    onClick={() => { setCampaignStep(2); loadCampaignPreview(); }}
                    disabled={!campaignName}
                    className="px-6 py-2.5 bg-white text-[#0d0d1f] rounded-lg hover:bg-gray-100 text-sm font-semibold disabled:opacity-30 flex items-center gap-2 transition-colors"
                  >
                    Preview <Eye className="w-4 h-4" />
                  </button>
                )}

                {campaignStep === 2 && (
                  <button
                    onClick={sendCampaign}
                    disabled={campaignSending || !campaignPreview || campaignPreview.total_recipients === 0}
                    className="px-6 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-semibold disabled:opacity-30 flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-colors"
                  >
                    {campaignSending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send to {campaignPreview?.total_recipients || 0} agencies</>
                    )}
                  </button>
                )}

                {campaignStep === 3 && (
                  <button
                    onClick={() => setShowCampaign(false)}
                    className="px-6 py-2.5 bg-white text-[#0d0d1f] rounded-lg hover:bg-gray-100 text-sm font-semibold transition-colors"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
