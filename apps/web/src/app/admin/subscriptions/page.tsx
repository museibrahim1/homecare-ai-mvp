'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Building2, CreditCard, TrendingUp, Loader2, Shield,
  RefreshCw, Search, Filter, MoreVertical, Check, X, AlertCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Plan {
  id: string;
  name: string;
  tier: string;
  monthly_price: number;
  annual_price: number;
  max_users: number;
  max_clients: number;
  max_visits_per_month: number;
}

interface Subscription {
  id: string;
  business_name: string;
  plan_name: string;
  plan_tier: string;
  status: string;
  billing_cycle: string;
  current_period_end: string | null;
  visits_this_month: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  trial: 'bg-blue-500/20 text-blue-400',
  past_due: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-dark-500/20 text-dark-400',
  suspended: 'bg-orange-500/20 text-orange-400',
};

const TIER_COLORS: Record<string, string> = {
  free: 'text-dark-400',
  starter: 'text-blue-400',
  professional: 'text-purple-400',
  enterprise: 'text-yellow-400',
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

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
      const [plansRes, subsRes] = await Promise.all([
        fetch(`${API_BASE}/platform/subscriptions/plans`, { headers }),
        fetch(`${API_BASE}/platform/subscriptions${filter !== 'all' ? `?status=${filter}` : ''}`, { headers }),
      ]);

      if (plansRes.ok) setPlans(await plansRes.json());
      if (subsRes.ok) setSubscriptions(await subsRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchData();
  }, [filter, isAuthorized]);

  const updateSubscriptionStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/platform/subscriptions/${id}/status?new_status=${status}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
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
            <p className="text-blue-400 font-medium">Subscription Management</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Manage business subscriptions and billing. No client data is accessible from this view.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
            <p className="text-dark-400 mt-1">Manage business plans and billing</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Plans Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {plans.map(plan => (
            <div key={plan.id} className="p-5 bg-dark-800 rounded-xl border border-dark-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold ${TIER_COLORS[plan.tier]}`}>{plan.name}</h3>
                <span className="text-xs bg-dark-700 px-2 py-1 rounded text-dark-400">{plan.tier}</span>
              </div>
              <p className="text-2xl font-bold text-white mb-2">
                ${plan.monthly_price}<span className="text-sm text-dark-400">/mo</span>
              </p>
              <div className="space-y-1 text-xs text-dark-400">
                <p>{plan.max_users} users</p>
                <p>{plan.max_clients} clients</p>
                <p>{plan.max_visits_per_month} visits/mo</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-dark-800 rounded-lg p-1">
            {['all', 'active', 'trial', 'past_due', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'
                }`}
              >
                {f === 'past_due' ? 'Past Due' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search businesses..."
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left p-4 text-dark-400 font-medium">Business</th>
                <th className="text-left p-4 text-dark-400 font-medium">Plan</th>
                <th className="text-left p-4 text-dark-400 font-medium">Status</th>
                <th className="text-left p-4 text-dark-400 font-medium">Billing</th>
                <th className="text-left p-4 text-dark-400 font-medium">Usage</th>
                <th className="text-left p-4 text-dark-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-dark-400">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                subscriptions
                  .filter(s => !search || s.business_name.toLowerCase().includes(search.toLowerCase()))
                  .map(sub => (
                    <tr key={sub.id} className="border-b border-dark-700 hover:bg-dark-700/30">
                      <td className="p-4">
                        <p className="text-white font-medium">{sub.business_name}</p>
                        <p className="text-dark-400 text-xs">{new Date(sub.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4">
                        <span className={`font-medium ${TIER_COLORS[sub.plan_tier] || 'text-white'}`}>
                          {sub.plan_name}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-white text-sm capitalize">{sub.billing_cycle}</p>
                        {sub.current_period_end && (
                          <p className="text-dark-400 text-xs">
                            Renews {new Date(sub.current_period_end).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-white text-sm">{sub.visits_this_month} visits</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {sub.status === 'active' && (
                            <button
                              onClick={() => updateSubscriptionStatus(sub.id, 'suspended')}
                              className="p-1.5 hover:bg-dark-600 rounded text-orange-400"
                              title="Suspend"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                          {sub.status === 'suspended' && (
                            <button
                              onClick={() => updateSubscriptionStatus(sub.id, 'active')}
                              className="p-1.5 hover:bg-dark-600 rounded text-green-400"
                              title="Reactivate"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {sub.status !== 'cancelled' && (
                            <button
                              onClick={() => updateSubscriptionStatus(sub.id, 'cancelled')}
                              className="p-1.5 hover:bg-dark-600 rounded text-red-400"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
