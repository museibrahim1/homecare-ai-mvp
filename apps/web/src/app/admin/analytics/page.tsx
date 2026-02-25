'use client';

import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, TrendingUp, Users, AlertTriangle, Activity,
  RefreshCw, Loader2, Clock, Target, Zap, CheckCircle2, XCircle,
  Building2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  low: { label: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  high: { label: 'High Risk', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeView, setActiveView] = useState<'churn' | 'funnel' | 'activity'>('churn');

  const [churnOverview, setChurnOverview] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [riskFilter, setRiskFilter] = useState('');
  const [funnel, setFunnel] = useState<any>(null);
  const [platformActivity, setPlatformActivity] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activityDays, setActivityDays] = useState(30);

  const getToken = () => getStoredToken();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return res.json();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) { router.push('/login'); return; }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const user = await res.json();
          if (user.role === 'admin') {
            setIsAuthorized(true);
            loadData();
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, providerList, funnelData, activity] = await Promise.all([
        fetchWithAuth('/analytics/churn/overview').catch(() => null),
        fetchWithAuth('/analytics/churn/providers?sort_by=engagement_score&sort_order=asc&limit=100').catch(() => []),
        fetchWithAuth('/analytics/leads/funnel').catch(() => null),
        fetchWithAuth(`/analytics/platform/activity?days=${activityDays}`).catch(() => null),
      ]);
      setChurnOverview(overview);
      setProviders(providerList);
      setFunnel(funnelData);
      setPlatformActivity(activity);
    } catch {
      // Non-critical: analytics data will show as empty
    } finally {
      setLoading(false);
    }
  };

  const refreshScores = async () => {
    setRefreshing(true);
    try {
      await fetchWithAuth('/analytics/churn/refresh', { method: 'POST' });
      await loadData();
    } catch (e) {
      alert(`Refresh failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthorized && activeView === 'activity') {
      fetchWithAuth(`/analytics/platform/activity?days=${activityDays}`)
        .then(setPlatformActivity)
        .catch(() => {});
    }
  }, [activityDays]);

  const filteredProviders = riskFilter
    ? providers.filter((p: any) => p.churn_risk === riskFilter)
    : providers;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              Analytics & Churn Tracking
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Monitor provider engagement, churn risk, and sales funnel performance
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshScores}
              disabled={refreshing}
              className="px-4 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-gray-300 hover:text-white flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh Scores
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mb-6 bg-[#1a1a2e] border border-gray-700/50 rounded-lg p-1 w-fit">
          {([
            { id: 'churn' as const, label: 'Churn Risk', icon: AlertTriangle },
            { id: 'funnel' as const, label: 'Sales Funnel', icon: Target },
            { id: 'activity' as const, label: 'Platform Activity', icon: Activity },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                activeView === id
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {/* ========== CHURN VIEW ========== */}
            {activeView === 'churn' && churnOverview && (
              <div className="space-y-6">
                {/* Overview cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Users className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs text-gray-500">Total</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{churnOverview.total_users}</p>
                    <p className="text-xs text-gray-500 mt-1">Registered users</p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      <span className={`text-xs ${churnOverview.retention_rate_30d >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {churnOverview.retention_rate_30d}%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-white">{churnOverview.active_users_30d}</p>
                    <p className="text-xs text-gray-500 mt-1">Active last 30 days</p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{churnOverview.active_users_7d}</p>
                    <p className="text-xs text-gray-500 mt-1">Active last 7 days</p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-red-400">${churnOverview.at_risk_mrr?.toFixed(0) || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">At-risk MRR</p>
                  </div>
                </div>

                {/* Risk distribution */}
                <div className="grid grid-cols-4 gap-3">
                  {(['low', 'medium', 'high', 'critical'] as const).map((risk) => {
                    const config = RISK_CONFIG[risk];
                    const RiskIcon = config.icon;
                    const count = churnOverview.risk_breakdown?.[risk] || 0;
                    return (
                      <button
                        key={risk}
                        onClick={() => setRiskFilter(riskFilter === risk ? '' : risk)}
                        className={`border rounded-xl p-4 text-center transition-all ${
                          riskFilter === risk ? config.bg + ' ring-1 ring-white/10' : 'bg-[#1a1a2e] border-gray-700/50 hover:border-gray-600'
                        }`}
                      >
                        <RiskIcon className={`w-5 h-5 ${config.color} mx-auto mb-2`} />
                        <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                        <p className="text-xs text-gray-500">{config.label}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Provider table */}
                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-700/50 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-400">
                      Provider Engagement
                      {riskFilter && <span className="ml-2 text-indigo-400">({RISK_CONFIG[riskFilter]?.label})</span>}
                    </h3>
                    <span className="text-xs text-gray-600">{filteredProviders.length} providers</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800/50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Risk</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days Inactive</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Logins (30d)</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Assessments</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clients</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contracts</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProviders.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-12 text-gray-500">
                              {providers.length === 0
                                ? 'No engagement data yet. Click "Refresh Scores" to calculate.'
                                : 'No providers match this filter.'}
                            </td>
                          </tr>
                        ) : (
                          filteredProviders.map((p: any) => {
                            const risk = RISK_CONFIG[p.churn_risk] || RISK_CONFIG.low;
                            const RiskIcon = risk.icon;
                            return (
                              <tr key={p.id} className="border-b border-gray-800/50 hover:bg-[#12122a]">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                                      <Building2 className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-white font-medium">{p.business_name}</p>
                                      {p.last_login_at && (
                                        <p className="text-[10px] text-gray-600">
                                          Last login: {new Date(p.last_login_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 bg-gray-800 rounded-full h-1.5">
                                      <div
                                        className={`h-full rounded-full ${
                                          p.engagement_score >= 60 ? 'bg-emerald-500' :
                                          p.engagement_score >= 30 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(p.engagement_score, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-white font-mono w-8">{p.engagement_score}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${risk.bg}`}>
                                    <RiskIcon className={`w-3 h-3 ${risk.color}`} />
                                    <span className={risk.color}>{risk.label}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm ${p.days_since_last_activity > 14 ? 'text-red-400' : p.days_since_last_activity > 7 ? 'text-amber-400' : 'text-gray-300'}`}>
                                    {p.days_since_last_activity > 900 ? 'Never' : `${p.days_since_last_activity}d`}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-300">{p.logins_last_30d}</td>
                                <td className="px-4 py-3 text-right text-sm text-indigo-400">{p.assessments_created}</td>
                                <td className="px-4 py-3 text-right text-sm text-purple-400">{p.clients_added}</td>
                                <td className="px-4 py-3 text-right text-sm text-cyan-400">{p.contracts_generated}</td>
                                <td className="px-4 py-3 text-right text-xs text-gray-500">{p.plan_tier || '—'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========== FUNNEL VIEW ========== */}
            {activeView === 'funnel' && funnel && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5 text-center">
                    <p className="text-xs text-gray-500">Total Leads</p>
                    <p className="text-3xl font-bold text-white mt-1">{funnel.total_leads}</p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5 text-center">
                    <p className="text-xs text-gray-500">Conversion Rate</p>
                    <p className={`text-3xl font-bold mt-1 ${funnel.conversion_rate >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {funnel.conversion_rate}%
                    </p>
                  </div>
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5 text-center">
                    <p className="text-xs text-gray-500">Lost / Not Interested</p>
                    <p className="text-3xl font-bold text-red-400 mt-1">{funnel.lost}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{funnel.lost_percentage}%</p>
                  </div>
                </div>

                <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-5">Sales Pipeline</h3>
                  <div className="space-y-4">
                    {(funnel.funnel || []).map((stage: any, i: number) => {
                      const colors = [
                        'bg-slate-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
                        'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-orange-500', 'bg-green-500',
                      ];
                      const maxCount = Math.max(...(funnel.funnel || []).map((s: any) => s.count), 1);
                      return (
                        <div key={stage.stage} className="flex items-center gap-4">
                          <span className="text-xs text-gray-400 w-36 shrink-0 capitalize">
                            {stage.stage.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden relative">
                            <div
                              className={`${colors[i] || 'bg-gray-500'} h-full rounded-full transition-all flex items-center justify-end pr-2`}
                              style={{ width: `${Math.max((stage.count / maxCount) * 100, 3)}%` }}
                            >
                              {stage.count > 0 && (
                                <span className="text-[10px] text-white font-bold">{stage.count}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 w-12 text-right">{stage.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========== ACTIVITY VIEW ========== */}
            {activeView === 'activity' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Platform Activity</h2>
                  <select
                    value={activityDays}
                    onChange={(e) => setActivityDays(Number(e.target.value))}
                    className="px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                {platformActivity ? (
                  <>
                    {/* Daily activity chart (bar chart using divs) */}
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-gray-400 mb-4">Daily Events</h3>
                      {platformActivity.daily_activity?.length > 0 ? (
                        <div className="flex items-end gap-1 h-40">
                          {platformActivity.daily_activity.map((d: any, i: number) => {
                            const maxVal = Math.max(...platformActivity.daily_activity.map((x: any) => x.total), 1);
                            const height = (d.total / maxVal) * 100;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {d.date}: {d.total} events, {d.unique_users} users
                                </div>
                                <div
                                  className="w-full bg-indigo-500 rounded-t hover:bg-indigo-400 transition-colors"
                                  style={{ height: `${Math.max(height, 2)}%` }}
                                />
                                {platformActivity.daily_activity.length <= 14 && (
                                  <span className="text-[8px] text-gray-600 rotate-45 origin-left mt-1">
                                    {d.date.slice(5)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-sm text-center py-8">No activity data yet</p>
                      )}
                    </div>

                    {/* Top features */}
                    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-gray-400 mb-4">Most Used Features</h3>
                      {platformActivity.top_features?.length > 0 ? (
                        <div className="space-y-3">
                          {platformActivity.top_features.map((f: any, i: number) => {
                            const maxCount = platformActivity.top_features[0]?.count || 1;
                            return (
                              <div key={f.feature} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                                <span className="text-sm text-gray-300 w-40 shrink-0 capitalize">
                                  {f.feature.replace(/_/g, ' ')}
                                </span>
                                <div className="flex-1 bg-gray-800 rounded-full h-2">
                                  <div
                                    className="bg-indigo-500 h-full rounded-full"
                                    style={{ width: `${(f.count / maxCount) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 font-mono w-10 text-right">{f.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-sm text-center py-8">No feature usage data yet</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-12 text-center">
                    <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No activity data</h3>
                    <p className="text-sm text-gray-500">
                      Activity tracking will populate as users interact with the platform.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
