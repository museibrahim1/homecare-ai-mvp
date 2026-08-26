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
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  uploaded: { label: 'Uploaded', className: 'bg-blue-50 text-blue-700' },
  processing: { label: 'Processing', className: 'bg-sky-50 text-sky-700' },
  in_progress: { label: 'In Progress', className: 'bg-primary-50 text-primary-600' },
  pending_review: { label: 'Pending Review', className: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
  exported: { label: 'Exported', className: 'bg-purple-50 text-purple-700' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700' },
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
      <div className="glass-card p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-12 h-12 bg-white/70 rounded-xl flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">No assessments yet</h3>
        <p className="text-sm text-slate-500 mb-3">Record a visit to generate care plans, billables and contracts.</p>
        <button onClick={() => router.push('/visits/new')} className="glass-btn-primary h-9 text-sm mx-auto">
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/70">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">Assessments</h2>
          <span className="text-xs text-slate-500">{visits.length} total</span>
        </div>
        <button onClick={() => router.push('/visits/new')} className="glass-btn-primary h-8 text-xs">
          <Plus className="w-3.5 h-3.5" />
          New Assessment
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem_8.5rem_1.25rem] items-center gap-3 px-4 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-white/60">
        <div>Client</div>
        <div>Stage</div>
        <div>Date</div>
        <div />
      </div>

      <div>
        {visits.map((visit) => {
          const statusKey = (visit.status || '').toLowerCase();
          const stage = STAGE_LABELS[statusKey] || {
            label: visit.status ? visit.status.replace(/_/g, ' ') : 'Unknown',
            className: 'bg-slate-100 text-slate-600',
          };
          return (
            <button
              key={visit.id}
              onClick={() => router.push(`/visits/${visit.id}`)}
              className="w-full grid grid-cols-[minmax(0,1fr)_7.5rem_8.5rem_1.25rem] items-center gap-3 px-4 py-2.5 text-left border-b border-white/50 hover:bg-white/70 hover:shadow-[inset_3px_0_0_#0D9488] transition-all duration-150 group"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate">
                  {visit.client?.full_name || 'Unknown Client'}
                </p>
                {visit.caregiver?.full_name && (
                  <p className="text-[11px] text-slate-500 truncate">{visit.caregiver.full_name}</p>
                )}
              </div>
              <div>
                <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium capitalize ${stage.className}`}>
                  {stage.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {visit.scheduled_start ? format(new Date(visit.scheduled_start), 'MMM d, yyyy') : 'Not scheduled'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
