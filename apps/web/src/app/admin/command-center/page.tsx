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
  ChevronDown, ChevronUp, FileText, Calendar,
  ChevronLeft, ChevronRight as ChevronRightIcon,
  Eye,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────────────

interface AgencyDraft {
  id: string;
  provider_name: string;
  city: string | null;
  state: string;
  contact_email: string | null;
  contact_name: string | null;
  phone: string | null;
  priority: string;
  status: string;
  email_send_count: number;
  last_email_sent_at: string | null;
  draft_subject: string;
  draft_body: string;
  is_html: boolean;
}

interface InvestorDraft {
  id: string;
  fund_name: string;
  contact_name: string | null;
  contact_email: string | null;
  check_size_display: string | null;
  priority: string;
  status: string;
  email_send_count: number;
  last_email_sent_at: string | null;
  draft_subject: string;
  draft_body: string;
  is_html: boolean;
}

interface CallRow {
  id: string;
  provider_name: string;
  city: string | null;
  state: string;
  phone: string | null;
  priority: string;
  notes: string;
  is_contacted: boolean;
}

interface DayPlan {
  date: string;
  day_name: string;
  is_today: boolean;
  agency_drafts: AgencyDraft[];
  investor_drafts: InvestorDraft[];
  calls: CallRow[];
}

interface WeeklyPlan {
  days: DayPlan[];
  stats: {
    total_leads: number;
    leads_with_email: number;
    leads_contacted: number;
    leads_remaining_email: number;
    leads_no_email: number;
    calls_remaining: number;
    total_investors: number;
    investors_with_email: number;
    investors_contacted: number;
    investors_remaining: number;
  };
  week_start: string;
  week_end: string;
  week_offset: number;
  total_weeks: number;
  all_contacts_covered: boolean;
}

interface DraftEdit {
  subject: string;
  body: string;
}

type TabKey = 'agencies' | 'calls' | 'investors';

// ── Helpers ──────────────────────────────────────────────────────────

