'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  Calendar, Clock, Phone, Mail, Building2, Search, Plus, X,
  Trash2, CheckCircle2, User, MapPin, Loader2, ChevronDown,
  Video, ArrowRight, AlertCircle, Star, ExternalLink
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface CrmResult {
  id: string; type: 'lead' | 'investor'; name: string;
  email?: string; phone?: string; company?: string;
  city?: string; state?: string; status?: string;
}

interface ScheduledDemo {
  id: string; contact_name: string; contact_email?: string;
  contact_phone?: string; company_name?: string;
  scheduled_date: string; scheduled_time: string;
  duration_minutes: number; notes?: string; source: string;
  status: string; booked_by: string; booked_by_id: string;
  lead_id?: string; investor_id?: string; crm_data?: Record<string, unknown>;
  created_at: string;
}

const TIMES = Array.from({ length: 19 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

export default function SchedulerPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const [demos, setDemos] = useState<ScheduledDemo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CrmResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCrm, setSelectedCrm] = useState<CrmResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [form, setForm] = useState({
    contact_name: '', contact_email: '', contact_phone: '',
    company_name: '', scheduled_date: '', scheduled_time: '09:00',
    duration_minutes: 30, notes: '', source: 'cold_call' as string,
    lead_id: '', investor_id: '',
  });

  const fetchDemos = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/admin/scheduler/demos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDemos(data.demos || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchDemos(); }, [fetchDemos]);

  useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  const handleCrmSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/admin/scheduler/crm-search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch { /* */ }
      setSearching(false);
    }, 300);
  }, [token]);

  const selectCrmResult = (r: CrmResult) => {
    setSelectedCrm(r);
    setForm(f => ({
      ...f,
      contact_name: r.name,
      contact_email: r.email || '',
      contact_phone: r.phone || '',
      company_name: r.company || '',
      lead_id: r.type === 'lead' ? r.id : '',
      investor_id: r.type === 'investor' ? r.id : '',
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!form.contact_name || !form.scheduled_date || !form.scheduled_time) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/scheduler/demos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ contact_name: '', contact_email: '', contact_phone: '', company_name: '', scheduled_date: '', scheduled_time: '09:00', duration_minutes: 30, notes: '', source: 'cold_call', lead_id: '', investor_id: '' });
        setSelectedCrm(null);
        fetchDemos();
      }
    } catch { /* */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API}/admin/scheduler/demos/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    fetchDemos();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`${API}/admin/scheduler/demos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchDemos();
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = demos.filter(d => d.scheduled_date >= today && d.status !== 'completed' && d.status !== 'cancelled');
  const past = demos.filter(d => d.scheduled_date < today || d.status === 'completed' || d.status === 'cancelled');

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
                <h1 className="text-2xl font-bold text-slate-900">Demo Scheduler</h1>
                <p className="text-sm text-slate-500 mt-1">Schedule and track product demos from cold calls and outreach</p>
              </div>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm">
                <Plus className="w-4 h-4" /> Schedule Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Upcoming', value: upcoming.length, color: 'text-teal-600', bg: 'bg-teal-50' },
                { label: 'Today', value: demos.filter(d => d.scheduled_date === today).length, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'This Week', value: demos.filter(d => { const dt = new Date(d.scheduled_date); const now = new Date(); const diff = (dt.getTime() - now.getTime()) / 86400000; return diff >= 0 && diff <= 7; }).length, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Completed', value: demos.filter(d => d.status === 'completed').length, color: 'text-green-600', bg: 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Upcoming Demos */}
            <div className="bg-white rounded-xl border border-slate-200 mb-6">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Upcoming Demos</h2>
              </div>
              {upcoming.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No upcoming demos scheduled</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcoming.map(demo => (
                    <div key={demo.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{demo.contact_name}</span>
                          {demo.company_name && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{demo.company_name}</span>}
                          {demo.crm_data && <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">CRM Linked</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${demo.source === 'cold_call' ? 'bg-orange-50 text-orange-600' : demo.source === 'inbound' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{demo.source.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(demo.scheduled_date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {demo.scheduled_time} ({demo.duration_minutes}m)</span>
                          {demo.contact_email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {demo.contact_email}</span>}
                          {demo.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {demo.contact_phone}</span>}
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> by {demo.booked_by}</span>
                        </div>
                        {demo.notes && <p className="text-xs text-slate-400 mt-1 truncate">{demo.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleStatusChange(demo.id, 'completed')} className="p-1.5 text-green-500 hover:bg-green-50 rounded-md" title="Mark completed"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => handleStatusChange(demo.id, 'cancelled')} className="p-1.5 text-red-400 hover:bg-red-50 rounded-md" title="Cancel"><X className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(demo.id)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-md" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Demos */}
            {past.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Past & Completed</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {past.slice(0, 10).map(demo => (
                    <div key={demo.id} className="px-5 py-3 flex items-center gap-3 opacity-60">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-700 text-sm">{demo.contact_name}</span>
                        {demo.company_name && <span className="text-xs text-slate-400 ml-2">{demo.company_name}</span>}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${demo.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{demo.status}</span>
                      </div>
                      <span className="text-xs text-slate-400">{demo.scheduled_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* New Demo Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900">Schedule a Demo</h3>
                  <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  {/* CRM Search */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Search CRM (auto-fill)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input value={searchQuery} onChange={e => handleCrmSearch(e.target.value)} placeholder="Type a name, email, or company..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                      {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-teal-500" />}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map(r => (
                          <button key={r.id} onClick={() => selectCrmResult(r)} className="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${r.type === 'lead' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{r.type}</span>
                              <span className="font-medium text-sm text-slate-900">{r.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              {r.email && <span>{r.email}</span>}
                              {r.phone && <span>{r.phone}</span>}
                              {r.city && r.state && <span>{r.city}, {r.state}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCrm && (
                    <div className="flex items-center gap-2 bg-teal-50 rounded-lg px-3 py-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      <span className="text-teal-700">Linked to CRM: <strong>{selectedCrm.name}</strong></span>
                      <button onClick={() => setSelectedCrm(null)} className="ml-auto text-teal-400 hover:text-teal-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Contact Name *</label>
                      <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Company</label>
                      <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Email</label>
                      <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Phone</label>
                      <input type="tel" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Date *</label>
                      <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} min={new Date().toISOString().slice(0, 10)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Time *</label>
                      <select value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                        {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Duration</label>
                      <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                        <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Source</label>
                      <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                        <option value="cold_call">Cold Call</option><option value="inbound">Inbound</option><option value="referral">Referral</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" placeholder="Any context about the call..." />
                  </div>

                  <button onClick={handleSubmit} disabled={saving || !form.contact_name || !form.scheduled_date} className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Schedule Demo
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
