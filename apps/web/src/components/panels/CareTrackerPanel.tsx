'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock, Users, AlertCircle, Plus, X, Search, Heart, Activity,
  CalendarDays, Phone, Pencil, Trash2, UserCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, formatLocalDate } from '@/lib/api';
import { migrateLocalCrmToServer } from '@/lib/crmMigrate';
import { careEntryFromApi, careEntryToApi } from '@/lib/crmAdapters';

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
  startDate: string;
  targetDate: string;
  lastContact: string;
  nextFollowUp: string;
  notes: string;
  phone?: string;
  caregiverId?: string;
}

const STAGE_CONFIG: Record<CareStage, { label: string; color: string; bg: string; border: string; dot: string; headerBg: string }> = {
  follow_up:   { label: 'Follow-up Needed',      color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-500',  dot: 'bg-amber-400',  headerBg: 'bg-amber-500' },
  plan_review: { label: 'Care Plan Under Review', color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-500',   dot: 'bg-teal-400',   headerBg: 'bg-teal-500' },
  ongoing:     { label: 'Ongoing Care',           color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-500', dot: 'bg-purple-400', headerBg: 'bg-purple-500' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; bar: string }> = {
  critical: { label: 'Critical', color: 'text-red-600',    bg: 'bg-red-50',    bar: 'bg-red-500' },
  high:     { label: 'High',     color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' },
  moderate: { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-yellow-500' },
  routine:  { label: 'Routine',  color: 'text-emerald-600',  bg: 'bg-emerald-50',  bar: 'bg-green-400' },
};

const CARE_SPECIALTIES = ['General Care', 'Dementia Care', 'Post-Surgery', 'Cardiac Care', 'Diabetes Management', 'Hospice Support', 'Physical Therapy', 'Wound Care', 'Respiratory Care'];

function enrichCareItems(items: CareItem[], clients: Array<{ id: string; full_name: string; phone?: string }>): CareItem[] {
  const byId = Object.fromEntries(clients.map((c) => [c.id, c]));
  return items.map((item) => ({
    ...item,
    clientName: byId[item.clientId]?.full_name || item.clientName || 'Unknown client',
    phone: item.phone || byId[item.clientId]?.phone,
  }));
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
function daysAgo(d: string): number { return daysBetween(d, formatLocalDate(new Date())); }
function daysUntil(d: string): number { return daysBetween(formatLocalDate(new Date()), d); }

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500', 'from-orange-500 to-red-500', 'from-indigo-500 to-purple-500'];
  const idx = name.charCodeAt(0) % colors.length;
  return <div className={`w-7 h-7 text-[10px] rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center font-semibold text-white shrink-0`}>{initials}</div>;
}

function CareItemForm({
  data, onChange, onSubmit, onCancel, submitLabel, clients,
}: {
  data: Omit<CareItem, 'id'>;
  onChange: (d: Omit<CareItem, 'id'>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  clients: { id: string; full_name: string; phone?: string; primary_diagnosis?: string }[];
}) {
  const INPUT = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Care Tracking Entry</h2>
          <button onClick={onCancel} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Client *</label>
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
          {!data.clientId && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Or enter client name</label>
              <input type="text" value={data.clientName} onChange={e => onChange({ ...data, clientName: e.target.value })} placeholder="Client name" className={INPUT} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Stage</label>
              <select value={data.stage} onChange={e => onChange({ ...data, stage: e.target.value as CareStage })} className={INPUT}>
                {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority</label>
              <select value={data.priority} onChange={e => onChange({ ...data, priority: e.target.value as Priority })} className={INPUT}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Assigned Caregiver</label>
            <input type="text" value={data.assignedTo} onChange={e => onChange({ ...data, assignedTo: e.target.value })} placeholder="Caregiver name" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Care Specialty</label>
            <select value={data.careSpecialty} onChange={e => onChange({ ...data, careSpecialty: e.target.value })} className={INPUT}>
              <option value="">Select...</option>
              {CARE_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Start Date</label>
              <input type="date" value={data.startDate} onChange={e => onChange({ ...data, startDate: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Target Date</label>
              <input type="date" value={data.targetDate} onChange={e => onChange({ ...data, targetDate: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Last Contact</label>
              <input type="date" value={data.lastContact} onChange={e => onChange({ ...data, lastContact: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Next Follow-Up</label>
              <input type="date" value={data.nextFollowUp} onChange={e => onChange({ ...data, nextFollowUp: e.target.value })} className={INPUT} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
            <textarea value={data.notes} onChange={e => onChange({ ...data, notes: e.target.value })} rows={2} placeholder="Care plan details, special requirements..." className={`${INPUT} resize-none`} />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={onSubmit} disabled={!data.clientName.trim()} className="flex-1 px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 disabled:bg-slate-100 disabled:text-slate-500 text-white rounded-lg transition-colors">
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Post-visit care tracker board and timeline. Extracted from the standalone
 * /care-tracker route (now redirected) so it can live as a tab on the Clients
 * page. Entries persist to the agency CRM API.
 */
export default function CareTrackerPanel() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<CareItem[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [view, setView] = useState<'timeline' | 'board'>('board');
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
    lastContact: today, nextFollowUp: '', notes: '', phone: '',
  }), [today]);

  const [formData, setFormData] = useState<Omit<CareItem, 'id'>>(emptyForm());
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (user?.id) await migrateLocalCrmToServer(token, user.id);
      const [rows, clientRows] = await Promise.all([
        api.getCareTrackerEntries(token),
        api.getClients(token),
      ]);
      setClients(clientRows || []);
      const mapped = (rows || []).map((r: Record<string, unknown>) => careEntryFromApi(r)) as CareItem[];
      setItems(enrichCareItems(mapped, clientRows || []));
    } catch (error) {
      console.error('Failed to load care tracker:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

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
    const pOrder: Record<Priority, number> = { critical: 0, high: 1, moderate: 2, routine: 3 };
    Object.values(g).forEach(arr => arr.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]));
    return g;
  }, [filtered]);

  const overdueCount = items.filter(i => daysUntil(i.targetDate) < 0).length;
  const criticalCount = items.filter(i => i.priority === 'critical' || i.priority === 'high').length;
  const noContactCount = items.filter(i => daysAgo(i.lastContact) > 7).length;
  const overdueFollowUpCount = items.filter(i => i.nextFollowUp && daysUntil(i.nextFollowUp) < 0).length;

  const handleAdd = async () => {
    if (!token || !formData.clientId) return;
    try {
      const created = await api.createCareTrackerEntry(token, careEntryToApi(formData as unknown as Record<string, unknown>, clients));
      const item = careEntryFromApi(created) as CareItem;
      const enriched = enrichCareItems([item], clients)[0];
      setItems([...items, enriched]);
      setFormData(emptyForm());
      setShowAdd(false);
    } catch (error) {
      console.error('Failed to add care entry:', error);
      alert('Failed to save care entry.');
    }
  };
  const handleUpdate = async () => {
    if (!editItem || !token) return;
    try {
      const updated = await api.updateCareTrackerEntry(token, editItem.id, careEntryToApi(editItem as unknown as Record<string, unknown>, clients));
      const mapped = enrichCareItems([careEntryFromApi(updated) as CareItem], clients)[0];
      setItems(items.map(i => i.id === editItem.id ? mapped : i));
      setEditItem(null);
    } catch (error) {
      console.error('Failed to update care entry:', error);
    }
  };
  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteCareTrackerEntry(token, id);
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete care entry:', error);
    }
  };
  const handleMoveStage = async (id: string, newStage: CareStage) => {
    if (!token) return;
    const current = items.find((i) => i.id === id);
    if (!current) return;
    try {
      const updated = await api.updateCareTrackerEntry(token, id, { stage: newStage });
      const mapped = enrichCareItems([careEntryFromApi(updated) as CareItem], clients)[0];
      setItems(items.map(i => i.id === id ? mapped : i));
    } catch (error) {
      console.error('Failed to move care stage:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        Loading care tracker…
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Post-Visit Care Tracker</h2>
          <p className="text-slate-500 text-xs mt-0.5">Track follow-ups, care plan reviews, and ongoing client coordination</p>
        </div>
        <button
          onClick={() => { setFormData(emptyForm()); setShowAdd(true); }}
          className="glass-btn-primary h-9 text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Care Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        {[
          { label: 'Total Tracking', value: items.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Overdue', value: overdueCount, icon: AlertCircle, color: overdueCount > 0 ? 'text-red-600' : 'text-slate-500', bg: overdueCount > 0 ? 'bg-red-50' : 'bg-slate-100' },
          { label: 'Follow-Up Due', value: overdueFollowUpCount, icon: Clock, color: overdueFollowUpCount > 0 ? 'text-purple-600' : 'text-slate-500', bg: overdueFollowUpCount > 0 ? 'bg-purple-50' : 'bg-slate-100' },
          { label: 'High Priority', value: criticalCount, icon: Heart, color: criticalCount > 0 ? 'text-orange-600' : 'text-slate-500', bg: criticalCount > 0 ? 'bg-orange-50' : 'bg-slate-100' },
          { label: 'No Contact 7d+', value: noContactCount, icon: Phone, color: noContactCount > 0 ? 'text-amber-600' : 'text-slate-500', bg: noContactCount > 0 ? 'bg-amber-50' : 'bg-slate-100' },
        ].map((s, i) => (
          <div
            key={i}
            className="glass-card px-3 py-2.5 flex items-center gap-2.5 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div>
            <div className="min-w-0"><p className="text-[10px] text-slate-500 truncate">{s.label}</p><p className={`text-base font-bold tabular-nums leading-5 ${s.color}`}>{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Empty state only (avoid empty board + empty CTA stacking) */}
      {items.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-5 h-5 text-slate-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">No care tracking entries yet</h3>
          <p className="text-slate-500 text-sm mb-3 max-w-md mx-auto">Start tracking post-visit follow-ups, care plan reviews, and ongoing client coordination</p>
          <button onClick={() => { setFormData(emptyForm()); setShowAdd(true); }} className="glass-btn-primary h-9 text-sm mx-auto">
            <Plus className="w-4 h-4" />
            Add First Entry
          </button>
        </div>
      ) : (
        <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 bg-white/50 rounded-xl p-0.5 border border-white/70 h-9">
          {[
            { key: 'board' as const, label: 'Board', icon: CalendarDays },
            { key: 'timeline' as const, label: 'Timeline', icon: Activity },
          ].map(v => (
            <button key={v.key} onClick={() => setView(v.key)} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors ${view === v.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              <v.icon className="w-3.5 h-3.5" />{v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-48 h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-primary-500" />
          </div>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value as any)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-primary-500">
            <option value="all">All Stages</option>
            {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Timeline View */}
      {view === 'timeline' && (
        <div className="space-y-3">
          {(Object.entries(STAGE_CONFIG) as [CareStage, typeof STAGE_CONFIG[CareStage]][]).map(([stage, cfg]) => {
            const stageItems = grouped[stage] || [];
            if (stageFilter !== 'all' && stageFilter !== stage) return null;
            return (
              <div key={stage} className="glass-card overflow-hidden">
                <div className="flex items-center gap-2.5 px-3.5 py-2 border-b border-slate-200/70">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <h3 className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</h3>
                  <span className="text-[11px] text-slate-400">({stageItems.length})</span>
                </div>
                {stageItems.length === 0 ? (
                  <div className="px-4 py-4 text-center text-slate-400 text-xs">No clients in this stage</div>
                ) : (
                  <div className="divide-y divide-slate-200/40">
                    {stageItems.map(item => {
                      const pCfg = PRIORITY_CONFIG[item.priority];
                      const overdue = daysUntil(item.targetDate) < 0;
                      const noContact = daysAgo(item.lastContact) > 7;
                      const followUpOverdue = item.nextFollowUp && daysUntil(item.nextFollowUp) < 0;
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-3.5 py-2 hover:bg-white/50 transition-colors group">
                          <div className="w-40 lg:w-52 shrink-0 flex items-center gap-2">
                            <Avatar name={item.clientName} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">{item.clientName}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.assignedTo || 'Unassigned'}</p>
                            </div>
                          </div>
                          <div className="flex-1 text-xs text-slate-500 truncate">{item.careSpecialty || 'General care'}</div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${pCfg.bg} ${pCfg.color}`}>{pCfg.label}</span>
                            {overdue && <span title="Overdue"><AlertCircle className="w-3.5 h-3.5 text-red-600" /></span>}
                            {followUpOverdue && (
                              <span title={`Follow-up overdue (${item.nextFollowUp})`} className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600">F/U overdue</span>
                            )}
                            {noContact && <span title="No contact 7d+"><Phone className="w-3.5 h-3.5 text-amber-600" /></span>}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditItem({ ...item })} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
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

      {/* Board View */}
      {view === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {(Object.entries(STAGE_CONFIG) as [CareStage, typeof STAGE_CONFIG[CareStage]][]).map(([stage, cfg]) => {
            const stageItems = grouped[stage] || [];
            const isOver = dragOverStage === stage;
            return (
              <div
                key={stage}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={e => { e.preventDefault(); setDragOverStage(null); if (draggedId) { handleMoveStage(draggedId, stage); setDraggedId(null); } }}
                className={`rounded-xl border overflow-hidden transition-all ${isOver ? `border-2 ${cfg.border} bg-slate-50/20` : 'border-slate-200 bg-white'}`}
              >
                <div className={`h-0.5 ${cfg.headerBg}`} />
                <div className="px-2.5 py-2 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <h3 className="font-semibold text-xs text-slate-600">{cfg.label}</h3>
                    </div>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${cfg.color} bg-slate-100`}>{stageItems.length}</span>
                  </div>
                </div>
                <div className="p-1.5 space-y-1.5 max-h-[55vh] overflow-y-auto">
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
                        className={`p-2.5 bg-white rounded-lg border-l-[3px] ${
                          item.priority === 'critical' ? 'border-l-red-500' :
                          item.priority === 'high' ? 'border-l-orange-500' :
                          item.priority === 'moderate' ? 'border-l-yellow-500' : 'border-l-green-400'
                        } border border-slate-200 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-sm transition-all group ${isDragging ? 'opacity-40 scale-95' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-slate-900 truncate">{item.clientName}</p>
                          <div className="flex items-center gap-1">
                            {overdue && <AlertCircle className="w-3 h-3 text-red-600" />}
                            {item.nextFollowUp && daysUntil(item.nextFollowUp) < 0 && (
                              <span title="Follow-up overdue" className="text-[8px] px-1 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">F/U</span>
                            )}
                            <button onClick={() => setEditItem({ ...item })} className="p-0.5 text-slate-300 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all"><Pencil className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className={`w-1 h-3 rounded-full ${pCfg.bar}`} />
                          <span className={`text-[10px] font-medium ${pCfg.color}`}>{pCfg.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Avatar name={item.clientName} />
                          <div className="flex items-center gap-2 text-slate-400">
                            {item.careSpecialty && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 truncate max-w-[80px]">{item.careSpecialty}</span>
                            )}
                            {item.assignedTo && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[60px]">{item.assignedTo}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {stageItems.length === 0 && (
                    <div className={`text-center py-5 text-slate-400 text-xs rounded-lg border border-dashed transition-colors ${isOver ? cfg.border : 'border-slate-200/60'}`}>
                      {isOver ? 'Drop here' : 'No clients'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {showAdd && (
        <CareItemForm data={formData} onChange={setFormData} onSubmit={handleAdd} onCancel={() => setShowAdd(false)} submitLabel="Add Entry" clients={clients} />
      )}
      {editItem && (
        <CareItemForm data={editItem} onChange={d => setEditItem({ ...editItem, ...d } as CareItem)} onSubmit={handleUpdate} onCancel={() => setEditItem(null)} submitLabel="Save Changes" clients={clients} />
      )}
    </div>
  );
}
