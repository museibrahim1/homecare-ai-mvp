'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useRouter } from 'next/navigation';
import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import {
  Mail, Phone, Send, Check, X, Loader2, RefreshCw,
  CheckCircle2, Edit3, Search,
  DollarSign, StickyNote,
  Sun, Coffee, Moon,
  ChevronDown, ChevronUp, FileText, Calendar,
  ChevronLeft, ChevronRight as ChevronRightIcon,
  Eye, PhoneForwarded, Users, MapPin,
  Bot, Sparkles, MessageSquare,
  ListChecks, MailX, PhoneCall, Target,
} from 'lucide-react';

import { API_BASE, greetingByTime, priorityBadge, SkeletonRow } from './shared';
import {
  AgencyDraft, InvestorDraft, CallRow, CallbackItem, TeamMember,
  StateCount, DayPlan, WeeklyPlan, DraftEdit, TabKey,
} from './types';
import {
  WeeklyTodoSection, MiniStat, StatPill, AgencyDraftTable,
  PhoneScriptsPanel, CallsTable, InvestorDraftTable, DraftEditor, mockWeeklyPlan,
} from './sections';

export default function CommandCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('agencies');
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Per-entity state
  const [agencyStatuses, setAgencyStatuses] = useState<Record<string, string>>({});
  const [investorStatuses, setInvestorStatuses] = useState<Record<string, string>>({});
  const [callStatuses, setCallStatuses] = useState<Record<string, boolean>>({});
  const [callNotes, setCallNotes] = useState<Record<string, string>>({});

  // Draft editing
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEdit>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Callbacks, assignments, team
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableStates, setAvailableStates] = useState<StateCount[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignType, setAssignType] = useState<'call' | 'email'>('call');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignCount, setAssignCount] = useState(25);
  const [assignStates, setAssignStates] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  // CEO Notes
  const [ceoNotes, setCeoNotes] = useState('');
  const [yesterdaySummary, setYesterdaySummary] = useState('');
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Task creation for team members
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('high');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Territory assignment
  const [territoryOpen, setTerritoryOpen] = useState(false);
  const [territories, setTerritories] = useState<{
    team: Array<{ user_id: string; name: string; title: string; states: string[]; lead_count: number }>;
    all_states: Array<{ code: string; name: string; region: string }>;
    regions: Record<string, string[]>;
  } | null>(null);
  const [selectedTerritoryStates, setSelectedTerritoryStates] = useState<string[]>([]);
  const [territoryUserId, setTerritoryUserId] = useState('me');
  const [savingTerritory, setSavingTerritory] = useState(false);

  // AI Agent
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentMessages, setAgentMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const agentScrollRef = useRef<HTMLDivElement | null>(null);
  const agentInputRef = useRef<HTMLInputElement | null>(null);

  // Current user info & tasks
  const [currentUser, setCurrentUser] = useState<{ id?: string; full_name?: string; email?: string; role?: string } | null>(null);
  const [myTasks, setMyTasks] = useState<Array<{
    id: string; title: string; description?: string; status: string;
    priority: string; due_date?: string; assigned_by_name?: string;
  }>>([]);

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

  const loadCallbacks = useCallback(async () => {
    try {
      const data = await apiFetch('/platform/outreach/callbacks');
      setCallbacks(data);
    } catch { /* ignore */ }
  }, [apiFetch]);

  const loadTeamAndStates = useCallback(async () => {
    try {
      const [team, states] = await Promise.all([
        apiFetch('/admin/team'),
        apiFetch('/platform/outreach/available-states'),
      ]);
      setTeamMembers(team);
      setAvailableStates(states);
    } catch { /* ignore */ }
  }, [apiFetch]);

  const loadUserInfo = useCallback(async () => {
    try {
      const user = await apiFetch('/auth/me');
      setCurrentUser(user);
    } catch { /* ignore */ }
  }, [apiFetch]);

  const loadMyTasks = useCallback(async () => {
    try {
      const tasks = await apiFetch('/notes/tasks?assigned_to_me=true');
      setMyTasks((tasks || []).filter((t: any) => t.status !== 'done' && t.status !== 'cancelled'));
    } catch { setMyTasks([]); }
  }, [apiFetch]);

  const loadTerritories = useCallback(async () => {
    try {
      const data = await apiFetch('/admin/scheduler/territories');
      setTerritories(data);
    } catch { /* ignore */ }
  }, [apiFetch]);

  const saveTerritories = useCallback(async (userId: string, states: string[]) => {
    setSavingTerritory(true);
    try {
      await apiFetch(`/admin/scheduler/territories/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ states }),
      });
      await loadTerritories();
    } catch { /* ignore */ }
    setSavingTerritory(false);
  }, [apiFetch, loadTerritories]);

  // Load everything in parallel on mount
  useEffect(() => {
    Promise.all([loadWeeklyPlan(), loadCallbacks(), loadTeamAndStates(), loadUserInfo(), loadMyTasks(), loadTerritories()]);
  }, [loadWeeklyPlan, loadCallbacks, loadTeamAndStates, loadUserInfo, loadMyTasks, loadTerritories]);

  // Init selected states when territories load
  useEffect(() => {
    if (territories && currentUser) {
      const me = territories.team.find(t => t.user_id === (currentUser as any)?.id) || territories.team[0];
      if (me) {
        setSelectedTerritoryStates(me.states || []);
        setTerritoryUserId(me.user_id);
      }
    }
  }, [territories, currentUser]);

  const handleMarkCallback = async (leadId: string, callbackNotes: string) => {
    await apiFetch(`/platform/outreach/mark-callback/${leadId}`, {
      method: 'POST',
      body: JSON.stringify({ callback_notes: callbackNotes }),
    });
    loadWeeklyPlan(true);
    loadCallbacks();
  };

  const handleCompleteCallback = async (leadId: string, notes: string) => {
    await apiFetch(`/platform/outreach/callbacks/${leadId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    loadCallbacks();
    loadWeeklyPlan(true);
  };

  const handleAssignLeads = async () => {
    setAssigning(true);
    try {
      await apiFetch('/platform/outreach/assign', {
        method: 'POST',
        body: JSON.stringify({
          user_id: assignUserId,
          assign_type: assignType,
          count: assignCount,
          states: assignStates.length > 0 ? assignStates : undefined,
        }),
      });
      setAssignModalOpen(false);
      loadWeeklyPlan(true);
      loadTeamAndStates();
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      await apiFetch('/notes/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || null,
          priority: newTaskPriority,
          due_date: newTaskDueDate || null,
          assigned_to_id: newTaskAssignee || null,
        }),
      });
      setTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('high');
      setNewTaskDueDate('');
      setNewTaskAssignee('');
      loadMyTasks();
    } catch { /* ignore */ }
    finally { setCreatingTask(false); }
  };

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

  // ── AI Agent send ─────────────────────────────────────────────
  const handleAgentSend = async () => {
    const msg = agentInput.trim();
    if (!msg || agentLoading) return;
    setAgentInput('');

    const userMsg = { role: 'user', content: msg };
    setAgentMessages(prev => [...prev, userMsg]);
    setAgentLoading(true);

    try {
      const history = agentMessages.slice(-20);
      const data = await apiFetch('/platform/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, history }),
      });
      const assistantMsg = { role: 'assistant', content: data.response };
      setAgentMessages(prev => [...prev, assistantMsg]);

      if (data.tool_calls?.some((tc: { tool: string }) =>
        ['batch_send_emails', 'mark_call_done', 'assign_leads_to_team', 'send_single_email'].includes(tc.tool)
      )) {
        loadWeeklyPlan(true);
        loadCallbacks();
      }
    } catch (e) {
      setAgentMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Something went wrong'}` }]);
    } finally {
      setAgentLoading(false);
      setTimeout(() => agentScrollRef.current?.scrollTo({ top: agentScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
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

  const sq = searchQuery.toLowerCase().trim();
  const matchSearch = useCallback((...fields: (string | null | undefined)[]) => {
    if (!sq) return true;
    return fields.some(f => f?.toLowerCase().includes(sq));
  }, [sq]);

  const filteredAgencies = useMemo(() =>
    currentDay?.agency_drafts.filter(a => matchSearch(a.provider_name, a.phone, a.contact_email, a.contact_name, a.city, a.state)) || [],
    [currentDay, matchSearch]);
  const filteredCalls = useMemo(() =>
    currentDay?.calls.filter(c => matchSearch(c.provider_name, c.phone, c.contact_name, c.contact_email, c.city, c.state)) || [],
    [currentDay, matchSearch]);
  const filteredInvestors = useMemo(() =>
    currentDay?.investor_drafts.filter(i => matchSearch(i.fund_name, i.contact_name, i.contact_email)) || [],
    [currentDay, matchSearch]);
  const filteredCallbacks = useMemo(() =>
    callbacks.filter(cb => matchSearch(cb.provider_name, cb.phone, cb.contact_name, cb.contact_email, cb.city, cb.state, cb.callback_notes, cb.notes)),
    [callbacks, matchSearch]);

  const agencySentCount = useMemo(() => currentDay?.agency_drafts.filter(a => agencyStatuses[a.id] === 'sent').length || 0, [currentDay, agencyStatuses]);
  const agencyTotal = currentDay?.agency_drafts.length || 0;
  const callsMadeCount = useMemo(() => currentDay?.calls.filter(c => callStatuses[c.id]).length || 0, [currentDay, callStatuses]);
  const callsTotal = currentDay?.calls.length || 0;
  const investorSentCount = useMemo(() => currentDay?.investor_drafts.filter(i => investorStatuses[i.id] === 'sent').length || 0, [currentDay, investorStatuses]);
  const investorTotal = currentDay?.investor_drafts.length || 0;

  const weekAgencySent = useMemo(() => weeklyPlan?.days.reduce((sum, d) => sum + d.agency_drafts.filter(a => agencyStatuses[a.id] === 'sent').length, 0) || 0, [weeklyPlan, agencyStatuses]);
  const weekInvestorSent = useMemo(() => weeklyPlan?.days.reduce((sum, d) => sum + d.investor_drafts.filter(i => investorStatuses[i.id] === 'sent').length, 0) || 0, [weeklyPlan, investorStatuses]);
  const weekCallsMade = useMemo(() => weeklyPlan?.days.reduce((sum, d) => sum + d.calls.filter(c => callStatuses[c.id]).length, 0) || 0, [weeklyPlan, callStatuses]);

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
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{greeting.text}, {currentUser?.full_name?.split(' ')[0] || 'there'}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Week of {weeklyPlan?.week_start || '...'} — {weeklyPlan?.week_end || '...'}
                    {weeklyPlan && <span className="text-slate-400 ml-1">
                      {weekOffset < 0 ? `(${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? 's' : ''} ago)` : weekOffset === 0 ? '(Current week)' : `(Week ${weekOffset + 1} of ${weeklyPlan.total_weeks})`}
                    </span>}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { const w = weekOffset - 1; setWeekOffset(w); loadWeeklyPlan(true, w); }}
                      disabled={refreshing}
                      className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      title="Previous week"
                      aria-label="Previous week"
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
                      aria-label="Next week"
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

            {/* Unsent Emails & Call Tracking */}
            {!loading && weeklyPlan && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Unsent Agency Emails</p>
                  <p className="text-lg font-bold text-amber-700">{weeklyPlan.stats.unsent_agency_emails}</p>
                </div>
                <div className="bg-violet-50 rounded-lg px-3 py-2 border border-violet-200">
                  <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Unsent Investor Emails</p>
                  <p className="text-lg font-bold text-violet-700">{weeklyPlan.stats.unsent_investor_emails}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Numbers Called</p>
                  <p className="text-lg font-bold text-emerald-700">{weeklyPlan.stats.total_called} / {weeklyPlan.stats.total_with_phone}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-200">
                  <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Calls Remaining</p>
                  <p className="text-lg font-bold text-indigo-700">{weeklyPlan.stats.calls_remaining}</p>
                </div>
              </div>
            )}

            {/* ── Weekly TODO ──────────────────────────────────── */}
            {!loading && weeklyPlan && (
              <WeeklyTodoSection weekOffset={weekOffset} weekStart={weeklyPlan.week_start} weekEnd={weeklyPlan.week_end} totalWeeks={weeklyPlan.total_weeks} stats={weeklyPlan.stats} plan={weeklyPlan} />
            )}

            {/* ── Priority Tasks (assigned to this user) ─── */}
            {!loading && myTasks.length > 0 && (
              <div className="mb-5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-teal-800">Priority Tasks</h3>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{myTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {myTasks.map(task => {
                    const pCfg: Record<string, string> = {
                      urgent: 'bg-red-100 text-red-700 border-red-200',
                      high: 'bg-orange-100 text-orange-700 border-orange-200',
                      medium: 'bg-amber-100 text-amber-700 border-amber-200',
                      low: 'bg-slate-100 text-slate-600 border-slate-200',
                    };
                    return (
                      <div key={task.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-slate-200 shadow-sm">
                        <button
                          onClick={async () => {
                            try {
                              await apiFetch(`/notes/tasks/${task.id}/complete`, { method: 'PUT' });
                              setMyTasks(prev => prev.filter(t => t.id !== task.id));
                            } catch {
                              try {
                                await apiFetch(`/notes/tasks/${task.id}`, { method: 'DELETE' });
                                setMyTasks(prev => prev.filter(t => t.id !== task.id));
                              } catch { /* last resort: hide locally */ setMyTasks(prev => prev.filter(t => t.id !== task.id)); }
                            }
                          }}
                          className="w-5 h-5 rounded-full border-2 border-teal-400 hover:bg-teal-100 flex items-center justify-center transition-colors shrink-0"
                          title="Mark complete"
                        >
                          <Check className="w-3 h-3 text-teal-500 opacity-0 hover:opacity-100" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                          {task.description && <p className="text-xs text-slate-500 truncate">{task.description}</p>}
                          <div className="flex items-center gap-2 mt-0.5">
                            {task.assigned_by_name && (
                              <span className="text-[10px] text-slate-400">From: {task.assigned_by_name}</span>
                            )}
                            {task.due_date && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" /> {task.due_date}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pCfg[task.priority] || pCfg.medium}`}>
                          {task.priority}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await apiFetch(`/notes/tasks/${task.id}`, { method: 'DELETE' });
                            } catch { /* ignore */ }
                            setMyTasks(prev => prev.filter(t => t.id !== task.id));
                          }}
                          className="ml-1 p-1 text-slate-300 hover:text-red-500 transition-colors rounded shrink-0"
                          title="Remove task"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── My Calling Territories ───────────────────── */}
            {!loading && (
              <div className="mb-5">
                <button
                  onClick={() => { setTerritoryOpen(!territoryOpen); if (!territories) loadTerritories(); }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-indigo-800">My Calling Territories</h3>
                  {territories && (() => {
                    const me = territories.team.find(t => t.user_id === (currentUser as any)?.id) || territories.team[0];
                    return me?.states?.length ? (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {me.states.length} state{me.states.length !== 1 ? 's' : ''} · {me.lead_count} leads
                      </span>
                    ) : null;
                  })()}
                  <div className="flex-1" />
                  {territoryOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {territoryOpen && territories && (
                  <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    {/* Who to assign */}
                    <div className="flex items-center gap-3 mb-4">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign to:</label>
                      <select
                        value={territoryUserId}
                        onChange={e => {
                          setTerritoryUserId(e.target.value);
                          const member = territories.team.find(t => t.user_id === e.target.value);
                          setSelectedTerritoryStates(member?.states || []);
                        }}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-400"
                      >
                        <option value="me">Myself</option>
                        {territories.team.map(t => (
                          <option key={t.user_id} value={t.user_id}>{t.name}{t.title ? ` (${t.title})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    {/* Region quick-select buttons */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold self-center mr-1">Regions:</span>
                      {Object.entries(territories.regions).map(([region, states]) => {
                        const allSelected = states.every(s => selectedTerritoryStates.includes(s));
                        return (
                          <button
                            key={region}
                            onClick={() => {
                              if (allSelected) {
                                setSelectedTerritoryStates(prev => prev.filter(s => !states.includes(s)));
                              } else {
                                setSelectedTerritoryStates(prev => Array.from(new Set([...prev, ...states])));
                              }
                            }}
                            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                              allSelected
                                ? 'bg-indigo-500 text-white border-indigo-500'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                          >
                            {region.replace('_', ' ')}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setSelectedTerritoryStates(territories.all_states.map(s => s.code))}
                        className="text-xs px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 font-medium"
                      >
                        All States
                      </button>
                      <button
                        onClick={() => setSelectedTerritoryStates([])}
                        className="text-xs px-2.5 py-1 rounded-full border bg-red-50 text-red-500 border-red-200 hover:bg-red-100 font-medium"
                      >
                        Clear
                      </button>
                    </div>

                    {/* State grid */}
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 mb-4">
                      {territories.all_states.map(st => {
                        const selected = selectedTerritoryStates.includes(st.code);
                        return (
                          <button
                            key={st.code}
                            onClick={() => setSelectedTerritoryStates(prev =>
                              selected ? prev.filter(s => s !== st.code) : [...prev, st.code]
                            )}
                            className={`text-xs font-semibold py-1.5 rounded-lg border transition-all ${
                              selected
                                ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-500'
                            }`}
                            title={st.name}
                          >
                            {st.code}
                          </button>
                        );
                      })}
                    </div>

                    {/* Save button */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {selectedTerritoryStates.length} state{selectedTerritoryStates.length !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={() => saveTerritories(territoryUserId, selectedTerritoryStates)}
                        disabled={savingTerritory}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {savingTerritory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save Territories
                      </button>
                    </div>

                    {/* Current team assignments */}
                    {territories.team.filter(t => t.states.length > 0).length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Team Assignments</p>
                        <div className="space-y-1.5">
                          {territories.team.filter(t => t.states.length > 0).map(t => (
                            <div key={t.user_id} className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-slate-700 w-28 truncate">{t.name}</span>
                              <div className="flex flex-wrap gap-1 flex-1">
                                {t.states.slice(0, 10).map(s => (
                                  <span key={s} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">{s}</span>
                                ))}
                                {t.states.length > 10 && <span className="text-slate-400">+{t.states.length - 10} more</span>}
                              </div>
                              <span className="text-slate-400 tabular-nums">{t.lead_count} leads</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                aria-label="Previous day"
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
                aria-label="Next day"
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

        {/* ── Search + Tab Navigation ──────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-shrink-0 w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search phone, name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-full sm:w-fit overflow-x-auto">
          {([
            { key: 'agencies' as TabKey, label: 'Agency Emails', Icon: Mail, count: `${agencySentCount}/${agencyTotal}` },
            { key: 'calls' as TabKey, label: 'Phone Calls', Icon: Phone, count: `${callsMadeCount}/${callsTotal}` },
            { key: 'investors' as TabKey, label: 'Investor Emails', Icon: DollarSign, count: `${investorSentCount}/${investorTotal}` },
            { key: 'callbacks' as TabKey, label: 'Callbacks', Icon: PhoneForwarded, count: sq ? `${filteredCallbacks.length}/${callbacks.length}` : `${callbacks.length}` },
            { key: 'assignments' as TabKey, label: 'Team Assign', Icon: Users, count: `${teamMembers.filter(t => t.is_active).length}` },
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
              rows={filteredAgencies}
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
                rows={filteredCalls}
                statuses={callStatuses}
                notes={callNotes}
                loading={loading}
                onMarkCalled={markCalled}
                onNotesChange={(id, val) => setCallNotes(prev => ({ ...prev, [id]: val }))}
                onMarkCallback={handleMarkCallback}
              />
            </>
          )}
          {activeTab === 'investors' && currentDay && (
            <InvestorDraftTable
              rows={filteredInvestors}
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
          {activeTab === 'callbacks' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <PhoneForwarded className="w-5 h-5 text-amber-500" />
                  Callbacks ({filteredCallbacks.length}{sq ? ` of ${callbacks.length}` : ''})
                </h3>
                <button onClick={loadCallbacks} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" />Refresh
                </button>
              </div>
              {filteredCallbacks.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <PhoneForwarded className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  {sq ? 'No callbacks match your search' : 'No callbacks pending'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCallbacks.map((cb) => (
                    <div key={cb.id} className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{cb.provider_name}</p>
                          <p className="text-sm text-slate-500">{[cb.city, cb.state].filter(Boolean).join(', ')}</p>
                          {cb.phone && (
                            <a href={`tel:${cb.phone}`} className="text-sm text-teal-600 hover:underline font-mono">{cb.phone}</a>
                          )}
                          {cb.contact_name && <p className="text-xs text-slate-500 mt-1">Contact: {cb.contact_name}</p>}
                          {cb.contact_email && <p className="text-xs text-slate-500">{cb.contact_email}</p>}
                        </div>
                        <div className="text-right">
                          {cb.callback_date && (
                            <p className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              {new Date(cb.callback_date).toLocaleDateString()}
                            </p>
                          )}
                          {priorityBadge(cb.priority)}
                        </div>
                      </div>
                      {cb.callback_notes && (
                        <p className="mt-2 text-sm text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-100">{cb.callback_notes}</p>
                      )}
                      {cb.notes && (
                        <p className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">{cb.notes}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleCompleteCallback(cb.id, 'Callback completed')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Complete
                        </button>
                        {cb.phone && (
                          <a href={`tel:${cb.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors">
                            <Phone className="w-3 h-3" /> Call Now
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'assignments' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Team Assignments
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTaskModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                  >
                    <ListChecks className="w-4 h-4" /> Assign Task
                  </button>
                  <button
                    onClick={() => setAssignModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
                  >
                    <Users className="w-4 h-4" /> Assign Leads
                  </button>
                </div>
              </div>

              {/* Team Members Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {teamMembers.filter(t => t.is_active).map((member) => (
                  <div key={member.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <p className="font-semibold text-slate-800">{member.full_name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {member.permissions.map(p => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {teamMembers.filter(t => t.is_active).length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-400">
                    No team members yet. Invite members from the Team page.
                  </div>
                )}
              </div>

              {/* Available States */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-500" />
                  Unassigned Leads by State
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableStates.map((s) => (
                    <span key={s.state} className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                      {s.state} <span className="font-semibold text-teal-600">({s.count})</span>
                    </span>
                  ))}
                  {availableStates.length === 0 && <span className="text-sm text-slate-400">No unassigned leads</span>}
                </div>
              </div>

              {/* Task Creation Modal */}
              {taskModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-teal-500" /> Assign Task to Team Member
                    </h3>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g., Call back ABC Agency, Follow up with investor..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3"
                    />

                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Additional details about the task..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 resize-none"
                    />

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
                    >
                      <option value="">Myself</option>
                      {teamMembers.filter(t => t.is_active).map(m => (
                        <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
                      ))}
                    </select>

                    <div className="flex justify-end gap-2">
                      <button onClick={() => setTaskModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button
                        onClick={handleCreateTask}
                        disabled={!newTaskTitle.trim() || creatingTask}
                        className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 disabled:opacity-50"
                      >
                        {creatingTask ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                        Create Task
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Assign Modal */}
              {assignModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Assign Leads</h3>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                    <select
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4"
                    >
                      <option value="">Select member...</option>
                      {currentUser?.id && (
                        <option value={currentUser.id}>Myself ({currentUser.full_name || currentUser.email})</option>
                      )}
                      {teamMembers.filter(t => t.is_active).map(m => (
                        <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
                      ))}
                    </select>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Assignment Type</label>
                    <div className="flex gap-2 mb-4">
                      <button onClick={() => setAssignType('call')} className={`px-4 py-2 rounded-lg text-sm font-medium ${assignType === 'call' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Phone className="w-3.5 h-3.5 inline mr-1" /> Calls
                      </button>
                      <button onClick={() => setAssignType('email')} className={`px-4 py-2 rounded-lg text-sm font-medium ${assignType === 'email' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Mail className="w-3.5 h-3.5 inline mr-1" /> Emails
                      </button>
                    </div>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of Leads ({assignCount})</label>
                    <input
                      type="range" min={5} max={100} step={5}
                      value={assignCount}
                      onChange={(e) => setAssignCount(Number(e.target.value))}
                      className="w-full mb-1 accent-teal-500"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mb-4">
                      <span>5</span><span>25</span><span>50</span><span>75</span><span>100</span>
                    </div>

                    <label className="block text-sm font-medium text-slate-700 mb-1">Filter by States (optional)</label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto mb-4 p-2 border border-slate-200 rounded-lg">
                      {availableStates.map((s) => (
                        <button
                          key={s.state}
                          onClick={() => setAssignStates(prev =>
                            prev.includes(s.state) ? prev.filter(x => x !== s.state) : [...prev, s.state]
                          )}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                            assignStates.includes(s.state)
                              ? 'bg-teal-500 text-white border-teal-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          {s.state} ({s.count})
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button
                        onClick={handleAssignLeads}
                        disabled={!assignUserId || assigning}
                        className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                      >
                        {assigning ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                        Assign {assignCount} Leads
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {!currentDay && !loading && activeTab !== 'callbacks' && activeTab !== 'assignments' && (
            <div className="px-4 py-12 text-center text-slate-400">No data loaded</div>
          )}
        </div>

        {/* ── Palm AI Agent ──────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            onClick={() => { setAgentOpen(o => !o); setTimeout(() => agentInputRef.current?.focus(), 100); }}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  Palm AI Agent
                  <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">BETA</span>
                </h2>
                <p className="text-xs text-slate-400">Ask me to send emails, check stats, assign leads, mark calls...</p>
              </div>
            </div>
            {agentOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {agentOpen && (
            <div className="border-t border-slate-100">
              <div ref={agentScrollRef} className="h-80 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/30">
                {agentMessages.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-teal-400" />
                    <p className="text-sm font-medium text-slate-600 mb-1">What can I help with?</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                      {[
                        'Send all agency emails',
                        'How many callbacks pending?',
                        'Show me investor stats',
                        'Search leads in Florida',
                        'What work is pending?',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => { setAgentInput(suggestion); setTimeout(() => agentInputRef.current?.focus(), 50); }}
                          className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {agentMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-md'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm prose-slate max-w-none [&>p]:mb-1 [&>ul]:my-1 [&>ol]:my-1 [&_li]:my-0" dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            msg.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-xs">$1</code>')
                              .replace(/^- (.*)/gm, '<li>$1</li>')
                              .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-4">$1</ul>')
                              .replace(/\n/g, '<br/>'),
                            { ALLOWED_TAGS: ['strong', 'em', 'code', 'li', 'br', 'ul', 'ol', 'p', 'a'], ALLOWED_ATTR: ['class', 'href'] }
                          )
                        }} />
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                {agentLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-100 bg-white">
                <div className="flex gap-2">
                  <input
                    ref={agentInputRef}
                    type="text"
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAgentSend(); }}
                    placeholder="Ask Palm to do something..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                    disabled={agentLoading}
                  />
                  <button
                    onClick={handleAgentSend}
                    disabled={agentLoading || !agentInput.trim()}
                    className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
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

// ── Weekly TODO Section ──────────────────────────────────────────────
