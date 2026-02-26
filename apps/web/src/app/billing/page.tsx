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
  ArrowRight,
  Shield,
  Crown,
  Sparkles,
  Check,
  ChevronRight,
  Download,
  Building2,
  Mic,
  FileText,
  Globe,
  Headphones,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  active:    { label: 'Active',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  trial:     { label: 'Trial',     color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       icon: Clock },
  past_due:  { label: 'Past Due',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         icon: XCircle },
  suspended: { label: 'Suspended', color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         icon: XCircle },
};

const TIER_FEATURES: Record<string, string[]> = {
  starter: [
    'Up to 25 clients',
    'AI voice assessments',
    'Basic contract generation',
    'Email support',
    '5 GB storage',
  ],
  growth: [
    'Up to 100 clients',
    'AI voice assessments',
    'Advanced contract generation',
    'Priority email support',
    'Team collaboration (5 users)',
    '25 GB storage',
    'Google Calendar sync',
    'ADL logging',
  ],
  professional: [
    'Up to 500 clients',
    'Unlimited AI assessments',
    'Full contract suite + templates',
    'Priority phone & email support',
    'Team collaboration (25 users)',
    '100 GB storage',
    'Google Calendar + Gmail',
    'ADL logging + care tracking',
    'Custom branding',
    'Reports & analytics',
  ],
  enterprise: [
    'Unlimited clients',
    'Unlimited AI assessments',
    'Enterprise contract suite',
    'Dedicated account manager',
    'Unlimited users',
    'Unlimited storage',
    'Full API access',
    'Custom integrations',
    'HIPAA BAA included',
    'SOC 2 compliance',
    'SLA guarantee',
  ],
};

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  starter: Zap,
  growth: Users,
  professional: Crown,
  enterprise: Building2,
};

