'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Mic, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw,
  ChevronDown, ChevronUp, Activity, Wrench, ArrowLeft, Bell
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const POLL_INTERVAL = 30_000;

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

interface StatusOverview {
  overall_status: string;
  overall_impact: string;
  services: { name: string; status: string }[];
  active_incidents: Incident[];
  recent_incidents: Incident[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; banner: string }> = {
  operational: {
    label: 'All Systems Operational',
    color: 'text-green-400',
    bg: 'bg-green-500',
    icon: CheckCircle,
    banner: 'bg-gradient-to-r from-green-600 to-emerald-600',
  },
  maintenance: {
    label: 'Scheduled Maintenance',
    color: 'text-blue-400',
    bg: 'bg-blue-500',
    icon: Wrench,
    banner: 'bg-gradient-to-r from-blue-600 to-indigo-600',
  },
  minor: {
    label: 'Minor Service Disruption',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500',
    icon: AlertTriangle,
    banner: 'bg-gradient-to-r from-yellow-600 to-orange-600',
  },
  major: {
    label: 'Partial System Outage',
    color: 'text-orange-400',
    bg: 'bg-orange-500',
    icon: AlertTriangle,
    banner: 'bg-gradient-to-r from-orange-600 to-red-600',
  },
  critical: {
    label: 'Major System Outage',
    color: 'text-red-400',
    bg: 'bg-red-500',
    icon: XCircle,
    banner: 'bg-gradient-to-r from-red-600 to-red-800',
  },
};

const INCIDENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  investigating: { label: 'Investigating', color: 'text-red-400' },
  identified: { label: 'Identified', color: 'text-orange-400' },
  monitoring: { label: 'Monitoring', color: 'text-blue-400' },
  resolved: { label: 'Resolved', color: 'text-green-400' },
};

