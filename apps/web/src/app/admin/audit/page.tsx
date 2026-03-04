'use client';

import { getStoredToken, useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Shield, Loader2, RefreshCw, Search, Filter,
  User, Clock, ChevronLeft, ChevronRight, Download, ArrowLeft, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface AuditLog {
  id: string;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  user_login: 'bg-emerald-50 text-emerald-600',
  user_logout: 'bg-slate-200/20 text-slate-500',
  visit_created: 'bg-blue-50 text-blue-600',
  audio_uploaded: 'bg-purple-50 text-purple-600',
  contract_generated: 'bg-amber-50 text-amber-600',
  client_created: 'bg-emerald-50 text-emerald-400',
  business_approved: 'bg-emerald-50 text-emerald-600',
  business_rejected: 'bg-red-50 text-red-600',
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [filter, setFilter] = useState({ action: '', user_email: '' });
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          if (user.role === 'admin' && (user.email.endsWith('@palmtai.com'))) {
            setIsAuthorized(true);
            fetchActions();
            fetchLogs();
          } else {
            router.push('/visits');
          }
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const fetchActions = async () => {
    const token = getStoredToken();
    try {
      const response = await fetch(`${API_BASE}/platform/audit-logs/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setActions(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch actions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load actions');
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const token = getStoredToken();
    
    let url = `${API_BASE}/platform/audit-logs?skip=${page * pageSize}&limit=${pageSize}`;
    if (filter.action) url += `&action=${filter.action}`;
    if (filter.user_email) url += `&user_email=${filter.user_email}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setLogs(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchLogs();
  }, [page, filter.action, isAuthorized]);

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Description', 'IP Address'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.user_email || '',
        log.action,
        log.entity_type || '',
        (log.description || '').replace(/,/g, ';'),
        log.ip_address || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  return (
    <div className="landing-dark flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-600 font-medium">Audit Log</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Track all system activities for security and compliance purposes.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
              <p className="text-slate-500 mt-1">System activity tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-slate-50 transition text-slate-500"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 bg-white rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-red-600 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-300 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filter.action}
            onChange={e => { setFilter({ ...filter, action: e.target.value }); setPage(0); }}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Actions</option>
            {actions.map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={filter.user_email}
              onChange={e => setFilter({ ...filter, user_email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && fetchLogs()}
              placeholder="Filter by user email..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-4 text-slate-500 font-medium">Timestamp</th>
                <th className="text-left p-4 text-slate-500 font-medium">User</th>
                <th className="text-left p-4 text-slate-500 font-medium">Action</th>
                <th className="text-left p-4 text-slate-500 font-medium">Entity</th>
                <th className="text-left p-4 text-slate-500 font-medium">Description</th>
                <th className="text-left p-4 text-slate-500 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50/30">
                    <td className="p-4">
                      <p className="text-slate-900 text-sm">
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-900 text-sm">{log.user_email || 'System'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-500 text-sm">{log.entity_type || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-500 text-sm truncate max-w-xs" title={log.description || ''}>
                        {log.description || '-'}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-500 text-sm font-mono">{log.ip_address || '-'}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-slate-500 text-sm">
              Showing {page * pageSize + 1} - {page * pageSize + logs.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="text-slate-500 px-3">Page {page + 1}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={logs.length < pageSize}
                className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
