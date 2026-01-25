'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalVisits: 0,
    pendingReview: 0,
    totalClients: 0,
    hoursThisWeek: 0,
  });
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
        hoursThisWeek: 24, // Placeholder
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

  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-dark-300">Welcome back! Here's your overview.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-400" />
                </div>
              </div>
              <p className="text-dark-400 text-sm mb-1">Total Visits</p>
              <p className="text-3xl font-bold text-white">{stats.totalVisits}</p>
            </div>
            
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-orange/20 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-accent-orange" />
                </div>
              </div>
              <p className="text-dark-400 text-sm mb-1">Pending Review</p>
              <p className="text-3xl font-bold text-accent-orange">{stats.pendingReview}</p>
            </div>
            
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent-green" />
                </div>
              </div>
              <p className="text-dark-400 text-sm mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-accent-green">{stats.totalClients}</p>
            </div>
            
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-cyan/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent-cyan" />
                </div>
              </div>
              <p className="text-dark-400 text-sm mb-1">Hours This Week</p>
              <p className="text-3xl font-bold text-accent-cyan">{stats.hoursThisWeek}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Recent Visits */}
            <div className="col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Visits</h2>
                <button 
                  onClick={() => router.push('/visits')}
                  className="text-primary-400 text-sm hover:text-primary-300 transition flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : recentVisits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-dark-400">No visits yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentVisits.map((visit) => (
                    <div
                      key={visit.id}
                      onClick={() => router.push(`/visits/${visit.id}`)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 cursor-pointer transition"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        visit.status === 'pending_review' 
                          ? 'bg-accent-orange/20' 
                          : visit.status === 'approved'
                          ? 'bg-accent-green/20'
                          : 'bg-dark-600'
                      }`}>
                        {visit.status === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-accent-green" />
                        ) : visit.status === 'pending_review' ? (
                          <AlertCircle className="w-5 h-5 text-accent-orange" />
                        ) : (
                          <Calendar className="w-5 h-5 text-dark-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{visit.client?.full_name || 'Unknown'}</p>
                        <p className="text-dark-400 text-sm">
                          {visit.scheduled_start 
                            ? format(new Date(visit.scheduled_start), 'MMM d, h:mm a')
                            : 'Not scheduled'
                          }
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs ${
                        visit.status === 'pending_review' 
                          ? 'bg-accent-orange/20 text-accent-orange' 
                          : visit.status === 'approved'
                          ? 'bg-accent-green/20 text-accent-green'
                          : 'bg-dark-600 text-dark-300'
                      }`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/visits')}
                  className="w-full p-4 bg-dark-700/50 hover:bg-dark-700 rounded-xl text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center group-hover:bg-primary-500/30 transition">
                      <Calendar className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">New Visit</p>
                      <p className="text-dark-400 text-sm">Create a new visit</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => router.push('/clients')}
                  className="w-full p-4 bg-dark-700/50 hover:bg-dark-700 rounded-xl text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center group-hover:bg-accent-green/30 transition">
                      <Users className="w-5 h-5 text-accent-green" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Add Client</p>
                      <p className="text-dark-400 text-sm">Register new client</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => router.push('/reports')}
                  className="w-full p-4 bg-dark-700/50 hover:bg-dark-700 rounded-xl text-left transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-cyan/20 rounded-xl flex items-center justify-center group-hover:bg-accent-cyan/30 transition">
                      <TrendingUp className="w-5 h-5 text-accent-cyan" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Export Report</p>
                      <p className="text-dark-400 text-sm">Download reports</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
