'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, Calendar, Users, Clock, TrendingUp, ChevronRight, CheckCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalVisits: 0, pendingReview: 0, totalClients: 0, hoursThisWeek: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      setStats({
        totalVisits: visitsData.total,
        pendingReview: visitsData.items.filter((v: any) => v.status === 'pending_review').length,
        totalClients: clientsData.length,
        hoursThisWeek: 24,
      });
      setRecentVisits(visitsData.items.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-2xl flex items-center justify-center animate-pulse-glow">
          <Mic className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-dark-300">Care assessments in, proposal-ready contracts out.</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Assessments', value: stats.totalVisits, icon: Calendar, color: 'primary' },
              { label: 'Pending Proposals', value: stats.pendingReview, icon: AlertCircle, color: 'orange' },
              { label: 'Total Clients', value: stats.totalClients, icon: Users, color: 'green' },
              { label: 'Assessments This Week', value: stats.hoursThisWeek, icon: Clock, color: 'cyan' },
            ].map((stat, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 bg-accent-${stat.color}/20 rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 text-accent-${stat.color}`} />
                  </div>
                </div>
                <p className="text-dark-400 text-sm mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold text-accent-${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Assessments</h2>
                <button onClick={() => router.push('/visits')} className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : recentVisits.length === 0 ? (
                <div className="text-center py-8 text-dark-400">No assessments yet</div>
              ) : (
                <div className="space-y-3">
                  {recentVisits.map((visit) => (
                    <div key={visit.id} onClick={() => router.push(`/visits/${visit.id}`)} className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 cursor-pointer transition">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${visit.status === 'approved' ? 'bg-accent-green/20' : 'bg-accent-orange/20'}`}>
                        {visit.status === 'approved' ? <CheckCircle className="w-5 h-5 text-accent-green" /> : <AlertCircle className="w-5 h-5 text-accent-orange" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{visit.client?.full_name || 'Unknown'}</p>
                        <p className="text-dark-400 text-sm">{visit.scheduled_start ? format(new Date(visit.scheduled_start), 'MMM d, h:mm a') : 'Not scheduled'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs ${visit.status === 'approved' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-orange/20 text-accent-orange'}`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {[
                  { label: 'New Assessment', desc: 'Start a new intake/visit', icon: Calendar, href: '/visits/new', color: 'primary' },
                  { label: 'Add Client', desc: 'Register new client', icon: Users, href: '/clients', color: 'green' },
                  { label: 'Export Proposals', desc: 'Download contracts/PDFs', icon: TrendingUp, href: '/reports', color: 'cyan' },
                ].map((action, i) => (
                  <button key={i} onClick={() => router.push(action.href)} className="w-full p-4 bg-dark-700/50 hover:bg-dark-700 rounded-xl text-left transition group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-accent-${action.color}/20 rounded-xl flex items-center justify-center`}>
                        <action.icon className={`w-5 h-5 text-accent-${action.color}`} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{action.label}</p>
                        <p className="text-dark-400 text-sm">{action.desc}</p>
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
