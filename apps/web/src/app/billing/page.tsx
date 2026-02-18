'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  ExternalLink,
  Receipt,
  Zap,
  Users,
  HardDrive,
  Calendar,
  ArrowRight,
  Shield,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface SubscriptionData {
  id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  visits_this_month: number;
  storage_used_mb: number;
  business_id: string;
}

interface PlanData {
  id: string;
  name: string;
  tier: string;
  monthly_price: number;
  annual_price: number;
  max_users: number;
  max_clients: number;
  max_visits_per_month: number;
  max_storage_gb: number;
  features: string | null;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  invoice_date: string | null;
  paid_at: string | null;
  description: string | null;
  stripe_invoice_id: string | null;
}

interface PublicPlan {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  setup_fee: number;
  max_users: number;
  is_contact_sales: boolean;
  features: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  trial: { label: 'Trial', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Clock },
  past_due: { label: 'Past Due', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
  suspended: { label: 'Suspended', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
};

export default function BillingPage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [allPlans, setAllPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('palmcare-auth');

  useEffect(() => {
    if (!hasStoredToken && !isAuthenticated()) {
      router.push('/login');
    }
  }, [hasStoredToken, isAuthenticated, router]);

  const fetchBilling = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [subRes, invRes, plansRes] = await Promise.all([
        fetch(`${API_BASE}/billing/subscription`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/billing/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/billing/plans`),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
        setPlan(subData.plan);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setAllPlans(plansData);
      }
    } catch (e) {
      console.error('Failed to fetch billing data:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  const handleCheckout = async (planId: string) => {
    if (!token) return;
    setCheckoutLoading(planId);
    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.checkout_url;
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to start checkout');
      }
    } catch {
      alert('Failed to connect to billing service');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!token || !subscription?.business_id) return;
    setPortalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: subscription.business_id }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.portal_url;
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to open billing portal');
      }
    } catch {
      alert('Failed to connect to billing service');
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (!hasStoredToken && !isAuthenticated()) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const status = subscription?.status || 'none';
  const statusInfo = statusConfig[status] || statusConfig.trial;
  const StatusIcon = statusInfo?.icon || Clock;

  const usagePercent = plan?.max_visits_per_month
    ? Math.min(100, Math.round(((subscription?.visits_this_month || 0) / plan.max_visits_per_month) * 100))
    : 0;
  const storagePercent = plan?.max_storage_gb
    ? Math.min(100, Math.round(((subscription?.storage_used_mb || 0) / (plan.max_storage_gb * 1024)) * 100))
    : 0;

  const upgradePlans = allPlans.filter(p => {
    if (p.is_contact_sales) return false;
    if (!plan) return true;
    return p.monthly_price > plan.monthly_price;
  });

  return (
    <div className="min-h-screen bg-dark-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Billing & Subscription</h1>
            <p className="text-dark-400 mt-1">Manage your plan, payment method, and invoices</p>
          </div>
          {subscription?.stripe_customer_id && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white rounded-xl transition-all font-medium text-sm"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Manage in Stripe
            </button>
          )}
        </div>

        {/* Current Plan Card */}
        <div className="bg-dark-900/50 backdrop-blur border border-dark-800 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600/20 via-purple-600/10 to-transparent p-6 md:p-8 border-b border-dark-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{plan?.name || 'Free'} Plan</h2>
                    {statusInfo && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <p className="text-dark-400 text-sm mt-0.5">
                    {subscription?.billing_cycle === 'annual' ? 'Annual billing' : 'Monthly billing'}
                    {subscription?.current_period_end && ` · Renews ${formatDate(subscription.current_period_end)}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  {plan ? formatCurrency(subscription?.billing_cycle === 'annual'
                    ? plan.annual_price / 12
                    : plan.monthly_price) : '$0'}
                  <span className="text-sm font-normal text-dark-400">/mo</span>
                </div>
                {subscription?.billing_cycle === 'annual' && plan && (
                  <p className="text-xs text-emerald-400 mt-1">
                    {formatCurrency(plan.annual_price)}/year · Save {formatCurrency(plan.monthly_price * 12 - plan.annual_price)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Usage meters */}
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <UsageMeter
              icon={Zap}
              label="Assessments This Month"
              used={subscription?.visits_this_month || 0}
              limit={plan?.max_visits_per_month || 0}
              percent={usagePercent}
            />
            <UsageMeter
              icon={Users}
              label="Team Members"
              used={0}
              limit={plan?.max_users || 1}
              percent={0}
            />
            <UsageMeter
              icon={HardDrive}
              label="Storage Used"
              used={Math.round((subscription?.storage_used_mb || 0) / 1024 * 10) / 10}
              limit={plan?.max_storage_gb || 1}
              unit="GB"
              percent={storagePercent}
            />
          </div>
        </div>

        {/* Payment Method + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Method */}
          <div className="bg-dark-900/50 backdrop-blur border border-dark-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">Payment Method</h3>
            </div>
            {subscription?.stripe_customer_id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                  <div className="w-12 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-md flex items-center justify-center">
                    <CreditCard className="w-5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Card on file via Stripe</p>
                    <p className="text-dark-400 text-xs">Managed through Stripe Customer Portal</p>
                  </div>
                </div>
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-primary-400 hover:text-primary-300 bg-primary-500/5 hover:bg-primary-500/10 rounded-xl border border-primary-500/20 transition-all"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Update Payment Method
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400 text-sm mb-3">No payment method on file</p>
                <p className="text-dark-500 text-xs">Subscribe to a plan to add a payment method</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-dark-900/50 backdrop-blur border border-dark-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              {subscription?.stripe_customer_id && (
                <button
                  onClick={handleManageBilling}
                  className="w-full flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800 rounded-xl border border-dark-700 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-dark-400" />
                    <span className="text-white text-sm font-medium">View Stripe Invoices</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
                </button>
              )}
              {upgradePlans.length > 0 && (
                <a
                  href="#upgrade"
                  className="w-full flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800 rounded-xl border border-dark-700 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-white text-sm font-medium">Upgrade Plan</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
                </a>
              )}
              <Link
                href="/pricing"
                className="w-full flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800 rounded-xl border border-dark-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-dark-400" />
                  <span className="text-white text-sm font-medium">Compare All Plans</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        {invoices.length > 0 && (
          <div className="bg-dark-900/50 backdrop-blur border border-dark-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-dark-800">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">Invoice History</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-800">
                    <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-dark-400 uppercase tracking-wider px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-dark-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-white font-medium">{inv.invoice_number || '—'}</td>
                      <td className="px-6 py-4 text-sm text-dark-300">{formatDate(inv.invoice_date)}</td>
                      <td className="px-6 py-4 text-sm text-white font-medium">{formatCurrency(inv.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          inv.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {inv.status === 'paid' ? 'Paid' : inv.status === 'failed' ? 'Failed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upgrade Section */}
        {upgradePlans.length > 0 && (
          <div id="upgrade" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                  Upgrade Your Plan
                </h2>
                <p className="text-dark-400 mt-1">Get more power for your growing agency</p>
              </div>
              <div className="flex items-center bg-dark-800 rounded-xl p-1 border border-dark-700">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    billingCycle === 'monthly' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    billingCycle === 'annual' ? 'bg-primary-600 text-white shadow-lg' : 'text-dark-400 hover:text-white'
                  }`}
                >
                  Annual
                  <span className="ml-1.5 text-xs text-emerald-400">Save 17%</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upgradePlans.map((p) => {
                const price = billingCycle === 'annual' ? Math.round(p.annual_price / 12) : p.monthly_price;
                const isCurrentPlan = plan?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`bg-dark-900/50 backdrop-blur border rounded-2xl p-6 transition-all ${
                      isCurrentPlan ? 'border-primary-500/50 ring-1 ring-primary-500/20' : 'border-dark-800 hover:border-dark-700'
                    }`}
                  >
                    <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                    <p className="text-dark-400 text-sm mb-4">{p.description || 'For growing agencies'}</p>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-white">{formatCurrency(price)}</span>
                      <span className="text-dark-400">/mo</span>
                      {billingCycle === 'annual' && (
                        <p className="text-xs text-emerald-400 mt-1">{formatCurrency(p.annual_price)}/year</p>
                      )}
                    </div>
                    {isCurrentPlan ? (
                      <div className="w-full py-3 text-center text-sm font-medium text-primary-400 bg-primary-500/10 rounded-xl border border-primary-500/20">
                        Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckout(p.id)}
                        disabled={!!checkoutLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 rounded-xl transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                      >
                        {checkoutLoading === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Upgrade Now <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    )}
                    {p.features && (
                      <ul className="mt-5 space-y-2.5">
                        {(typeof p.features === 'string' ? JSON.parse(p.features) : p.features).slice(0, 5).map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-dark-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No subscription state */}
        {!subscription && (
          <div className="bg-dark-900/50 backdrop-blur border border-dark-800 rounded-2xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Active Subscription</h2>
            <p className="text-dark-400 max-w-md mx-auto mb-8">
              Choose a plan to unlock AI-powered assessments, automated contracts, and everything you need to grow your agency.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20"
              >
                View Plans <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function UsageMeter({ icon: Icon, label, used, limit, unit, percent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number;
  limit: number;
  unit?: string;
  percent: number;
}) {
  const barColor = percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-primary-500';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-300">{label}</span>
        </div>
        <span className="text-sm font-medium text-white">
          {used}{unit ? ` ${unit}` : ''} / {limit}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
    </div>
  );
}
