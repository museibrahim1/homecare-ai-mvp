'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  Zap,
  HardDrive,
  Users,
  Apple,
  Smartphone,
  Download,
  Building2,
  CreditCard,
} from 'lucide-react';

const API_BASE = '/api';
import { useRequireAuth } from '@/lib/auth';
import GlassShell from '@/components/GlassShell';
import {
  openAppleSubscriptions,
  openPaywallInApp,
  scrollToManageSubscription,
  type BillingPlanKey,
} from '@/lib/billingLinks';

interface SubscriptionData {
  id: string;
  status: string;
  billing_cycle: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  visits_this_month: number;
  storage_used_mb: number;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
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

interface SeatData {
  current_users: number;
  max_users: number;
}

interface InvoiceData {
  id: string;
  invoice_number: string | null;
  amount: number;
  currency: string;
  status: string;
  invoice_date: string | null;
  paid_at: string | null;
  description: string | null;
  download_url: string | null;
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
  const [seats, setSeats] = useState<SeatData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [planActionLoading, setPlanActionLoading] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    if (!token) return;
    const auth = { Authorization: `Bearer ${token}` };
    try {
      const [subRes, seatRes, invRes] = await Promise.allSettled([
        fetch(`${API_BASE}/billing/subscription`, { headers: auth }),
        fetch(`${API_BASE}/auth/business/team/limits`, { headers: auth }),
        fetch(`${API_BASE}/billing/invoices`, { headers: auth }),
      ]);

      if (subRes.status === 'fulfilled' && subRes.value.ok) {
        const data = await subRes.value.json();
        setSubscription(data.subscription || null);
        setPlan(data.plan || null);
      }
      if (seatRes.status === 'fulfilled' && seatRes.value.ok) {
        const data = await seatRes.value.json();
        if (typeof data.max_users === 'number' && typeof data.current_users === 'number') {
          setSeats({ current_users: data.current_users, max_users: data.max_users });
        }
      }
      if (invRes.status === 'fulfilled' && invRes.value.ok) {
        const data = await invRes.value.json();
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
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

  const downloadInvoice = useCallback(async (inv: InvoiceData) => {
    if (!token || !inv.download_url) return;
    setDownloadingId(inv.id);
    try {
      const res = await fetch(`${API_BASE}${inv.download_url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // non-fatal: leave the row as-is if the download fails
    } finally {
      setDownloadingId(null);
    }
  }, [token]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!isReady || loading) {
    return (
      <GlassShell title="Billing">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      </GlassShell>
    );
  }

  const planCatalog = [
    {
      tier: 'mobile',
      planKey: 'mobile' as BillingPlanKey,
      name: 'PalmCare Mobile',
      price: '$89.99',
      period: '/mo',
      blurb: 'Lite web CRM plus assessments. 15 assessments and 30 clients per month.',
      features: [
        '15 AI assessments per month',
        'Lite web CRM (30 clients)',
        'Notes, billables, and contracts',
        '50-state compliance engine',
      ],
      highlight: false,
    },
    {
      tier: 'starter',
      planKey: 'platform' as BillingPlanKey,
      name: 'PalmCare Platform',
      price: '$199.99',
      period: '/mo',
      blurb: 'Full CRM with higher caps: 30 assessments and 150 clients per month.',
      features: [
        '30 AI assessments per month',
        'Web CRM (150 clients)',
        'Team seats, pipeline, and calendar',
      ],
      highlight: true,
    },
    {
      tier: 'enterprise',
      planKey: null,
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      blurb: 'Custom limits, formula pricing, and a signed quote.',
      features: [
        'Everything in Platform',
        'Custom caps, SSO, and success support',
        'Volume and formula pricing',
      ],
      highlight: false,
    },
  ];

  const currentTier = (plan?.tier || '').toLowerCase();
  const currentName = (plan?.name || '').toLowerCase();
  const isCurrentPlan = (tier: string) => {
    if (tier === 'starter') {
      return ['starter', 'platform', 'complete'].includes(currentTier) || currentName.includes('platform');
    }
    if (tier === 'mobile') {
      return currentTier === 'mobile' || currentName.includes('mobile');
    }
    if (tier === 'enterprise') {
      return ['enterprise', 'pro', 'professional'].includes(currentTier) || currentName.includes('enterprise');
    }
    return currentTier === tier;
  };

  const status = subscription?.status || 'none';
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const StatusIcon = statusInfo.icon;
  const hasPaidSubscription = status === 'active' || status === 'trial';

  const handleSubscribe = (planKey: BillingPlanKey) => {
    setPlanActionLoading(planKey);
    openPaywallInApp(planKey);
    window.setTimeout(() => {
      scrollToManageSubscription();
      setPlanActionLoading(null);
    }, 800);
  };

  const getPlanCta = (tier: string, planKey: BillingPlanKey | null) => {
    if (isCurrentPlan(tier)) {
      return { label: 'Current plan', kind: 'current' as const };
    }
    if (tier === 'enterprise') {
      return { label: 'Request a quote', kind: 'quote' as const };
    }
    if (hasPaidSubscription) {
      return { label: 'Change in Apple Subscriptions', kind: 'manage' as const };
    }
    return { label: 'Start free trial', kind: 'subscribe' as const, planKey };
  };

  const hasVisitCap = !!plan && plan.max_visits_per_month > 0 && plan.max_visits_per_month < 99999;
  const usagePercent = hasVisitCap
    ? Math.min(100, Math.round(((subscription?.visits_this_month || 0) / plan!.max_visits_per_month) * 100))
    : 0;
  const storagePercent = plan?.max_storage_gb
    ? Math.min(100, Math.round(((subscription?.storage_used_mb || 0) / (plan.max_storage_gb * 1024)) * 100))
    : 0;
  const hasSeatCap = !!seats && seats.max_users > 0 && seats.max_users < 999;
  const seatPercent = hasSeatCap
    ? Math.min(100, Math.round((seats!.current_users / seats!.max_users) * 100))
    : 0;

  const changePlanAction = hasPaidSubscription ? (
    <button
      type="button"
      onClick={() => openAppleSubscriptions()}
      className="glass-btn-primary inline-flex items-center gap-2"
      style={{ borderRadius: 22, height: 44 }}
    >
      <CreditCard className="w-4 h-4" />
      Manage subscription
    </button>
  ) : (
    <button
      type="button"
      onClick={() => scrollToManageSubscription()}
      className="glass-btn-primary"
      style={{ borderRadius: 22, height: 44 }}
    >
      Subscribe
    </button>
  );

  return (
    <GlassShell title="Billing" subtitle="Plan, usage, and invoices in one place." action={changePlanAction}>
      <div className="max-w-4xl w-full space-y-6">
        {/* Current plan */}
        <div className="glass-card p-[22px]">
          <div className="flex items-start justify-between gap-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-500">Current plan</div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[13px] font-medium ${statusInfo.bg} ${statusInfo.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-end justify-between gap-4 mt-2">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="text-2xl font-bold tracking-tight text-[#10211F]">{plan?.name || 'No active plan'}</div>
              <div className="text-[15px] font-medium text-[#4B6B66]">
                {hasVisitCap
                  ? `${plan!.max_visits_per_month} assessments / month.`
                  : plan
                    ? 'Unlimited assessments.'
                    : 'Choose a plan below to get started.'}
                {status === 'trial' && subscription?.trial_ends_at
                  ? ` Trial ends ${formatDate(subscription.trial_ends_at)}.`
                  : subscription?.current_period_end && status !== 'trial'
                    ? ` Renews ${formatDate(subscription.current_period_end)}.`
                    : ''}
              </div>
            </div>
            {plan && plan.monthly_price > 0 && (
              <div className="shrink-0 text-2xl font-bold tracking-tight text-[#10211F]">
                ${plan.monthly_price % 1 === 0 ? plan.monthly_price.toLocaleString() : plan.monthly_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-[15px] font-medium text-[#4B6B66]"> / mo</span>
              </div>
            )}
          </div>
        </div>

        {/* Usage: assessments, storage, seats */}
        {(plan || seats) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plan && (
              <>
                <UsageCard
                  icon={<Zap className="w-4 h-4 text-primary-500" />}
                  label="Assessments this month"
                  value={hasVisitCap
                    ? `${subscription?.visits_this_month || 0} / ${plan.max_visits_per_month}`
                    : `${subscription?.visits_this_month || 0}`}
                  percent={usagePercent}
                  showBar={hasVisitCap}
                />
                <UsageCard
                  icon={<HardDrive className="w-4 h-4 text-primary-500" />}
                  label="Storage"
                  value={`${((subscription?.storage_used_mb || 0) / 1024).toFixed(1)} / ${plan.max_storage_gb} GB`}
                  percent={storagePercent}
                  showBar
                />
              </>
            )}
            {seats && (
              <UsageCard
                icon={<Users className="w-4 h-4 text-primary-500" />}
                label="Team seats"
                value={hasSeatCap ? `${seats.current_users} / ${seats.max_users}` : `${seats.current_users}`}
                percent={seatPercent}
                showBar={hasSeatCap}
              />
            )}
          </div>
        )}

        {/* Choose a plan */}
        <div id="plans">
          <h2 className="text-lg font-bold text-[#10211F] mb-1">Choose a plan</h2>
          <p className="text-[#4B6B66] text-sm mb-4">
            New plans start in the PalmCare app with Apple In-App Purchase. Active subscribers change or cancel in Apple Subscriptions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {planCatalog.map((p) => {
              const current = isCurrentPlan(p.tier);
              const cta = getPlanCta(p.tier, p.planKey);
              const loadingThis = Boolean(
                cta.kind === 'subscribe' &&
                  cta.planKey &&
                  planActionLoading === cta.planKey,
              );
              const className = `w-full h-9 rounded-[10px] text-[13px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                current
                  ? 'bg-primary-500 text-white cursor-default'
                  : p.highlight
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`;
              return (
                <div
                  key={p.tier}
                  className={`glass-card p-5 flex flex-col ${current || p.highlight ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[13px] font-semibold uppercase tracking-[0.06em] ${current || p.highlight ? 'text-primary-500' : 'text-[#4B6B66]'}`}>
                      {p.name}
                    </span>
                    {current ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-600">Current</span>
                    ) : p.highlight ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-600">Popular</span>
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-[32px] leading-9 font-bold tracking-tight text-[#10211F]">{p.price}</span>
                    {p.period ? <span className="text-[13px] text-[#4B6B66]">{p.period}</span> : null}
                  </div>
                  <p className="text-xs text-[#4B6B66] mb-4">{p.blurb}</p>
                  <ul className="space-y-2 mb-5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[#4B6B66]">
                        <CheckCircle2 className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {cta.kind === 'current' ? (
                    <button type="button" disabled className={className}>
                      {cta.label}
                    </button>
                  ) : cta.kind === 'quote' ? (
                    <Link href="/book-demo" className={className}>
                      {cta.label}
                      <Building2 className="w-3.5 h-3.5" />
                    </Link>
                  ) : cta.kind === 'manage' ? (
                    <button
                      type="button"
                      onClick={() => openAppleSubscriptions()}
                      className={className}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {cta.label}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cta.planKey && handleSubscribe(cta.planKey)}
                      disabled={loadingThis}
                      className={className}
                    >
                      {loadingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5" />
                      )}
                      {cta.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent invoices */}
        <div>
          <h2 className="text-lg font-bold text-[#10211F] mb-3">Recent invoices</h2>
          {invoices.length > 0 ? (
            <div className="glass-panel p-2 flex flex-col gap-1">
              {invoices.map((inv) => {
                const paid = (inv.status || '').toLowerCase() === 'paid';
                return (
                  <div key={inv.id} className="flex items-center h-16 px-[18px] rounded-xl gap-4 hover:bg-white/50 transition-colors">
                    <div className="flex flex-col gap-0.5 grow min-w-0">
                      <div className="text-[15px] font-semibold leading-[18px] text-[#10211F] truncate">
                        {inv.invoice_date
                          ? new Date(inv.invoice_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : inv.invoice_number || 'Invoice'}
                      </div>
                      {inv.description && (
                        <div className="text-[13px] font-medium leading-4 text-[#4B6B66] truncate">{inv.description}</div>
                      )}
                    </div>
                    <div className={`shrink-0 text-[13px] font-semibold capitalize ${paid ? 'text-primary-500' : 'text-amber-600'}`}>
                      {inv.status || '—'}
                    </div>
                    <div className="shrink-0 w-[90px] text-right text-[15px] font-semibold text-[#10211F]">
                      ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {inv.download_url && (
                      <button
                        onClick={() => downloadInvoice(inv)}
                        disabled={downloadingId === inv.id}
                        title="Download PDF"
                        aria-label="Download invoice PDF"
                        className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === inv.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel p-8 flex flex-col items-center justify-center text-center gap-1">
              <div className="text-[15px] font-semibold text-[#10211F]">No invoices yet</div>
              <p className="text-[13px] text-[#4B6B66] max-w-xs">
                Invoices appear here after your first payment. Subscriptions purchased in the PalmCare app are billed through your Apple ID.
              </p>
            </div>
          )}
        </div>

        {/* Subscribe + manage via Apple */}
        <div id="manage-subscription" className="glass-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#10211F] flex items-center justify-center flex-shrink-0">
              <Apple className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#10211F]">Subscription and payment</h2>
              <p className="text-sm text-[#4B6B66] mt-0.5">
                PalmCare Mobile and Platform are billed through your Apple ID. Start a trial in the app, or manage an active subscription below.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            {hasPaidSubscription ? (
              <button
                type="button"
                onClick={() => openAppleSubscriptions()}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Open Apple Subscriptions
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubscribe('mobile')}
                  disabled={planActionLoading === 'mobile'}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors disabled:opacity-60"
                >
                  {planActionLoading === 'mobile' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  Start Mobile trial in app
                </button>
                <button
                  type="button"
                  onClick={() => handleSubscribe('platform')}
                  disabled={planActionLoading === 'platform'}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
                >
                  {planActionLoading === 'platform' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  Start Platform trial in app
                </button>
              </>
            )}
          </div>

          <ol className="space-y-3 text-sm text-[#334155]">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center text-xs font-semibold text-primary-600">1</span>
              <span>
                {hasPaidSubscription
                  ? 'Open Apple Subscriptions to change plans, update your payment method, or cancel renewal.'
                  : 'Tap a plan above on your iPhone or iPad to open PalmCare and start the Apple payment sheet.'}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center text-xs font-semibold text-primary-600">2</span>
              <span>
                In the app, go to <span className="font-medium">Settings → Your Plan</span> if you need to pick Mobile or Platform again.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center text-xs font-semibold text-primary-600">3</span>
              <span>
                You can also manage billing from <span className="font-medium">iPhone Settings → [your name] → Subscriptions</span>.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </GlassShell>
  );
}

function UsageCard({
  icon,
  label,
  value,
  percent,
  showBar,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percent: number;
  showBar: boolean;
}) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4B6B66]">
          {icon}
          {label}
        </span>
        <span className="text-[13px] font-semibold text-[#10211F]">{value}</span>
      </div>
      {showBar && (
        <div className="h-2 rounded-full overflow-hidden bg-slate-100">
          <div className="h-full rounded-full bg-primary-500" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
