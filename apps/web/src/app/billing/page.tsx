'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  Zap,
  HardDrive,
  Apple,
  Smartphone,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

const API_BASE = '/api';

interface SubscriptionData {
  id: string;
  status: string;
  billing_cycle: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  visits_this_month: number;
  storage_used_mb: number;
}

interface PlanData {
  id: string;
  name: string;
  tier: string;
  monthly_price: number;
  max_users: number;
  max_visits_per_month: number;
  max_storage_gb: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  active:    { label: 'Active',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  trial:     { label: 'Free Trial', color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',       icon: Clock },
  past_due:  { label: 'Past Due',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         icon: XCircle },
  suspended: { label: 'Suspended', color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         icon: XCircle },
  none:      { label: 'No Subscription', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: AlertCircle },
};

export default function BillingPage() {
  const { token, isReady } = useRequireAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBilling = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/billing/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription || null);
        setPlan(data.plan || null);
      }
    } catch {
      // non-fatal: show the "manage in app" guidance regardless
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isReady && token) fetchBilling();
  }, [isReady, token, fetchBilling]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!isReady || loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  const status = subscription?.status || 'none';
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const StatusIcon = statusInfo.icon;

  const usagePercent = plan?.max_visits_per_month
    ? Math.min(100, Math.round(((subscription?.visits_this_month || 0) / plan.max_visits_per_month) * 100))
    : 0;
  const storagePercent = plan?.max_storage_gb
    ? Math.min(100, Math.round(((subscription?.storage_used_mb || 0) / (plan.max_storage_gb * 1024)) * 100))
    : 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 p-4 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Subscription</h1>
              <p className="text-slate-500 text-sm mt-0.5">View your plan and usage. Subscriptions are managed in the PalmCare app.</p>
            </div>

            {/* Current plan */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <div className="text-sm text-slate-500">Current plan</div>
                  <div className="text-2xl font-bold text-slate-900 mt-0.5">{plan?.name || 'No active plan'}</div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusInfo.label}
                </span>
              </div>

              {subscription && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-sm">
                  {status === 'trial' && subscription.trial_ends_at && (
                    <div className="text-slate-600">
                      <span className="text-slate-400">Trial ends:</span> {formatDate(subscription.trial_ends_at)}
                    </div>
                  )}
                  {subscription.current_period_end && status !== 'trial' && (
                    <div className="text-slate-600">
                      <span className="text-slate-400">Renews:</span> {formatDate(subscription.current_period_end)}
                    </div>
                  )}
                  {subscription.cancelled_at && (
                    <div className="text-slate-600">
                      <span className="text-slate-400">Cancelled:</span> {formatDate(subscription.cancelled_at)}
                    </div>
                  )}
                </div>
              )}

              {/* Usage meters */}
              {plan && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-1.5 text-slate-600"><Zap className="w-4 h-4 text-primary-500" /> Assessments this month</span>
                      <span className="font-medium text-slate-900">
                        {subscription?.visits_this_month || 0}{plan.max_visits_per_month >= 99999 ? '' : ` / ${plan.max_visits_per_month}`}
                      </span>
                    </div>
                    {plan.max_visits_per_month < 99999 && (
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${usagePercent}%` }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-1.5 text-slate-600"><HardDrive className="w-4 h-4 text-primary-500" /> Storage</span>
                      <span className="font-medium text-slate-900">
                        {((subscription?.storage_used_mb || 0) / 1024).toFixed(1)} GB / {plan.max_storage_gb} GB
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${storagePercent}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Manage subscription via Apple */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <Apple className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Manage your subscription in the PalmCare app</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Plans, payments, upgrades, and cancellations are handled securely through your Apple ID.
                  </p>
                </div>
              </div>

              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">1</span>
                  <span>Open the <span className="font-medium">PalmCare AI</span> app on your iPhone or iPad.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">2</span>
                  <span>Go to <span className="font-medium">Settings → Subscription</span> to upgrade, downgrade, or start a plan.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">3</span>
                  <span>To cancel or change billing, open <span className="font-medium">iPhone Settings → [your name] → Subscriptions</span>.</span>
                </li>
              </ol>

              <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                <Smartphone className="w-4 h-4" />
                Don&apos;t have the app yet? Search &quot;PalmCare AI&quot; on the App Store.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
