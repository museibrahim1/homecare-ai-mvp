'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  Clock, Users, AlertCircle, ChevronRight, Plus, X, Search, Check,
  Loader2, CalendarDays, Heart, Activity, MapPin, Phone, Filter,
  GripVertical, ArrowRight, MoreHorizontal, Pencil, Trash2, UserCheck
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api, formatLocalDate } from '@/lib/api';

/* ─── Types ─── */
type CareStage = 'follow_up' | 'plan_review' | 'ongoing';
type Priority = 'routine' | 'moderate' | 'high' | 'critical';

interface CareItem {
  id: string;
  clientId: string;
  clientName: string;
  stage: CareStage;
  priority: Priority;
  assignedTo: string;
  careSpecialty: string;
  startDate: string;       // YYYY-MM-DD
  targetDate: string;       // YYYY-MM-DD
  lastContact: string;      // YYYY-MM-DD
  notes: string;
  phone?: string;
}

/* ─── Config ─── */
const STAGE_CONFIG: Record<CareStage, { label: string; color: string; bg: string; border: string; dot: string; headerBg: string }> = {
  follow_up:   { label: 'Follow-up Needed',      color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500',  dot: 'bg-amber-400',  headerBg: 'bg-amber-500' },
  plan_review: { label: 'Care Plan Under Review', color: 'text-teal-400',   bg: 'bg-teal-500/15',   border: 'border-teal-500',   dot: 'bg-teal-400',   headerBg: 'bg-teal-500' },
  ongoing:     { label: 'Ongoing Care',           color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500', dot: 'bg-purple-400', headerBg: 'bg-purple-500' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; bar: string }> = {
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/15',    bar: 'bg-red-500' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/15', bar: 'bg-orange-500' },
  moderate: { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/15', bar: 'bg-yellow-500' },
  routine:  { label: 'Routine',  color: 'text-green-400',  bg: 'bg-green-500/15',  bar: 'bg-green-400' },
};

const STORAGE_KEY = 'palmcare-care-tracker';
const CARE_SPECIALTIES = ['General Care', 'Dementia Care', 'Post-Surgery', 'Cardiac Care', 'Diabetes Management', 'Hospice Support', 'Physical Therapy', 'Wound Care', 'Respiratory Care'];

/* ─── Persistence ─── */
function loadItems(): CareItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveItems(items: CareItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/* ─── Helpers ─── */
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

function daysAgo(d: string): number {
  return daysBetween(d, formatLocalDate(new Date()));
}

function daysUntil(d: string): number {
  return daysBetween(formatLocalDate(new Date()), d);
}

/* ─── Avatar ─── */
function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500', 'from-orange-500 to-red-500', 'from-indigo-500 to-purple-500'];
  const idx = name.charCodeAt(0) % colors.length;
  const s = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return <div className={`${s} rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center font-semibold text-white shrink-0`}>{initials}</div>;
}

/* ─── Timeline Bar ─── */
function TimelineBar({ item, totalDays }: { item: CareItem; totalDays: number }) {
  const started = daysAgo(item.startDate);
  const total = daysBetween(item.startDate, item.targetDate) || 1;
  const progress = Math.min(Math.max((started / total) * 100, 5), 100);
  const overdue = daysUntil(item.targetDate) < 0;
  const pCfg = PRIORITY_CONFIG[item.priority];

  return (
    <div className="flex-1 relative h-6 bg-dark-700/30 rounded overflow-hidden group">
      <div
        className={`h-full rounded transition-all ${overdue ? 'bg-red-500/80' : pCfg.bar + '/70'}`}
        style={{ width: `${progress}%` }}
      />
      {overdue && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <span className="text-[9px] text-red-300 font-medium bg-red-500/30 px-1 py-0.5 rounded">
            {Math.abs(daysUntil(item.targetDate))}d overdue
          </span>
        </div>
      )}
      {!overdue && daysUntil(item.targetDate) <= 7 && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <span className="text-[9px] text-amber-300 font-medium bg-amber-500/20 px-1 py-0.5 rounded">
            {daysUntil(item.targetDate)}d left
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Add/Edit Form ─── */
function CareItemForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  clients,
}: {
  data: Omit<CareItem, 'id'>;
  onChange: (d: Omit<CareItem, 'id'>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  clients: { id: string; full_name: string; phone?: string; primary_diagnosis?: string }[];
}) {
  const INPUT = "w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h2 className="text-base font-semibold text-white">Care Tracking Entry</h2>
          <button onClick={onCancel} className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Client selector */}
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1.5">Client *</label>
            <select
              value={data.clientId}
              onChange={e => {
                const client = clients.find(c => c.id === e.target.value);
                onChange({ ...data, clientId: e.target.value, clientName: client?.full_name || '', phone: client?.phone || '', careSpecialty: client?.primary_diagnosis || data.careSpecialty });
              }}
              className={INPUT}
            >
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>

          {/* If no clients in API, allow manual entry */}
          {!data.clientId && (
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Or enter client name</label>
              <input type="text" value={data.clientName} onChange={e => onChange({ ...data, clientName: e.target.value })} placeholder="Client name" className={INPUT} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Stage</label>
              <select value={data.stage} onChange={e => onChange({ ...data, stage: e.target.value as CareStage })} className={INPUT}>
                {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Priority</label>
              <select value={data.priority} onChange={e => onChange({ ...data, priority: e.target.value as Priority })} className={INPUT}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1.5">Assigned Caregiver</label>
            <input type="text" value={data.assignedTo} onChange={e => onChange({ ...data, assignedTo: e.target.value })} placeholder="Caregiver name" className={INPUT} />
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1.5">Care Specialty</label>
            <select value={data.careSpecialty} onChange={e => onChange({ ...data, careSpecialty: e.target.value })} className={INPUT}>
              <option value="">Select...</option>
              {CARE_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Start Date</label>
              <input type="date" value={data.startDate} onChange={e => onChange({ ...data, startDate: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Target Date</label>
              <input type="date" value={data.targetDate} onChange={e => onChange({ ...data, targetDate: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-400 mb-1.5">Last Contact</label>
              <input type="date" value={data.lastContact} onChange={e => onChange({ ...data, lastContact: e.target.value })} className={INPUT} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1.5">Notes</label>
            <textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} rows={2} placeholder="Care plan details, special requirements..." className={`${INPUT} resize-none`} />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-dark-700">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-dark-300 hover:text-white bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">Cancel</button>
          <button onClick={onSubmit} disabled={!data.clientName.trim()} className="flex-1 px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 disabled:bg-dark-600 disabled:text-dark-400 text-white rounded-lg transition-colors">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CareTrackerPage() {
  const router = useRouter();
  const { token, isReady } = useRequireAuth();
  const [items, setItems] = useState<CareItem[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [view, setView] = useState<'timeline' | 'board'>('timeline');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<CareItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<CareStage | 'all'>('all');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CareStage | null>(null);

  const today = formatLocalDate(new Date());

  const emptyForm = useCallback((): Omit<CareItem, 'id'> => ({
    clientId: '', clientName: '', stage: 'follow_up', priority: 'moderate',
    assignedTo: '', careSpecialty: '', startDate: today, targetDate: '',
    lastContact: today, notes: '', phone: '',
  }), [today]);

  const [formData, setFormData] = useState<Omit<CareItem, 'id'>>(emptyForm());

  // Load data
  useEffect(() => { setItems(loadItems()); }, []);
  useEffect(() => {
    if (token) {
      api.getClients(token).then(setClients).catch(() => {});
    }
  }, [token]);
  const persist = useCallback((updated: CareItem[]) => { setItems(updated); saveItems(updated); }, []);

  // Filtered & grouped
  const filtered = useMemo(() => {
    let list = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.clientName.toLowerCase().includes(q) || i.assignedTo.toLowerCase().includes(q) || i.careSpecialty.toLowerCase().includes(q));
    }
    if (stageFilter !== 'all') list = list.filter(i => i.stage === stageFilter);
    return list;
  }, [items, searchQuery, stageFilter]);

  const grouped = useMemo(() => {
    const g: Record<CareStage, CareItem[]> = { follow_up: [], plan_review: [], ongoing: [] };
    filtered.forEach(i => { if (g[i.stage]) g[i.stage].push(i); });
    // Sort by priority within each group
    const pOrder: Record<Priority, number> = { critical: 0, high: 1, moderate: 2, routine: 3 };
    Object.values(g).forEach(arr => arr.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]));
    return g;
  }, [filtered]);

  // Stats
  const overdueCount = items.filter(i => daysUntil(i.targetDate) < 0).length;
  const criticalCount = items.filter(i => i.priority === 'critical' || i.priority === 'high').length;
  const noContactCount = items.filter(i => daysAgo(i.lastContact) > 7).length;

  // CRUD
  const handleAdd = () => {
    const item: CareItem = { id: Date.now().toString(), ...formData };
    persist([...items, item]);
    setFormData(emptyForm());
    setShowAdd(false);
  };

  const handleUpdate = () => {
    if (!editItem) return;
    persist(items.map(i => i.id === editItem.id ? editItem : i));
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    persist(items.filter(i => i.id !== id));
  };

  const handleMoveStage = (id: string, newStage: CareStage) => {
    persist(items.map(i => i.id === id ? { ...i, stage: newStage } : i));
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Post-Visit Care Tracker</h1>
                <p className="text-dark-400 text-sm">Track follow-ups, care plan reviews, and ongoing client coordination</p>
              </div>
              <button
                onClick={() => { setFormData(emptyForm()); setShowAdd(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Care Entry
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Tracking', value: items.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15' },
                { label: 'Overdue', value: overdueCount, icon: AlertCircle, color: overdueCount > 0 ? 'text-red-400' : 'text-dark-400', bg: overdueCount > 0 ? 'bg-red-500/15' : 'bg-dark-700/50' },
                { label: 'High Priority', value: criticalCount, icon: Heart, color: criticalCount > 0 ? 'text-orange-400' : 'text-dark-400', bg: criticalCount > 0 ? 'bg-orange-500/15' : 'bg-dark-700/50' },
                { label: 'No Contact 7d+', value: noContactCount, icon: Phone, color: noContactCount > 0 ? 'text-amber-400' : 'text-dark-400', bg: noContactCount > 0 ? 'bg-amber-500/15' : 'bg-dark-700/50' },
              ].map((s, i) => (
                <div key={i} className="card p-3 lg:p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.bg}`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                  <div><p className="text-xs text-dark-400">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{s.value}</p></div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1 bg-dark-800/50 rounded-xl p-1 border border-dark-700/50">
                {[
                  { key: 'timeline' as const, label: 'Timeline', icon: Activity },
                  { key: 'board' as const, label: 'Board', icon: CalendarDays },
                ].map(v => (
                  <button key={v.key} onClick={() => setView(v.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v.key ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-white'}`}>
                    <v.icon className="w-3.5 h-3.5" />{v.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-400" />
                  <input type="text" placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-48 pl-8 pr-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-xs placeholder-dark-400 focus:outline-none focus:border-primary-500" />
                </div>
                <select value={stageFilter} onChange={e => setStageFilter(e.target.value as any)} className="px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-xs focus:outline-none focus:border-primary-500">
                  <option value="all">All Stages</option>
                  {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* ─── Timeline View ─── */}
            {view === 'timeline' && (
              <div className="space-y-6">
                {(Object.entries(STAGE_CONFIG) as [CareStage, typeof STAGE_CONFIG[CareStage]][]).map(([stage, cfg]) => {
                  const stageItems = grouped[stage] || [];
                  if (stageFilter !== 'all' && stageFilter !== stage) return null;

                  return (
                    <div key={stage} className="card overflow-hidden">
                      {/* Stage header */}
                      <div className="flex items-center gap-3 px-4 lg:px-5 py-3 border-b border-dark-700/50">
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        <h3 className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</h3>
                        <span className="text-xs text-dark-500">({stageItems.length})</span>
                      </div>

                      {stageItems.length === 0 ? (
                        <div className="px-5 py-6 text-center text-dark-500 text-xs">No clients in this stage</div>
                      ) : (
                        <div className="divide-y divide-dark-700/30">
                          {stageItems.map(item => {
                            const pCfg = PRIORITY_CONFIG[item.priority];
                            const overdue = daysUntil(item.targetDate) < 0;
                            const noContact = daysAgo(item.lastContact) > 7;

                            return (
                              <div key={item.id} className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 hover:bg-dark-700/20 transition-colors group">
                                {/* Client info */}
                                <div className="w-44 lg:w-56 shrink-0 flex items-center gap-2.5">
                                  <Avatar name={item.clientName} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{item.clientName}</p>
                                    <p className="text-[10px] text-dark-500 truncate">{item.assignedTo || 'Unassigned'}</p>
                                  </div>
                                </div>

                                {/* Timeline bar */}
                                <TimelineBar item={item} totalDays={30} />

                                {/* Meta */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Priority */}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${pCfg.bg} ${pCfg.color}`}>{pCfg.label}</span>
                                  {overdue && <span title="Overdue"><AlertCircle className="w-3.5 h-3.5 text-red-400" /></span>}
                                  {noContact && <span title="No contact 7d+"><Phone className="w-3.5 h-3.5 text-amber-400" /></span>}

                                  {/* Actions */}
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditItem({ ...item })} className="p-1 text-dark-500 hover:text-white hover:bg-dark-700 rounded transition-colors"><Pencil className="w-3 h-3" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Board View ─── */}
            {view === 'board' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(Object.entries(STAGE_CONFIG) as [CareStage, typeof STAGE_CONFIG[CareStage]][]).map(([stage, cfg]) => {
                  const stageItems = grouped[stage] || [];
                  const isOver = dragOverStage === stage;

                  return (
                    <div
                      key={stage}
                      onDragOver={e => { e.preventDefault(); setDragOverStage(stage); }}
                      onDragLeave={() => setDragOverStage(null)}
                      onDrop={e => {
                        e.preventDefault();
                        setDragOverStage(null);
                        if (draggedId) { handleMoveStage(draggedId, stage); setDraggedId(null); }
                      }}
                      className={`rounded-xl border overflow-hidden transition-all ${isOver ? `border-2 ${cfg.border} bg-dark-700/20` : 'border-dark-700/50 bg-dark-800/30'}`}
                    >
                      <div className={`h-1 ${cfg.headerBg}`} />
                      <div className="px-3 py-2.5 border-b border-dark-700/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                            <h3 className="font-semibold text-sm text-white">{cfg.label}</h3>
                          </div>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.color} bg-dark-700/50`}>{stageItems.length}</span>
                        </div>
                      </div>

                      <div className="p-2 space-y-2 max-h-[65vh] overflow-y-auto">
                        {stageItems.map(item => {
                          const pCfg = PRIORITY_CONFIG[item.priority];
                          const isDragging = draggedId === item.id;
                          const overdue = daysUntil(item.targetDate) < 0;

                          return (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={() => setDraggedId(item.id)}
                              onDragEnd={() => { setDraggedId(null); setDragOverStage(null); }}
                              className={`p-3 bg-dark-800 rounded-lg border-l-[3px] ${
                                item.priority === 'critical' ? 'border-l-red-500' :
                                item.priority === 'high' ? 'border-l-orange-500' :
                                item.priority === 'moderate' ? 'border-l-yellow-500' : 'border-l-green-400'
                              } border border-dark-600 cursor-grab active:cursor-grabbing hover:border-dark-500 transition-all group ${isDragging ? 'opacity-40 scale-95' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-medium text-white truncate">{item.clientName}</p>
                                <div className="flex items-center gap-1">
                                  {overdue && <AlertCircle className="w-3 h-3 text-red-400" />}
                                  <button onClick={() => setEditItem({ ...item })} className="p-0.5 text-dark-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><Pencil className="w-3 h-3" /></button>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 mb-2">
                                <div className={`w-1 h-3 rounded-full ${pCfg.bar}`} />
                                <span className={`text-[10px] font-medium ${pCfg.color}`}>{pCfg.label}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <Avatar name={item.clientName} />
                                <div className="flex items-center gap-2 text-dark-500">
                                  {item.careSpecialty && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-dark-700/60 rounded text-dark-400 truncate max-w-[80px]">{item.careSpecialty}</span>
                                  )}
                                  {item.assignedTo && (
                                    <span className="text-[9px] text-dark-500 truncate max-w-[60px]">{item.assignedTo}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {stageItems.length === 0 && (
                          <div className={`text-center py-8 text-dark-500 text-xs rounded-lg border border-dashed transition-colors ${isOver ? cfg.border : 'border-dark-700/30'}`}>
                            {isOver ? 'Drop here' : 'No clients'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {items.length === 0 && (
              <div className="card p-12 text-center mt-4">
                <div className="w-14 h-14 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="w-7 h-7 text-dark-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No care tracking entries yet</h3>
                <p className="text-dark-400 text-sm mb-4">Start tracking post-visit follow-ups, care plan reviews, and ongoing client coordination</p>
                <button onClick={() => { setFormData(emptyForm()); setShowAdd(true); }} className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors">
                  <Plus className="w-4 h-4 inline mr-1" />Add First Entry
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Modal */}
      {showAdd && (
        <CareItemForm data={formData} onChange={setFormData} onSubmit={handleAdd} onCancel={() => setShowAdd(false)} submitLabel="Add Entry" clients={clients} />
      )}

      {/* Edit Modal */}
      {editItem && (
        <CareItemForm data={editItem} onChange={d => setEditItem({ ...editItem, ...d } as CareItem)} onSubmit={handleUpdate} onCancel={() => setEditItem(null)} submitLabel="Save Changes" clients={clients} />
      )}
    </div>
  );
}
