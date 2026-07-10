'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  Target, Trophy, Zap, Plus, X, Loader2, Share2, CheckCircle2,
  TrendingUp, Phone, Mail, Video, Star, MapPin, ArrowRight,
  Sparkles, MessageSquare, ChevronDown, Flame, Award
} from 'lucide-react';

const API = '/api';

interface Goal {
  id: string; user_id: string; user_name: string;
  title: string; description?: string;
  goal_type: string; target_value: number; current_value: number;
  area?: string; due_date?: string; status: string;
  inspiring_message: string; created_at: string; completed_at?: string;
}

const REGIONS = [
  { id: 'northeast', label: 'Northeast', states: 'CT, ME, MA, NH, NJ, NY, PA, RI, VT' },
  { id: 'southeast', label: 'Southeast', states: 'AL, AR, FL, GA, KY, LA, MS, NC, SC, TN, VA, WV' },
  { id: 'midwest', label: 'Midwest', states: 'IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI' },
  { id: 'southwest', label: 'Southwest', states: 'AZ, NM, OK, TX' },
  { id: 'west', label: 'West', states: 'AK, CA, CO, HI, ID, MT, NV, OR, UT, WA, WY' },
  { id: 'mid_atlantic', label: 'Mid-Atlantic', states: 'DC, DE, MD' },
];

const GOAL_ICONS: Record<string, typeof Phone> = {
  calls: Phone, demos: Video, emails: Mail, conversions: TrendingUp,
};

