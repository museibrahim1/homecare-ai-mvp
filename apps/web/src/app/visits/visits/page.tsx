'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Clock, User, Users, ChevronRight, Plus, Filter, Search, Mic, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function VisitsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !token) router.push('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      setLoading(true);
      api.getVisits(token, { status: statusFilter || undefined }).then(r => setVisits(r.items)).finally(() => setLoading(false));
    }
  }, [token, statusFilter]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      scheduled: { bg: 'bg-dark-600', text: 'text-dark-200', icon: Timer, label: 'Scheduled' },
      in_progress: { bg: 'bg-primary-500/20', text: 'text-primary-400', icon: Mic, label: 'In Progress' },
      pending_review: { bg: 'bg-accent-orange/20', text: 'text-accent-orange', icon: AlertCircle, label: 'Pending Review' },
      approved: { bg: 'bg-accent-green/20', text: 'text-accent-green', icon: CheckCircle, label: 'Approved' },
    };
    return configs[status] || configs.scheduled;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-dark-900"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div><h1 className="text-3xl font-bold text-white mb-2">Visits</h1><p className="text-dark-300">Review and manage visits</p></div>
            <button onClick={() => router.push('/visits/new')} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />New Visit</button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total', value: visits.length, color: 'white' },
              { label: 'Pending', value: visits.filter(v => v.status === 'pending_review').length, color: 'accent-orange' },
              { label: 'Approved', value: visits.filter(v => v.status === 'approved').length, color: 'accent-green' },
              { label: 'Today', value: visits.filter(v => v.scheduled_start && new Date(v.scheduled_start).toDateString() === new Date().toDateString()).length, color: 'accent-cyan' },
            ].map((s, i) => <div key={i} className="card p-5"><p className="text-dark-400 text-sm mb-1">{s.label}</p><p className={`text-3xl font-bold text-${s.color}`}>{s.value}</p></div>)}
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-dark w-full pl-12" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-dark-400" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-dark min-w-[180px]">
                <option value="">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="card p-12 text-center"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : visits.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-dark-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">No visits found</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map(visit => {
                const cfg = getStatusConfig(visit.status);
                return (
                  <div key={visit.id} onClick={() => router.push(`/visits/${visit.id}`)} className="card card-hover p-5 cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center`}><cfg.icon className={`w-6 h-6 ${cfg.text}`} /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-white">{visit.client?.full_name || 'Unknown'}</h3>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-5 text-sm text-dark-400">
                          <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{visit.scheduled_start ? format(new Date(visit.scheduled_start), 'MMM d, yyyy') : 'Not scheduled'}</div>
                          <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{visit.scheduled_start ? format(new Date(visit.scheduled_start), 'h:mm a') : '-'}</div>
                          <div className="flex items-center gap-1.5"><User className="w-4 h-4" />{visit.caregiver?.full_name || 'Unassigned'}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
