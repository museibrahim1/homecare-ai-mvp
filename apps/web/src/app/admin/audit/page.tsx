'use client';

import { getStoredToken, useAuth } from '@/lib/auth';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Shield, Loader2, RefreshCw, Search, Filter,
  User, Clock, ChevronLeft, ChevronRight, Download, ArrowLeft
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
  user_login: 'bg-green-500/20 text-green-400',
  user_logout: 'bg-dark-500/20 text-dark-400',
  visit_created: 'bg-blue-500/20 text-blue-400',
  audio_uploaded: 'bg-purple-500/20 text-purple-400',
  contract_generated: 'bg-yellow-500/20 text-yellow-400',
  client_created: 'bg-emerald-500/20 text-emerald-400',
  business_approved: 'bg-green-500/20 text-green-400',
  business_rejected: 'bg-red-500/20 text-red-400',
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
          if (user.role === 'admin' && user.email.endsWith('@homecare.ai')) {
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
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Audit Log</p>
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
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-dark-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
              <p className="text-dark-400 mt-1">System activity tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition text-dark-400"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filter.action}
            onChange={e => { setFilter({ ...filter, action: e.target.value }); setPage(0); }}
            className="px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Actions</option>
            {actions.map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={filter.user_email}
              onChange={e => setFilter({ ...filter, user_email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && fetchLogs()}
              placeholder="Filter by user email..."
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left p-4 text-dark-400 font-medium">Timestamp</th>
                <th className="text-left p-4 text-dark-400 font-medium">User</th>
                <th className="text-left p-4 text-dark-400 font-medium">Action</th>
                <th className="text-left p-4 text-dark-400 font-medium">Entity</th>
                <th className="text-left p-4 text-dark-400 font-medium">Description</th>
                <th className="text-left p-4 text-dark-400 font-medium">IP</th>
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
                  <td colSpan={6} className="p-8 text-center text-dark-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-dark-700 hover:bg-dark-700/30">
                    <td className="p-4">
                      <p className="text-white text-sm">
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-dark-400 text-xs">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-white text-sm">{log.user_email || 'System'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-dark-600 text-dark-300'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-dark-400 text-sm">{log.entity_type || '-'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-dark-400 text-sm truncate max-w-xs" title={log.description || ''}>
                        {log.description || '-'}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-dark-400 text-sm font-mono">{log.ip_address || '-'}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="p-4 border-t border-dark-700 flex items-center justify-between">
            <p className="text-dark-400 text-sm">
              Showing {page * pageSize + 1} - {page * pageSize + logs.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-dark-400" />
              </button>
              <span className="text-dark-400 px-3">Page {page + 1}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={logs.length < pageSize}
                className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 text-dark-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
