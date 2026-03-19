'use client';

import { getStoredToken } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Users, AlertTriangle, Activity,
  RefreshCw, Loader2, Clock, Target, Zap, CheckCircle2, XCircle,
  Building2, MousePointerClick, TrendingDown, Eye, ArrowDown, Globe,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  low: { label: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-500/20', icon: Clock },
  high: { label: 'High Risk', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-500/20', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50 border-red-500/20', icon: XCircle },
};

type ViewId = 'registration' | 'clicks' | 'churn' | 'funnel' | 'activity';

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeView, setActiveView] = useState<ViewId>('registration');

  interface ChurnOverview {
    total_users: number;
    active_users_30d: number;
    active_users_7d: number;
    retention_rate_30d: number;
    at_risk_mrr: number;
    risk_breakdown?: Record<string, number>;
  }
  interface ProviderEngagement {
    id: string;
    business_name: string;
    engagement_score: number;
    churn_risk: string;
    days_since_last_activity: number;
    logins_last_30d: number;
    assessments_created: number;
    clients_added: number;
    contracts_generated: number;
    plan_tier?: string;
    last_login_at?: string;
  }
  const [churnOverview, setChurnOverview] = useState<ChurnOverview | null>(null);
  const [providers, setProviders] = useState<ProviderEngagement[]>([]);
  const [riskFilter, setRiskFilter] = useState('');
  interface FunnelData {
    total_leads: number;
    conversion_rate: number;
    lost: number;
    lost_percentage: number;
    funnel?: { stage: string; count: number; percentage: number }[];
  }
  interface PlatformActivityData {
    daily_activity?: { date: string; total: number; unique_users: number }[];
    top_features?: { feature: string; count: number }[];
  }
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [platformActivity, setPlatformActivity] = useState<PlatformActivityData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activityDays, setActivityDays] = useState(30);

  interface RegFunnelData {
    total_page_views: number;
    unique_visitors: number;
    total_started: number;
    total_completed: number;
    completion_rate: number;
    steps: { step: number; label: string; unique_sessions: number; drop_off: number; drop_off_rate: number; percentage_of_start: number }[];
  }
  interface ClickData {
    elements: { element_id: string; text: string; tag: string; page: string; clicks: number; unique_sessions: number }[];
    by_page: { page: string; clicks: number }[];
  }
  interface PageViewData {
    daily: { date: string; views: number; unique: number }[];
    top_pages: { page: string; views: number; unique: number }[];
    top_referrers: { referrer: string; count: number }[];
  }
  interface SessionItem {
    session_id: string;
    started_at: string;
    last_event: string;
    total_events: number;
    max_funnel_step: number | null;
    pages_visited: string[];
  }
  const [regFunnel, setRegFunnel] = useState<RegFunnelData | null>(null);
  const [clickData, setClickData] = useState<ClickData | null>(null);
  const [pageViews, setPageViews] = useState<PageViewData | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [regDays, setRegDays] = useState(30);

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
      const [overview, providerList, funnelData, activity, regFunnelData, clicks, pvData, sessData] = await Promise.all([
        fetchWithAuth('/analytics/churn/overview').catch(() => null),
        fetchWithAuth('/analytics/churn/providers?sort_by=engagement_score&sort_order=asc&limit=100').catch(() => []),
        fetchWithAuth('/analytics/leads/funnel').catch(() => null),
        fetchWithAuth(`/analytics/platform/activity?days=${activityDays}`).catch(() => null),
        fetchWithAuth(`/analytics/registration/funnel?days=${regDays}`).catch(() => null),
        fetchWithAuth(`/analytics/registration/clicks?days=${regDays}`).catch(() => null),
        fetchWithAuth(`/analytics/registration/page-views?days=${regDays}`).catch(() => null),
        fetchWithAuth(`/analytics/registration/sessions?days=7&limit=50`).catch(() => ({ sessions: [] })),
      ]);
      setChurnOverview(overview);
      setProviders(providerList);
      setFunnel(funnelData);
      setPlatformActivity(activity);
      setRegFunnel(regFunnelData);
      setClickData(clicks);
      setPageViews(pvData);
      setSessions(sessData?.sessions || []);
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

  useEffect(() => {
    if (isAuthorized && (activeView === 'registration' || activeView === 'clicks')) {
      Promise.all([
        fetchWithAuth(`/analytics/registration/funnel?days=${regDays}`).catch(() => null),
        fetchWithAuth(`/analytics/registration/clicks?days=${regDays}`).catch(() => null),
        fetchWithAuth(`/analytics/registration/page-views?days=${regDays}`).catch(() => null),
        fetchWithAuth(`/analytics/registration/sessions?days=${Math.min(regDays, 14)}&limit=50`).catch(() => ({ sessions: [] })),
      ]).then(([rf, cd, pv, sess]) => {
        setRegFunnel(rf);
        setClickData(cd);
        setPageViews(pv);
        setSessions(sess?.sessions || []);
      });
    }
  }, [regDays]);

  const filteredProviders = riskFilter
    ? providers.filter((p) => p.churn_risk === riskFilter)
    : providers;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
              Analytics & Churn Tracking
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor provider engagement, churn risk, and sales funnel performance
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshScores}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh Scores
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-lg p-1 w-fit flex-wrap">
          {([
            { id: 'registration' as const, label: 'Registration Funnel', icon: TrendingDown },
            { id: 'clicks' as const, label: 'Click Analytics', icon: MousePointerClick },
            { id: 'churn' as const, label: 'Churn Risk', icon: AlertTriangle },
            { id: 'funnel' as const, label: 'Sales Funnel', icon: Target },
            { id: 'activity' as const, label: 'Platform Activity', icon: Activity },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                activeView === id
                  ? 'bg-teal-50 text-teal-700 border border-teal-500/30'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* ========== REGISTRATION FUNNEL VIEW ========== */}
            {activeView === 'registration' && (
              <div className="space-y-6">
                {/* Period selector */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Registration Funnel</h2>
                  <select value={regDays} onChange={e => setRegDays(Number(e.target.value))} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm">
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                {/* Overview cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Page Views', value: regFunnel?.total_page_views || 0, icon: Eye, color: 'text-blue-600' },
                    { label: 'Unique Visitors', value: regFunnel?.unique_visitors || 0, icon: Users, color: 'text-indigo-600' },
                    { label: 'Started Signup', value: regFunnel?.total_started || 0, icon: Target, color: 'text-teal-600' },
                    { label: 'Completed', value: regFunnel?.total_completed || 0, icon: CheckCircle2, color: 'text-emerald-600' },
                    { label: 'Completion Rate', value: `${regFunnel?.completion_rate || 0}%`, icon: TrendingDown, color: regFunnel && regFunnel.completion_rate >= 20 ? 'text-emerald-600' : 'text-amber-600' },
                  ].map(c => {
                    const Icon = c.icon;
                    return (
                      <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <Icon className={`w-5 h-5 ${c.color}`} />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{c.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{c.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Funnel visualization */}
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-5">Step-by-Step Funnel</h3>
                  {(regFunnel?.steps?.length ?? 0) > 0 ? (
                    <div className="space-y-4">
                      {regFunnel!.steps.map((s, i) => {
                        const maxSessions = regFunnel!.steps[0]?.unique_sessions || 1;
                        const barWidth = Math.max((s.unique_sessions / maxSessions) * 100, 4);
                        const colors = ['bg-teal-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500'];
                        return (
                          <div key={s.step}>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-slate-500 w-32 shrink-0">
                                Step {s.step}: {s.label}
                              </span>
                              <div className="flex-1 bg-slate-100 rounded-full h-8 overflow-hidden relative">
                                <div
                                  className={`${colors[i] || 'bg-gray-500'} h-full rounded-full transition-all flex items-center justify-end pr-3`}
                                  style={{ width: `${barWidth}%` }}
                                >
                                  <span className="text-xs text-white font-bold">{s.unique_sessions}</span>
                                </div>
                              </div>
                              <span className="text-xs text-slate-500 w-16 text-right">{s.percentage_of_start}%</span>
                            </div>
                            {s.drop_off > 0 && (
                              <div className="ml-36 mt-1 flex items-center gap-1 text-xs text-red-500">
                                <ArrowDown className="w-3 h-3" />
                                {s.drop_off} dropped ({s.drop_off_rate}%)
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm text-center py-8">
                      No registration funnel data yet. Events will appear as visitors start the signup flow.
                    </p>
                  )}
                </div>

                {/* Recent sessions */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-medium text-slate-500">Recent Visitor Sessions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Session</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Started</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Events</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Max Step</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Pages</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-12 text-slate-400">No sessions yet</td></tr>
                        ) : sessions.map((s, i) => {
                          const stepLabel = s.max_funnel_step ? `Step ${s.max_funnel_step}` : '—';
                          const stepColor = !s.max_funnel_step ? 'text-slate-400' : s.max_funnel_step >= 4 ? 'text-emerald-600' : s.max_funnel_step >= 2 ? 'text-amber-600' : 'text-red-500';
                          return (
                            <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-600 font-mono">{s.session_id}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-slate-600">{s.total_events}</td>
                              <td className={`px-4 py-3 text-sm text-center font-semibold ${stepColor}`}>{stepLabel}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {s.pages_visited.slice(0, 4).join(', ')}
                                {s.pages_visited.length > 4 && ` +${s.pages_visited.length - 4}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Page views chart + top referrers */}
                {pageViews && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-slate-500 mb-4">Daily Page Views</h3>
                      {pageViews.daily.length > 0 ? (
                        <div className="flex items-end gap-1 h-40">
                          {pageViews.daily.map((d, i) => {
                            const maxVal = Math.max(...pageViews.daily.map(x => x.views), 1);
                            const height = (d.views / maxVal) * 100;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {d.date}: {d.views} views, {d.unique} unique
                                </div>
                                <div className="w-full bg-teal-500 rounded-t hover:bg-teal-400 transition-colors" style={{ height: `${Math.max(height, 2)}%` }} />
                                {pageViews.daily.length <= 14 && (
                                  <span className="text-[8px] text-slate-500 rotate-45 origin-left mt-1">{d.date.slice(5)}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm text-center py-8">No data yet</p>
                      )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-slate-500 mb-4">Top Referrers</h3>
                      {pageViews.top_referrers.length > 0 ? (
                        <div className="space-y-3">
                          {pageViews.top_referrers.slice(0, 8).map((r, i) => {
                            const maxCount = pageViews.top_referrers[0]?.count || 1;
                            let domain = r.referrer;
                            try { domain = new URL(r.referrer).hostname; } catch {}
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="text-sm text-slate-600 w-36 shrink-0 truncate" title={r.referrer}>{domain}</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-2">
                                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                                </div>
                                <span className="text-xs text-slate-500 font-mono w-8 text-right">{r.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm text-center py-8">No referrer data yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========== CLICK ANALYTICS VIEW ========== */}
            {activeView === 'clicks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Click Analytics</h2>
                  <select value={regDays} onChange={e => setRegDays(Number(e.target.value))} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm">
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                {/* Clicks by page */}
                {clickData && clickData.by_page.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-slate-500 mb-4">Clicks by Page</h3>
                    <div className="space-y-3">
                      {clickData.by_page.map((p, i) => {
                        const maxClicks = clickData.by_page[0]?.clicks || 1;
                        return (
                          <div key={i} className="flex items-center gap-4">
                            <span className="text-sm text-slate-600 w-48 shrink-0 truncate" title={p.page}>{p.page}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                              <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${(p.clicks / maxClicks) * 100}%` }} />
                            </div>
                            <span className="text-sm font-mono text-slate-600 w-12 text-right">{p.clicks}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top clicked elements */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-medium text-slate-500">Most Clicked Elements</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Element</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Text</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Page</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Clicks</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Unique</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!clickData || clickData.elements.length === 0) ? (
                          <tr><td colSpan={5} className="text-center py-12 text-slate-400">No click data yet. Clicks will appear as visitors interact with your site.</td></tr>
                        ) : clickData.elements.map((el, i) => (
                          <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-600">{el.tag}</span>
                                <span className="text-sm text-slate-700 font-mono">{el.element_id || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 max-w-48 truncate">{el.text || '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{el.page}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-indigo-600">{el.clicks}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-500">{el.unique_sessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top pages table */}
                {pageViews && pageViews.top_pages.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200">
                      <h3 className="text-sm font-medium text-slate-500">Top Pages by Views</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Page</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Views</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Unique</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageViews.top_pages.map((p, i) => (
                            <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-700">{p.page}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-teal-600">{p.views}</td>
                              <td className="px-4 py-3 text-sm text-right text-slate-500">{p.unique}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========== CHURN VIEW ========== */}
            {activeView === 'churn' && churnOverview && (
              <div className="space-y-6">
                {/* Overview cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Users className="w-5 h-5 text-indigo-600" />
                      <span className="text-xs text-slate-400">Total</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{churnOverview.total_users}</p>
                    <p className="text-xs text-slate-400 mt-1">Registered users</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      <span className={`text-xs ${churnOverview.retention_rate_30d >= 70 ? 'text-emerald-400' : 'text-amber-600'}`}>
                        {churnOverview.retention_rate_30d}%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{churnOverview.active_users_30d}</p>
                    <p className="text-xs text-slate-400 mt-1">Active last 30 days</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Zap className="w-5 h-5 text-cyan-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{churnOverview.active_users_7d}</p>
                    <p className="text-xs text-slate-400 mt-1">Active last 7 days</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">${churnOverview.at_risk_mrr?.toFixed(0) || 0}</p>
                    <p className="text-xs text-slate-400 mt-1">At-risk MRR</p>
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
                          riskFilter === risk ? config.bg + ' ring-1 ring-slate-200' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <RiskIcon className={`w-5 h-5 ${config.color} mx-auto mb-2`} />
                        <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                        <p className="text-xs text-slate-400">{config.label}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Provider table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-500">
                      Provider Engagement
                      {riskFilter && <span className="ml-2 text-indigo-600">({RISK_CONFIG[riskFilter]?.label})</span>}
                    </h3>
                    <span className="text-xs text-slate-500">{filteredProviders.length} providers</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Provider</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Score</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Risk</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Days Inactive</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Logins (30d)</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Assessments</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Clients</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Contracts</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProviders.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-12 text-slate-400">
                              {providers.length === 0
                                ? 'No engagement data yet. Click "Refresh Scores" to calculate.'
                                : 'No providers match this filter.'}
                            </td>
                          </tr>
                        ) : (
                          filteredProviders.map((p) => {
                            const risk = RISK_CONFIG[p.churn_risk] || RISK_CONFIG.low;
                            const RiskIcon = risk.icon;
                            return (
                              <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                                      <Building2 className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-slate-900 font-medium">{p.business_name}</p>
                                      {p.last_login_at && (
                                        <p className="text-[10px] text-slate-500">
                                          Last login: {new Date(p.last_login_at).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                      <div
                                        className={`h-full rounded-full ${
                                          p.engagement_score >= 60 ? 'bg-emerald-500' :
                                          p.engagement_score >= 30 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${Math.min(p.engagement_score, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-slate-900 font-mono w-8">{p.engagement_score}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${risk.bg}`}>
                                    <RiskIcon className={`w-3 h-3 ${risk.color}`} />
                                    <span className={risk.color}>{risk.label}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm ${p.days_since_last_activity > 14 ? 'text-red-600' : p.days_since_last_activity > 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                                    {p.days_since_last_activity > 900 ? 'Never' : `${p.days_since_last_activity}d`}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-slate-600">{p.logins_last_30d}</td>
                                <td className="px-4 py-3 text-right text-sm text-indigo-600">{p.assessments_created}</td>
                                <td className="px-4 py-3 text-right text-sm text-purple-600">{p.clients_added}</td>
                                <td className="px-4 py-3 text-right text-sm text-cyan-600">{p.contracts_generated}</td>
                                <td className="px-4 py-3 text-right text-xs text-slate-400">{p.plan_tier || '—'}</td>
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
                  <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                    <p className="text-xs text-slate-400">Total Leads</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{funnel.total_leads}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                    <p className="text-xs text-slate-400">Conversion Rate</p>
                    <p className={`text-3xl font-bold mt-1 ${funnel.conversion_rate >= 5 ? 'text-emerald-400' : 'text-amber-600'}`}>
                      {funnel.conversion_rate}%
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                    <p className="text-xs text-slate-400">Lost / Not Interested</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{funnel.lost}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{funnel.lost_percentage}%</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-5">Sales Pipeline</h3>
                  <div className="space-y-4">
                    {(funnel.funnel || []).map((stage, i) => {
                      const colors = [
                        'bg-slate-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
                        'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-orange-500', 'bg-green-500',
                      ];
                      const maxCount = Math.max(...(funnel.funnel || []).map((s) => s.count), 1);
                      return (
                        <div key={stage.stage} className="flex items-center gap-4">
                          <span className="text-xs text-slate-500 w-36 shrink-0 capitalize">
                            {stage.stage.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 bg-slate-200 rounded-full h-6 overflow-hidden relative">
                            <div
                              className={`${colors[i] || 'bg-gray-500'} h-full rounded-full transition-all flex items-center justify-end pr-2`}
                              style={{ width: `${Math.max((stage.count / maxCount) * 100, 3)}%` }}
                            >
                              {stage.count > 0 && (
                                <span className="text-[10px] text-slate-900 font-bold">{stage.count}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 w-12 text-right">{stage.percentage}%</span>
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
                  <h2 className="text-lg font-semibold text-slate-900">Platform Activity</h2>
                  <select
                    value={activityDays}
                    onChange={(e) => setActivityDays(Number(e.target.value))}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                {platformActivity ? (
                  <>
                    {/* Daily activity chart (bar chart using divs) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-slate-500 mb-4">Daily Events</h3>
                      {(platformActivity.daily_activity?.length ?? 0) > 0 ? (
                        <div className="flex items-end gap-1 h-40">
                          {platformActivity.daily_activity!.map((d, i) => {
                            const maxVal = Math.max(...platformActivity.daily_activity!.map((x) => x.total), 1);
                            const height = (d.total / maxVal) * 100;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {d.date}: {d.total} events, {d.unique_users} users
                                </div>
                                <div
                                  className="w-full bg-indigo-500 rounded-t hover:bg-indigo-400 transition-colors"
                                  style={{ height: `${Math.max(height, 2)}%` }}
                                />
                                {platformActivity.daily_activity!.length <= 14 && (
                                  <span className="text-[8px] text-slate-500 rotate-45 origin-left mt-1">
                                    {d.date.slice(5)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm text-center py-8">No activity data yet</p>
                      )}
                    </div>

                    {/* Top features */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-slate-500 mb-4">Most Used Features</h3>
                      {(platformActivity.top_features?.length ?? 0) > 0 ? (
                        <div className="space-y-3">
                          {platformActivity.top_features!.map((f, i) => {
                            const maxCount = platformActivity.top_features![0]?.count || 1;
                            return (
                              <div key={f.feature} className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                                <span className="text-sm text-slate-600 w-40 shrink-0 capitalize">
                                  {f.feature.replace(/_/g, ' ')}
                                </span>
                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-500 h-full rounded-full"
                                    style={{ width: `${(f.count / maxCount) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 font-mono w-10 text-right">{f.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm text-center py-8">No feature usage data yet</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No activity data</h3>
                    <p className="text-sm text-slate-400">
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