const SERVICE_STATUS_ICON: Record<string, { color: string; bg: string }> = {
  operational: { color: 'text-green-400', bg: 'bg-green-500' },
  maintenance: { color: 'text-blue-400', bg: 'bg-blue-500' },
  minor: { color: 'text-yellow-400', bg: 'bg-yellow-500' },
  major: { color: 'text-orange-400', bg: 'bg-orange-500' },
  critical: { color: 'text-red-400', bg: 'bg-red-500' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

function formatDateGroup(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() === yesterday.getTime()) return 'Yesterday';

  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function groupIncidentsByDay(incidents: Incident[]): Record<string, Incident[]> {
  const groups: Record<string, Incident[]> = {};
  for (const inc of incidents) {
    const key = new Date(inc.created_at).toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(inc);
  }
  return groups;
}

function getDaysInRange(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIncidents, setExpandedIncidents] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status/overview`);
      if (!res.ok) throw new Error('Failed to load status');
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Unable to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const toggleIncident = (id: string) => {
    setExpandedIncidents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const config = data ? (STATUS_CONFIG[data.overall_status] || STATUS_CONFIG.operational) : STATUS_CONFIG.operational;
  const StatusIcon = config.icon;

  const allIncidents = data ? [...data.active_incidents, ...data.recent_incidents] : [];
  const grouped = groupIncidentsByDay(allIncidents);
  const days = getDaysInRange(14);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700/50 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
              <span className="text-dark-400 text-sm ml-2">Status</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-dark-500 text-xs hidden sm:block">
                Updated {formatTime(lastUpdated.toISOString())}
              </span>
            )}
            <button
              onClick={fetchStatus}
              className="p-2 rounded-lg hover:bg-dark-700 transition text-dark-400 hover:text-white"
              aria-label="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Overall Status Banner */}
        {error ? (
          <div className="rounded-2xl bg-dark-800 border border-red-500/30 p-8 text-center mb-10">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Unable to load status</h2>
            <p className="text-dark-400 mb-4">{error}</p>
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
            >
              Retry
            </button>
          </div>
        ) : loading && !data ? (
          <div className="rounded-2xl bg-dark-800 border border-dark-700 p-12 text-center mb-10">
            <RefreshCw className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-dark-400">Loading service status...</p>
          </div>
        ) : data && (
          <>
            {/* Status Banner */}
            <div className={`rounded-2xl ${config.banner} p-8 mb-10 shadow-lg`}>
              <div className="flex items-center gap-4">
                <StatusIcon className="w-10 h-10 text-white/90" />
                <div>
                  <h1 className="text-2xl font-bold text-white">{config.label}</h1>
                  <p className="text-white/70 text-sm mt-1">
                    {data.active_incidents.length === 0
                      ? 'All services are running normally.'
                      : `${data.active_incidents.length} active incident${data.active_incidents.length > 1 ? 's' : ''} affecting service.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Components */}
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-white mb-4">Service Components</h2>
              <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
                {data.services.map(svc => {
                  const svcConf = SERVICE_STATUS_ICON[svc.status] || SERVICE_STATUS_ICON.operational;
                  const isOk = svc.status === 'operational';
                  return (
                    <div key={svc.name} className="flex items-center justify-between px-5 py-4">
                      <span className="text-white font-medium">{svc.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm capitalize ${svcConf.color}`}>
                          {svc.status === 'operational' ? 'Operational' : svc.status.replace('_', ' ')}
                        </span>
                        <div className={`w-2.5 h-2.5 rounded-full ${svcConf.bg}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Incidents */}
            {data.active_incidents.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  Active Incidents
                </h2>
                <div className="space-y-4">
                  {data.active_incidents.map(inc => (
                    <IncidentCard
                      key={inc.id}
                      incident={inc}
                      expanded={expandedIncidents.has(inc.id)}
                      onToggle={() => toggleIncident(inc.id)}
                      active
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Incidents Timeline */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Past Incidents</h2>
              <div className="space-y-1">
                {days.map(day => {
                  const dayIncidents = grouped[day] || [];
                  const resolved = dayIncidents.filter(i => i.status === 'resolved');
                  return (
                    <div key={day} className="border-b border-dark-700/50 pb-4 mb-4">
                      <h3 className="text-sm font-semibold text-dark-300 mb-3">
                        {formatDateGroup(day + 'T12:00:00Z')}
                      </h3>
                      {resolved.length === 0 ? (
                        <p className="text-dark-500 text-sm pl-1">No incidents reported.</p>
                      ) : (
                        <div className="space-y-3">
                          {resolved.map(inc => (
                            <IncidentCard
                              key={inc.id}
                              incident={inc}
                              expanded={expandedIncidents.has(inc.id)}
                              onToggle={() => toggleIncident(inc.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-dark-700 text-center">
          <p className="text-dark-500 text-sm">
            Powered by{' '}
            <Link href="/" className="text-primary-400 hover:text-primary-300 transition">
              PalmCare AI
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}


function IncidentCard({
  incident,
  expanded,
  onToggle,
  active = false,
}: {
  incident: Incident;
  expanded: boolean;
  onToggle: () => void;
  active?: boolean;
}) {
  const statusConf = INCIDENT_STATUS_LABELS[incident.status] || INCIDENT_STATUS_LABELS.investigating;
  const impactColors: Record<string, string> = {
    minor: 'border-yellow-500/30 bg-yellow-500/5',
    major: 'border-orange-500/30 bg-orange-500/5',
    critical: 'border-red-500/30 bg-red-500/5',
    maintenance: 'border-blue-500/30 bg-blue-500/5',
    none: 'border-dark-700 bg-dark-800',
  };
  const borderColor = active
    ? impactColors[incident.impact] || impactColors.none
    : 'border-dark-700/50 bg-dark-800/50';

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden transition-all`}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-start justify-between text-left hover:bg-dark-700/30 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold uppercase tracking-wide ${statusConf.color}`}>
              {statusConf.label}
            </span>
            <span className="text-dark-600">—</span>
            <span className="text-white font-medium">{incident.title}</span>
          </div>
          {incident.updates.length > 0 && (
            <p className="text-dark-400 text-sm mt-1.5 line-clamp-2">
              {incident.updates[0].message}
            </p>
          )}
          <p className="text-dark-500 text-xs mt-2">
            {formatDate(incident.created_at)} · {incident.service_name}
          </p>
        </div>
        <div className="ml-3 mt-1 flex-shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-dark-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-dark-500" />
          )}
        </div>
      </button>

      {expanded && incident.updates.length > 0 && (
        <div className="px-5 pb-5 border-t border-dark-700/50">
          <div className="mt-4 space-y-4">
            {incident.updates.map((upd, idx) => {
              const updConf = INCIDENT_STATUS_LABELS[upd.status] || INCIDENT_STATUS_LABELS.investigating;
              return (
                <div key={upd.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                      upd.status === 'resolved' ? 'bg-green-500' :
                      upd.status === 'monitoring' ? 'bg-blue-500' :
                      upd.status === 'identified' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`} />
                    {idx < incident.updates.length - 1 && (
                      <div className="w-px flex-1 bg-dark-700 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase ${updConf.color}`}>
                        {updConf.label}
                      </span>
                      <span className="text-dark-500 text-xs">
                        {formatDate(upd.created_at)} {formatTime(upd.created_at)}
                      </span>
                    </div>
                    <p className="text-dark-300 text-sm mt-1 leading-relaxed">
                      {upd.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
