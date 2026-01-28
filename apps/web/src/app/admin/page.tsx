'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, Users, Building2, FileText, TrendingUp, DollarSign,
  Shield, AlertTriangle, Loader2, Activity, Ticket, Settings,
  ChevronRight, RefreshCw, Clock, CheckCircle, XCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface PlatformStats {
  total_businesses: number;
  active_businesses: number;
  pending_approvals: number;
  total_users: number;
  total_visits: number;
  total_contracts: number;
  visits_this_month: number;
  contracts_this_month: number;
  revenue_this_month: number;
  active_subscriptions: number;
}

interface ComplianceAlert {
  id: string;
  business_name: string;
  alert_type: string;
  document_type: string;
  days_until_expiry: number;
  severity: string;
}

interface SupportStats {
  total_tickets: number;
  open: number;
  in_progress: number;
  resolved: number;
}

interface SystemHealth {
  api_status: string;
  database_status: string;
  redis_status: string;
  storage_status: string;
  worker_status: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [supportStats, setSupportStats] = useState<SupportStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
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
            fetchData();
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

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, alertsRes, supportRes, healthRes] = await Promise.all([
        fetch(`${API_BASE}/platform/analytics/overview`, { headers }),
        fetch(`${API_BASE}/platform/compliance/alerts`, { headers }),
        fetch(`${API_BASE}/platform/support/stats`, { headers }),
        fetch(`${API_BASE}/platform/system/health`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (supportRes.ok) setSupportStats(await supportRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ label, value, icon: Icon, color, href }: any) => (
    <Link
      href={href || '#'}
      className="p-6 bg-dark-800 rounded-xl border border-dark-700 hover:border-dark-600 transition group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-dark-400 text-sm">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-')}/10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-dark-400 text-sm group-hover:text-white transition">
        <span>View details</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </Link>
  );

  const HealthIndicator = ({ status, label }: { status: string; label: string }) => {
    const isHealthy = status === 'healthy';
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-dark-300">{label}</span>
        <span className={`flex items-center gap-2 text-sm ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
          {isHealthy ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {isHealthy ? 'Healthy' : 'Issue'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Platform Admin Dashboard</p>
            <p className="text-blue-300/70 text-sm mt-1">
              This dashboard shows platform-level metrics only. Individual client/patient data is not 
              accessible in compliance with HIPAA regulations.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
            <p className="text-dark-400 mt-1">Monitor your platform's health and performance</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <StatCard
                label="Active Businesses"
                value={stats?.active_businesses || 0}
                icon={Building2}
                color="text-green-400"
                href="/admin/businesses"
              />
              <StatCard
                label="Pending Approvals"
                value={stats?.pending_approvals || 0}
                icon={Clock}
                color="text-yellow-400"
                href="/admin/approvals"
              />
              <StatCard
                label="Total Users"
                value={stats?.total_users || 0}
                icon={Users}
                color="text-blue-400"
                href="/admin/users"
              />
              <StatCard
                label="Monthly Revenue"
                value={`$${(stats?.revenue_this_month || 0).toLocaleString()}`}
                icon={DollarSign}
                color="text-emerald-400"
                href="/admin/subscriptions"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
                <p className="text-dark-400 text-sm">Visits This Month</p>
                <p className="text-2xl font-bold text-white mt-1">{stats?.visits_this_month || 0}</p>
              </div>
              <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
                <p className="text-dark-400 text-sm">Contracts Generated</p>
                <p className="text-2xl font-bold text-white mt-1">{stats?.contracts_this_month || 0}</p>
              </div>
              <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
                <p className="text-dark-400 text-sm">Active Subscriptions</p>
                <p className="text-2xl font-bold text-white mt-1">{stats?.active_subscriptions || 0}</p>
              </div>
              <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
                <p className="text-dark-400 text-sm">Total Businesses</p>
                <p className="text-2xl font-bold text-white mt-1">{stats?.total_businesses || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Compliance Alerts */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="font-medium text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    Compliance Alerts
                  </h2>
                  <Link href="/admin/compliance" className="text-primary-400 text-sm hover:underline">
                    View All
                  </Link>
                </div>
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-dark-400 text-center py-4">No active alerts</p>
                  ) : (
                    alerts.slice(0, 5).map(alert => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg ${
                          alert.severity === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                          alert.severity === 'high' ? 'bg-orange-500/10 border border-orange-500/30' :
                          'bg-yellow-500/10 border border-yellow-500/30'
                        }`}
                      >
                        <p className="text-white text-sm font-medium">{alert.business_name}</p>
                        <p className="text-dark-400 text-xs mt-1">
                          {alert.document_type.replace(/_/g, ' ')} expires in {alert.days_until_expiry} days
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Support Tickets */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="font-medium text-white flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-purple-400" />
                    Support Tickets
                  </h2>
                  <Link href="/admin/support" className="text-primary-400 text-sm hover:underline">
                    View All
                  </Link>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Open</span>
                    <span className="text-yellow-400 font-medium">{supportStats?.open || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">In Progress</span>
                    <span className="text-blue-400 font-medium">{supportStats?.in_progress || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Resolved</span>
                    <span className="text-green-400 font-medium">{supportStats?.resolved || 0}</span>
                  </div>
                  <div className="pt-3 border-t border-dark-700">
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400 text-sm">Total</span>
                      <span className="text-white font-bold">{supportStats?.total_tickets || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="font-medium text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    System Health
                  </h2>
                  <Link href="/admin/system" className="text-primary-400 text-sm hover:underline">
                    Details
                  </Link>
                </div>
                <div className="p-4 space-y-2">
                  <HealthIndicator status={health?.api_status || 'unknown'} label="API" />
                  <HealthIndicator status={health?.database_status || 'unknown'} label="Database" />
                  <HealthIndicator status={health?.redis_status || 'unknown'} label="Redis" />
                  <HealthIndicator status={health?.storage_status || 'unknown'} label="Storage" />
                  <HealthIndicator status={health?.worker_status || 'unknown'} label="Workers" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-4 gap-4">
              <Link
                href="/admin/approvals"
                className="p-4 bg-dark-800 rounded-xl border border-dark-700 hover:border-primary-500 transition flex items-center gap-3"
              >
                <Building2 className="w-5 h-5 text-primary-400" />
                <span className="text-white">Review Approvals</span>
              </Link>
              <Link
                href="/admin/subscriptions"
                className="p-4 bg-dark-800 rounded-xl border border-dark-700 hover:border-primary-500 transition flex items-center gap-3"
              >
                <DollarSign className="w-5 h-5 text-primary-400" />
                <span className="text-white">Manage Subscriptions</span>
              </Link>
              <Link
                href="/admin/audit"
                className="p-4 bg-dark-800 rounded-xl border border-dark-700 hover:border-primary-500 transition flex items-center gap-3"
              >
                <FileText className="w-5 h-5 text-primary-400" />
                <span className="text-white">Audit Logs</span>
              </Link>
              <Link
                href="/admin/users"
                className="p-4 bg-dark-800 rounded-xl border border-dark-700 hover:border-primary-500 transition flex items-center gap-3"
              >
                <Users className="w-5 h-5 text-primary-400" />
                <span className="text-white">Platform Users</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
