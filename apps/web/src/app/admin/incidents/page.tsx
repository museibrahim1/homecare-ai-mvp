'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStoredToken } from '@/lib/auth';
import {
  AlertTriangle, Plus, Loader2, ArrowLeft, RefreshCw, Send,
  Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle,
  Activity, Eye, Clock, Shield, Wrench
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface IncidentUpdate {
  id: string;
  status: string;
  message: string;
  created_at: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  impact: string;
  service_name: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  updates: IncidentUpdate[];
}

const SERVICES = [
  'PalmCare AI Platform',
  'API',
  'Authentication',
  'AI Pipeline',
  'File Storage',
];

const STATUSES = [
  { value: 'investigating', label: 'Investigating', color: 'text-red-600 bg-red-50' },
  { value: 'identified', label: 'Identified', color: 'text-orange-600 bg-orange-50' },
  { value: 'monitoring', label: 'Monitoring', color: 'text-blue-600 bg-blue-50' },
  { value: 'resolved', label: 'Resolved', color: 'text-emerald-600 bg-emerald-50' },
];

const IMPACTS = [
  { value: 'minor', label: 'Minor', color: 'text-amber-600' },
  { value: 'major', label: 'Major', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'maintenance', label: 'Maintenance', color: 'text-blue-600' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminIncidentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    title: '',
    impact: 'minor',
    service_name: 'PalmCare AI Platform',
    status: 'investigating',
    message: '',
  });
  const [creating, setCreating] = useState(false);

  // Update form
  const [updateForm, setUpdateForm] = useState<Record<string, { status: string; message: string }>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) { router.push('/login'); return; }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          if (user.role === 'admin' && user.email.endsWith('@palmtai.com')) {
            setIsAuthorized(true);
            fetchIncidents();
          } else {
            router.push('/visits');
          }
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const fetchIncidents = async () => {
    setLoading(true);
    const token = getStoredToken();
    try {
      const res = await fetch(`${API_BASE}/status/incidents?days=90`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIncidents(await res.json());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.message.trim()) return;
    setCreating(true);
    setError(null);
    const token = getStoredToken();
    try {
      const res = await fetch(`${API_BASE}/status/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to create incident');
      }
      setCreateForm({ title: '', impact: 'minor', service_name: 'PalmCare AI Platform', status: 'investigating', message: '' });
      setShowCreate(false);
      fetchIncidents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAddUpdate = async (incidentId: string) => {
    const form = updateForm[incidentId];
    if (!form?.message?.trim()) return;
    setUpdating(incidentId);
    setError(null);
    const token = getStoredToken();
    try {
      const res = await fetch(`${API_BASE}/status/incidents/${incidentId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to add update');
      }
      setUpdateForm(prev => ({ ...prev, [incidentId]: { status: 'monitoring', message: '' } }));
      fetchIncidents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (incidentId: string) => {
    if (!confirm('Delete this incident and all updates? This cannot be undone.')) return;
    const token = getStoredToken();
    try {
      await fetch(`${API_BASE}/status/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchIncidents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="landing-dark flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </main>
      </div>
    );
  }

  const activeCount = incidents.filter(i => i.status !== 'resolved').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  return (
    <div className="landing-dark flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-600 font-medium">Incident Management</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Create and manage incidents that appear on the public status page at{' '}
              <Link href="/status" className="underline hover:text-blue-200" target="_blank">/status</Link>.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Status & Incidents</h1>
              <p className="text-slate-500 mt-1">Manage the public status page</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/status"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-slate-50 transition text-slate-500"
            >
              <Eye className="w-4 h-4" />
              View Public Page
            </Link>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <Plus className="w-4 h-4" />
              Report Incident
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-sm">Active Incidents</p>
            <p className={`text-2xl font-bold mt-1 ${activeCount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
              {activeCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-sm">Resolved (90d)</p>
            <p className="text-2xl font-bold mt-1 text-white">{resolvedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-sm">Total Incidents</p>
            <p className="text-2xl font-bold mt-1 text-white">{incidents.length}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-red-600 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-300 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Create Incident Form */}
        {showCreate && (
          <div className="mb-8 bg-white rounded-xl border border-orange-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Report New Incident
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-sm mb-2">Incident Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. PalmCare AI service interruption"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 text-sm mb-2">Affected Service</label>
                  <select
                    value={createForm.service_name}
                    onChange={e => setCreateForm({ ...createForm, service_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-white focus:outline-none focus:border-primary-500"
                  >
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 text-sm mb-2">Impact Level</label>
                  <select
                    value={createForm.impact}
                    onChange={e => setCreateForm({ ...createForm, impact: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-white focus:outline-none focus:border-primary-500"
                  >
                    {IMPACTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 text-sm mb-2">Initial Status</label>
                  <select
                    value={createForm.status}
                    onChange={e => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-white focus:outline-none focus:border-primary-500"
                  >
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-500 text-sm mb-2">Initial Message *</label>
                <textarea
                  rows={3}
                  value={createForm.message}
                  onChange={e => setCreateForm({ ...createForm, message: e.target.value })}
                  placeholder="We are aware of an issue impacting..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreate}
                  disabled={creating || !createForm.title.trim() || !createForm.message.trim()}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Publish Incident
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Incidents List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Incidents</h3>
              <p className="text-slate-500">All systems are operational. No incidents in the last 90 days.</p>
            </div>
          ) : (
            incidents.map(inc => {
              const isExpanded = expandedIncident === inc.id;
              const statusConf = STATUSES.find(s => s.value === inc.status) || STATUSES[0];
              const impactConf = IMPACTS.find(i => i.value === inc.impact) || IMPACTS[0];
              const isActive = inc.status !== 'resolved';

              return (
                <div
                  key={inc.id}
                  className={`bg-white rounded-xl border ${isActive ? 'border-orange-200' : 'border-slate-200'} overflow-hidden`}
                >
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/30 transition"
                    onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isActive ? 'bg-orange-500 animate-pulse' : 'bg-green-500'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-900 font-medium truncate">{inc.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.color}`}>
                            {statusConf.label}
                          </span>
                          <span className={`text-xs ${impactConf.color}`}>
                            {impactConf.label}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {inc.service_name} · {formatDate(inc.created_at)} · {inc.updates.length} update{inc.updates.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(inc.id); }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition text-slate-400 hover:text-red-600"
                        aria-label="Delete incident"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 px-5 py-5">
                      {/* Updates timeline */}
                      <div className="space-y-3 mb-6">
                        {inc.updates.map((upd, idx) => {
                          const updConf = STATUSES.find(s => s.value === upd.status) || STATUSES[0];
                          return (
                            <div key={upd.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                  upd.status === 'resolved' ? 'bg-green-500' :
                                  upd.status === 'monitoring' ? 'bg-blue-500' :
                                  upd.status === 'identified' ? 'bg-orange-500' :
                                  'bg-red-500'
                                }`} />
                                {idx < inc.updates.length - 1 && (
                                  <div className="w-px flex-1 bg-slate-50 mt-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold uppercase ${updConf.color.split(' ')[0]}`}>
                                    {updConf.label}
                                  </span>
                                  <span className="text-slate-400 text-xs">{formatDate(upd.created_at)}</span>
                                </div>
                                <p className="text-slate-600 text-sm mt-1">{upd.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add update form */}
                      {inc.status !== 'resolved' && (
                        <div className="bg-slate-100 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-slate-900 mb-3">Post Update</h4>
                          <div className="flex gap-3 mb-3">
                            <select
                              value={updateForm[inc.id]?.status || 'monitoring'}
                              onChange={e => setUpdateForm(prev => ({
                                ...prev,
                                [inc.id]: { ...prev[inc.id], status: e.target.value, message: prev[inc.id]?.message || '' },
                              }))}
                              className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-primary-500"
                            >
                              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-3">
                            <textarea
                              rows={2}
                              value={updateForm[inc.id]?.message || ''}
                              onChange={e => setUpdateForm(prev => ({
                                ...prev,
                                [inc.id]: { ...prev[inc.id], status: prev[inc.id]?.status || 'monitoring', message: e.target.value },
                              }))}
                              placeholder="Describe what's happening..."
                              className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:border-primary-500 resize-none"
                            />
                            <button
                              onClick={() => handleAddUpdate(inc.id)}
                              disabled={updating === inc.id || !updateForm[inc.id]?.message?.trim()}
                              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 self-end flex items-center gap-2"
                            >
                              {updating === inc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      </main>
    </div>
  );
}
