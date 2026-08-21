'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, ChevronRight, ClipboardList, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { Visit } from '@/lib/types';

const STAGE_LABELS: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', className: 'bg-primary-50 text-primary-600' },
  pending_review: { label: 'Pending Review', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  exported: { label: 'Exported', className: 'bg-purple-50 text-purple-700' },
};

/**
 * Read-only summary of assessment visits shown as the Assessments tab on the
 * Clients page. The full assessment workspace still lives at /visits; this table
 * links each row through to its detail page.
 */
export default function AssessmentsPanel() {
  const router = useRouter();
  const { token } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.getVisits(token);
        setVisits(response.items || []);
      } catch {
        // Leave list empty on failure
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 bg-white/70 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No assessments yet</h3>
        <p className="text-slate-500 mb-4">Record a visit to generate care plans, billables and contracts.</p>
        <button onClick={() => router.push('/visits/new')} className="glass-btn-primary">
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/70">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Assessments</h2>
          <span className="text-sm text-slate-500">{visits.length} total</span>
        </div>
        <button onClick={() => router.push('/visits/new')} className="glass-btn-primary h-9 text-sm">
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>

      <div className="flex items-center gap-4 px-5 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-white/60">
        <div className="flex-1">Client</div>
        <div className="w-36">Stage</div>
        <div className="w-40">Date</div>
        <div className="w-6" />
      </div>

      <div>
        {visits.map((visit) => {
          const stage = STAGE_LABELS[visit.status] || { label: visit.status || 'Unknown', className: 'bg-slate-100 text-slate-600' };
          return (
            <button
              key={visit.id}
              onClick={() => router.push(`/visits/${visit.id}`)}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-left border-b border-white/50 hover:bg-white/60 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{visit.client?.full_name || 'Unknown Client'}</p>
                {visit.caregiver?.full_name && (
                  <p className="text-xs text-slate-500 truncate">{visit.caregiver.full_name}</p>
                )}
              </div>
              <div className="w-36">
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${stage.className}`}>{stage.label}</span>
              </div>
              <div className="w-40 flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar className="w-4 h-4" />
                {visit.scheduled_start ? format(new Date(visit.scheduled_start), 'MMM d, yyyy') : 'Not scheduled'}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
