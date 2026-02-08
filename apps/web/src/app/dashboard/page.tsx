'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, Calendar, Users, Clock, TrendingUp, ChevronRight, CheckCircle, AlertCircle,
  FileSignature, UserCheck, UserX, Loader2, FileText
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import { format } from 'date-fns';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function DashboardPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalVisits: 0, pendingReview: 0, totalClients: 0, hoursThisWeek: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [proposalClients, setProposalClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [visitsData, clientsData] = await Promise.all([
        api.getVisits(token!),
        api.getClients(token!),
      ]);
      // Safely extract arrays with fallback defaults
      const items = visitsData?.items || [];
      const clients = Array.isArray(clientsData) ? clientsData : [];

      // Calculate assessments this week from actual data
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisWeekCount = items.filter((v: any) => {
        const created = new Date(v.created_at || v.scheduled_start || 0);
        return created >= weekAgo;
      }).length;
      
      // Find clients with proposal status
      const proposalList = clients.filter((c: any) => c.status === 'proposal');
      setProposalClients(proposalList);
      
      setStats({
        totalVisits: visitsData?.total || 0,
        pendingReview: proposalList.length,
        totalClients: clients.length,
        hoursThisWeek: thisWeekCount,
      });
      setRecentVisits(items.slice(0, 5));
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClientAction = async (clientId: string, action: 'active' | 'follow_up') => {
    if (!token) return;
    setUpdatingClientId(clientId);
    try {
      await api.updateClient(token, clientId, { status: action });
      
      // If activating, also trigger auto-policy creation
      if (action === 'active') {
        try {
          await fetch(`${API_BASE}/clients/${clientId}/activate-policy`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          // Policy creation is best-effort
        }
      }
      
      // Remove from proposal list
      setProposalClients(prev => prev.filter(c => c.id !== clientId));
      setStats(prev => ({ ...prev, pendingReview: prev.pendingReview - 1 }));
    } catch (err) {
      console.error(`Failed to update client:`, err);
      setError('Failed to update client status. Please try again.');
    } finally {
      setUpdatingClientId(null);
    }
  };

  // Only show full loading on initial page load, not during navigation
  // Check localStorage directly for faster response
  const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('homecare-auth');
  
  if (authLoading && !hasStoredToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-2xl flex items-center justify-center animate-pulse-glow">
          <Mic className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  if (!token && !hasStoredToken) return null;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      {/* Main content - add left padding on mobile for menu button */}
      <main className="flex-1 p-4 pt-16 lg:pt-4 lg:p-8 min-w-0">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-dark-300 text-sm lg:text-base">Care assessments in, proposal-ready contracts out.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm underline">Dismiss</button>
            </div>
          )}

          {/* Onboarding Checklist - shows for new users */}
          <OnboardingChecklist />

          {/* Stats Grid - responsive: 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
            {[
              { label: 'Total Assessments', value: stats.totalVisits, icon: Calendar, color: 'primary' },
              { label: 'Pending Proposals', value: stats.pendingReview, icon: AlertCircle, color: 'orange' },
              { label: 'Total Clients', value: stats.totalClients, icon: Users, color: 'green' },
              { label: 'Assessments This Week', value: stats.hoursThisWeek, icon: Clock, color: 'cyan' },
            ].map((stat, i) => (
              <div key={i} className="card p-3 lg:p-5">
                <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                  <div className={`w-8 h-8 lg:w-10 lg:h-10 bg-accent-${stat.color}/20 rounded-lg lg:rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 lg:w-5 lg:h-5 text-accent-${stat.color}`} />
                  </div>
                </div>
                <p className="text-dark-400 text-xs lg:text-sm mb-1 truncate">{stat.label}</p>
                <p className={`text-xl lg:text-3xl font-bold text-accent-${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Proposal Follow-Up Widget */}
          {proposalClients.length > 0 && (
            <div className="card p-4 lg:p-6 mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <FileSignature className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Proposal Follow-Up</h2>
                    <p className="text-dark-400 text-sm">{proposalClients.length} client{proposalClients.length !== 1 ? 's' : ''} awaiting response</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/clients')}
                  className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {proposalClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-dark-700/30 rounded-xl border border-dark-700/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-400 font-bold text-sm">
                          {(client.full_name || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{client.full_name}</p>
                        <p className="text-dark-400 text-sm">Proposal sent {client.updated_at ? format(new Date(client.updated_at), 'MMM d, yyyy') : 'recently'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2.5 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium">
                        Awaiting Signature
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleClientAction(client.id, 'active')}
                        disabled={updatingClientId === client.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                      >
                        {updatingClientId === client.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                        Signed & Active
                      </button>
                      <button
                        onClick={() => handleClientAction(client.id, 'follow_up')}
                        disabled={updatingClientId === client.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        Declined
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Grid - stack on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Recent Assessments - full width on mobile, 2/3 on desktop */}
            <div className="lg:col-span-2 card p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base lg:text-lg font-semibold text-white">Recent Assessments</h2>
                <button onClick={() => router.push('/visits')} className="text-primary-400 text-xs lg:text-sm hover:text-primary-300 flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {loading ? (
                <div className="text-center py-6 lg:py-8">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : recentVisits.length === 0 ? (
                <div className="text-center py-6 lg:py-8 text-dark-400 text-sm">No assessments yet</div>
              ) : (
                <div className="space-y-2 lg:space-y-3">
                  {recentVisits.map((visit) => (
                    <div key={visit.id} onClick={() => router.push(`/visits/${visit.id}`)} className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg lg:rounded-xl bg-dark-700/30 hover:bg-dark-700/50 cursor-pointer transition">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0 ${visit.status === 'approved' ? 'bg-accent-green/20' : 'bg-accent-orange/20'}`}>
                        {visit.status === 'approved' ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-accent-green" /> : <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-accent-orange" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm lg:text-base truncate">{visit.client?.full_name || 'Unknown'}</p>
                        <p className="text-dark-400 text-xs lg:text-sm">{visit.scheduled_start ? format(new Date(visit.scheduled_start), 'MMM d, h:mm a') : 'Not scheduled'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] lg:text-xs flex-shrink-0 ${visit.status === 'approved' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-orange/20 text-accent-orange'}`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions - full width on mobile, 1/3 on desktop */}
            <div className="card p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4">Quick Actions</h2>
              <div className="space-y-2 lg:space-y-3">
                {[
                  { label: 'New Assessment', desc: 'Start a new intake/visit', icon: Calendar, href: '/visits/new', color: 'primary' },
                  { label: 'Add Client', desc: 'Register new client', icon: Users, href: '/clients', color: 'green' },
                  { label: 'Export Proposals', desc: 'View & export contracts', icon: TrendingUp, href: '/proposals', color: 'cyan' },
                ].map((action, i) => (
                  <button key={i} onClick={() => router.push(action.href)} className="w-full p-3 lg:p-4 bg-dark-700/50 hover:bg-dark-700 rounded-lg lg:rounded-xl text-left transition group">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 bg-accent-${action.color}/20 rounded-lg lg:rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <action.icon className={`w-4 h-4 lg:w-5 lg:h-5 text-accent-${action.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm lg:text-base">{action.label}</p>
                        <p className="text-dark-400 text-xs lg:text-sm truncate">{action.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
