'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Users, Clock, TrendingUp, ChevronRight, CheckCircle, AlertCircle,
  FileSignature, Loader2, Activity, BarChart3, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Circle, CheckCircle2, X, GripVertical, Settings2,
  LayoutGrid, Target, Zap, ArrowRight
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import AreaChart from '@/components/charts/AreaChart';
import DonutChart from '@/components/charts/DonutChart';
import BarChart from '@/components/charts/BarChart';
import Sparkline from '@/components/charts/Sparkline';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/* ─── Pipeline stage config ─── */
const PIPELINE_STAGES = [
  { key: 'intake', label: 'Intake', color: '#3b82f6', statuses: ['intake', 'pending'] },
  { key: 'assessment', label: 'Assessment', color: '#8b5cf6', statuses: ['assessment'] },
  { key: 'proposal', label: 'Proposal', color: '#f59e0b', statuses: ['proposal', 'pending_review'] },
  { key: 'active', label: 'Active', color: '#10b981', statuses: ['active', 'assigned'] },
  { key: 'follow_up', label: 'Follow-up', color: '#ef4444', statuses: ['follow_up', 'review', 'discharged', 'inactive'] },
];

const PIPELINE_BG: Record<string, string> = {
  intake: 'bg-blue-50 text-blue-600',
  assessment: 'bg-purple-50 text-purple-600',
  proposal: 'bg-amber-50 text-amber-600',
  active: 'bg-emerald-50 text-emerald-600',
  follow_up: 'bg-red-50 text-red-600',
};

/* ─── Task types ─── */
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  category?: string;
  dueDate?: string;
  createdAt: string;
}

