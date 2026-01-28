'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Shield, Loader2, RefreshCw, Save, ExternalLink,
  DollarSign, CheckCircle, AlertCircle, Copy, Check
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Plan {
  id: string;
  name: string;
  tier: string;
  monthly_price: number;
  annual_price: number;
  setup_fee: number;
  is_contact_sales: boolean;
}

interface StripeConfig {
  plan_id: string;
  plan_name: string;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  stripe_price_id_setup: string | null;
  monthly_price: number;
  annual_price: number;
  setup_fee: number;
}

export default function BillingConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StripeConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    stripe_product_id: '',
    stripe_price_id_monthly: '',
    stripe_price_id_annual: '',
    stripe_price_id_setup: '',
  });

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
            fetchPlans();
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

  const fetchPlans = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE}/platform/subscriptions/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setPlans(await response.json());
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanStripeConfig = async (planId: string) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE}/billing/plans/${planId}/stripe`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const config = await response.json();
        setSelectedPlan(config);
        setFormData({
          stripe_product_id: config.stripe_product_id || '',
          stripe_price_id_monthly: config.stripe_price_id_monthly || '',
          stripe_price_id_annual: config.stripe_price_id_annual || '',
          stripe_price_id_setup: config.stripe_price_id_setup || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch Stripe config:', err);
    }
  };

  const saveStripeConfig = async () => {
    if (!selectedPlan) return;
    
    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE}/billing/plans/${selectedPlan.plan_id}/stripe`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        await fetchPlanStripeConfig(selectedPlan.plan_id);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isConfigured = (config: StripeConfig | null) => {
    if (!config) return false;
    return !!(config.stripe_product_id && config.stripe_price_id_monthly);
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
      <div className="max-w-6xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Stripe Billing Configuration</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Configure Stripe Price IDs for subscription billing. Create products and prices in your 
              <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener" className="underline ml-1">
                Stripe Dashboard
              </a>, then add the IDs here.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Billing Configuration</h1>
            <p className="text-dark-400 mt-1">Connect plans to Stripe for payment processing</p>
          </div>
          <a
            href="https://dashboard.stripe.com/products"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition text-dark-400 hover:text-white"
          >
            <ExternalLink className="w-4 h-4" />
            Stripe Dashboard
          </a>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Plans List */}
          <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-medium text-white">Plans</h2>
            </div>
            <div className="divide-y divide-dark-700">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto" />
                </div>
              ) : (
                plans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => fetchPlanStripeConfig(plan.id)}
                    className={`w-full p-4 text-left hover:bg-dark-700/50 transition ${
                      selectedPlan?.plan_id === plan.id ? 'bg-dark-700/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{plan.name}</p>
                        <p className="text-dark-400 text-sm">
                          {plan.is_contact_sales ? 'Contact Sales' : `$${plan.monthly_price}/mo`}
                        </p>
                      </div>
                      {/* Status indicator would go here */}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Configuration Form */}
          <div className="col-span-2 bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            {selectedPlan ? (
              <div>
                <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-white">{selectedPlan.plan_name}</h2>
                    <p className="text-dark-400 text-sm">
                      ${selectedPlan.monthly_price}/mo • ${selectedPlan.annual_price}/yr • ${selectedPlan.setup_fee} setup
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                    isConfigured(selectedPlan)
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {isConfigured(selectedPlan) ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Configured
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Not Configured
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Stripe Product ID */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">
                      Stripe Product ID
                      <span className="text-dark-500 ml-2">(prod_xxxxx)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.stripe_product_id}
                      onChange={e => setFormData({ ...formData, stripe_product_id: e.target.value })}
                      placeholder="prod_xxxxxxxxxxxxx"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white font-mono text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
                    />
                    <p className="text-dark-500 text-xs mt-1">
                      Create a Product in Stripe for this plan
                    </p>
                  </div>

                  {/* Monthly Price ID */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">
                      Monthly Price ID
                      <span className="text-dark-500 ml-2">(price_xxxxx)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.stripe_price_id_monthly}
                      onChange={e => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })}
                      placeholder="price_xxxxxxxxxxxxx"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white font-mono text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
                    />
                    <p className="text-dark-500 text-xs mt-1">
                      Recurring monthly price: ${selectedPlan.monthly_price}/month
                    </p>
                  </div>

                  {/* Annual Price ID */}
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">
                      Annual Price ID
                      <span className="text-dark-500 ml-2">(price_xxxxx)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.stripe_price_id_annual}
                      onChange={e => setFormData({ ...formData, stripe_price_id_annual: e.target.value })}
                      placeholder="price_xxxxxxxxxxxxx"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white font-mono text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
                    />
                    <p className="text-dark-500 text-xs mt-1">
                      Recurring annual price: ${selectedPlan.annual_price}/year (10% discount)
                    </p>
                  </div>

                  {/* Setup Fee Price ID */}
                  {selectedPlan.setup_fee > 0 && (
                    <div>
                      <label className="block text-dark-400 text-sm mb-2">
                        Setup Fee Price ID
                        <span className="text-dark-500 ml-2">(price_xxxxx, one-time)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.stripe_price_id_setup}
                        onChange={e => setFormData({ ...formData, stripe_price_id_setup: e.target.value })}
                        placeholder="price_xxxxxxxxxxxxx"
                        className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white font-mono text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500"
                      />
                      <p className="text-dark-500 text-xs mt-1">
                        One-time setup fee: ${selectedPlan.setup_fee}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={saveStripeConfig}
                    disabled={saving}
                    className="w-full py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save Configuration
                  </button>
                </div>

                {/* Instructions */}
                <div className="p-6 border-t border-dark-700 bg-dark-700/30">
                  <h3 className="text-white font-medium mb-3">Setup Instructions</h3>
                  <ol className="space-y-2 text-dark-400 text-sm">
                    <li>1. Go to <a href="https://dashboard.stripe.com/products/create" target="_blank" className="text-primary-400 hover:underline">Stripe Products</a> and create a product for "{selectedPlan.plan_name}"</li>
                    <li>2. Add a <strong>recurring monthly price</strong> of ${selectedPlan.monthly_price}</li>
                    <li>3. Add a <strong>recurring yearly price</strong> of ${selectedPlan.annual_price}</li>
                    {selectedPlan.setup_fee > 0 && (
                      <li>4. Add a <strong>one-time price</strong> of ${selectedPlan.setup_fee} for setup fee</li>
                    )}
                    <li>{selectedPlan.setup_fee > 0 ? '5' : '4'}. Copy the IDs (prod_xxx, price_xxx) into the fields above</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-dark-400">
                <CreditCard className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a plan to configure</p>
              </div>
            )}
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="mt-8 p-6 bg-dark-800 rounded-xl border border-dark-700">
          <h3 className="text-white font-medium mb-4">Webhook Configuration</h3>
          <p className="text-dark-400 text-sm mb-4">
            Set up a webhook in Stripe to receive subscription events:
          </p>
          <div className="flex items-center gap-3 p-4 bg-dark-700 rounded-lg">
            <code className="flex-1 text-primary-400 font-mono text-sm">
              {typeof window !== 'undefined' ? `${window.location.origin.replace(':3000', ':8000')}/billing/webhook` : 'https://your-api.com/billing/webhook'}
            </code>
            <button
              onClick={() => copyToClipboard(`${window.location.origin.replace(':3000', ':8000')}/billing/webhook`, 'webhook')}
              className="p-2 hover:bg-dark-600 rounded transition"
            >
              {copied === 'webhook' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-dark-400" />
              )}
            </button>
          </div>
          <p className="text-dark-500 text-xs mt-3">
            Events to enable: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed
          </p>
        </div>
      </div>
    </div>
  );
}
