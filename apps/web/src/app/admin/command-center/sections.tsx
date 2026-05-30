'use client';

import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronUp, DollarSign, Eye, FileText, Loader2, Mail, Phone, PhoneForwarded, Send, Target, X } from 'lucide-react';
import { AgencyDraft, CallRow, DayPlan, DraftEdit, InvestorDraft, WeeklyPlan } from './types';
import { priorityBadge, SkeletonRow } from './shared';

export interface WeeklyTodoItem {
  id: string;
  text: string;
  done: boolean;
}

export function getWeekKey(weekOffset: number, weekStart: string) {
  return `weekly-todo-v2-${weekStart || weekOffset}`;
}

export function defaultTodosForWeek(weekOffset: number, stats: WeeklyPlan['stats'], plan?: WeeklyPlan | null): WeeklyTodoItem[] {
  const items: WeeklyTodoItem[] = [];

  if (plan?.days) {
    const weekAgencyEmails = plan.days.reduce((sum, d) => sum + d.agency_drafts.length, 0);
    const weekInvestorEmails = plan.days.reduce((sum, d) => sum + d.investor_drafts.length, 0);
    const weekCalls = plan.days.reduce((sum, d) => sum + d.calls.length, 0);

    if (weekAgencyEmails > 0) items.push({ id: `a-emails-${weekOffset}`, text: `Send ${weekAgencyEmails} agency emails`, done: false });
    if (weekInvestorEmails > 0) items.push({ id: `i-emails-${weekOffset}`, text: `Send ${weekInvestorEmails} investor emails`, done: false });
    if (weekCalls > 0) items.push({ id: `calls-${weekOffset}`, text: `Make ${weekCalls} calls`, done: false });
  } else {
    if (stats.unsent_agency_emails > 0) items.push({ id: `a-emails-${weekOffset}`, text: `Send agency emails`, done: false });
    if (stats.unsent_investor_emails > 0) items.push({ id: `i-emails-${weekOffset}`, text: `Send investor emails`, done: false });
    if (stats.calls_remaining > 0) items.push({ id: `calls-${weekOffset}`, text: `Make calls`, done: false });
  }

  items.push(
    { id: `callbacks-${weekOffset}`, text: 'Perform callbacks', done: false },
    { id: `crm-${weekOffset}`, text: 'Review CRM — update statuses, add notes', done: false },
  );
  return items;
}

export function WeeklyTodoSection({ weekOffset, weekStart, weekEnd, totalWeeks, stats, plan }: {
  weekOffset: number;
  weekStart: string;
  weekEnd: string;
  totalWeeks: number;
  stats: WeeklyPlan['stats'];
  plan?: WeeklyPlan | null;
}) {
  const weekKey = getWeekKey(weekOffset, weekStart);
  const [todos, setTodos] = useState<WeeklyTodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(weekKey);
    if (saved) {
      try { setTodos(JSON.parse(saved)); } catch { setTodos(defaultTodosForWeek(weekOffset, stats, plan)); }
    } else {
      setTodos(defaultTodosForWeek(weekOffset, stats, plan));
    }
  }, [weekKey, weekOffset, stats, plan]);

  const saveTodos = (updated: WeeklyTodoItem[]) => {
    setTodos(updated);
    localStorage.setItem(weekKey, JSON.stringify(updated));
  };

  const toggleTodo = (id: string) => {
    saveTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    saveTodos([...todos, { id: `custom-${Date.now()}`, text, done: false }]);
    setNewTodo('');
  };

  const removeTodo = (id: string) => {
    saveTodos(todos.filter(t => t.id !== id));
  };

  const doneCount = todos.filter(t => t.done).length;
  const totalCount = todos.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="mb-5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-teal-600" />
          <h3 className="font-bold text-slate-900">
            {weekOffset < 0 ? `Past Week (${Math.abs(weekOffset)} ago)` : weekOffset === 0 ? 'This Week' : `Week ${weekOffset + 1}`} TODO
          </h3>
          <span className="text-xs text-slate-500">
            {weekStart && new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekEnd && new Date(weekEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-700">{doneCount}/{totalCount}</span>
          <div className="w-20 h-2 bg-teal-200 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {todos.map(todo => (
          <div key={todo.id} className="flex items-center gap-2 group">
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                todo.done ? 'bg-teal-500 border-teal-500' : 'border-slate-300 hover:border-teal-400'
              }`}
            >
              {todo.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`text-sm flex-1 ${todo.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {todo.text}
            </span>
            <button
              onClick={() => removeTodo(todo.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
          placeholder="Add a task..."
          className="flex-1 px-3 py-1.5 bg-white/80 border border-teal-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400"
        />
        <button
          onClick={addTodo}
          disabled={!newTodo.trim()}
          className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Mini Stat ────────────────────────────────────────────────────────

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ── Stat Pill ────────────────────────────────────────────────────────

export function StatPill({ icon, label, done, total, color }: {
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

export function AgencyDraftTable({
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

export const PHONE_SCRIPTS = [
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

export function PhoneScriptsPanel() {
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

export function CallsTable({
  rows, statuses, notes, loading, onMarkCalled, onNotesChange, onMarkCallback,
}: {
  rows: CallRow[];
  statuses: Record<string, boolean>;
  notes: Record<string, string>;
  loading: boolean;
  onMarkCalled: (id: string) => void;
  onNotesChange: (id: string, val: string) => void;
  onMarkCallback?: (id: string, notes: string) => void;
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
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
              const isCallback = row.callback_requested;
              return (
                <tr key={row.id} className={`border-b border-slate-50 transition-colors ${called ? 'bg-emerald-50/30' : isCallback ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{row.provider_name}</span>
                    {row.contact_name && <span className="block text-xs text-slate-400">{row.contact_name}</span>}
                    {isCallback && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Callback</span>}
                  </td>
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
                    <div className="flex items-center justify-end gap-1.5">
                      {called ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Called
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => onMarkCalled(row.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Called
                          </button>
                          {onMarkCallback && !isCallback && (
                            <button
                              onClick={() => onMarkCallback(row.id, notes[row.id] || '')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                              title="Schedule callback"
                            >
                              <PhoneForwarded className="w-3 h-3" /> CB
                            </button>
                          )}
                        </>
                      )}
                    </div>
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

export function InvestorDraftTable({
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

export function DraftEditor({
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

export function mockWeeklyPlan(): WeeklyPlan {
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
        last_email_sent_at: null,
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
        last_email_sent_at: null,
        draft_subject: `PalmCare AI — Voice-Powered AI for Home Healthcare ($92K ARR, Pre-Seed)`,
        draft_body: `Dear Partner ${i + 1},\n\nI'm Muse Ibrahim, CEO of PalmCare AI...`,
        is_html: false,
      })),
      calls: Array.from({ length: 25 }, (_, i) => ({
        id: `c-${idx}-${i}`,
        provider_name: `${cities[i % 10]} Care Services`,
        city: cities[i % 10],
        state: states[i % 10],
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
      calls_remaining: 163,
      total_investors: 63,
      investors_with_email: 60,
      investors_contacted: 0,
      investors_remaining: 60,
      unsent_agency_emails: 120,
      unsent_investor_emails: 60,
      total_called: 0,
      total_with_phone: 163,
    },
    week_start: days[0].date,
    week_end: days[days.length - 1].date,
    week_offset: 0,
    total_weeks: 3,
    all_contacts_covered: false,
  };
}