function greetingByTime(): { text: string; Icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Coffee };
  if (h < 17) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function priorityBadge(p: string) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[p] || PRIORITY_BADGE.low}`}>
      {p}
    </span>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function CommandCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('agencies');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Per-entity state
  const [agencyStatuses, setAgencyStatuses] = useState<Record<string, string>>({});
  const [investorStatuses, setInvestorStatuses] = useState<Record<string, string>>({});
  const [callStatuses, setCallStatuses] = useState<Record<string, boolean>>({});
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});

  // Draft editing
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEdit>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  // CEO Notes
  const [ceoNotes, setCeoNotes] = useState('');
  const [yesterdaySummary, setYesterdaySummary] = useState('');
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API helpers ────────────────────────────────────────────────────

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = getStoredToken();
    if (!token) { router.push('/login'); throw new Error('No auth token'); }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers || {}) },
    });
    if (res.status === 401) { router.push('/login'); throw new Error('Unauthorized'); }
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }, [router]);

  // ── Load weekly plan ──────────────────────────────────────────────

  const loadWeeklyPlan = useCallback(async (isRefresh = false, offset?: number) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const wo = offset !== undefined ? offset : weekOffset;
    try {
      const data: WeeklyPlan = await apiFetch(`/platform/outreach/weekly-plan?week_offset=${wo}`);
      setWeeklyPlan(data);

      const todayIdx = data.days.findIndex(d => d.is_today);
      if (todayIdx >= 0) setSelectedDayIdx(todayIdx);

      // Initialize statuses from the data
      const aStatus: Record<string, string> = {};
      const iStatus: Record<string, string> = {};
      const cStatus: Record<string, boolean> = {};
      const cNotes: Record<string, string> = {};
      const edits: Record<string, DraftEdit> = {};

      for (const day of data.days) {
        const dayDate = day.date;
        for (const a of day.agency_drafts) {
          const sentOnOrAfter = a.last_email_sent_at && a.last_email_sent_at.slice(0, 10) >= dayDate;
          aStatus[a.id] = sentOnOrAfter ? 'sent' : 'pending';
          edits[a.id] = { subject: a.draft_subject, body: a.draft_body };
        }
        for (const inv of day.investor_drafts) {
          const sentOnOrAfter = inv.last_email_sent_at && inv.last_email_sent_at.slice(0, 10) >= dayDate;
          iStatus[inv.id] = sentOnOrAfter ? 'sent' : 'pending';
          edits[inv.id] = { subject: inv.draft_subject, body: inv.draft_body };
        }
        for (const c of day.calls) {
          cStatus[c.id] = c.is_contacted || false;
          cNotes[c.id] = c.notes || '';
        }
      }
      setAgencyStatuses(aStatus);
      setInvestorStatuses(iStatus);
      setCallStatuses(cStatus);
      setCallNotes(cNotes);
      setDraftEdits(edits);
    } catch {
      setWeeklyPlan(mockWeeklyPlan());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch, weekOffset]);

  useEffect(() => { loadWeeklyPlan(); }, [loadWeeklyPlan]);

  // ── CEO Notes persistence ─────────────────────────────────────────

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
      localStorage.setItem(`ceo-notes-${new Date().toISOString().slice(0, 10)}`, value);
    }, 500);
  };

  // ── Batch send state ────────────────────────────────────────────
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');

  // ── Send / approve flow ───────────────────────────────────────────

  const sendAllEmails = async () => {
    if (!currentDay || batchSending) return;
    const dayIdx = selectedDayIdx;
    setBatchSending(true);
    setBatchProgress('Sending all emails...');
    try {
      const res = await apiFetch('/platform/outreach/batch-send', {
        method: 'POST',
        body: JSON.stringify({ day_index: dayIdx, week_offset: weekOffset }),
      });
      const r = res.results || {};
      const aSent = r.agencies?.sent || 0;
      const iSent = r.investors?.sent || 0;
      const aFail = r.agencies?.failed || 0;
      const iFail = r.investors?.failed || 0;
      setBatchProgress(`Done: ${aSent} agencies, ${iSent} investors sent${aFail + iFail > 0 ? ` (${aFail + iFail} failed)` : ''}`);
      await loadWeeklyPlan(true);
    } catch (e) {
      setBatchProgress('Batch send failed — try again');
    } finally {
      setBatchSending(false);
      setTimeout(() => setBatchProgress(''), 5000);
    }
  };

  const sendEmail = async (id: string, type: 'agency' | 'investor') => {
    setSendingId(id);
    const edit = draftEdits[id];
    try {
      const draftRes = await apiFetch('/platform/outreach/generate-draft', {
        method: 'POST',
        body: JSON.stringify({ target_type: type, target_id: id }),
      });
      await apiFetch(`/platform/outreach/approve-draft/${draftRes.draft_id}`, {
        method: 'POST',
        body: JSON.stringify({ subject: edit?.subject, body: edit?.body }),
      });
      if (type === 'agency') setAgencyStatuses(prev => ({ ...prev, [id]: 'sent' }));
      else setInvestorStatuses(prev => ({ ...prev, [id]: 'sent' }));
    } catch {
      if (type === 'agency') setAgencyStatuses(prev => ({ ...prev, [id]: 'failed' }));
      else setInvestorStatuses(prev => ({ ...prev, [id]: 'failed' }));
    } finally {
      setSendingId(null);
      setExpandedDraft(null);
    }
  };

  const skipEmail = (id: string, type: 'agency' | 'investor') => {
    if (type === 'agency') setAgencyStatuses(prev => ({ ...prev, [id]: 'skipped' }));
    else setInvestorStatuses(prev => ({ ...prev, [id]: 'skipped' }));
    setExpandedDraft(null);
  };

  const markCalled = async (rowId: string) => {
    setCallStatuses(prev => ({ ...prev, [rowId]: true }));
    try {
      await apiFetch(`/platform/outreach/mark-called/${rowId}`, {
        method: 'POST',
        body: JSON.stringify({ notes: callNotes[rowId] || '' }),
      });
    } catch { /* keep optimistic */ }
  };

  // ── Computed values ───────────────────────────────────────────────

  const currentDay = weeklyPlan?.days[selectedDayIdx] || null;
  const greeting = greetingByTime();

  const agencySentCount = currentDay?.agency_drafts.filter(a => agencyStatuses[a.id] === 'sent').length || 0;
  const agencyTotal = currentDay?.agency_drafts.length || 0;
  const callsMadeCount = currentDay?.calls.filter(c => callStatuses[c.id]).length || 0;
  const callsTotal = currentDay?.calls.length || 0;
  const investorSentCount = currentDay?.investor_drafts.filter(i => investorStatuses[i.id] === 'sent').length || 0;
  const investorTotal = currentDay?.investor_drafts.length || 0;

  // Week totals
  const weekAgencySent = weeklyPlan?.days.reduce((sum, d) => sum + d.agency_drafts.filter(a => agencyStatuses[a.id] === 'sent').length, 0) || 0;
  const weekInvestorSent = weeklyPlan?.days.reduce((sum, d) => sum + d.investor_drafts.filter(i => investorStatuses[i.id] === 'sent').length, 0) || 0;
  const weekCallsMade = weeklyPlan?.days.reduce((sum, d) => sum + d.calls.filter(c => callStatuses[c.id]).length, 0) || 0;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">
        {/* ── Top Banner ──────────────────────────────────── */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <greeting.Icon className="w-5 h-5 text-teal-500 shrink-0" />
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{greeting.text}, Muse</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Week of {weeklyPlan?.week_start || '...'} — {weeklyPlan?.week_end || '...'}
                    {weeklyPlan && <span className="text-slate-400 ml-1">(Week {weekOffset + 1} of {weeklyPlan.total_weeks})</span>}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { const w = weekOffset - 1; setWeekOffset(w); loadWeeklyPlan(true, w); }}
                      disabled={weekOffset <= 0 || refreshing}
                      className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => { setWeekOffset(0); loadWeeklyPlan(true, 0); }}
                      disabled={weekOffset === 0 || refreshing}
                      className="px-2 py-1 text-xs font-medium text-teal-600 rounded-md hover:bg-teal-50 disabled:opacity-30 transition-colors"
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => { const w = weekOffset + 1; setWeekOffset(w); loadWeeklyPlan(true, w); }}
                      disabled={(weeklyPlan?.all_contacts_covered) || refreshing}
                      className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      title="Next week"
                    >
                      <ChevronRightIcon className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => loadWeeklyPlan(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium disabled:opacity-50 shrink-0 self-start sm:self-auto"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Week stats summary */}
            {!loading && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <MiniStat label="Agency Emails (Week)" value={`${weekAgencySent}/${weeklyPlan?.days.reduce((s, d) => s + d.agency_drafts.length, 0) || 0}`} />
                <MiniStat label="Investor Emails (Week)" value={`${weekInvestorSent}/${weeklyPlan?.days.reduce((s, d) => s + d.investor_drafts.length, 0) || 0}`} />
                <MiniStat label="Calls Made (Week)" value={`${weekCallsMade}/${weeklyPlan?.days.reduce((s, d) => s + d.calls.length, 0) || 0}`} />
                <MiniStat label="Total Leads in CRM" value={`${weeklyPlan?.stats.total_leads || 0}`} />
              </div>
            )}

            {/* ── Day Picker ─────────────────────────────────── */}
            {!loading && weeklyPlan && (
              <div className={`grid gap-2 grid-cols-2 sm:grid-cols-3 ${weeklyPlan.days.length <= 4 ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
                {weeklyPlan.days.map((day, idx) => {
                  const daySent = day.agency_drafts.filter(a => agencyStatuses[a.id] === 'sent').length;
                  const dayInvSent = day.investor_drafts.filter(i => investorStatuses[i.id] === 'sent').length;
                  const dayCalls = day.calls.filter(c => callStatuses[c.id]).length;
                  const dayTotal = day.agency_drafts.length + day.investor_drafts.length + day.calls.length;
                  const dayDone = daySent + dayInvSent + dayCalls;
                  const isSelected = idx === selectedDayIdx;
                  const pct = dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0;

                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`rounded-xl p-3 text-left transition-all border-2 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 shadow-sm'
                          : day.is_today
                            ? 'border-teal-200 bg-teal-50/50 hover:border-teal-300'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
                          {day.day_name}
                        </span>
                        {day.is_today && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-teal-500 text-white rounded-full">
                            TODAY
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2">
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Emails</span>
                          <span className={`font-medium ${daySent === day.agency_drafts.length && day.agency_drafts.length > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {daySent}/{day.agency_drafts.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Investors</span>
                          <span className={`font-medium ${dayInvSent === day.investor_drafts.length && day.investor_drafts.length > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {dayInvSent}/{day.investor_drafts.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Calls</span>
                          <span className={`font-medium ${dayCalls === day.calls.length && day.calls.length > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {dayCalls}/{day.calls.length}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 animate-pulse">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="h-32 bg-slate-100 rounded-xl" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Selected Day Header ─────────────────────────── */}
        {currentDay && !loading && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSelectedDayIdx(Math.max(0, selectedDayIdx - 1))}
                disabled={selectedDayIdx === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-teal-500 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {currentDay.day_name}, {new Date(currentDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h2>
                {currentDay.is_today && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full shrink-0">Today</span>
                )}
              </div>
              <button
                onClick={() => setSelectedDayIdx(Math.min((weeklyPlan?.days.length || 5) - 1, selectedDayIdx + 1))}
                disabled={selectedDayIdx >= (weeklyPlan?.days.length || 5) - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 shrink-0"
              >
                <ChevronRightIcon className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto overflow-x-auto">
              <StatPill icon={<Mail className="w-3.5 h-3.5" />} label="Emails" done={agencySentCount} total={agencyTotal} color="teal" />
              <StatPill icon={<Phone className="w-3.5 h-3.5" />} label="Calls" done={callsMadeCount} total={callsTotal} color="indigo" />
              <StatPill icon={<DollarSign className="w-3.5 h-3.5" />} label="Investors" done={investorSentCount} total={investorTotal} color="violet" />
            </div>
          </div>
        )}

        {/* ── Tab Navigation ──────────────────────────────── */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-full sm:w-fit overflow-x-auto">
          {([
            { key: 'agencies' as TabKey, label: 'Agency Emails', Icon: Mail, count: `${agencySentCount}/${agencyTotal}` },
            { key: 'calls' as TabKey, label: 'Phone Calls', Icon: Phone, count: `${callsMadeCount}/${callsTotal}` },
            { key: 'investors' as TabKey, label: 'Investor Emails', Icon: DollarSign, count: `${investorSentCount}/${investorTotal}` },
          ]).map(({ key, label, Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-teal-400/40 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Batch Send Bar ──────────────────────────────── */}
        {currentDay && (agencySentCount < agencyTotal || investorSentCount < investorTotal) && (
          <div className="flex items-center gap-3 mb-4 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
            <button
              onClick={sendAllEmails}
              disabled={batchSending}
              className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {batchSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {batchSending ? 'Sending...' : 'Send All Remaining Emails'}
            </button>
            <span className="text-sm text-teal-700">
              {agencyTotal - agencySentCount} agencies + {investorTotal - investorSentCount} investors pending
            </span>
            {batchProgress && (
              <span className="text-sm font-medium text-teal-800 ml-auto">{batchProgress}</span>
            )}
          </div>
        )}

        {/* ── Tab Content ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          {activeTab === 'agencies' && currentDay && (
            <AgencyDraftTable
              rows={currentDay.agency_drafts}
              statuses={agencyStatuses}
              loading={loading}
              expandedDraft={expandedDraft}
              draftEdits={draftEdits}
              sendingId={sendingId}
              onToggleDraft={(id) => setExpandedDraft(expandedDraft === id ? null : id)}
              onEditDraft={(id, edit) => setDraftEdits(prev => ({ ...prev, [id]: edit }))}
              onSend={(id) => sendEmail(id, 'agency')}
              onSkip={(id) => skipEmail(id, 'agency')}
            />
          )}
          {activeTab === 'calls' && currentDay && (
            <>
              <PhoneScriptsPanel />
              <CallsTable
                rows={currentDay.calls}
                statuses={callStatuses}
                notes={callNotes}
                loading={loading}
                onMarkCalled={markCalled}
                onNotesChange={(id, val) => setCallNotes(prev => ({ ...prev, [id]: val }))}
              />
            </>
          )}
          {activeTab === 'investors' && currentDay && (
            <InvestorDraftTable
              rows={currentDay.investor_drafts}
              statuses={investorStatuses}
              loading={loading}
              expandedDraft={expandedDraft}
              draftEdits={draftEdits}
              sendingId={sendingId}
              onToggleDraft={(id) => setExpandedDraft(expandedDraft === id ? null : id)}
              onEditDraft={(id, edit) => setDraftEdits(prev => ({ ...prev, [id]: edit }))}
              onSend={(id) => sendEmail(id, 'investor')}
              onSkip={(id) => skipEmail(id, 'investor')}
            />
          )}
          {!currentDay && !loading && (
            <div className="px-4 py-12 text-center text-slate-400">No data loaded</div>
          )}
        </div>

        {/* ── CEO Notes ───────────────────────────────────── */}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Yesterday&apos;s Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{yesterdaySummary}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Mini Stat ────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ── Stat Pill ────────────────────────────────────────────────────────

function StatPill({ icon, label, done, total, color }: {
  icon: React.ReactNode; label: string; done: number; total: number;
  color: 'teal' | 'indigo' | 'violet';
}) {
  const colors = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${colors[color]}`}>
      {icon}
      <span>{label}: {done}/{total}</span>
    </div>
  );
}

// ── Agency Draft Table ───────────────────────────────────────────────

function AgencyDraftTable({
  rows, statuses, loading, expandedDraft, draftEdits, sendingId,
  onToggleDraft, onEditDraft, onSend, onSkip,
}: {
  rows: AgencyDraft[];
  statuses: Record<string, string>;
  loading: boolean;
  expandedDraft: string | null;
  draftEdits: Record<string, DraftEdit>;
  sendingId: string | null;
  onToggleDraft: (id: string) => void;
  onEditDraft: (id: string, edit: DraftEdit) => void;
  onSend: (id: string) => void;
  onSkip: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject Preview</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : rows.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">
              <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />No agency emails for this day
            </td></tr>
          ) : (
            rows.map((row) => {
              const status = statuses[row.id] || 'pending';
              const isExpanded = expandedDraft === row.id;
              const isSent = status === 'sent' || status === 'email_sent' || (row.email_send_count > 0);
              const isSkipped = status === 'skipped';
              const isFailed = status === 'failed';
              const edit = draftEdits[row.id];

              return (
                <React.Fragment key={row.id}>
                  <tr className={`border-b border-slate-50 transition-colors ${
                    isExpanded ? 'bg-teal-50/30' : isSent ? 'bg-emerald-50/30' : isFailed ? 'bg-red-50/30' : 'hover:bg-slate-50/50'
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
                    <td className="px-4 py-3">
                      <span className="text-slate-500 text-xs truncate block max-w-[200px]">{edit?.subject || row.draft_subject}</span>
                    </td>
                    <td className="px-4 py-3">{priorityBadge(row.priority)}</td>
                    <td className="px-4 py-3 text-right">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Sent
                        </span>
                      ) : isFailed ? (
                        <button
                          onClick={() => onToggleDraft(row.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          Failed — Retry
                        </button>
                      ) : isSkipped ? (
                        <span className="text-xs text-slate-400">Skipped</span>
                      ) : (
                        <button
                          onClick={() => onToggleDraft(row.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          {isExpanded ? 'Collapse' : 'Review Draft'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && edit && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-teal-50/20 border-b border-teal-100">
                        <DraftEditor
                          edit={edit}
                          sending={sendingId === row.id}
                          onChange={(e) => onEditDraft(row.id, e)}
                          onApprove={() => onSend(row.id)}
                          onSkip={() => onSkip(row.id)}
                          accent="teal"
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

// ── Phone Scripts Panel ──────────────────────────────────────────────

const PHONE_SCRIPTS = [
  {
    id: 'cold',
    title: 'Cold Call — First Contact',
    steps: [
      { label: 'Intro', text: `"Hi, this is Muse Ibrahim from PalmCare AI. I'm reaching out to home care agencies in [STATE] — is this [AGENCY NAME]?"` },
      { label: 'Hook', text: `"We built an AI platform that lets your staff record client assessments on their phone and automatically generates compliant care plans, contracts, and billing — saving agencies 15+ hours a week on paperwork."` },
      { label: 'Qualify', text: `"How many clients are you currently managing? And what software are you using for your documentation right now?"` },
      { label: 'Pain Point', text: `"A lot of agencies we work with were spending hours on manual intake forms and compliance docs. Are you running into similar challenges?"` },
      { label: 'Offer', text: `"I'd love to show you a quick 30-minute demo — no commitment. You'll see exactly how it works with a real assessment recording. Would [DAY] at [TIME] work for you?"` },
      { label: 'Collect Info', text: `"Great! Let me grab your info — what's the best email to send the calendar invite to? And who else on your team should I include?"` },
      { label: 'Close', text: `"Perfect. I'll send that over right now. Looking forward to showing you what PalmCare can do for [AGENCY NAME]. Have a great day!"` },
    ],
  },
  {
    id: 'warm',
    title: 'Warm Follow-Up — After Email',
    steps: [
      { label: 'Intro', text: `"Hi, this is Muse from PalmCare AI. I sent over an email earlier this week about our AI-powered documentation platform for home care — did you get a chance to take a look?"` },
      { label: 'Re-hook', text: `"No worries if not — the quick version is we help agencies like yours cut documentation time by 80% using voice AI. Your staff just records the assessment on their phone and our system handles the rest — care plans, contracts, billing codes, all compliant."` },
      { label: 'Social Proof', text: `"We're already working with agencies across [X] states. Agencies tell us it's a game-changer — they're saving 15+ hours a week on documentation alone."` },
      { label: 'Ask', text: `"Would you be open to a quick 30-minute demo this week? I can walk you through exactly how it works with your type of services."` },
      { label: 'Objection — Too Busy', text: `"Totally understand — that's actually why agencies love it. It frees up so much time. Even 15 minutes would be enough to show you the value."` },
      { label: 'Objection — Have Software', text: `"That's great — we actually integrate alongside existing systems. Most agencies find PalmCare handles the clinical documentation and intake side much faster than what they're currently using."` },
      { label: 'Close', text: `"Let me send you a quick calendar link — what's the best email and time for you?"` },
    ],
  },
  {
    id: 'demo',
    title: 'Demo Confirmation',
    steps: [
      { label: 'Intro', text: `"Hi [NAME], this is Muse from PalmCare AI. I'm calling to confirm your demo scheduled for [DATE] at [TIME] — does that still work for you?"` },
      { label: 'Set Expectations', text: `"Great! The demo will be about 30 minutes. I'll walk you through a live assessment recording, show you how contracts and care plans are generated automatically, and answer any questions."` },
      { label: 'Prep Question', text: `"To make the demo most relevant for you — what type of services does your agency primarily provide? And roughly how many clients are you managing?"` },
      { label: 'Decision Makers', text: `"Will anyone else from your team be joining? It's really helpful if your administrator or clinical director can see it too."` },
      { label: 'Tech Check', text: `"You'll get a Google Meet link in your email — just make sure you have a decent internet connection and you're good to go."` },
      { label: 'Close', text: `"Awesome — I'm looking forward to it. If anything comes up, just reply to the email or call me back at this number. See you on [DATE]!"` },
    ],
  },
  {
    id: 'data',
    title: 'Data Checklist',
    steps: [
      { label: 'Company Name', text: `Confirm the full legal name of the agency.` },
      { label: 'Contact Info', text: `Full name, title/role, email, direct phone number.` },
      { label: 'State & City', text: `Where they operate — ask if they serve multiple states.` },
      { label: 'Services', text: `Hospice, IDD, Non-Skilled, Skilled Nursing, Personal Care, Companion Care?` },
      { label: 'Client Count', text: `"Roughly how many active clients do you have right now?" (1-10, 11-25, 26-50, 51-100, 101-250, 250+)` },
      { label: 'Current Software', text: `"What are you using for documentation/scheduling today?"` },
      { label: 'Pain Points', text: `"What's your biggest challenge with documentation or compliance right now?"` },
      { label: 'Timeline', text: `"Are you actively looking for a solution, or just exploring?"` },
      { label: 'Budget Authority', text: `"Are you the one who makes software decisions, or should I loop someone else in?"` },
      { label: 'Source', text: `"How did you hear about PalmCare AI?"` },
    ],
  },
];

function PhoneScriptsPanel() {
  const [open, setOpen] = useState(false);
  const [activeScript, setActiveScript] = useState('cold');
  const script = PHONE_SCRIPTS.find(s => s.id === activeScript) || PHONE_SCRIPTS[0];

  return (
    <div className="m-4 mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Phone Call Scripts & Data Checklist
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="mt-2 border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {PHONE_SCRIPTS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveScript(s.id)}
                className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  activeScript === s.id ? 'text-indigo-700 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {script.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide pt-0.5">{step.label}</span>
                <p className="text-sm text-slate-700 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calls Table ─────────────────────────────────────────────────────

function CallsTable({
  rows, statuses, notes, loading, onMarkCalled, onNotesChange,
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
            <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">
              <Phone className="w-8 h-8 mx-auto mb-2 text-slate-300" />No calls scheduled for this day
            </td></tr>
          ) : (
            rows.map((row) => {
              const called = statuses[row.id] || false;
              return (
                <tr key={row.id} className={`border-b border-slate-50 transition-colors ${called ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-4 py-3"><span className="font-medium text-slate-800">{row.provider_name}</span></td>
                  <td className="px-4 py-3 text-slate-500">{[row.city, row.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    {row.phone ? (
                      <a href={`tel:${row.phone}`} className="text-teal-600 hover:underline font-mono text-xs">{row.phone}</a>
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
                        <Check className="w-3 h-3" /> Mark Called
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

// ── Investor Draft Table ─────────────────────────────────────────────

function InvestorDraftTable({
  rows, statuses, loading, expandedDraft, draftEdits, sendingId,
  onToggleDraft, onEditDraft, onSend, onSkip,
}: {
  rows: InvestorDraft[];
  statuses: Record<string, string>;
  loading: boolean;
  expandedDraft: string | null;
  draftEdits: Record<string, DraftEdit>;
  sendingId: string | null;
  onToggleDraft: (id: string) => void;
  onEditDraft: (id: string, edit: DraftEdit) => void;
  onSend: (id: string) => void;
  onSkip: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fund</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject Preview</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check Size</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
          ) : rows.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />No investor emails for this day
            </td></tr>
          ) : (
            rows.map((row) => {
              const status = statuses[row.id] || 'pending';
              const isExpanded = expandedDraft === row.id;
              const isSent = status === 'sent' || status === 'email_sent';
              const isSkipped = status === 'skipped';
              const edit = draftEdits[row.id];

              return (
                <React.Fragment key={row.id}>
                  <tr className={`border-b border-slate-50 transition-colors ${
                    isExpanded ? 'bg-violet-50/30' : isSent ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'
                  }`}>
                    <td className="px-4 py-3"><span className="font-medium text-slate-800">{row.fund_name}</span></td>
                    <td className="px-4 py-3 text-slate-600">{row.contact_name || '—'}</td>
                    <td className="px-4 py-3"><span className="text-slate-600 font-mono text-xs">{row.contact_email || '—'}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-slate-500 text-xs truncate block max-w-[200px]">{edit?.subject || row.draft_subject}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.check_size_display || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Sent
                        </span>
                      ) : isSkipped ? (
                        <span className="text-xs text-slate-400">Skipped</span>
                      ) : (
                        <button
                          onClick={() => onToggleDraft(row.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          {isExpanded ? 'Collapse' : 'Review Draft'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && edit && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-violet-50/20 border-b border-violet-100">
                        <DraftEditor
                          edit={edit}
                          sending={sendingId === row.id}
                          onChange={(e) => onEditDraft(row.id, e)}
                          onApprove={() => onSend(row.id)}
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
  edit, sending, onChange, onApprove, onSkip, accent = 'teal',
}: {
  edit: DraftEdit;
  sending: boolean;
  onChange: (d: DraftEdit) => void;
  onApprove: () => void;
  onSkip: () => void;
  accent?: 'teal' | 'violet';
}) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const btnColor = accent === 'violet' ? 'bg-violet-500 hover:bg-violet-600' : 'bg-teal-500 hover:bg-teal-600';
  const isHtml = edit.body.trim().startsWith('<');

  return (
    <div className="space-y-3 max-w-2xl">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
        <input
          type="text"
          value={edit.subject}
          onChange={(e) => onChange({ ...edit, subject: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-500">Body</label>
          {isHtml && (
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setMode('preview')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'preview' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Preview
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'edit' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Edit HTML
              </button>
            </div>
          )}
        </div>
        {isHtml && mode === 'preview' ? (
          <div
            className="w-full bg-white border border-slate-200 rounded-lg overflow-auto"
            style={{ maxHeight: 420 }}
          >
            <iframe
              srcDoc={edit.body}
              className="w-full border-0"
              style={{ minHeight: 350, height: 400 }}
              sandbox="allow-same-origin"
              title="Email preview"
            />
          </div>
        ) : (
          <textarea
            value={edit.body}
            onChange={(e) => onChange({ ...edit, body: e.target.value })}
            rows={isHtml ? 12 : 8}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none font-mono text-xs"
          />
        )}
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
          <X className="w-4 h-4" /> Skip
        </button>
      </div>
    </div>
  );
}

// ── Mock data (fallback when API not available) ──────────────────────

function mockWeeklyPlan(): WeeklyPlan {
  const states = ['NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  const cities = ['New York', 'Los Angeles', 'Houston', 'Miami', 'Chicago', 'Philadelphia', 'Columbus', 'Atlanta', 'Charlotte', 'Detroit'];
  const priorities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
  const investors = [
    'Andreessen Horowitz', 'General Catalyst', 'Founders Fund', 'Lux Capital',
    'NEA', 'Khosla Ventures', 'SignalFire', 'First Round', 'Bessemer', 'GV',
  ];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const todayDow = new Date().getDay();
  const todayIdx = todayDow >= 1 && todayDow <= 5 ? todayDow - 1 : 0;

  const now = new Date();
  const monday = new Date(now);
  const daysSinceMon = (now.getDay() - 1 + 7) % 7;
  monday.setDate(now.getDate() - daysSinceMon);

  const days: DayPlan[] = dayNames.map((name, idx) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + idx);

    return {
      date: date.toISOString().slice(0, 10),
      day_name: name,
      is_today: idx === todayIdx,
      agency_drafts: Array.from({ length: 50 }, (_, i) => ({
        id: `a-${idx}-${i}`,
        provider_name: `${cities[i % 10]} Home Health ${idx * 50 + i + 1}`,
        city: cities[i % 10],
        state: states[i % 10],
        contact_email: `contact${idx * 50 + i + 1}@agency.com`,
        contact_name: null,
        phone: null,
        priority: priorities[i % 3],
        status: 'pending',
        email_send_count: 0,
        draft_subject: `Reduce Paperwork by 80% — PalmCare AI for ${cities[i % 10]} Home Health ${idx * 50 + i + 1}`,
        draft_body: `Hi ${cities[i % 10]} Home Health team,\n\nI'm Muse Ibrahim, CEO of PalmCare AI...`,
        is_html: true,
      })),
      investor_drafts: Array.from({ length: 10 }, (_, i) => ({
        id: `i-${idx}-${i}`,
        fund_name: investors[i],
        contact_name: `Partner ${i + 1}`,
        contact_email: `partner@${investors[i].toLowerCase().replace(/\s+/g, '')}.com`,
        check_size_display: `$${(i + 1) * 50}K–$${(i + 1) * 200}K`,
        priority: priorities[i % 3],
        status: 'pending',
        email_send_count: 0,
        draft_subject: `PalmCare AI — Voice-Powered AI for Home Healthcare ($92K ARR, Pre-Seed)`,
        draft_body: `Dear Partner ${i + 1},\n\nI'm Muse Ibrahim, CEO of PalmCare AI...`,
        is_html: false,
      })),
      calls: Array.from({ length: 10 }, (_, i) => ({
        id: `c-${idx}-${i}`,
        provider_name: `${cities[i]} Care Services`,
        city: cities[i],
        state: states[i],
        phone: `(${500 + i}) 555-${String(1000 + i).slice(1)}`,
        priority: priorities[i % 3],
        notes: '',
        is_contacted: false,
      })),
    };
  });

  return {
    days,
    stats: {
      total_leads: 163,
      leads_with_email: 120,
      leads_contacted: 0,
      leads_remaining_email: 120,
      leads_no_email: 43,
      calls_remaining: 43,
      total_investors: 63,
      investors_with_email: 60,
      investors_contacted: 0,
      investors_remaining: 60,
    },
    week_start: days[0].date,
    week_end: days[days.length - 1].date,
    week_offset: 0,
    total_weeks: 3,
    all_contacts_covered: false,
  };
}
