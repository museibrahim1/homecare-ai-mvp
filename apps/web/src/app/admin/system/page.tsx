'use client';

import { getStoredToken, useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, Shield, Loader2, RefreshCw, Server, Database,
  HardDrive, Cpu, CheckCircle, XCircle, AlertTriangle, Clock, ArrowLeft, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface SystemHealth {
  api_status: string;
  database_status: string;
  redis_status: string;
  storage_status: string;
  worker_status: string;
  last_checked: string;
}

interface SystemMetrics {
  api_version: string;
  uptime_seconds: number;
  total_api_requests_today: number;
  database_connections: number;
  storage_used_gb: number;
  worker_tasks_pending: number;
  worker_tasks_completed_today: number;
}

export default function SystemHealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
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
            fetchData();
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

  useEffect(() => {
    if (autoRefresh && isAuthorized) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isAuthorized]);

  const fetchData = async () => {
    setLoading(true);
    const token = getStoredToken();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/platform/system/health`, { headers }),
        fetch(`${API_BASE}/platform/system/metrics`, { headers }),
      ]);

      if (healthRes.ok) setHealth(await healthRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'healthy') return <CheckCircle className="w-6 h-6 text-green-400" />;
    if (status.startsWith('unhealthy')) return <XCircle className="w-6 h-6 text-red-400" />;
    return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const color = status === 'healthy' 
      ? 'bg-green-500/20 text-green-400' 
      : status.startsWith('unhealthy') 
        ? 'bg-red-500/20 text-red-400' 
        : 'bg-yellow-500/20 text-yellow-400';
    
    return (
      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${color}`}>
        {status === 'healthy' ? 'Operational' : status.startsWith('unhealthy') ? 'Down' : 'Unknown'}
      </span>
    );
  };

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </main>
      </div>
    );
  }

  const allHealthy = health && 
    health.api_status === 'healthy' && 
    health.database_status === 'healthy' && 
    health.redis_status === 'healthy' && 
    health.storage_status === 'healthy';

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">System Health Monitor</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Monitor the health and performance of platform infrastructure.
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
              <h1 className="text-2xl font-bold text-white">System Health</h1>
              <p className="text-dark-400 mt-1">Infrastructure monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-dark-400 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Overall Status */}
        <div className={`p-6 rounded-xl border mb-8 ${
          allHealthy 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {allHealthy ? (
                <CheckCircle className="w-10 h-10 text-green-400" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-red-400" />
              )}
              <div>
                <p className={`text-xl font-bold ${allHealthy ? 'text-green-400' : 'text-red-400'}`}>
                  {allHealthy ? 'All Systems Operational' : 'System Issues Detected'}
                </p>
                <p className="text-dark-400 text-sm mt-1">
                  Last checked: {health ? new Date(health.last_checked).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            {metrics && (
              <div className="text-right">
                <p className="text-dark-400 text-sm">API Version</p>
                <p className="text-white font-mono">{metrics.api_version}</p>
              </div>
            )}
          </div>
        </div>

        {/* Service Status Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-primary-400" />
                <h3 className="text-white font-medium">API Server</h3>
              </div>
              <StatusIcon status={health?.api_status || 'unknown'} />
            </div>
            <StatusBadge status={health?.api_status || 'unknown'} />
          </div>

          <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-400" />
                <h3 className="text-white font-medium">Database</h3>
              </div>
              <StatusIcon status={health?.database_status || 'unknown'} />
            </div>
            <StatusBadge status={health?.database_status || 'unknown'} />
            {health?.database_status?.startsWith('unhealthy') && (
              <p className="text-red-400 text-xs mt-2">{health.database_status}</p>
            )}
          </div>

          <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-purple-400" />
                <h3 className="text-white font-medium">Redis (Queue)</h3>
              </div>
              <StatusIcon status={health?.redis_status || 'unknown'} />
            </div>
            <StatusBadge status={health?.redis_status || 'unknown'} />
            {health?.redis_status?.startsWith('unhealthy') && (
              <p className="text-red-400 text-xs mt-2">{health.redis_status}</p>
            )}
          </div>

          <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-yellow-400" />
                <h3 className="text-white font-medium">Storage (S3)</h3>
              </div>
              <StatusIcon status={health?.storage_status || 'unknown'} />
            </div>
            <StatusBadge status={health?.storage_status || 'unknown'} />
            {health?.storage_status?.startsWith('unhealthy') && (
              <p className="text-red-400 text-xs mt-2">{health.storage_status}</p>
            )}
          </div>

          <div className="col-span-2 p-6 bg-dark-800 rounded-xl border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Cpu className="w-6 h-6 text-emerald-400" />
                <h3 className="text-white font-medium">Background Workers</h3>
              </div>
              <StatusIcon status={health?.worker_status || 'unknown'} />
            </div>
            <div className="flex items-center gap-6">
              <StatusBadge status={health?.worker_status || 'unknown'} />
              {metrics && (
                <>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{metrics.worker_tasks_pending}</p>
                    <p className="text-dark-400 text-xs">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{metrics.worker_tasks_completed_today}</p>
                    <p className="text-dark-400 text-xs">Completed Today</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="text-white font-medium mb-4">System Metrics</h3>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{metrics.total_api_requests_today}</p>
                <p className="text-dark-400 text-sm">API Requests Today</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{metrics.database_connections}</p>
                <p className="text-dark-400 text-sm">DB Connections</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{metrics.storage_used_gb} GB</p>
                <p className="text-dark-400 text-sm">Storage Used</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">
                  {Math.floor(metrics.uptime_seconds / 3600)}h
                </p>
                <p className="text-dark-400 text-sm">Uptime</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
