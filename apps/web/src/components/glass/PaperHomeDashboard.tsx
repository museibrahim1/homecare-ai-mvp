'use client';

import Link from 'next/link';
import { ArrowRight, LayoutGrid, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

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
  if (max <= 0) return 18;
  return Math.max(18, Math.round((value / max) * 96));
}

function donutDash(segments: PipelineSeg[]) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const circ = 2 * Math.PI * 40;
  let offset = 0;
  return segments.map((seg) => {
    const len = (seg.value / total) * circ;
    const item = { ...seg, dash: `${len} ${circ}`, offset: -offset };
    offset += len;
    return item;
  });
}

/** Paper Web Glass Home main column (slim + motion). */
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
  const [mounted, setMounted] = useState(false);
  const [hoverBar, setHoverBar] = useState<number | null>(null);
  const [hoverSeg, setHoverSeg] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-w-0 flex flex-col pt-14 md:pt-6 lg:pt-8 pb-10 lg:pb-12 px-4 sm:px-6 lg:px-10 gap-5 overflow-x-hidden">
      <div className="w-full max-w-[1080px] mx-auto flex flex-col gap-5 relative min-w-0">
        <div
          className="pointer-events-none absolute -top-[80px] right-0 w-[min(280px,45vw)] h-[280px] rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(circle farthest-corner at 50% 50%, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0) 70%)',
          }}
        />

        {onCustomize && (
          <button
            type="button"
            onClick={onCustomize}
            className="absolute top-0 right-0 z-10 flex items-center h-8 px-3 rounded-full gap-1.5 bg-white/70 border border-white/90 shadow-sm text-xs font-semibold text-primary-600 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Customize
          </button>
        )}

        {/* Greeting */}
        <div
          className={`relative flex flex-col gap-1 pr-24 dash-reveal ${mounted ? 'dash-reveal-in' : ''}`}
          style={{ transitionDelay: '0ms' }}
        >
          <p className="text-[11px] tracking-[0.1em] font-semibold text-primary-500">{dateLine}</p>
          <h1 className="text-[26px] sm:text-[32px] tracking-tight leading-tight font-bold text-[#10211F]">
            {hello}, {firstName}
          </h1>
          <p className="text-sm font-medium leading-5 text-[#4B6B66]">{greetingSub}</p>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`group flex flex-col py-4 px-4 rounded-2xl gap-0.5 bg-white/75 border border-white/90 shadow-sm backdrop-blur-md hover:bg-white hover:shadow-[0_10px_28px_#0D948818] hover:-translate-y-0.5 hover:border-primary-200/60 transition-all duration-200 ease-out cursor-default dash-reveal ${mounted ? 'dash-reveal-in' : ''}`}
              style={{ transitionDelay: `${60 + i * 50}ms` }}
            >
              <div className="text-[11px] tracking-[0.04em] font-semibold text-slate-500 group-hover:text-primary-600 transition-colors">
                {s.label}
              </div>
              <div
                className={`text-[32px] tracking-tight leading-9 font-bold tabular-nums transition-transform duration-200 group-hover:scale-[1.03] origin-left ${
                  s.accent ? 'text-primary-500' : 'text-[#10211F]'
                }`}
              >
                {s.value}
              </div>
              <div className="text-xs font-medium text-[#4B6B66]">{s.hint}</div>
            </div>
          ))}
        </div>

        {/* Analytics */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div
            className={`flex flex-col p-4 rounded-2xl gap-3 bg-white/70 border border-white/90 shadow-sm backdrop-blur-md hover:bg-white/90 hover:shadow-[0_10px_28px_#0D948814] transition-all duration-200 dash-reveal ${mounted ? 'dash-reveal-in' : ''}`}
            style={{ transitionDelay: '220ms' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#10211F]">Assessments</span>
              <span className="text-[11px] font-medium text-[#4B6B66]">
                {hoverBar !== null ? `${trend[hoverBar].label}: ${trend[hoverBar].value}` : 'Last 6 months'}
              </span>
            </div>
            <div className="flex items-end h-[112px] pt-1 gap-2 sm:gap-2.5 w-full overflow-hidden">
              {trend.map((t, i) => {
                const h = barHeight(t.value, maxTrend);
                const active = hoverBar === i;
                return (
                  <button
                    key={t.label}
                    type="button"
                    className="flex flex-col items-center flex-1 min-w-0 gap-1.5 group/bar focus:outline-none"
                    onMouseEnter={() => setHoverBar(i)}
                    onMouseLeave={() => setHoverBar(null)}
                    onFocus={() => setHoverBar(i)}
                    onBlur={() => setHoverBar(null)}
                    aria-label={`${t.label}: ${t.value} assessments`}
                  >
                    <div className="w-full flex items-end justify-center h-[96px]">
                      <div
                        className={`w-full max-w-8 mx-auto rounded-md shrink-0 origin-bottom transition-all duration-300 ease-out ${
                          active ? 'brightness-110 shadow-[0_4px_12px_#0D948833]' : 'group-hover/bar:brightness-105'
                        }`}
                        style={{
                          height: mounted ? h : 12,
                          backgroundColor: barColors[i % barColors.length],
                          transform: active ? 'scaleY(1.06)' : 'scaleY(1)',
                          transitionDelay: mounted ? `${i * 40}ms` : '0ms',
                        }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-medium truncate max-w-full transition-colors ${
                        active || i === trend.length - 1 ? 'text-[#10211F]' : 'text-[#4B6B66]'
                      }`}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`flex flex-col p-4 rounded-2xl gap-3 bg-white/70 border border-white/90 shadow-sm backdrop-blur-md hover:bg-white/90 hover:shadow-[0_10px_28px_#0D948814] transition-all duration-200 dash-reveal ${mounted ? 'dash-reveal-in' : ''}`}
            style={{ transitionDelay: '280ms' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#10211F]">Pipeline</span>
              <Link
                href="/clients"
                className="text-[11px] font-medium text-primary-500 hover:text-primary-600 hover:underline transition-colors"
              >
                View clients
              </Link>
            </div>
            <div className="flex items-center gap-4 min-w-0">
              <svg width="112" height="112" viewBox="0 0 112 112" className="shrink-0 dash-donut" aria-hidden>
                <circle cx="56" cy="56" r="40" fill="none" stroke="#CCFBF1" strokeWidth="12" />
                {donut.map((d) => (
                  <circle
                    key={d.label}
                    cx="56"
                    cy="56"
                    r="40"
                    transform="rotate(-90 56 56)"
                    fill="none"
                    stroke={d.color}
                    strokeWidth={hoverSeg === d.label ? 14 : 12}
                    strokeLinecap="round"
                    strokeDasharray={d.dash}
                    strokeDashoffset={d.offset}
                    className="transition-all duration-300 ease-out"
                    style={{
                      opacity: hoverSeg && hoverSeg !== d.label ? 0.35 : 1,
                      filter: hoverSeg === d.label ? 'drop-shadow(0 2px 4px rgba(13,148,136,0.35))' : undefined,
                    }}
                  />
                ))}
              </svg>
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                {pipeline.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`flex items-center gap-2 min-w-0 rounded-lg px-1.5 py-1 -mx-1.5 text-left transition-colors duration-150 ${
                      hoverSeg === p.label ? 'bg-primary-50/80' : 'hover:bg-slate-50'
                    }`}
                    onMouseEnter={() => setHoverSeg(p.label)}
                    onMouseLeave={() => setHoverSeg(null)}
                    onFocus={() => setHoverSeg(p.label)}
                    onBlur={() => setHoverSeg(null)}
                  >
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs flex-1 min-w-0 truncate font-medium text-[#4B6B66]">{p.label}</span>
                    <span className="text-xs font-semibold text-[#10211F] shrink-0 tabular-nums">{p.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Palm It Now */}
        <button
          type="button"
          onClick={onPalmIt}
          className={`group relative flex items-center py-4 px-5 sm:px-6 rounded-2xl gap-3 sm:gap-4 text-left shadow-[0_14px_32px_#0D948840] bg-gradient-to-br from-[#0F766E] via-[#0D9488] to-[#14B8A6] hover:brightness-105 hover:shadow-[0_18px_40px_#0D948850] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 dash-reveal ${mounted ? 'dash-reveal-in' : ''}`}
          style={{ transitionDelay: '340ms' }}
        >
          <div className="w-10 h-10 shrink-0 flex items-end justify-center gap-0.5 pb-1.5" aria-hidden>
            <span className="w-0.5 h-3 rounded-sm bg-white/90 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-0.5 h-5 rounded-sm bg-white animate-pulse" style={{ animationDelay: '120ms' }} />
            <span className="w-0.5 h-7 rounded-sm bg-white animate-pulse" style={{ animationDelay: '240ms' }} />
            <span className="w-0.5 h-4 rounded-sm bg-white/90 animate-pulse" style={{ animationDelay: '80ms' }} />
            <span className="w-0.5 h-6 rounded-sm bg-white animate-pulse" style={{ animationDelay: '200ms' }} />
          </div>
          <div className="flex flex-col flex-1 gap-0.5 min-w-0">
            <span className="text-lg sm:text-xl tracking-[-0.02em] font-bold text-white">Palm It Now</span>
            <span className="text-xs sm:text-sm leading-snug font-medium text-white/85">
              Record the visit. Palm writes the care plan, billables, and contract.
            </span>
          </div>
          <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white/18 group-hover:bg-white/28 group-hover:translate-x-0.5 transition-all duration-200">
            <ArrowRight className="w-4 h-4 text-white" />
          </span>
        </button>

        {/* Needs review */}
        <div
          className={`relative flex flex-col gap-2.5 dash-reveal ${mounted ? 'dash-reveal-in' : ''}`}
          style={{ transitionDelay: '400ms' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.1em] font-semibold text-slate-500">NEEDS REVIEW</span>
            <Link href="/visits" className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline transition-colors">
              View all visits
            </Link>
          </div>
          {reviewItems.length === 0 ? (
            <div className="py-6 px-5 rounded-2xl bg-white/70 border border-white/90 text-sm text-[#4B6B66]">
              Nothing waiting on you right now.
            </div>
          ) : (
            reviewItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-center py-3.5 px-4 rounded-2xl gap-3 bg-white/70 border border-white/90 shadow-sm backdrop-blur-md hover:bg-white hover:shadow-[0_10px_28px_#0D948818] hover:-translate-y-0.5 hover:border-primary-200/50 transition-all duration-200"
              >
                <span className="w-0.5 h-10 shrink-0 rounded-full bg-primary-500 group-hover:h-11 transition-all" />
                <span
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: initialsColor(item.initials) }}
                >
                  {item.initials}
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[15px] tracking-[-0.01em] font-semibold text-[#10211F] truncate">
                    {item.name}
                  </span>
                  <span className="text-xs font-medium text-[#4B6B66] truncate">{item.subtitle}</span>
                </div>
                <div className="flex items-center shrink-0 gap-2">
                  {item.badge && (
                    <span className="hidden sm:inline-flex items-center h-6 px-2.5 rounded-lg bg-[#0D94881A] text-[11px] font-semibold text-[#0F766E]">
                      {item.badge}
                    </span>
                  )}
                  <span className="inline-flex items-center h-8 px-4 rounded-full bg-primary-500 text-xs font-semibold text-white group-hover:bg-primary-600 transition-colors">
                    Review
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Doc previews */}
        {docs.length > 0 && (
          <div
            className={`relative flex flex-col gap-2.5 pb-2 dash-reveal ${mounted ? 'dash-reveal-in' : ''}`}
            style={{ transitionDelay: '460ms' }}
          >
            <span className="text-[11px] tracking-[0.1em] font-semibold text-slate-500">{docsLabel}</span>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {docs.map((d) => (
                <div
                  key={d.title}
                  className="flex flex-col p-3.5 rounded-xl gap-2 bg-white/65 border border-white/90 shadow-sm backdrop-blur-md hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="w-7 h-7 flex items-center justify-center rounded-md bg-[#0D94881F] text-primary-500 text-xs font-bold">
                    {d.title.slice(0, 1)}
                  </div>
                  <div className="text-sm font-semibold text-[#10211F]">{d.title}</div>
                  <div
                    className={`text-[11px] font-medium ${
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
