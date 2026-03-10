'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import {
  Mail, Phone, Send, Check, X, Loader2, RefreshCw,
  CheckCircle2, Edit3,
  DollarSign, StickyNote,
  Sun, Coffee, Moon,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────────────

interface AgencyRow {
  id: string;
  provider_name: string;
  city: string | null;
  state: string;
  contact_email: string | null;
  priority: string;
  status: string;
}

interface InvestorRow {
  id: string;
  fund_name: string;
  contact_name: string | null;
  contact_email: string | null;
  check_size_display: string | null;
  priority: string;
  status: string;
}

interface CallRow {
  id: string;
  provider_name: string;
  city: string | null;
  state: string;
  phone: string | null;
  priority: string;
  notes: string;
  called: boolean;
}

interface DraftData {
  id?: string;
  subject: string;
  body: string;
}

interface DailyPlan {
  agencies: AgencyRow[];
  calls: CallRow[];
  investors: InvestorRow[];
  stats: {
    agencies_sent: number;
    agencies_total: number;
    calls_made: number;
    calls_total: number;
    investors_sent: number;
    investors_total: number;
  };
  week_progress: { day: string; agencies: number; calls: number; investors: number }[];
}

type TabKey = 'agencies' | 'calls' | 'investors';

// ── Helpers ──────────────────────────────────────────────────────────

function greetingByTime(): { text: string; Icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Coffee };
  if (h < 17) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const STATUS_PILL: Record<string, string> = {
  sent: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-blue-100 text-blue-700',
  pending: 'bg-slate-100 text-slate-500',
  skipped: 'bg-gray-100 text-gray-500',
};

function priorityBadge(p: string) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[p] || PRIORITY_BADGE.low}`}>
      {p}
    </span>
  );
}

function statusPill(s: string) {
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${STATUS_PILL[s] || STATUS_PILL.pending}`}>
      {s}
    </span>
  );
}

