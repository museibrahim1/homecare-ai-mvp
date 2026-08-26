'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import GlassRail from '@/components/GlassRail';
import PaperHomeDashboard from '@/components/glass/PaperHomeDashboard';
import { format } from 'date-fns';

const PalmAgent = dynamic(() => import('@/components/PalmAgent'), {
  ssr: false,
  loading: () => null,
});

interface DashboardVisit {
  id: string;
  created_at?: string;
  scheduled_start?: string;
  status?: string;
  client_name?: string;
  client?: { full_name?: string };
  contract_status?: string;
}

interface DashboardClient {
  id: string;
  full_name: string;
  status?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, isReady, user } = useRequireAuth();
  const [stats, setStats] = useState({
    totalVisits: 0,
    pendingReview: 0,
    totalClients: 0,
    hoursThisWeek: 0,
  });
  const [recentVisits, setRecentVisits] = useState<DashboardVisit[]>([]);
  const [allVisits, setAllVisits] = useState<DashboardVisit[]>([]);
  const [allClients, setAllClients] = useState<DashboardClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        // Parallel fetch; skip usage analytics (not shown on home) for faster first paint
        const [visitsData, clientsData] = await Promise.all([
          api.getVisits(token),
          api.getClients(token),
        ]);
        if (cancelled) return;

        const items: DashboardVisit[] = visitsData?.items || [];
        const clients: DashboardClient[] = Array.isArray(clientsData) ? clientsData : [];
        setAllVisits(items);
        setAllClients(clients);

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekCount = items.filter(
          (v) => new Date(v.created_at || v.scheduled_start || 0) >= weekAgo
        ).length;
        const proposalList = clients.filter((c) => c.status === 'proposal');

        setStats({
          totalVisits: visitsData?.total || 0,
          pendingReview: proposalList.length,
          totalClients: clients.length,
          hoursThisWeek: thisWeekCount,
        });
        setRecentVisits(items.slice(0, 6));
        api.trackUsageEvent(token, { event_type: 'login', page_path: '/dashboard' }).catch(() => {});
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = allVisits.filter((v) => {
        const c = new Date(v.created_at || 0);
        return c >= d && c <= monthEnd;
      }).length;
      months.push({ label: format(d, 'MMM'), value: count });
    }
    return months;
  }, [allVisits]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = (user?.full_name || 'there').split(' ')[0];
  const needsReviewVisits = recentVisits
    .filter(
      (v) =>
        ['completed', 'pending_review', 'ready', 'processed'].includes((v.status || '').toLowerCase()) ||
        Boolean(v.contract_status)
    )
    .slice(0, 3);

  const reviewItems = (needsReviewVisits.length ? needsReviewVisits : recentVisits.slice(0, 1)).map(
    (v) => {
      const name = v.client_name || v.client?.full_name || 'Client';
      const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return {
        id: v.id,
        name,
        initials: initials || 'CL',
        subtitle: v.scheduled_start
          ? `Visit from ${format(new Date(v.scheduled_start), 'MMMM d')}`
          : 'Ready for your review',
        badge: v.status === 'completed' ? 'Ready' : undefined,
        href: `/visits/${v.id}`,
      };
    }
  );

  const dueThisWeek = allVisits.filter((v) => {
    if (!v.scheduled_start) return false;
    const d = new Date(v.scheduled_start);
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= now && d <= weekEnd;
  });
  const dueHint =
    dueThisWeek[0]?.client_name
      ? `${dueThisWeek[0].client_name.split(' ')[0]} soon`
      : 'No visits scheduled';

  const paperPipeline = [
    {
      label: 'Active',
      value: allClients.filter((c) => ['active', 'assigned'].includes(c.status || 'active')).length,
      color: '#0D9488',
    },
    {
      label: 'Proposal sent',
      value: allClients.filter((c) => ['proposal', 'pending_review'].includes(c.status || '')).length,
      color: '#F59E0B',
    },
    {
      label: 'In assessment',
      value: allClients.filter((c) => c.status === 'assessment').length,
      color: '#7C3AED',
    },
  ];

  const topReviewName = reviewItems[0]?.name;
  const greetingSub =
    reviewItems.length > 0
      ? reviewItems.length === 1
        ? 'One visit is ready for your review.'
        : `${reviewItems.length} visits are ready for your review.`
      : 'Record a visit when you are ready.';

  const paperDocs =
    reviewItems.length > 0
      ? [
          { title: 'Care plan', status: 'Ready', statusTone: 'ready' as const },
          { title: 'Billables', status: 'From visit', statusTone: 'muted' as const },
          { title: 'Visit note', status: 'Ready', statusTone: 'ready' as const },
          { title: 'Service agreement', status: 'Draft', statusTone: 'warn' as const },
        ]
      : [];

  return (
    <>
      <div className="flex min-h-dvh glass-page">
        <GlassRail />
        <div className="flex-1 min-w-0 flex flex-col relative overflow-x-hidden overflow-y-auto">
          {error && (
            <div className="mx-4 sm:mx-6 lg:mx-10 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 relative z-10">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-red-600 text-sm flex-1">{error}</p>
              <button type="button" onClick={() => setError(null)} className="text-red-500 text-xs underline">
                Dismiss
              </button>
            </div>
          )}
          <PaperHomeDashboard
            loading={loading}
            firstName={firstName}
            greetingSub={greetingSub}
            stats={[
              {
                label: 'Clients',
                value: stats.totalClients,
                hint: stats.totalClients === 0 ? 'Add your first client' : 'All active',
              },
              {
                label: 'Due this week',
                value: dueThisWeek.length || stats.hoursThisWeek,
                hint: dueHint,
              },
              {
                label: 'Needs review',
                value: Math.max(reviewItems.length, stats.pendingReview),
                hint: topReviewName || 'Nothing waiting',
                accent: true,
              },
            ]}
            trend={monthlyData}
            pipeline={paperPipeline}
            reviewItems={reviewItems}
            docs={paperDocs}
            docsLabel={
              topReviewName
                ? `FROM ${topReviewName.split(' ')[0].toUpperCase()}'S VISIT · FOUR DOCUMENTS, ONE RECORDING`
                : 'FOUR DOCUMENTS, ONE RECORDING'
            }
            onPalmIt={() => router.push('/visits/new')}
          />
        </div>
      </div>
      <PalmAgent />
    </>
  );
}
