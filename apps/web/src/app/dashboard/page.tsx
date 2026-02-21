'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Users, Clock, TrendingUp, ChevronRight, CheckCircle, AlertCircle,
  FileSignature, UserCheck, UserX, Loader2, Activity, BarChart3, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, Circle, CheckCircle2, X, GripVertical, Tag, Settings2,
  LayoutGrid
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import { format } from 'date-fns';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/* ─── Pipeline stage config ─── */
const PIPELINE_STAGES = [
  { key: 'intake', label: 'Intake', color: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/20', statuses: ['intake', 'pending'] },
  { key: 'assessment', label: 'Assessment', color: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/20', statuses: ['assessment'] },
  { key: 'proposal', label: 'Proposal', color: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/20', statuses: ['proposal', 'pending_review'] },
  { key: 'active', label: 'Active', color: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/20', statuses: ['active', 'assigned'] },
  { key: 'follow_up', label: 'Follow-up', color: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/20', statuses: ['follow_up', 'review', 'discharged', 'inactive'] },
];

/* ─── Simple bar chart component (pure CSS, no library) ─── */
function MiniBarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  const safeMax = Math.max(maxValue, 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((item, i) => {
        const heightPct = Math.max((item.value / safeMax) * 100, 4);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-xs text-dark-300 font-medium">{item.value}</span>
            <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: `${heightPct}%` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-primary-600 to-primary-400 opacity-80 hover:opacity-100 transition-opacity rounded-t-md" />
            </div>
            <span className="text-[10px] text-dark-400 truncate w-full text-center">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Pipeline bar component ─── */
function PipelineBar({ stages }: { stages: { label: string; count: number; color: string; text: string; bg: string }[] }) {
  const total = Math.max(stages.reduce((sum, s) => sum + s.count, 0), 1);
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-dark-600">
        {stages.map((stage, i) => {
          const pct = (stage.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              className={`${stage.color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${stage.label}: ${stage.count}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
            <span className="text-xs text-dark-300">{stage.label}</span>
            <span className={`text-xs font-semibold ${stage.text}`}>{stage.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  { value: 'assessment', label: 'Assessment', bg: 'bg-primary-500/20', text: 'text-primary-400' },
  { value: 'follow_up', label: 'Follow-up', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  { value: 'documentation', label: 'Documentation', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { value: 'billing', label: 'Billing', bg: 'bg-green-500/20', text: 'text-green-400' },
  { value: 'general', label: 'General', bg: 'bg-dark-600', text: 'text-dark-300' },
];

const TASK_STORAGE_KEY = 'palmcare-tasks';

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TASK_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
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

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  const updateTasks = (updated: Task[]) => {
    setTasks(updated);
    saveTasks(updated);
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      status: 'todo',
      category: newCategory,
      dueDate: newDueDate || undefined,
      createdAt: new Date().toISOString(),
    };
    updateTasks([task, ...tasks]);
    setNewTitle('');
    setNewCategory('general');
    setNewDueDate('');
    setShowAddForm(false);
  };

  const toggleStatus = (id: string) => {
    updateTasks(tasks.map(t => {
      if (t.id !== id) return t;
      const next = t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : 'todo';
      return { ...t, status: next };
    }));
  };

  const deleteTask = (id: string) => {
    updateTasks(tasks.filter(t => t.id !== id));
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const getCategoryConfig = (cat?: string) =>
    TASK_CATEGORIES.find(c => c.value === cat) || TASK_CATEGORIES[4];

  return (
    <div data-tour="tasks" className="card p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary-400" />
          <h2 className="text-base lg:text-lg font-semibold text-white">Tasks</h2>
          <span className="text-xs bg-dark-600 text-dark-300 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-dark-700/50 rounded-xl border border-dark-600 space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg text-white text-sm placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-dark-700 border border-dark-500 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TASK_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="px-3 py-1.5 bg-dark-700 border border-dark-500 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={addTask}
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-600 disabled:text-dark-400 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-3 bg-dark-700/30 rounded-lg p-0.5">
        {[
          { key: 'all' as const, label: 'All', count: tasks.length },
          { key: 'todo' as const, label: 'To Do', count: todoCount },
          { key: 'in_progress' as const, label: 'In Progress', count: inProgressCount },
          { key: 'completed' as const, label: 'Done', count: completedCount },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-dark-700 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {f.label} {f.count > 0 && <span className="text-dark-500 ml-0.5">{f.count}</span>}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-8 h-8 text-dark-600 mx-auto mb-2" />
          <p className="text-dark-400 text-sm">
            {filter === 'all' ? 'No tasks yet. Add one above!' : `No ${filter.replace('_', ' ')} tasks`}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          {filtered.map((task) => {
            const catCfg = getCategoryConfig(task.category);
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <div
                key={task.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg transition-colors group ${
                  task.status === 'completed' ? 'bg-dark-700/20 opacity-60' : 'bg-dark-700/30 hover:bg-dark-700/50'
                }`}
              >
                {/* Status toggle */}
                <button
                  onClick={() => toggleStatus(task.id)}
                  className="mt-0.5 shrink-0"
                  title={`Status: ${task.status.replace('_', ' ')}`}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : task.status === 'in_progress' ? (
                    <div className="w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-dark-500 hover:text-primary-400 transition-colors" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${task.status === 'completed' ? 'text-dark-400 line-through' : 'text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${catCfg.bg} ${catCfg.text}`}>
                      {catCfg.label}
                    </span>
                    {task.dueDate && (
                      <span className={`text-[10px] ${isOverdue ? 'text-red-400 font-medium' : 'text-dark-400'}`}>
                        {isOverdue ? 'Overdue: ' : 'Due: '}{format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 text-dark-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
}

const ALL_WIDGETS: WidgetDef[] = [
  { id: 'tasks', label: 'Tasks', description: 'Create and manage tasks' },
  { id: 'stats', label: 'Stats Cards', description: 'Key numbers at a glance' },
  { id: 'charts', label: 'Charts', description: 'Trend & pipeline charts' },
  { id: 'proposals', label: 'Proposal Follow-Up', description: 'Pending proposals' },
  { id: 'activity', label: 'Activity & Actions', description: 'Recent activity + quick actions' },
];

const DEFAULT_ORDER = ['stats', 'charts', 'proposals', 'activity', 'tasks'];
const WIDGET_PREFS_KEY = 'palmcare-dashboard-widgets';

interface WidgetPrefs {
  order: string[];
  hidden: string[];
}

function loadWidgetPrefs(): WidgetPrefs {
  if (typeof window === 'undefined') return { order: DEFAULT_ORDER, hidden: [] };
  try {
    const raw = localStorage.getItem(WIDGET_PREFS_KEY);
    if (!raw) return { order: DEFAULT_ORDER, hidden: [] };
    const parsed = JSON.parse(raw) as WidgetPrefs;
    // Ensure any newly added widgets are included
    const knownIds = ALL_WIDGETS.map(w => w.id);
    const order = parsed.order.filter(id => knownIds.includes(id));
    for (const id of knownIds) {
      if (!order.includes(id)) order.push(id);
    }
    return { order, hidden: parsed.hidden.filter(id => knownIds.includes(id)) };
  } catch {
    return { order: DEFAULT_ORDER, hidden: [] };
  }
}

function saveWidgetPrefs(prefs: WidgetPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(prefs));
}

/* ─── Widget icons for the customize panel ─── */
const WIDGET_ICONS: Record<string, typeof CheckCircle2> = {
  tasks: CheckCircle2,
  stats: BarChart3,
  charts: Activity,
  proposals: FileSignature,
  activity: Calendar,
};

/* ─── Customize Panel (drag-and-drop + toggle switches) ─── */
function CustomizePanel({
  prefs,
  onUpdate,
  onClose,
}: {
  prefs: WidgetPrefs;
  onUpdate: (prefs: WidgetPrefs) => void;
  onClose: () => void;
}) {
  const [localPrefs, setLocalPrefs] = useState<WidgetPrefs>(prefs);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const orderedWidgets = localPrefs.order.map(id => ALL_WIDGETS.find(w => w.id === id)!).filter(Boolean);

  const toggleVisibility = (id: string) => {
    setLocalPrefs(prev => {
      const hidden = prev.hidden.includes(id)
        ? prev.hidden.filter(h => h !== id)
        : [...prev.hidden, id];
      return { ...prev, hidden };
    });
  };

  /* ─── Drag handlers ─── */
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, e.currentTarget.offsetWidth / 2, 20);
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    setLocalPrefs(prev => {
      const order = [...prev.order];
      const fromIdx = order.indexOf(draggedId);
      const toIdx = order.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, draggedId);
      return { ...prev, order };
    });
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleSave = () => {
    onUpdate(localPrefs);
    onClose();
  };

  const handleReset = () => {
    setLocalPrefs({ order: DEFAULT_ORDER, hidden: [] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-5 h-5 text-primary-400" />
            <h2 className="text-base font-semibold text-white">Customize Dashboard</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Widget List */}
        <div className="p-4 space-y-1.5">
          <p className="text-xs text-dark-400 mb-3">Drag to reorder. Toggle to show or hide.</p>
          {orderedWidgets.map((widget) => {
            const isHidden = localPrefs.hidden.includes(widget.id);
            const isDragging = draggedId === widget.id;
            const isDragOver = dragOverId === widget.id && draggedId !== widget.id;
            const WidgetIcon = WIDGET_ICONS[widget.id] || LayoutGrid;

            return (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={(e) => handleDragOver(e, widget.id)}
                onDrop={(e) => handleDrop(e, widget.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 select-none ${
                  isDragging
                    ? 'opacity-40 scale-[0.98] border-primary-500/40 bg-primary-500/5'
                    : isDragOver
                    ? 'border-primary-500/60 bg-primary-500/10 scale-[1.01]'
                    : isHidden
                    ? 'bg-dark-700/20 border-dark-700/30'
                    : 'bg-dark-700/40 border-dark-600/50 hover:border-dark-500'
                }`}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing p-1 text-dark-500 hover:text-dark-300 transition-colors shrink-0">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isHidden ? 'bg-dark-700/30' : 'bg-primary-500/10'
                }`}>
                  <WidgetIcon className={`w-4 h-4 transition-colors ${isHidden ? 'text-dark-500' : 'text-primary-400'}`} />
                </div>

                {/* Info */}
                <div className={`flex-1 min-w-0 transition-opacity ${isHidden ? 'opacity-40' : ''}`}>
                  <p className="text-sm font-medium text-white">{widget.label}</p>
                  <p className="text-[11px] text-dark-400 leading-tight">{widget.description}</p>
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => toggleVisibility(widget.id)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
                    isHidden ? 'bg-dark-600' : 'bg-primary-500'
                  }`}
                  role="switch"
                  aria-checked={!isHidden}
                >
                  <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    isHidden ? 'left-[3px]' : 'translate-x-[21px] left-0'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-dark-700 bg-dark-800/50">
          <button
            onClick={handleReset}
            className="text-xs text-dark-400 hover:text-white transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-dark-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, isReady } = useRequireAuth();
  const [stats, setStats] = useState({ totalVisits: 0, pendingReview: 0, totalClients: 0, hoursThisWeek: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [proposalClients, setProposalClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ─── Widget preferences ─── */
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>({ order: DEFAULT_ORDER, hidden: [] });
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    setWidgetPrefs(loadWidgetPrefs());
  }, []);

  const updateWidgetPrefs = useCallback((prefs: WidgetPrefs) => {
    setWidgetPrefs(prefs);
    saveWidgetPrefs(prefs);
  }, []);

  const isWidgetVisible = useCallback((id: string) => !widgetPrefs.hidden.includes(id), [widgetPrefs.hidden]);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [visitsData, clientsData] = await Promise.all([
        api.getVisits(token!),
        api.getClients(token!),
      ]);
      const items = visitsData?.items || [];
      const clients = Array.isArray(clientsData) ? clientsData : [];

      setAllVisits(items);
      setAllClients(clients);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisWeekCount = items.filter((v: any) => {
        const created = new Date(v.created_at || v.scheduled_start || 0);
        return created >= weekAgo;
      }).length;
      
      const proposalList = clients.filter((c: any) => c.status === 'proposal');
      setProposalClients(proposalList);
      
      setStats({
        totalVisits: visitsData?.total || 0,
        pendingReview: proposalList.length,
        totalClients: clients.length,
        hoursThisWeek: thisWeekCount,
      });
      setRecentVisits(items.slice(0, 6));
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Compute monthly assessment chart data (last 6 months) ─── */
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = allVisits.filter((v: any) => {
        const created = new Date(v.created_at || 0);
        return created >= d && created <= monthEnd;
      }).length;
      months.push({
        label: format(d, 'MMM'),
        value: count,
      });
    }
    return months;
  }, [allVisits]);

  const monthlyMax = useMemo(() => Math.max(...monthlyData.map(m => m.value), 1), [monthlyData]);

  /* ─── Compute week-over-week change ─── */
  const weekOverWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeek = allVisits.filter((v: any) => new Date(v.created_at || 0) >= weekAgo).length;
    const lastWeek = allVisits.filter((v: any) => {
      const d = new Date(v.created_at || 0);
      return d >= twoWeeksAgo && d < weekAgo;
    }).length;
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }, [allVisits]);

  /* ─── Compute pipeline breakdown ─── */
  const pipelineStages = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      ...stage,
      count: allClients.filter(c => {
        const status = c.status || 'active';
        return stage.statuses.includes(status);
      }).length,
    }));
  }, [allClients]);

  const handleClientAction = async (clientId: string, action: 'active' | 'follow_up') => {
    if (!token) return;
    setUpdatingClientId(clientId);
    try {
      await api.updateClient(token, clientId, { status: action });
      
      if (action === 'active') {
        try {
          await fetch(`${API_BASE}/clients/${clientId}/activate-policy`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Policy creation is best-effort
        }
      }
      
      setProposalClients(prev => prev.filter(c => c.id !== clientId));
      setStats(prev => ({ ...prev, pendingReview: prev.pendingReview - 1 }));
    } catch {
      setError('Failed to update client status. Please try again.');
    } finally {
      setUpdatingClientId(null);
    }
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 lg:mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-dark-300 text-sm lg:text-base">Care assessments in, proposal-ready contracts out.</p>
            </div>
            <button
              onClick={() => setShowCustomize(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:text-white bg-dark-700/50 hover:bg-dark-700 border border-dark-600 rounded-lg transition-colors shrink-0"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Customize</span>
            </button>
          </div>

          {showCustomize && (
            <CustomizePanel
              prefs={widgetPrefs}
              onUpdate={updateWidgetPrefs}
              onClose={() => setShowCustomize(false)}
            />
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm underline">Dismiss</button>
            </div>
          )}

          <OnboardingChecklist />

          {/* ─── Dynamic Widget Renderer ─── */}
          <div className="space-y-6 lg:space-y-8">
            {widgetPrefs.order.filter(id => isWidgetVisible(id)).map((widgetId) => {
              switch (widgetId) {
                /* ─── Tasks ─── */
                case 'tasks':
                  return <TasksWidget key="tasks" />;

                /* ─── Stats Grid ─── */
                case 'stats':
                  return (
                    <div key="stats" data-tour="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                      {[
                        { label: 'Total Assessments', value: stats.totalVisits, icon: Calendar, bgClass: 'bg-accent-primary/20', textClass: 'text-accent-primary' },
                        { label: 'Pending Proposals', value: stats.pendingReview, icon: AlertCircle, bgClass: 'bg-accent-orange/20', textClass: 'text-accent-orange' },
                        { label: 'Total Clients', value: stats.totalClients, icon: Users, bgClass: 'bg-accent-green/20', textClass: 'text-accent-green' },
                        { label: 'This Week', value: stats.hoursThisWeek, icon: Clock, bgClass: 'bg-accent-cyan/20', textClass: 'text-accent-cyan', trend: weekOverWeek },
                      ].map((stat, i) => (
                        <div key={i} className="card p-3 lg:p-5">
                          <div className="flex items-center justify-between mb-2 lg:mb-3">
                            <div className={`w-8 h-8 lg:w-10 lg:h-10 ${stat.bgClass} rounded-lg lg:rounded-xl flex items-center justify-center`}>
                              <stat.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${stat.textClass}`} />
                            </div>
                            {'trend' in stat && stat.trend !== undefined && stat.trend !== 0 && (
                              <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stat.trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {Math.abs(stat.trend)}%
                              </div>
                            )}
                          </div>
                          <p className="text-dark-400 text-xs lg:text-sm mb-1 truncate">{stat.label}</p>
                          <p className={`text-xl lg:text-3xl font-bold ${stat.textClass}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  );

                /* ─── Charts Row ─── */
                case 'charts':
                  return (
                    <div key="charts" data-tour="pipeline" className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                      {/* Monthly Assessments Chart */}
                      <div className="card p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary-400" />
                            <h2 className="text-sm lg:text-base font-semibold text-white">Assessments Trend</h2>
                          </div>
                          <span className="text-xs text-dark-400">Last 6 months</span>
                        </div>
                        {loading ? (
                          <div className="h-32 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <MiniBarChart data={monthlyData} maxValue={monthlyMax} />
                        )}
                      </div>

                      {/* Client Pipeline Breakdown */}
                      <div className="card p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-400" />
                            <h2 className="text-sm lg:text-base font-semibold text-white">Client Pipeline</h2>
                          </div>
                          <button
                            onClick={() => router.push('/clients')}
                            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                          >
                            View all <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {loading ? (
                          <div className="h-20 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : allClients.length === 0 ? (
                          <div className="text-center py-6">
                            <Users className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                            <p className="text-dark-400 text-sm">No clients yet</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-2 mb-4">
                              <span className="text-3xl font-bold text-white">{allClients.length}</span>
                              <span className="text-sm text-dark-400">total clients</span>
                            </div>
                            <PipelineBar stages={pipelineStages} />
                          </div>
                        )}
                      </div>
                    </div>
                  );

                /* ─── Proposal Follow-Up ─── */
                case 'proposals':
                  if (proposalClients.length === 0) return null;
                  return (
                    <div key="proposals" className="card p-4 lg:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <FileSignature className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-white">Proposal Follow-Up</h2>
                            <p className="text-dark-400 text-sm">{proposalClients.length} client{proposalClients.length !== 1 ? 's' : ''} awaiting response</p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push('/clients')}
                          className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1"
                        >
                          View All <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {proposalClients.map((client) => (
                          <div
                            key={client.id}
                            className="flex items-center gap-3 p-3 bg-dark-700/30 rounded-xl border border-dark-700/50 hover:border-dark-600 transition-colors"
                          >
                            <div className="w-9 h-9 bg-orange-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-orange-400 font-semibold text-sm">
                                {(client.full_name || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{client.full_name}</p>
                              <p className="text-dark-400 text-xs">Sent {client.updated_at ? format(new Date(client.updated_at), 'MMM d, yyyy') : 'recently'}</p>
                            </div>
                            <span className="hidden sm:inline-flex px-2 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-[11px] font-medium">
                              Pending
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleClientAction(client.id, 'active')}
                                disabled={updatingClientId === client.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updatingClientId === client.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                )}
                                Accept
                              </button>
                              <button
                                onClick={() => handleClientAction(client.id, 'follow_up')}
                                disabled={updatingClientId === client.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-dark-400 hover:text-red-400 bg-dark-700/50 border border-dark-600 hover:border-red-500/20 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                /* ─── Activity Feed + Quick Actions ─── */
                case 'activity':
                  return (
                    <div key="activity" data-tour="quick-actions" className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                      {/* Recent Activity Feed */}
                      <div className="lg:col-span-2 card p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary-400" />
                            <h2 className="text-base lg:text-lg font-semibold text-white">Recent Activity</h2>
                          </div>
                          <button onClick={() => router.push('/visits')} className="text-primary-400 text-xs lg:text-sm hover:text-primary-300 flex items-center gap-1">
                            View all <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        {loading ? (
                          <div className="text-center py-6 lg:py-8">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          </div>
                        ) : recentVisits.length === 0 ? (
                          <div className="text-center py-6 lg:py-8">
                            <Calendar className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                            <p className="text-dark-400 text-sm">No assessments yet</p>
                            <button onClick={() => router.push('/visits/new')} className="text-sm text-primary-400 hover:text-primary-300 mt-2">
                              Start your first assessment
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="hidden sm:grid grid-cols-12 gap-3 px-3 pb-2 text-xs font-medium text-dark-400 uppercase tracking-wider border-b border-dark-700/50">
                              <div className="col-span-2">Date</div>
                              <div className="col-span-4">Client</div>
                              <div className="col-span-2">Status</div>
                              <div className="col-span-3">Type</div>
                              <div className="col-span-1"></div>
                            </div>
                            <div className="space-y-1 mt-1">
                              {recentVisits.map((visit) => {
                                const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                                  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
                                  approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Approved' },
                                  processing: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Processing' },
                                  pending: { bg: 'bg-dark-600', text: 'text-dark-300', label: 'Pending' },
                                  failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' },
                                  uploaded: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Uploaded' },
                                };
                                const status = visit.status || 'pending';
                                const cfg = statusConfig[status] || statusConfig.pending;
                                let typeLabel = 'Assessment';
                                let typeBg = 'bg-primary-500/20';
                                let typeText = 'text-primary-400';
                                if (visit.contract_generated) {
                                  typeLabel = 'Contract'; typeBg = 'bg-green-500/20'; typeText = 'text-green-400';
                                } else if (visit.note_generated) {
                                  typeLabel = 'Visit Note'; typeBg = 'bg-purple-500/20'; typeText = 'text-purple-400';
                                } else if (status === 'processing') {
                                  typeLabel = 'Processing'; typeBg = 'bg-yellow-500/20'; typeText = 'text-yellow-400';
                                }
                                return (
                                  <div
                                    key={visit.id}
                                    onClick={() => router.push(`/visits/${visit.id}`)}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-3 p-3 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 cursor-pointer transition group items-center"
                                  >
                                    <div className="sm:col-span-2 text-xs text-dark-400">
                                      {visit.created_at ? format(new Date(visit.created_at), 'MMM d, h:mm a') : '-'}
                                    </div>
                                    <div className="sm:col-span-4 flex items-center gap-2 min-w-0">
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                                        <span className={`text-xs font-bold ${cfg.text}`}>
                                          {((visit.client_name || visit.client?.full_name || 'U')[0] || 'U').toUpperCase()}
                                        </span>
                                      </div>
                                      <span className="text-sm text-white font-medium truncate">
                                        {visit.client_name || visit.client?.full_name || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                        {cfg.label}
                                      </span>
                                    </div>
                                    <div className="sm:col-span-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-medium ${typeBg} ${typeText}`}>
                                        {typeLabel}
                                      </span>
                                    </div>
                                    <div className="sm:col-span-1 hidden sm:flex justify-end">
                                      <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="card p-4 lg:p-6">
                        <h2 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4">Quick Actions</h2>
                        <div className="space-y-2 lg:space-y-3">
                          {[
                            { label: 'New Assessment', desc: 'Start a new intake/visit', icon: Calendar, href: '/visits/new', bgClass: 'bg-accent-primary/20', textClass: 'text-accent-primary' },
                            { label: 'Add Client', desc: 'Register new client', icon: Users, href: '/clients', bgClass: 'bg-accent-green/20', textClass: 'text-accent-green' },
                            { label: 'Export Proposals', desc: 'View & export contracts', icon: TrendingUp, href: '/proposals', bgClass: 'bg-accent-cyan/20', textClass: 'text-accent-cyan' },
                          ].map((action, i) => (
                            <button key={i} onClick={() => router.push(action.href)} className="w-full p-3 lg:p-4 bg-dark-700/50 hover:bg-dark-700 rounded-lg lg:rounded-xl text-left transition group">
                              <div className="flex items-center gap-2 lg:gap-3">
                                <div className={`w-8 h-8 lg:w-10 lg:h-10 ${action.bgClass} rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0`}>
                                  <action.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${action.textClass}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium text-sm lg:text-base">{action.label}</p>
                                  <p className="text-dark-400 text-xs lg:text-sm truncate">{action.desc}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Pipeline Summary (compact) */}
                        <div className="mt-5 pt-5 border-t border-dark-700">
                          <h3 className="text-sm font-medium text-dark-400 mb-3">Pipeline Summary</h3>
                          <div className="space-y-2">
                            {pipelineStages.filter(s => s.count > 0).map((stage, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                  <span className="text-xs text-dark-300">{stage.label}</span>
                                </div>
                                <span className={`text-xs font-semibold ${stage.text}`}>{stage.count}</span>
                              </div>
                            ))}
                            {pipelineStages.every(s => s.count === 0) && (
                              <p className="text-xs text-dark-500">No clients in pipeline</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                default:
                  return null;
              }
            })}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