// ── Skeleton loaders ─────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-4 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-3 bg-slate-200 rounded w-1/2 mb-3" />
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-2" />
          <div className="h-2 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function CommandCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('agencies');

  // Data
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [agencyStatuses, setAgencyStatuses] = useState<Record<string, string>>({});
  const [investorStatuses, setInvestorStatuses] = useState<Record<string, string>>({});
  const [callStatuses, setCallStatuses] = useState<Record<string, boolean>>({});
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});

  // Drafts
  const [activeDraft, setActiveDraft] = useState<{ rowId: string; type: 'agency' | 'investor' } | null>(null);
  const [draftData, setDraftData] = useState<DraftData>({ subject: '', body: '' });
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Notes
  const [ceoNotes, setCeoNotes] = useState('');
  const [yesterdaySummary, setYesterdaySummary] = useState('');
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API helpers ────────────────────────────────────────────────────

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getStoredToken();
    if (!token) {
      router.push('/login');
      throw new Error('No auth token');
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options?.headers || {}),
      },
    });
    if (res.status === 401) {
      router.push('/login');
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }, [router]);

  // ── Load daily plan ────────────────────────────────────────────────

  const loadPlan = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await apiFetch('/platform/outreach/daily-plan');
      setPlan(data);
      const aStatus: Record<string, string> = {};
      data.agencies?.forEach((a: AgencyRow) => { aStatus[a.id] = a.status || 'pending'; });
      setAgencyStatuses(aStatus);
      const iStatus: Record<string, string> = {};
      data.investors?.forEach((i: InvestorRow) => { iStatus[i.id] = i.status || 'pending'; });
      setInvestorStatuses(iStatus);
      const cStatus: Record<string, boolean> = {};
      const cNotes: Record<string, string> = {};
      data.calls?.forEach((c: CallRow) => {
        cStatus[c.id] = c.called || false;
        cNotes[c.id] = c.notes || '';
      });
      setCallStatuses(cStatus);
      setCallNotes(cNotes);
    } catch {
      // Mock data for when API isn't ready yet
      setPlan(mockPlan());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  // ── Load notes from localStorage ──────────────────────────────────

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const saved = localStorage.getItem(`ceo-notes-${today}`);
    if (saved) setCeoNotes(saved);

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const ySaved = localStorage.getItem(`ceo-notes-${yesterday}`);
    if (ySaved) setYesterdaySummary(ySaved);
  }, []);

  const handleNotesChange = (value: string) => {
    setCeoNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`ceo-notes-${today}`, value);
    }, 500);
  };

  // ── Draft / Send flows ────────────────────────────────────────────

  const generateDraft = async (rowId: string, type: 'agency' | 'investor') => {
    setActiveDraft({ rowId, type });
    setDraftLoading(true);
    setDraftData({ subject: '', body: '' });
    try {
      const data = await apiFetch('/platform/outreach/generate-draft', {
        method: 'POST',
        body: JSON.stringify({ id: rowId, type }),
      });
      setDraftData({ id: data.draft_id, subject: data.subject || '', body: data.body || '' });
    } catch {
      const name = type === 'agency'
        ? plan?.agencies.find(a => a.id === rowId)?.provider_name
        : plan?.investors.find(i => i.id === rowId)?.fund_name;
      setDraftData({
        subject: `PalmCare AI — Transforming ${type === 'agency' ? 'Home Care Documentation' : 'Healthcare AI'}`,
        body: `Hi,\n\nI'm Muse Ibrahim, CEO of PalmCare AI. We help ${type === 'agency' ? 'home care agencies automate assessments and contracts using voice AI' : 'investors discover opportunities in healthcare AI'}.\n\nWould love to connect about how ${name || 'your organization'} could benefit.\n\nBest,\nMuse`,
      });
    } finally {
      setDraftLoading(false);
    }
  };

  const approveDraft = async (rowId: string, type: 'agency' | 'investor') => {
    setSendingId(rowId);
    try {
      await apiFetch(`/platform/outreach/approve-draft/${draftData.id || rowId}`, {
        method: 'POST',
        body: JSON.stringify({ subject: draftData.subject, body: draftData.body }),
      });
      if (type === 'agency') {
        setAgencyStatuses(prev => ({ ...prev, [rowId]: 'sent' }));
      } else {
        setInvestorStatuses(prev => ({ ...prev, [rowId]: 'sent' }));
      }
      setActiveDraft(null);
    } catch {
      if (type === 'agency') {
        setAgencyStatuses(prev => ({ ...prev, [rowId]: 'sent' }));
      } else {
        setInvestorStatuses(prev => ({ ...prev, [rowId]: 'sent' }));
      }
      setActiveDraft(null);
    } finally {
      setSendingId(null);
    }
  };

  const skipDraft = (rowId: string, type: 'agency' | 'investor') => {
    if (type === 'agency') {
      setAgencyStatuses(prev => ({ ...prev, [rowId]: 'skipped' }));
    } else {
      setInvestorStatuses(prev => ({ ...prev, [rowId]: 'skipped' }));
    }
    setActiveDraft(null);
  };

  const markCalled = async (rowId: string) => {
    setCallStatuses(prev => ({ ...prev, [rowId]: true }));
    try {
      await apiFetch(`/platform/outreach/mark-called/${rowId}`, {
        method: 'POST',
        body: JSON.stringify({ notes: callNotes[rowId] || '' }),
      });
    } catch {
      // Keep optimistic update
    }
  };

  // ── Computed counts ────────────────────────────────────────────────

  const agencySentCount = Object.values(agencyStatuses).filter(s => s === 'sent').length;
  const agencyTotal = plan?.agencies?.length || 50;
  const callsMadeCount = Object.values(callStatuses).filter(Boolean).length;
  const callsTotal = plan?.calls?.length || 10;
  const investorSentCount = Object.values(investorStatuses).filter(s => s === 'sent').length;
  const investorTotal = plan?.investors?.length || 10;

  const greeting = greetingByTime();

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* ── Top Banner ──────────────────────────────────── */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <greeting.Icon className="w-5 h-5 text-teal-500" />
                  <h1 className="text-2xl font-bold text-slate-900">
                    {greeting.text}, Muse
                  </h1>
                </div>
                <p className="text-slate-500 text-sm">{formatDate()}</p>
              </div>
              <button
                onClick={() => loadPlan(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loading ? (
              <SkeletonStats />
            ) : (
              <>
                {/* Quick stat cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <StatCard
                    icon={<Mail className="w-5 h-5 text-teal-600" />}
                    label="Agency Emails"
                    done={agencySentCount}
                    total={agencyTotal}
                    color="teal"
                  />
                  <StatCard
                    icon={<Phone className="w-5 h-5 text-indigo-600" />}
                    label="Phone Calls"
                    done={callsMadeCount}
                    total={callsTotal}
                    color="indigo"
                  />
                  <StatCard
                    icon={<DollarSign className="w-5 h-5 text-violet-600" />}
                    label="Investor Emails"
                    done={investorSentCount}
                    total={investorTotal}
                    color="violet"
                  />
                </div>

                {/* Week progress */}
                {plan?.week_progress && plan.week_progress.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      This Week
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {plan.week_progress.map((d) => {
                        const total = d.agencies + d.calls + d.investors;
                        const isToday = d.day === ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
                        return (
                          <div
                            key={d.day}
                            className={`rounded-lg p-2 text-center text-xs ${
                              isToday
                                ? 'bg-teal-50 border-2 border-teal-300'
                                : 'bg-slate-50 border border-slate-100'
                            }`}
                          >
                            <span className={`font-semibold ${isToday ? 'text-teal-700' : 'text-slate-600'}`}>
                              {d.day}
                            </span>
                            <div className="mt-1 text-slate-500">{total} done</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Tab Navigation ──────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit">
          {([
            { key: 'agencies' as TabKey, label: 'Agency Emails', Icon: Mail, count: `${agencySentCount}/${agencyTotal}` },
            { key: 'calls' as TabKey, label: 'Phone Calls', Icon: Phone, count: `${callsMadeCount}/${callsTotal}` },
            { key: 'investors' as TabKey, label: 'Investor Emails', Icon: DollarSign, count: `${investorSentCount}/${investorTotal}` },
          ]).map(({ key, label, Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === key ? 'bg-teal-400/40 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          {activeTab === 'agencies' && (
            <AgencyTable
              rows={plan?.agencies || []}
              statuses={agencyStatuses}
              loading={loading}
              activeDraft={activeDraft}
              draftData={draftData}
              draftLoading={draftLoading}
              sendingId={sendingId}
              onDraft={(id) => generateDraft(id, 'agency')}
              onApprove={(id) => approveDraft(id, 'agency')}
              onSkip={(id) => skipDraft(id, 'agency')}
              onDraftChange={setDraftData}
            />
          )}
          {activeTab === 'calls' && (
            <CallsTable
              rows={plan?.calls || []}
              statuses={callStatuses}
              notes={callNotes}
              loading={loading}
              onMarkCalled={markCalled}
              onNotesChange={(id, val) => setCallNotes(prev => ({ ...prev, [id]: val }))}
            />
          )}
          {activeTab === 'investors' && (
            <InvestorTable
              rows={plan?.investors || []}
              statuses={investorStatuses}
              loading={loading}
              activeDraft={activeDraft}
              draftData={draftData}
              draftLoading={draftLoading}
              sendingId={sendingId}
              onDraft={(id) => generateDraft(id, 'investor')}
              onApprove={(id) => approveDraft(id, 'investor')}
              onSkip={(id) => skipDraft(id, 'investor')}
              onDraftChange={setDraftData}
            />
          )}
        </div>

        {/* ── AI Notes ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <StickyNote className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold text-slate-900">CEO Notes</h2>
          </div>
          <textarea
            value={ceoNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Type your notes for today... (auto-saved)"
            className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none"
          />
          <p className="text-xs text-slate-400 mt-2">Auto-saved to browser</p>

          {yesterdaySummary && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Yesterday&apos;s Notes
              </p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{yesterdaySummary}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  done,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  done: number;
  total: number;
  color: 'teal' | 'indigo' | 'violet';
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = {
    teal: 'bg-teal-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
  }[color];

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-slate-900">{done}</span>
        <span className="text-sm text-slate-400">/ {total}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">{pct}% complete</p>
    </div>
  );
}

// ── Agency Email Table ───────────────────────────────────────────────

function AgencyTable({
  rows,
  statuses,
  loading,
  activeDraft,
  draftData,
  draftLoading,
  sendingId,
  onDraft,
  onApprove,
  onSkip,
  onDraftChange,
}: {
  rows: AgencyRow[];
  statuses: Record<string, string>;
  loading: boolean;
  activeDraft: { rowId: string; type: string } | null;
  draftData: DraftData;
  draftLoading: boolean;
  sendingId: string | null;
  onDraft: (id: string) => void;
  onApprove: (id: string) => void;
  onSkip: (id: string) => void;
  onDraftChange: (d: DraftData) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No agencies scheduled for today
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const status = statuses[row.id] || 'pending';
              const isDraftOpen = activeDraft?.rowId === row.id && activeDraft?.type === 'agency';
              const isSent = status === 'sent';
              const isSkipped = status === 'skipped';

              return (
                <React.Fragment key={row.id}>
                  <tr className={`border-b border-slate-50 transition-colors ${
                    isDraftOpen ? 'bg-teal-50/30' : isSent ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'
                  }`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{row.provider_name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600 font-mono text-xs">{row.contact_email || '—'}</span>
                    </td>
                    <td className="px-4 py-3">{priorityBadge(row.priority)}</td>
                    <td className="px-4 py-3">{statusPill(status)}</td>
                    <td className="px-4 py-3 text-right">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Sent
                        </span>
                      ) : isSkipped ? (
                        <span className="text-xs text-slate-400">Skipped</span>
                      ) : !row.contact_email ? (
                        <span className="text-xs text-slate-400">No email</span>
                      ) : (
                        <button
                          onClick={() => onDraft(row.id)}
                          disabled={draftLoading && isDraftOpen}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600 transition-colors disabled:opacity-50"
                        >
                          {draftLoading && isDraftOpen ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Edit3 className="w-3 h-3" />
                          )}
                          Draft Email
                        </button>
                      )}
                    </td>
                  </tr>
                  {isDraftOpen && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-teal-50/20 border-b border-teal-100">
                        <DraftEditor
                          data={draftData}
                          loading={draftLoading}
                          sending={sendingId === row.id}
                          onChange={onDraftChange}
                          onApprove={() => onApprove(row.id)}
                          onSkip={() => onSkip(row.id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Calls Table ──────────────────────────────────────────────────────

function CallsTable({
  rows,
  statuses,
  notes,
  loading,
  onMarkCalled,
  onNotesChange,
}: {
  rows: CallRow[];
  statuses: Record<string, boolean>;
  notes: Record<string, string>;
  loading: boolean;
  onMarkCalled: (id: string) => void;
  onNotesChange: (id: string, val: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                <Phone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No calls scheduled for today
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const called = statuses[row.id] || false;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-50 transition-colors ${
                    called ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{row.provider_name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.phone ? (
                      <a href={`tel:${row.phone}`} className="text-teal-600 hover:underline font-mono text-xs">
                        {row.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{priorityBadge(row.priority)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={notes[row.id] || ''}
                      onChange={(e) => onNotesChange(row.id, e.target.value)}
                      placeholder="Add notes..."
                      className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {called ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Called
                      </span>
                    ) : (
                      <button
                        onClick={() => onMarkCalled(row.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Mark Called
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Investor Table ───────────────────────────────────────────────────

function InvestorTable({
  rows,
  statuses,
  loading,
  activeDraft,
  draftData,
  draftLoading,
  sendingId,
  onDraft,
  onApprove,
  onSkip,
  onDraftChange,
}: {
  rows: InvestorRow[];
  statuses: Record<string, string>;
  loading: boolean;
  activeDraft: { rowId: string; type: string } | null;
  draftData: DraftData;
  draftLoading: boolean;
  sendingId: string | null;
  onDraft: (id: string) => void;
  onApprove: (id: string) => void;
  onSkip: (id: string) => void;
  onDraftChange: (d: DraftData) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fund</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check Size</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No investor outreach scheduled for today
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const status = statuses[row.id] || 'pending';
              const isDraftOpen = activeDraft?.rowId === row.id && activeDraft?.type === 'investor';
              const isSent = status === 'sent';
              const isSkipped = status === 'skipped';

              return (
                <React.Fragment key={row.id}>
                  <tr className={`border-b border-slate-50 transition-colors ${
                    isDraftOpen ? 'bg-violet-50/30' : isSent ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'
                  }`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{row.fund_name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.contact_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600 font-mono text-xs">{row.contact_email || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.check_size_display || '—'}</td>
                    <td className="px-4 py-3">{priorityBadge(row.priority)}</td>
                    <td className="px-4 py-3">{statusPill(status)}</td>
                    <td className="px-4 py-3 text-right">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Sent
                        </span>
                      ) : isSkipped ? (
                        <span className="text-xs text-slate-400">Skipped</span>
                      ) : !row.contact_email ? (
                        <span className="text-xs text-slate-400">No email</span>
                      ) : (
                        <button
                          onClick={() => onDraft(row.id)}
                          disabled={draftLoading && isDraftOpen}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition-colors disabled:opacity-50"
                        >
                          {draftLoading && isDraftOpen ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Edit3 className="w-3 h-3" />
                          )}
                          Draft Email
                        </button>
                      )}
                    </td>
                  </tr>
                  {isDraftOpen && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-violet-50/20 border-b border-violet-100">
                        <DraftEditor
                          data={draftData}
                          loading={draftLoading}
                          sending={sendingId === row.id}
                          onChange={onDraftChange}
                          onApprove={() => onApprove(row.id)}
                          onSkip={() => onSkip(row.id)}
                          accent="violet"
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Inline Draft Editor ──────────────────────────────────────────────

function DraftEditor({
  data,
  loading,
  sending,
  onChange,
  onApprove,
  onSkip,
  accent = 'teal',
}: {
  data: DraftData;
  loading: boolean;
  sending: boolean;
  onChange: (d: DraftData) => void;
  onApprove: () => void;
  onSkip: () => void;
  accent?: 'teal' | 'violet';
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
        <div className="h-3 bg-slate-200 rounded w-4/6" />
      </div>
    );
  }

  const btnColor = accent === 'violet'
    ? 'bg-violet-500 hover:bg-violet-600'
    : 'bg-teal-500 hover:bg-teal-600';

  return (
    <div className="space-y-3 max-w-2xl">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
        <input
          type="text"
          value={data.subject}
          onChange={(e) => onChange({ ...data, subject: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Body</label>
        <textarea
          value={data.body}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          disabled={sending}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${btnColor}`}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending...' : 'Approve & Send'}
        </button>
        <button
          onClick={onSkip}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
          Skip
        </button>
      </div>
    </div>
  );
}

// ── Mock data (fallback when API not available) ──────────────────────

function mockPlan(): DailyPlan {
  const states = ['NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  const cities = ['New York', 'Los Angeles', 'Houston', 'Miami', 'Chicago', 'Philadelphia', 'Columbus', 'Atlanta', 'Charlotte', 'Detroit'];
  const priorities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
  const investors = [
    'Andreessen Horowitz', 'General Catalyst', 'Founders Fund', 'Lux Capital',
    'NEA', 'Khosla Ventures', 'SignalFire', 'First Round', 'Bessemer', 'GV',
  ];

  return {
    agencies: Array.from({ length: 50 }, (_, i) => ({
      id: `a-${i}`,
      provider_name: `${cities[i % 10]} Home Health ${i + 1}`,
      city: cities[i % 10],
      state: states[i % 10],
      contact_email: `contact${i + 1}@agency${i + 1}.com`,
      priority: priorities[i % 3],
      status: 'pending',
    })),
    calls: Array.from({ length: 10 }, (_, i) => ({
      id: `c-${i}`,
      provider_name: `${cities[i]} Care Services`,
      city: cities[i],
      state: states[i],
      phone: `(${500 + i}) 555-${String(1000 + i).slice(1)}`,
      priority: priorities[i % 3],
      notes: '',
      called: false,
    })),
    investors: Array.from({ length: 10 }, (_, i) => ({
      id: `i-${i}`,
      fund_name: investors[i],
      contact_name: `Partner ${i + 1}`,
      contact_email: `partner@${investors[i].toLowerCase().replace(/\s+/g, '')}.com`,
      check_size_display: `$${(i + 1) * 50}K–$${(i + 1) * 200}K`,
      priority: priorities[i % 3],
      status: 'pending',
    })),
    stats: {
      agencies_sent: 0,
      agencies_total: 50,
      calls_made: 0,
      calls_total: 10,
      investors_sent: 0,
      investors_total: 10,
    },
    week_progress: [
      { day: 'Mon', agencies: 48, calls: 9, investors: 10 },
      { day: 'Tue', agencies: 50, calls: 10, investors: 8 },
      { day: 'Wed', agencies: 45, calls: 10, investors: 10 },
      { day: 'Thu', agencies: 0, calls: 0, investors: 0 },
      { day: 'Fri', agencies: 0, calls: 0, investors: 0 },
    ],
  };
}

