'use client';

import Link from 'next/link';
import { ArrowRight, LayoutGrid, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type Stat = { label: string; value: string | number; hint: string; accent?: boolean };
type TrendPoint = { label: string; value: number };
type PipelineSeg = { label: string; value: number; color: string };
type ReviewItem = {
  id: string;
  name: string;
  initials: string;
  subtitle: string;
  badge?: string;
  href: string;
};
type DocPreview = {
  title: string;
  status: string;
  statusTone: 'ready' | 'muted' | 'warn';
};

type Props = {
  loading?: boolean;
  firstName: string;
  greetingSub: string;
  stats: Stat[];
  trend: TrendPoint[];
  pipeline: PipelineSeg[];
  reviewItems: ReviewItem[];
  docs: DocPreview[];
  docsLabel: string;
  onCustomize?: () => void;
  onPalmIt?: () => void;
};

function initialsColor(initials: string) {
  const colors = ['#F59E0B', '#0D9488', '#7C3AED', '#0891B2', '#DC2626'];
  return colors[initials.charCodeAt(0) % colors.length];
}

function barHeight(value: number, max: number) {
  if (max <= 0) return 24;
  return Math.max(24, Math.round((value / max) * 120));
}

function donutDash(segments: PipelineSeg[]) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const circ = 2 * Math.PI * 48;
  let offset = 0;
  return segments.map((seg) => {
    const len = (seg.value / total) * circ;
    const item = { ...seg, dash: `${len} ${circ}`, offset: -offset };
    offset += len;
    return item;
  });
}