const TASK_CATEGORIES = [
  { value: 'assessment', label: 'Assessment', bg: 'bg-teal-50', text: 'text-teal-700' },
  { value: 'follow_up', label: 'Follow-up', bg: 'bg-amber-50', text: 'text-amber-700' },
  { value: 'documentation', label: 'Documentation', bg: 'bg-purple-50', text: 'text-purple-700' },
  { value: 'billing', label: 'Billing', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { value: 'general', label: 'General', bg: 'bg-dark-700', text: 'text-dark-300' },
];

const TASK_STORAGE_KEY = 'palmcare-tasks';

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TASK_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveTasks(tasks: Task[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
}

/* ─── Tasks Widget ─── */
function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newDueDate, setNewDueDate] = useState('');
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');

  useEffect(() => { setTasks(loadTasks()); }, []);

  const updateTasks = (updated: Task[]) => { setTasks(updated); saveTasks(updated); };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: Task = { id: Date.now().toString(), title: newTitle.trim(), status: 'todo', category: newCategory, dueDate: newDueDate || undefined, createdAt: new Date().toISOString() };
    updateTasks([task, ...tasks]);
    setNewTitle(''); setNewCategory('general'); setNewDueDate(''); setShowAddForm(false);
  };

  const toggleStatus = (id: string) => {
    updateTasks(tasks.map(t => {
      if (t.id !== id) return t;
      const next = t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : 'todo';
      return { ...t, status: next };
    }));
  };

  const deleteTask = (id: string) => updateTasks(tasks.filter(t => t.id !== id));

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const getCategoryConfig = (cat?: string) => TASK_CATEGORIES.find(c => c.value === cat) || TASK_CATEGORIES[4];

  return (
    <div data-tour="tasks" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-semibold text-dark-100">Tasks</h2>
          <span className="text-[10px] bg-dark-700 text-dark-400 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-md transition-colors">
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-3 bg-dark-900 rounded-lg border border-dark-700 space-y-2.5">
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="What needs to be done?" className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-50 text-sm placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" autoFocus />
          <div className="flex items-center gap-2">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200">
              {TASK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200" />
            <button onClick={addTask} disabled={!newTitle.trim()} className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-200 disabled:text-dark-400 text-xs font-medium rounded-lg transition-colors" style={{ color: newTitle.trim() ? '#fff' : undefined }}>Add</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 mb-3 bg-dark-900 rounded-lg p-0.5">
        {[
          { key: 'all' as const, label: 'All', count: tasks.length },
          { key: 'todo' as const, label: 'To Do', count: todoCount },
          { key: 'in_progress' as const, label: 'Active', count: inProgressCount },
          { key: 'completed' as const, label: 'Done', count: completedCount },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${filter === f.key ? 'bg-dark-800 text-dark-100 shadow-sm' : 'text-dark-400 hover:text-dark-200'}`}>
            {f.label} {f.count > 0 && <span className="text-dark-400 ml-0.5">{f.count}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-dark-400 text-xs">{filter === 'all' ? 'No tasks yet' : `No ${filter.replace('_', ' ')} tasks`}</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {filtered.map((task) => {
            const catCfg = getCategoryConfig(task.category);
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <div key={task.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors group ${task.status === 'completed' ? 'bg-dark-900 opacity-60' : 'hover:bg-dark-700/30'}`}>
                <button onClick={() => toggleStatus(task.id)} className="mt-0.5 shrink-0" title={`Status: ${task.status.replace('_', ' ')}`}>
                  {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : task.status === 'in_progress' ? <div className="w-4 h-4 rounded-full border-2 border-yellow-400 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" /></div> : <Circle className="w-4 h-4 text-dark-400 hover:text-primary-400 transition-colors" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-tight ${task.status === 'completed' ? 'text-dark-400 line-through' : 'text-dark-100'}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${catCfg.bg} ${catCfg.text}`}>{catCfg.label}</span>
                    {task.dueDate && <span className={`text-[9px] ${isOverdue ? 'text-red-600 font-medium' : 'text-dark-400'}`}>{isOverdue ? 'Overdue: ' : 'Due: '}{format(new Date(task.dueDate), 'MMM d')}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="p-0.5 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"><Trash2 className="w-3 h-3" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Widget config system ─── */
interface WidgetDef {
  id: string;
  label: string;
  description: string;
  size: 'full' | 'half' | 'third';
}

const ALL_WIDGETS: WidgetDef[] = [
  { id: 'stats', label: 'Stats Cards', description: 'Key metrics at a glance with trends', size: 'full' },
  { id: 'assessments-chart', label: 'Assessments Trend', description: 'Area chart of assessments over time', size: 'half' },
  { id: 'pipeline-chart', label: 'Pipeline Breakdown', description: 'Donut chart of client stages', size: 'half' },
  { id: 'weekly-bar', label: 'Weekly Activity', description: 'Bar chart of daily activity this week', size: 'half' },
  { id: 'conversion', label: 'Conversion Funnel', description: 'Intake → Active conversion rates', size: 'half' },
  { id: 'proposals', label: 'Proposal Follow-Up', description: 'Pending proposals needing action', size: 'full' },
  { id: 'activity', label: 'Recent Activity', description: 'Latest assessments and actions', size: 'full' },
  { id: 'tasks', label: 'Tasks', description: 'Personal task list', size: 'half' },
  { id: 'quick-actions', label: 'Quick Actions', description: 'Shortcuts to common actions', size: 'half' },
  { id: 'usage', label: 'My Activity', description: 'Your engagement trends', size: 'full' },
];

const DEFAULT_ORDER = ['stats', 'assessments-chart', 'pipeline-chart', 'weekly-bar', 'conversion', 'proposals', 'activity', 'tasks', 'quick-actions', 'usage'];
const WIDGET_PREFS_KEY = 'palmcare-dashboard-widgets-v2';

interface WidgetPrefs { order: string[]; hidden: string[]; }

function loadWidgetPrefs(): WidgetPrefs {
  if (typeof window === 'undefined') return { order: DEFAULT_ORDER, hidden: [] };
  try {
    const raw = localStorage.getItem(WIDGET_PREFS_KEY);
    if (!raw) return { order: DEFAULT_ORDER, hidden: [] };
    const parsed = JSON.parse(raw) as WidgetPrefs;
    const knownIds = ALL_WIDGETS.map(w => w.id);
    const order = parsed.order.filter(id => knownIds.includes(id));
    for (const id of knownIds) { if (!order.includes(id)) order.push(id); }
    return { order, hidden: parsed.hidden.filter(id => knownIds.includes(id)) };
  } catch { return { order: DEFAULT_ORDER, hidden: [] }; }
}

function saveWidgetPrefs(prefs: WidgetPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(prefs));
}

const WIDGET_ICONS: Record<string, typeof CheckCircle2> = {
  tasks: CheckCircle2,
  stats: BarChart3,
  'assessments-chart': TrendingUp,
  'pipeline-chart': Target,
  'weekly-bar': BarChart3,
  conversion: Zap,
  usage: Activity,
  proposals: FileSignature,
  activity: Calendar,
  'quick-actions': ArrowRight,
};

/* ─── Customize Panel ─── */
function CustomizePanel({ prefs, onUpdate, onClose }: { prefs: WidgetPrefs; onUpdate: (prefs: WidgetPrefs) => void; onClose: () => void }) {
  const [localPrefs, setLocalPrefs] = useState<WidgetPrefs>(prefs);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const orderedWidgets = localPrefs.order.map(id => ALL_WIDGETS.find(w => w.id === id)!).filter(Boolean);

  const toggleVisibility = (id: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      hidden: prev.hidden.includes(id) ? prev.hidden.filter(h => h !== id) : [...prev.hidden, id],
    }));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (id !== draggedId) setDragOverId(id); };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
    setLocalPrefs(prev => {
      const order = [...prev.order];
      const fromIdx = order.indexOf(draggedId);
      const toIdx = order.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, draggedId);
      return { ...prev, order };
    });
    setDraggedId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };
  const handleSave = () => { onUpdate(localPrefs); onClose(); };
  const handleReset = () => setLocalPrefs({ order: DEFAULT_ORDER, hidden: [] });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-700 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-semibold text-dark-100">Customize Dashboard</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-dark-300 hover:bg-dark-700/30 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-1.5">
          <p className="text-xs text-dark-400 mb-3">Drag to reorder. Toggle to show or hide widgets.</p>
          {orderedWidgets.map((widget) => {
            const isHidden = localPrefs.hidden.includes(widget.id);
            const isDragging = draggedId === widget.id;
            const isDragOver = dragOverId === widget.id && draggedId !== widget.id;
            const WidgetIcon = WIDGET_ICONS[widget.id] || LayoutGrid;
            return (
              <div key={widget.id} draggable onDragStart={(e) => handleDragStart(e, widget.id)} onDragOver={(e) => handleDragOver(e, widget.id)} onDrop={(e) => handleDrop(e, widget.id)} onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 select-none ${isDragging ? 'opacity-40 scale-[0.98] border-primary-300 bg-primary-50' : isDragOver ? 'border-primary-400 bg-primary-50 scale-[1.01]' : isHidden ? 'bg-dark-900 border-dark-700' : 'bg-dark-800 border-dark-700 hover:border-dark-600'}`}>
                <div className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-dark-400 transition-colors shrink-0"><GripVertical className="w-4 h-4" /></div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isHidden ? 'bg-dark-700' : 'bg-primary-50'}`}>
                  <WidgetIcon className={`w-4 h-4 ${isHidden ? 'text-dark-400' : 'text-primary-500'}`} />
                </div>
                <div className={`flex-1 min-w-0 ${isHidden ? 'opacity-40' : ''}`}>
                  <p className="text-sm font-medium text-dark-100">{widget.label}</p>
                  <p className="text-[10px] text-dark-400 leading-tight">{widget.description}</p>
                </div>
                <button onClick={() => toggleVisibility(widget.id)} className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${isHidden ? 'bg-slate-200' : 'bg-primary-500'}`} role="switch" aria-checked={!isHidden}>
                  <div className={`absolute top-[3px] w-4 h-4 bg-dark-800 rounded-full shadow-sm transition-transform duration-200 ${isHidden ? 'left-[3px]' : 'translate-x-[21px] left-0'}`} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-dark-700 bg-dark-900">
          <button onClick={handleReset} className="text-xs text-dark-400 hover:text-dark-300 transition-colors">Reset defaults</button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-dark-400 hover:text-dark-200 transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-xs font-medium rounded-lg transition-colors" style={{ color: '#fff' }}>Save Layout</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const router = useRouter();
  const { token, isReady } = useRequireAuth();
  const [stats, setStats] = useState({ totalVisits: 0, pendingReview: 0, totalClients: 0, hoursThisWeek: 0 });
  interface DashboardVisit { id: string; created_at?: string; scheduled_start?: string; status?: string; client_name?: string; client?: { full_name?: string }; contract_generated?: boolean; note_generated?: boolean; }
  interface DashboardClient { id: string; full_name: string; status?: string; updated_at?: string; }
  const [recentVisits, setRecentVisits] = useState<DashboardVisit[]>([]);
  const [allVisits, setAllVisits] = useState<DashboardVisit[]>([]);
  const [allClients, setAllClients] = useState<DashboardClient[]>([]);
  const [proposalClients, setProposalClients] = useState<DashboardClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  interface UsageData { logins: number; total_events: number; top_pages?: { path: string; count: number }[]; daily_activity?: { date: string; count: number }[]; event_breakdown?: Record<string, number>; }
  const [myUsage, setMyUsage] = useState<UsageData | null>(null);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>({ order: DEFAULT_ORDER, hidden: [] });
  const [showCustomize, setShowCustomize] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => { setWidgetPrefs(loadWidgetPrefs()); }, []);
  const updateWidgetPrefs = useCallback((prefs: WidgetPrefs) => { setWidgetPrefs(prefs); saveWidgetPrefs(prefs); }, []);
  const isVisible = useCallback((id: string) => !widgetPrefs.hidden.includes(id), [widgetPrefs.hidden]);

  useEffect(() => { if (token) loadDashboardData(); }, [token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [visitsData, clientsData] = await Promise.all([api.getVisits(token!), api.getClients(token!)]);
      const items = visitsData?.items || [];
      const clients = Array.isArray(clientsData) ? clientsData : [];
      setAllVisits(items); setAllClients(clients);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisWeekCount = items.filter((v: DashboardVisit) => new Date(v.created_at || v.scheduled_start || 0) >= weekAgo).length;
      const proposalList = clients.filter((c: DashboardClient) => c.status === 'proposal');
      setProposalClients(proposalList);
      setStats({ totalVisits: visitsData?.total || 0, pendingReview: proposalList.length, totalClients: clients.length, hoursThisWeek: thisWeekCount });
      setRecentVisits(items.slice(0, 6));
      api.trackUsageEvent(token!, { event_type: 'login', page_path: '/dashboard' }).catch(() => {});
      api.getMyUsage(token!, 30).then(setMyUsage).catch(() => {});
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  /* ─── Chart data: Monthly assessments (area chart) ─── */
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = allVisits.filter(v => { const c = new Date(v.created_at || 0); return c >= d && c <= monthEnd; }).length;
      months.push({ label: format(d, 'MMM'), value: count });
    }
    return months;
  }, [allVisits]);

  /* ─── Chart data: Pipeline donut ─── */
  const pipelineSegments = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      label: stage.label,
      value: allClients.filter(c => stage.statuses.includes(c.status || 'active')).length,
      color: stage.color,
    }));
  }, [allClients]);

  /* ─── Chart data: Weekly activity bar chart ─── */
  const weeklyBarData = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      const count = allVisits.filter(v => { const c = new Date(v.created_at || 0); return c >= dayStart && c <= dayEnd; }).length;
      days.push({ label: format(d, 'EEE'), value: count });
    }
    return days;
  }, [allVisits]);

  /* ─── Conversion funnel ─── */
  const funnelData = useMemo(() => {
    const intake = allClients.filter(c => ['intake', 'pending'].includes(c.status || '')).length;
    const assessment = allClients.filter(c => c.status === 'assessment').length;
    const proposal = allClients.filter(c => ['proposal', 'pending_review'].includes(c.status || '')).length;
    const active = allClients.filter(c => ['active', 'assigned'].includes(c.status || '')).length;
    return [
      { label: 'Intake', value: intake + assessment + proposal + active, color: '#3b82f6' },
      { label: 'Assessment', value: assessment + proposal + active, color: '#8b5cf6' },
      { label: 'Proposal', value: proposal + active, color: '#f59e0b' },
      { label: 'Active', value: active, color: '#10b981' },
    ];
  }, [allClients]);

  /* ─── Sparkline data for stats cards ─── */
  const visitSparkline = useMemo(() => {
    const spark: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      spark.push(allVisits.filter(v => { const c = new Date(v.created_at || 0); return c >= dayStart && c <= dayEnd; }).length);
    }
    return spark;
  }, [allVisits]);

  /* ─── Week-over-week ─── */
  const weekOverWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeek = allVisits.filter(v => new Date(v.created_at || 0) >= weekAgo).length;
    const lastWeek = allVisits.filter(v => { const d = new Date(v.created_at || 0); return d >= twoWeeksAgo && d < weekAgo; }).length;
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }, [allVisits]);

  const handleClientAction = async (clientId: string, action: 'active' | 'follow_up') => {
    if (!token) return;
    setUpdatingClientId(clientId);
    try {
      await api.updateClient(token, clientId, { status: action });
      if (action === 'active') { try { await fetch(`${API_BASE}/clients/${clientId}/activate-policy`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch {} }
      setProposalClients(prev => prev.filter(c => c.id !== clientId));
      setStats(prev => ({ ...prev, pendingReview: prev.pendingReview - 1 }));
    } catch { setError('Failed to update client status.'); }
    finally { setUpdatingClientId(null); }
  };

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center bg-dark-900"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  /* ─── Render a widget by id ─── */
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'stats':
        return (
          <div key="stats" data-tour="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Assessments', value: stats.totalVisits, icon: Calendar, bgClass: 'bg-teal-50', textClass: 'text-teal-600', spark: visitSparkline, sparkColor: '#0d9488' },
              { label: 'Pending Proposals', value: stats.pendingReview, icon: AlertCircle, bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
              { label: 'Total Clients', value: stats.totalClients, icon: Users, bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
              { label: 'This Week', value: stats.hoursThisWeek, icon: Clock, bgClass: 'bg-sky-50', textClass: 'text-sky-600', trend: weekOverWeek },
            ].map((stat, i) => (
              <div key={i} className="bg-dark-800 rounded-lg border border-dark-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 ${stat.bgClass} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.textClass}`} />
                  </div>
                  {'trend' in stat && stat.trend !== undefined && stat.trend !== 0 && (
                    <div className={`flex items-center gap-0.5 text-[11px] font-medium ${stat.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stat.trend)}%
                    </div>
                  )}
                  {'spark' in stat && stat.spark && (
                    <Sparkline data={stat.spark} color={stat.sparkColor} fillColor={stat.sparkColor} width={64} height={24} />
                  )}
                </div>
                <p className="text-dark-400 text-xs mb-0.5">{stat.label}</p>
                <p className="text-2xl font-bold text-dark-50">{stat.value}</p>
              </div>
            ))}
          </div>
        );

      case 'assessments-chart':
        return (
          <div key="assessments-chart" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <h2 className="text-sm font-semibold text-dark-100">Assessments Trend</h2>
              </div>
              <span className="text-[11px] text-dark-400">Last 6 months</span>
            </div>
            {loading ? (
              <div className="h-[180px] flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary-400 animate-spin" /></div>
            ) : (
              <AreaChart data={monthlyData} height={180} color="#0d9488" showDots showGrid showLabels showValues />
            )}
          </div>
        );

      case 'pipeline-chart':
        return (
          <div key="pipeline-chart" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-dark-100">Pipeline Breakdown</h2>
              </div>
              <button onClick={() => router.push('/clients')} className="text-[11px] text-primary-500 hover:text-primary-600 flex items-center gap-0.5">
                View <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <div className="h-[180px] flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary-400 animate-spin" /></div>
            ) : allClients.length === 0 ? (
              <div className="text-center py-8"><Users className="w-7 h-7 text-slate-300 mx-auto mb-2" /><p className="text-dark-400 text-xs">No clients yet</p></div>
            ) : (
              <div className="flex items-center gap-6">
                <DonutChart segments={pipelineSegments} size={140} thickness={22} centerValue={allClients.length} centerLabel="Total" />
                <div className="flex-1 space-y-2">
                  {pipelineSegments.filter(s => s.value > 0).map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-dark-300">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-dark-100">{s.value}</span>
                        <span className="text-[10px] text-dark-400">{Math.round((s.value / allClients.length) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'weekly-bar':
        return (
          <div key="weekly-bar" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-dark-100">Weekly Activity</h2>
              </div>
              <span className="text-[11px] text-dark-400">Last 7 days</span>
            </div>
            {loading ? (
              <div className="h-[160px] flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary-400 animate-spin" /></div>
            ) : (
              <BarChart data={weeklyBarData} height={160} color="#3b82f6" showLabels showValues />
            )}
          </div>
        );

      case 'conversion':
        return (
          <div key="conversion" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-dark-100">Conversion Funnel</h2>
              </div>
            </div>
            {loading ? (
              <div className="h-[160px] flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary-400 animate-spin" /></div>
            ) : allClients.length === 0 ? (
              <div className="text-center py-8"><Zap className="w-7 h-7 text-slate-300 mx-auto mb-2" /><p className="text-dark-400 text-xs">Add clients to see funnel</p></div>
            ) : (
              <div className="space-y-2.5">
                {funnelData.map((step, i) => {
                  const maxVal = Math.max(funnelData[0].value, 1);
                  const pct = Math.max((step.value / maxVal) * 100, 4);
                  const convRate = i === 0 ? 100 : funnelData[0].value > 0 ? Math.round((step.value / funnelData[0].value) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-dark-300">{step.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-dark-100">{step.value}</span>
                          <span className="text-[10px] text-dark-400">{convRate}%</span>
                        </div>
                      </div>
                      <div className="h-5 bg-dark-900 rounded overflow-hidden">
                        <div className="h-full rounded transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: step.color, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'proposals':
        if (proposalClients.length === 0) return null;
        return (
          <div key="proposals" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-dark-100">Proposal Follow-Up</h2>
                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{proposalClients.length}</span>
              </div>
              <button onClick={() => router.push('/clients')} className="text-[11px] text-primary-500 hover:text-primary-600 flex items-center gap-0.5">View All <ChevronRight className="w-3 h-3" /></button>
            </div>
            <div className="space-y-2">
              {proposalClients.map((client) => (
                <div key={client.id} className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg border border-dark-700 hover:border-dark-700 transition-colors">
                  <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-600 font-semibold text-xs">{(client.full_name || 'U')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark-100 text-sm font-medium truncate">{client.full_name}</p>
                    <p className="text-dark-400 text-[11px]">Sent {client.updated_at ? format(new Date(client.updated_at), 'MMM d') : 'recently'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleClientAction(client.id, 'active')} disabled={updatingClientId === client.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors disabled:opacity-50">
                      {updatingClientId === client.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Accept
                    </button>
                    <button onClick={() => handleClientAction(client.id, 'follow_up')} disabled={updatingClientId === client.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-dark-400 bg-dark-700 border border-dark-700 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-md transition-colors disabled:opacity-50">
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'activity':
        return (
          <div key="activity" data-tour="quick-actions" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-500" />
                <h2 className="text-sm font-semibold text-dark-100">Recent Activity</h2>
              </div>
              <button onClick={() => router.push('/visits')} className="text-[11px] text-primary-500 hover:text-primary-600 flex items-center gap-0.5">View all <ChevronRight className="w-3 h-3" /></button>
            </div>
            {loading ? (
              <div className="text-center py-8"><Loader2 className="w-5 h-5 text-primary-400 animate-spin mx-auto" /></div>
            ) : recentVisits.length === 0 ? (
              <div className="text-center py-8"><Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-dark-400 text-xs">No assessments yet</p><button onClick={() => router.push('/visits/new')} className="text-xs text-primary-500 hover:text-primary-600 mt-1.5">Start your first assessment</button></div>
            ) : (
              <div className="space-y-1">
                {recentVisits.map((visit) => {
                  const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
                    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed' },
                    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
                    processing: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Processing' },
                    pending: { bg: 'bg-dark-700', text: 'text-dark-300', label: 'Pending' },
                    failed: { bg: 'bg-red-50', text: 'text-red-700', label: 'Failed' },
                    uploaded: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Uploaded' },
                  };
                  const status = visit.status || 'pending';
                  const cfg = statusCfg[status] || statusCfg.pending;
                  return (
                    <div key={visit.id} onClick={() => router.push(`/visits/${visit.id}`)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-dark-700/30 cursor-pointer transition group">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <span className={`text-[10px] font-bold ${cfg.text}`}>{((visit.client_name || visit.client?.full_name || 'U')[0] || 'U').toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-dark-100 truncate">{visit.client_name || visit.client?.full_name || 'Unknown'}</p>
                        <p className="text-[10px] text-dark-400">{visit.created_at ? format(new Date(visit.created_at), 'MMM d, h:mm a') : '-'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-400 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'tasks':
        return <TasksWidget key="tasks" />;

      case 'quick-actions':
        return (
          <div key="quick-actions" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-4 h-4 text-dark-400" />
              <h2 className="text-sm font-semibold text-dark-100">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: 'New Assessment', desc: 'Start a new intake', icon: Calendar, href: '/visits/new', bgClass: 'bg-teal-50', textClass: 'text-teal-600' },
                { label: 'Add Client', desc: 'Register new client', icon: Users, href: '/clients', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
                { label: 'Create Contract', desc: 'Generate from template', icon: FileSignature, href: '/contracts/new', bgClass: 'bg-purple-50', textClass: 'text-purple-600' },
                { label: 'View Reports', desc: 'Analytics & metrics', icon: BarChart3, href: '/reports', bgClass: 'bg-sky-50', textClass: 'text-sky-600' },
              ].map((action, i) => (
                <button key={i} onClick={() => router.push(action.href)} className="w-full p-3 bg-dark-900 hover:bg-dark-700/50 rounded-lg text-left transition group border border-dark-700 hover:border-dark-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${action.bgClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <action.icon className={`w-4 h-4 ${action.textClass}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-dark-100 font-medium text-xs">{action.label}</p>
                      <p className="text-dark-400 text-[11px]">{action.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'usage':
        return (
          <div key="usage" className="bg-dark-800 border border-dark-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-500" />
                <h2 className="text-sm font-semibold text-dark-100">My Activity</h2>
              </div>
              <span className="text-[11px] text-dark-400">Last 30 days</span>
            </div>
            {myUsage ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Logins', value: myUsage.logins || 0 },
                    { label: 'Events', value: myUsage.total_events || 0 },
                    { label: 'Pages', value: myUsage.top_pages?.length || 0 },
                  ].map((m, i) => (
                    <div key={i} className="bg-dark-900 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-dark-400">{m.label}</p>
                      <p className="text-lg font-bold text-dark-100">{m.value}</p>
                    </div>
                  ))}
                </div>
                {(myUsage.daily_activity?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[11px] text-dark-400 mb-2">Daily Activity (14 days)</p>
                    <BarChart
                      data={myUsage.daily_activity!.slice(-14).map(d => ({ label: format(new Date(d.date), 'dd'), value: d.count }))}
                      height={100}
                      color="#0d9488"
                      showLabels
                      showValues={false}
                    />
                  </div>
                )}
                {myUsage.event_breakdown && Object.keys(myUsage.event_breakdown).length > 0 && (
                  <BarChart
                    data={Object.entries(myUsage.event_breakdown).sort(([,a],[,b]) => (b as number) - (a as number)).slice(0, 5).map(([e, c]) => ({ label: e.replace(/_/g, ' '), value: c as number }))}
                    height={120}
                    horizontal
                    color="#6366f1"
                  />
                )}
                {myUsage.total_events === 0 && (
                  <p className="text-dark-400 text-xs text-center py-4">Activity tracking started. Check back tomorrow.</p>
                )}
              </div>
            ) : (
              <div className="text-center py-6"><Activity className="w-7 h-7 text-slate-300 mx-auto mb-2" /><p className="text-dark-400 text-xs">Loading activity data...</p></div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  /* ─── Layout: pair half-width widgets side-by-side ─── */
  const visibleWidgets = widgetPrefs.order.filter(id => isVisible(id));
  const layoutRows: { ids: string[]; type: 'full' | 'pair' }[] = [];
  let i = 0;
  while (i < visibleWidgets.length) {
    const wid = visibleWidgets[i];
    const wDef = ALL_WIDGETS.find(w => w.id === wid);
    if (wDef?.size === 'half' && i + 1 < visibleWidgets.length) {
      const nextId = visibleWidgets[i + 1];
      const nextDef = ALL_WIDGETS.find(w => w.id === nextId);
      if (nextDef?.size === 'half') {
        layoutRows.push({ ids: [wid, nextId], type: 'pair' });
        i += 2;
        continue;
      }
    }
    layoutRows.push({ ids: [wid], type: 'full' });
    i++;
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-dark-50">Dashboard</h1>
                <p className="text-dark-400 text-sm mt-0.5">Record. Transcribe. Contract. All in your palm.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="period-selector">
                  {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={period === p ? 'active' : ''}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowCustomize(true)} className="p-2 text-dark-400 hover:text-dark-300 hover:bg-dark-700/50 border border-dark-700 rounded-lg transition-colors" title="Customize dashboard">
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showCustomize && <CustomizePanel prefs={widgetPrefs} onUpdate={updateWidgetPrefs} onClose={() => setShowCustomize(false)} />}

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-red-600 text-sm flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-red-500 text-xs underline">Dismiss</button>
              </div>
            )}

            <OnboardingChecklist />

            {/* Dynamic widget layout */}
            <div className="space-y-4">
              {layoutRows.map((row, idx) => {
                if (row.type === 'pair') {
                  return (
                    <div key={idx} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {row.ids.map(id => renderWidget(id))}
                    </div>
                  );
                }
                return renderWidget(row.ids[0]);
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