export default function GoalsPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', goal_type: 'calls',
    target_value: 10, area: '', due_date: '',
  });

  const fetchGoals = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/admin/scheduler/goals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setGoals((await res.json()).goals || []); }
    } catch { /* */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);
  useEffect(() => { if (!isLoading && !token) router.push('/login'); }, [isLoading, token, router]);

  const handleCreate = async () => {
    if (!form.title) return;
    await fetch(`${API}/admin/scheduler/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setForm({ title: '', description: '', goal_type: 'calls', target_value: 10, area: '', due_date: '' });
    fetchGoals();
  };

  const handleAutoGenerate = async () => {
    if (!selectedRegion) return;
    setAutoGenLoading(true);
    try {
      const res = await fetch(`${API}/admin/scheduler/goals/auto-generate?area=${selectedRegion}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowAutoGen(false);
        fetchGoals();
      }
    } catch { /* */ }
    setAutoGenLoading(false);
  };

  const handleProgress = async (id: string, increment: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const newVal = Math.min(goal.current_value + increment, goal.target_value);
    await fetch(`${API}/admin/scheduler/goals/${id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_value: newVal }),
    });
    fetchGoals();
  };

  const handleComplete = async (id: string) => {
    await fetch(`${API}/admin/scheduler/goals/${id}/complete`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    fetchGoals();
  };

  const handleShare = async (goal: Goal) => {
    setSharing(goal.id);
    try {
      const channels = await fetch(`${API}/messaging/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());

      const generalChannel = channels.find((c: { name: string; is_dm: boolean }) => c.name === 'general' && !c.is_dm);
      if (generalChannel) {
        const message = `🏆 **Goal Completed!** ${user?.full_name || 'Team member'} just crushed it!\n\n✅ ${goal.title}\n📊 ${goal.target_value} ${goal.goal_type} achieved${goal.area ? ` in ${goal.area.replace('_', ' ')}` : ''}\n\n${goal.inspiring_message}`;
        await fetch(`${API}/messaging/channels/${generalChannel.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: message }),
        });
      }
    } catch { /* */ }
    setSharing(null);
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  if (isLoading || loading) {
    return <div className="flex h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div></div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Goals & Tasks</h1>
                <p className="text-sm text-slate-500 mt-1">Track your outreach goals, auto-generate tasks by region, and celebrate wins</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAutoGen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium text-sm">
                  <Sparkles className="w-4 h-4" /> Auto-Generate
                </button>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm">
                  <Plus className="w-4 h-4" /> New Goal
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-100">
                <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">Active Goals</p>
                <p className="text-3xl font-bold text-teal-700 mt-1">{activeGoals.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{completedGoals.length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Total Progress</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">
                  {activeGoals.length > 0 ? Math.round(activeGoals.reduce((sum, g) => sum + (g.current_value / g.target_value) * 100, 0) / activeGoals.length) : 0}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Streak</p>
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="w-6 h-6 text-orange-500" />
                  <p className="text-3xl font-bold text-purple-700">{completedGoals.length}</p>
                </div>
              </div>
            </div>

            {/* Active Goals */}
            <div className="space-y-4 mb-8">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Target className="w-5 h-5 text-teal-500" /> Active Goals</h2>
              {activeGoals.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Target className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-500">No active goals. Create one or auto-generate from a region!</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeGoals.map(goal => {
                    const pct = Math.round((goal.current_value / goal.target_value) * 100);
                    const GoalIcon = GOAL_ICONS[goal.goal_type] || Target;
                    return (
                      <div key={goal.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                              <GoalIcon className="w-5 h-5 text-teal-500" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 text-sm">{goal.title}</h3>
                              {goal.area && (
                                <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {goal.area.replace('_', ' ')}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-teal-600">{pct}%</span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-slate-500">{goal.current_value} / {goal.target_value} {goal.goal_type}</span>
                          {goal.due_date && <span className="text-xs text-slate-400">Due {new Date(goal.due_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        </div>

                        {/* Inspiring message */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 mb-3 border border-amber-100">
                          <p className="text-xs text-amber-800 italic leading-relaxed">&ldquo;{goal.inspiring_message}&rdquo;</p>
                        </div>

                        {goal.description && <p className="text-xs text-slate-400 mb-3">{goal.description}</p>}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleProgress(goal.id, 1)} className="flex-1 py-2 bg-teal-50 text-teal-600 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors flex items-center justify-center gap-1">
                            <Plus className="w-3 h-3" /> +1
                          </button>
                          <button onClick={() => handleProgress(goal.id, 5)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                            +5
                          </button>
                          <button onClick={() => handleComplete(goal.id)} className="flex-1 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Completed</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {completedGoals.map(goal => (
                    <div key={goal.id} className="bg-white rounded-xl border border-green-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-500" />
                          <h3 className="font-semibold text-slate-700 text-sm">{goal.title}</h3>
                        </div>
                        <button
                          onClick={() => handleShare(goal)}
                          disabled={sharing === goal.id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-600 rounded-md text-xs font-medium hover:bg-teal-100 transition-colors"
                        >
                          {sharing === goal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                          Share
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">{goal.target_value} {goal.goal_type} completed{goal.area ? ` in ${goal.area.replace('_', ' ')}` : ''}</p>
                      {goal.completed_at && <p className="text-[10px] text-green-500 mt-1">Completed {new Date(goal.completed_at).toLocaleDateString()}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto-Generate Modal */}
          {showAutoGen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAutoGen(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-500" /> Auto-Generate Goals</h3>
                  <button onClick={() => setShowAutoGen(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-500">Select a region and we&apos;ll auto-create goals based on the leads available in that area.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REGIONS.map(r => (
                      <button key={r.id} onClick={() => setSelectedRegion(r.id)} className={`p-3 rounded-lg border text-left transition-colors ${selectedRegion === r.id ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <p className="font-semibold text-sm text-slate-900">{r.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{r.states}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleAutoGenerate} disabled={!selectedRegion || autoGenLoading} className="w-full py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2">
                    {autoGenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate Goals for {selectedRegion ? REGIONS.find(r => r.id === selectedRegion)?.label : '...'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Create Modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900">Create Goal</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Make 20 calls in Southeast" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Type</label>
                      <select value={form.goal_type} onChange={e => setForm(f => ({ ...f, goal_type: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none">
                        <option value="calls">Calls</option><option value="demos">Demos</option><option value="emails">Emails</option><option value="conversions">Conversions</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Target</label>
                      <input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Due Date</label>
                    <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none" />
                  </div>
                  <button onClick={handleCreate} disabled={!form.title} className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 disabled:opacity-50">Create Goal</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