export default function BillingPage() {
  const router = useRouter();
  const { user, token, isReady } = useRequireAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [allPlans, setAllPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeTab, setActiveTab] = useState<'plans' | 'usage' | 'invoices'>('plans');

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

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
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.trial;
  const StatusIcon = statusInfo?.icon || Clock;

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
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Billing & Plans</h1>
                <p className="text-slate-500 text-sm mt-0.5">Manage your subscription and payment methods</p>
              </div>
              {subscription?.stripe_customer_id && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Stripe Portal
                </button>
              )}
            </div>

            {/* Current Plan Summary */}
            {subscription && plan && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-semibold text-slate-900">{plan.name} Plan</h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm">
                        {subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
                        {subscription.current_period_end && ` · Renews ${formatDate(subscription.current_period_end)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {formatCurrency(subscription.billing_cycle === 'annual'
                        ? Math.round(plan.annual_price / 12)
                        : plan.monthly_price)}
                    </span>
                    <span className="text-slate-500 text-sm">/mo</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
              {[
                { id: 'plans' as const, label: 'Plans', count: allPlans.length },
                { id: 'usage' as const, label: 'Usage' },
                { id: 'invoices' as const, label: 'Invoices', count: invoices.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Plans Tab */}
            {activeTab === 'plans' && (
              <div>
                {/* Billing Cycle Toggle */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-slate-500">Select a plan that fits your agency</p>
                  <div className="period-selector">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={billingCycle === 'monthly' ? 'active' : ''}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle('annual')}
                      className={billingCycle === 'annual' ? 'active' : ''}
                    >
                      Annual
                      <span className="ml-1 text-emerald-600">-17%</span>
                    </button>
                  </div>
                </div>

                {/* Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {allPlans.map((p) => {
                    const price = billingCycle === 'annual' ? Math.round(p.annual_price / 12) : p.monthly_price;
                    const isCurrentPlan = plan?.id === p.id;
                    const tierKey = p.tier.toLowerCase();
                    const features = TIER_FEATURES[tierKey] || (p.features ? (typeof p.features === 'string' ? JSON.parse(p.features) : p.features) : []);
                    const TierIcon = TIER_ICONS[tierKey] || Zap;
                    const isPopular = tierKey === 'professional';

                    return (
                      <div
                        key={p.id}
                        className={`relative bg-white border rounded-lg overflow-hidden transition-all ${
                          isCurrentPlan
                            ? 'border-primary-300 ring-2 ring-primary-100'
                            : isPopular
                            ? 'border-primary-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isPopular && (
                          <div className="bg-primary-500 text-center py-1">
                            <span className="text-[11px] font-semibold tracking-wide" style={{ color: '#fff' }}>MOST POPULAR</span>
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isCurrentPlan ? 'bg-primary-50' : 'bg-slate-50'
                            }`}>
                              <TierIcon className={`w-4 h-4 ${isCurrentPlan ? 'text-primary-600' : 'text-slate-500'}`} />
                            </div>
                            <h3 className="font-semibold text-slate-900">{p.name}</h3>
                          </div>

                          <p className="text-slate-500 text-xs mb-4 min-h-[32px]">
                            {p.description || `For ${tierKey === 'starter' ? 'solo practitioners' : tierKey === 'growth' ? 'growing agencies' : tierKey === 'professional' ? 'established agencies' : 'large organizations'}`}
                          </p>

                          {p.is_contact_sales ? (
                            <div className="mb-5">
                              <span className="text-2xl font-bold text-slate-900">Custom</span>
                              <p className="text-slate-500 text-xs mt-0.5">Tailored to your needs</p>
                            </div>
                          ) : (
                            <div className="mb-5">
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-900">{formatCurrency(price)}</span>
                                <span className="text-slate-500 text-sm">/mo</span>
                              </div>
                              {billingCycle === 'annual' && p.annual_price > 0 && (
                                <p className="text-emerald-600 text-xs mt-0.5">
                                  {formatCurrency(p.annual_price)}/yr · Save {formatCurrency(p.monthly_price * 12 - p.annual_price)}
                                </p>
                              )}
                              {p.setup_fee > 0 && (
                                <p className="text-slate-400 text-xs mt-0.5">+ {formatCurrency(p.setup_fee)} setup fee</p>
                              )}
                            </div>
                          )}

                          {/* CTA Button */}
                          {isCurrentPlan ? (
                            <div className="w-full py-2.5 text-center text-sm font-medium text-primary-700 bg-primary-50 rounded-lg border border-primary-200 mb-5">
                              Current Plan
                            </div>
                          ) : p.is_contact_sales ? (
                            <a
                              href="mailto:sales@palmtai.com?subject=Enterprise Plan Inquiry"
                              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors mb-5"
                            >
                              Contact Sales <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button
                              onClick={() => handleCheckout(p.id)}
                              disabled={!!checkoutLoading}
                              className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all mb-5 ${
                                isPopular
                                  ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              }`}
                              style={{ color: '#fff' }}
                            >
                              {checkoutLoading === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  {subscription ? 'Switch Plan' : 'Subscribe'}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}

                          {/* Features */}
                          <div className="space-y-2">
                            {features.slice(0, 7).map((f: string, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-slate-600">{f}</span>
                              </div>
                            ))}
                            {features.length > 7 && (
                              <p className="text-xs text-primary-600 font-medium pl-5">+ {features.length - 7} more</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {allPlans.length === 0 && (
                    <div className="col-span-full bg-white border border-slate-200 rounded-lg p-12 text-center">
                      <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">No plans available</h3>
                      <p className="text-slate-500 text-sm">Plans are being configured. Contact support for access.</p>
                    </div>
                  )}
                </div>

                {/* Feature Comparison */}
                <div className="mt-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">All Plans Include</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
                    {[
                      { icon: Mic, label: 'AI Voice Assessments' },
                      { icon: FileText, label: 'Contract Generation' },
                      { icon: Shield, label: 'HIPAA Compliant' },
                      { icon: Globe, label: 'Cloud-based Platform' },
                      { icon: Download, label: 'PDF Export' },
                      { icon: Sparkles, label: 'AI Transcription' },
                      { icon: CreditCard, label: 'Secure Payments' },
                      { icon: Headphones, label: 'Email Support' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="bg-white p-4 flex items-center gap-3">
                        <Icon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        <span className="text-xs text-slate-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
              <div className="space-y-4">
                {plan ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <UsageMeter
                        icon={Zap}
                        label="Assessments"
                        used={subscription?.visits_this_month || 0}
                        limit={plan.max_visits_per_month}
                        percent={usagePercent}
                      />
                      <UsageMeter
                        icon={Users}
                        label="Team Members"
                        used={1}
                        limit={plan.max_users}
                        percent={Math.round((1 / plan.max_users) * 100)}
                      />
                      <UsageMeter
                        icon={HardDrive}
                        label="Storage"
                        used={Math.round((subscription?.storage_used_mb || 0) / 1024 * 10) / 10}
                        limit={plan.max_storage_gb}
                        unit="GB"
                        percent={storagePercent}
                      />
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                      <div className="flex items-center gap-2.5 mb-4">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">Payment Method</h3>
                      </div>
                      {subscription?.stripe_customer_id ? (
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-7 bg-gradient-to-br from-indigo-500 to-blue-600 rounded flex items-center justify-center">
                              <CreditCard className="w-4 h-3 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">Card on file</p>
                              <p className="text-xs text-slate-500">Managed via Stripe</p>
                            </div>
                          </div>
                          <button
                            onClick={handleManageBilling}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Update
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No payment method on file</p>
                          <p className="text-slate-400 text-xs mt-0.5">Subscribe to a plan to add one</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">No active subscription</h3>
                    <p className="text-slate-500 text-sm mb-4">Subscribe to a plan to see your usage</p>
                    <button
                      onClick={() => setActiveTab('plans')}
                      className="text-sm text-primary-600 font-medium hover:text-primary-700"
                    >
                      View Plans
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div>
                {invoices.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="table-enterprise">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv, i) => (
                          <tr key={inv.id} className={i % 2 === 1 ? 'row-alt' : ''}>
                            <td className="font-medium text-slate-900">{inv.invoice_number || `INV-${i + 1}`}</td>
                            <td className="text-slate-600">{formatDate(inv.invoice_date)}</td>
                            <td className="font-medium text-slate-900">{formatCurrency(inv.amount)}</td>
                            <td>
                              <span className={`status-badge ${
                                inv.status === 'paid' ? 'status-active' :
                                inv.status === 'failed' ? 'status-error' :
                                'status-pending'
                              }`}>
                                {inv.status === 'paid' ? 'Paid' : inv.status === 'failed' ? 'Failed' : 'Pending'}
                              </span>
                            </td>
                            <td>
                              {inv.stripe_invoice_id && (
                                <button className="text-slate-400 hover:text-slate-600">
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">No invoices yet</h3>
                    <p className="text-slate-500 text-sm">Invoices will appear here after your first payment</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
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
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-xs text-slate-500">
          {used}{unit ? ` ${unit}` : ''} / {limit}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">{percent}% used</p>
    </div>
  );
}