/** Paper Web Glass Home main column (artboard Home). */
export default function PaperHomeDashboard({
  loading,
  firstName,
  greetingSub,
  stats,
  trend,
  pipeline,
  reviewItems,
  docs,
  docsLabel,
  onCustomize,
  onPalmIt,
}: Props) {
  const dateLine = format(new Date(), 'EEEE, MMMM d').toUpperCase();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const maxTrend = Math.max(...trend.map((t) => t.value), 1);
  const donut = donutDash(pipeline.filter((p) => p.value > 0));
  const barColors = ['#99F6E4', '#5EEAD4', '#99F6E4', '#2DD4BF', '#14B8A6', '#0D9488'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-w-0 flex flex-col py-8 lg:py-11 px-5 sm:px-8 lg:px-12 gap-8 overflow-x-hidden">
      <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-8 relative min-w-0">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute -top-[120px] right-0 w-[min(420px,50vw)] h-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle farthest-corner at 50% 50%, rgba(45,212,191,0.28) 0%, rgba(45,212,191,0) 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-[140px] left-0 w-[min(340px,40vw)] h-[340px] rounded-full"
        style={{
          background:
            'radial-gradient(circle farthest-corner at 50% 50%, rgba(13,148,136,0.16) 0%, rgba(13,148,136,0) 70%)',
        }}
      />

      {onCustomize && (
        <button
          type="button"
          onClick={onCustomize}
          className="absolute top-0 right-0 z-10 flex items-center h-10 px-4 rounded-full gap-2 bg-[#FFFFFFB8] border border-[#FFFFFFE0] shadow-[0_8px_22px_#0D948812] text-sm font-semibold text-primary-500 hover:bg-white"
        >
          <LayoutGrid className="w-4 h-4" />
          Customize
        </button>
      )}

      {/* Greeting */}
      <div className="relative flex flex-col gap-2 pr-28">
        <p className="text-xs tracking-[0.1em] font-semibold text-primary-500">{dateLine}</p>
        <h1 className="text-[32px] sm:text-[42px] tracking-tight leading-tight font-bold text-[#10211F]">
          {hello}, {firstName}
        </h1>
        <p className="text-base font-medium leading-5 text-[#4B6B66]">{greetingSub}</p>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col p-6 rounded-3xl gap-1.5 bg-[#FFFFFFA8] border border-[#FFFFFFE0] shadow-[0_12px_32px_#0D948817] backdrop-blur-xl"
          >
            <div className="text-[13px] tracking-[0.04em] font-semibold text-slate-500">{s.label}</div>
            <div
              className={`text-[44px] tracking-tight leading-[48px] font-bold ${
                s.accent ? 'text-primary-500' : 'text-[#10211F]'
              }`}
            >
              {s.value}
            </div>
            <div className="text-[13px] font-medium text-[#4B6B66]">{s.hint}</div>
          </div>
        ))}
      </div>

      {/* Analytics */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col p-5 rounded-[20px] gap-4 bg-[#FFFFFFB3] border border-[#FFFFFFE0] shadow-[0_10px_26px_#0D948814] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#10211F]">Assessments Trend</span>
            <span className="text-xs font-medium text-[#4B6B66]">Last 6 months</span>
          </div>
          <div className="flex items-end h-[140px] pt-2 gap-2 sm:gap-3 w-full overflow-hidden">
            {trend.map((t, i) => (
              <div key={t.label} className="flex flex-col items-center flex-1 min-w-0 gap-2">
                <div
                  className="w-full max-w-9 mx-auto rounded-sm shrink-0"
                  style={{
                    height: barHeight(t.value, maxTrend),
                    backgroundColor: barColors[i % barColors.length],
                  }}
                />
                <span
                  className={`text-xs font-medium truncate max-w-full ${
                    i === trend.length - 1 ? 'text-[#10211F]' : 'text-[#4B6B66]'
                  }`}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col p-5 rounded-[20px] gap-4 bg-[#FFFFFFB3] border border-[#FFFFFFE0] shadow-[0_10px_26px_#0D948814] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#10211F]">Pipeline Breakdown</span>
            <Link href="/clients" className="text-xs font-medium text-primary-500 hover:underline">
              View clients
            </Link>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0" aria-hidden>
              <circle cx="66" cy="66" r="48" fill="none" stroke="#CCFBF1" strokeWidth="16" />
              {donut.map((d) => (
                <circle
                  key={d.label}
                  cx="66"
                  cy="66"
                  r="48"
                  transform="rotate(-90 66 66)"
                  fill="none"
                  stroke={d.color}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={d.dash}
                  strokeDashoffset={d.offset}
                />
              ))}
            </svg>
            <div className="flex flex-col gap-2.5 min-w-0 flex-1">
              {pipeline.map((p) => (
                <div key={p.label} className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-[13px] flex-1 min-w-0 truncate font-medium text-[#4B6B66]">
                    {p.label}
                  </span>
                  <span className="text-[13px] font-semibold text-[#10211F] shrink-0">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Palm It Now */}
      <button
        type="button"
        onClick={onPalmIt}
        className="relative flex items-center py-[30px] px-6 sm:px-8 rounded-[28px] gap-4 sm:gap-[22px] text-left shadow-[0_20px_44px_#0D948852] bg-gradient-to-br from-[#0F766E] via-[#0D9488] to-[#14B8A6] hover:brightness-105 transition"
      >
        <div className="w-14 h-14 shrink-0 flex items-end justify-center gap-1 pb-2" aria-hidden>
          <span className="w-1 h-4 rounded-sm bg-white" />
          <span className="w-1 h-[30px] rounded-sm bg-white" />
          <span className="w-1 h-11 rounded-sm bg-white" />
          <span className="w-1 h-6 rounded-sm bg-white" />
          <span className="w-1 h-9 rounded-sm bg-white" />
          <span className="w-1 h-3.5 rounded-sm bg-white" />
        </div>
        <div className="flex flex-col flex-1 gap-1 min-w-0">
          <span className="text-xl sm:text-2xl tracking-[-0.02em] font-bold text-white">Palm It Now</span>
          <span className="text-sm sm:text-[15px] leading-snug font-medium text-white/85">
            Record the visit and Palm writes the care plan, the billables, and the contract.
          </span>
        </div>
        <span className="w-[52px] h-[52px] shrink-0 flex items-center justify-center rounded-full bg-white/18">
          <ArrowRight className="w-5 h-5 text-white" />
        </span>
      </button>

      {/* Needs review */}
      <div className="relative flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-[0.1em] font-semibold text-slate-500">NEEDS REVIEW</span>
          <Link href="/visits" className="text-sm font-semibold text-primary-500 hover:underline">
            View all visits
          </Link>
        </div>
        {reviewItems.length === 0 ? (
          <div className="py-8 px-6 rounded-3xl bg-[#FFFFFFB3] border border-[#FFFFFFE0] text-sm text-[#4B6B66]">
            Nothing waiting on you right now.
          </div>
        ) : (
          reviewItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center py-5 px-[22px] rounded-3xl gap-4 bg-[#FFFFFFB3] border border-[#FFFFFFE0] shadow-[0_14px_34px_#0D94881A] backdrop-blur-xl hover:bg-white/90 transition"
            >
              <span className="w-1 h-[52px] shrink-0 rounded-sm bg-primary-500" />
              <span
                className="w-[52px] h-[52px] shrink-0 flex items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: initialsColor(item.initials) }}
              >
                {item.initials}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-lg tracking-[-0.02em] font-semibold text-[#10211F] truncate">
                  {item.name}
                </span>
                <span className="text-sm font-medium text-[#4B6B66] truncate">{item.subtitle}</span>
              </div>
              <div className="flex items-center shrink-0 gap-3">
                {item.badge && (
                  <span className="hidden sm:inline-flex items-center h-7 px-3 rounded-[10px] bg-[#0D94881A] text-[13px] font-semibold text-[#0F766E]">
                    {item.badge}
                  </span>
                )}
                <span className="inline-flex items-center h-10 px-5 rounded-full bg-primary-500 text-sm font-semibold text-white">
                  Review
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Doc previews */}
      {docs.length > 0 && (
        <div className="relative flex flex-col gap-3.5 pb-4">
          <span className="text-xs tracking-[0.1em] font-semibold text-slate-500">{docsLabel}</span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {docs.map((d) => (
              <div
                key={d.title}
                className="flex flex-col p-[18px] rounded-[20px] gap-3 bg-[#FFFFFFA3] border border-[#FFFFFFE0] shadow-[0_10px_26px_#0D948814] backdrop-blur-xl"
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#0D94881F] text-primary-500 text-sm font-bold">
                  {d.title.slice(0, 1)}
                </div>
                <div className="text-[15px] font-semibold text-[#10211F]">{d.title}</div>
                <div
                  className={`text-[13px] font-medium ${
                    d.statusTone === 'ready'
                      ? 'text-emerald-600'
                      : d.statusTone === 'warn'
                        ? 'text-amber-600'
                        : 'text-[#4B6B66]'
                  }`}
                >
                  {d.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
