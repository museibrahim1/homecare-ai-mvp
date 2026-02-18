'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X, ChevronRight, ChevronLeft, Home, Users, Mic,
  FileText, MessageSquare, Bell, BarChart3, CalendarDays,
  Target, Settings, Sparkles, CheckCircle,
  ArrowRight, Activity, HelpCircle, BookOpen
} from 'lucide-react';
import { useWalkthrough } from '@/lib/walkthrough';

/* ─── Step definition ─── */
interface SpotlightStep {
  id: string;
  target?: string;
  title: string;
  description: string;
  tip?: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  preferredSide?: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: SpotlightStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PalmCare AI',
    description: 'Let\'s take a quick tour of your dashboard. We\'ll highlight the key areas you\'ll use every day. Takes about a minute.',
    tip: 'Use arrow keys or click Next to navigate. Press Escape to exit anytime.',
    icon: Sparkles,
    iconBg: 'bg-gradient-to-br from-primary-500 to-accent-cyan',
    iconColor: 'text-white',
  },
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Navigation Sidebar',
    description: 'Your main navigation. Jump between Clients, Assessments, Schedule, Pipeline, Team Chat, Reports, and more — organized into clear sections.',
    tip: 'On mobile, tap the menu icon to open the sidebar.',
    icon: Home,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    preferredSide: 'right',
  },
  {
    id: 'stats',
    target: 'stats',
    title: 'Key Metrics',
    description: 'Your at-a-glance numbers — total assessments, pending proposals, client count, and weekly activity. These update in real-time as you work.',
    icon: BarChart3,
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-400',
    preferredSide: 'bottom',
  },
  {
    id: 'pipeline',
    target: 'pipeline',
    title: 'Charts & Pipeline',
    description: 'Track assessment trends over the last 6 months and see your client pipeline breakdown — from intake through active care.',
    icon: Activity,
    iconBg: 'bg-green-500/15',
    iconColor: 'text-green-400',
    preferredSide: 'bottom',
  },
  {
    id: 'quick-actions',
    target: 'quick-actions',
    title: 'Activity & Quick Actions',
    description: 'Recent assessments alongside quick-launch buttons — start a new assessment, add a client, or export proposals in one click.',
    icon: CalendarDays,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    preferredSide: 'top',
  },
  {
    id: 'tasks',
    target: 'tasks',
    title: 'Task Manager',
    description: 'Create and manage your daily tasks right on the dashboard. Categorize them, set due dates, and track from To Do through Done.',
    tip: 'Tasks persist locally so you won\'t lose them between sessions.',
    icon: Target,
    iconBg: 'bg-pink-500/15',
    iconColor: 'text-pink-400',
    preferredSide: 'top',
  },
  {
    id: 'notifications',
    target: 'notifications',
    title: 'Smart Notifications',
    description: 'This bell aggregates alerts from your schedule, tasks, messages, emails, and follow-ups — sorted by priority so you never miss what matters.',
    tip: 'Click any notification to jump directly to the relevant page.',
    icon: Bell,
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-400',
    preferredSide: 'bottom',
  },
  {
    id: 'user-menu',
    target: 'user-menu',
    title: 'Profile & Settings',
    description: 'Access your profile, agency settings, and this tour anytime from here. Select "App Tour" to replay this walkthrough whenever you need a refresher.',
    icon: Settings,
    iconBg: 'bg-dark-600',
    iconColor: 'text-dark-300',
    preferredSide: 'bottom',
  },
  {
    id: 'done',
    title: 'You\'re All Set!',
    description: 'You now know your way around the dashboard. Start by adding a client or recording an assessment. Reopen this tour from the user menu or Help & Support anytime.',
    icon: CheckCircle,
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    iconColor: 'text-white',
  },
];

/* ─── Geometry ─── */
interface Rect { top: number; left: number; width: number; height: number }

const PAD = 10;
const GAP = 14;
const TIP_W = 370;

function getRect(target?: string): Rect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

type Side = 'top' | 'bottom' | 'left' | 'right';

function pickSide(r: Rect, pref?: Side): Side {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const space: Record<Side, number> = {
    top: r.top,
    bottom: vh - r.top - r.height,
    left: r.left,
    right: vw - r.left - r.width,
  };
  if (pref && space[pref] > 200) return pref;
  return (Object.entries(space) as [Side, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

function calcTipPos(r: Rect, side: Side) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0, left = 0;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  switch (side) {
    case 'bottom':
      top = r.top + r.height + PAD + GAP;
      left = clamp(cx - TIP_W / 2, 8, vw - TIP_W - 8);
      break;
    case 'top':
      top = r.top - PAD - GAP;
      left = clamp(cx - TIP_W / 2, 8, vw - TIP_W - 8);
      break;
    case 'right':
      top = clamp(cy - 80, 8, vh - 300);
      left = r.left + r.width + PAD + GAP;
      break;
    case 'left':
      top = clamp(cy - 80, 8, vh - 300);
      left = r.left - PAD - GAP - TIP_W;
      break;
  }
  return { top, left };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

/* ─── Component ─── */
export default function WalkthroughGuide() {
  const { isOpen, close } = useWalkthrough();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [side, setSide] = useState<Side>('bottom');
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const [fading, setFading] = useState(false);
  const measuring = useRef(false);

  const cur = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const pct = ((step + 1) / STEPS.length) * 100;

  /* ── measure once per step ── */
  const measure = useCallback(() => {
    if (measuring.current) return;
    measuring.current = true;
    const r = getRect(STEPS[step]?.target);
    setRect(r);
    if (r) {
      const s = pickSide(r, STEPS[step]?.preferredSide);
      setSide(s);
      setTipPos(calcTipPos(r, s));
    }
    measuring.current = false;
  }, [step]);

  /* ── scroll into view + measure on step change ── */
  useEffect(() => {
    if (!isOpen) return;
    const s = STEPS[step];
    if (s?.target) {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    // Measure after any scroll settles
    const t1 = setTimeout(measure, 100);
    const t2 = setTimeout(measure, 450);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step, isOpen, measure]);

  /* ── resize only (no scroll listener!) ── */
  useEffect(() => {
    if (!isOpen) return;
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 150);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, [isOpen, measure]);

  /* ── reset on open ── */
  useEffect(() => { if (isOpen) { setStep(0); setRect(null); } }, [isOpen]);

  /* ── navigation ── */
  const go = useCallback((dir: 1 | -1) => {
    const next = step + dir;
    if (next < 0) return;
    if (next >= STEPS.length) { close(); return; }
    setFading(true);
    setTimeout(() => { setStep(next); setFading(false); }, 160);
  }, [step, close]);

  /* ── keyboard ── */
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' || e.key === 'Enter') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, close, go]);

  if (!isOpen) return null;

  const hasTarget = !!rect && !!cur?.target;
  const Icon = cur.icon;

  // Cutout with padding
  const cx = rect ? { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 } : null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* ── Dark overlay with spotlight hole ── */}
      <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 100 }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {cx && (
              <rect
                x={cx.x} y={cx.y} width={cx.w} height={cx.h}
                rx="12" fill="black"
                style={{ transition: 'all 400ms cubic-bezier(.4,0,.2,1)' }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
          onClick={close}
          style={{ cursor: 'pointer' }}
        />
      </svg>

      {/* ── Highlight ring around target ── */}
      {cx && (
        <div
          className="fixed pointer-events-none rounded-xl"
          style={{
            top: cx.y, left: cx.x, width: cx.w, height: cx.h,
            zIndex: 101,
            boxShadow: '0 0 0 2px rgba(99,102,241,0.5), 0 0 16px rgba(99,102,241,0.15)',
            transition: 'all 400ms cubic-bezier(.4,0,.2,1)',
          }}
        />
      )}

      {/* ── Tooltip ── */}
      <div
        className={`fixed transition-all duration-200 ${fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={hasTarget ? {
          top: side === 'top' ? undefined : tipPos.top,
          bottom: side === 'top' ? `${window.innerHeight - tipPos.top}px` : undefined,
          left: tipPos.left,
          width: TIP_W,
          maxWidth: 'calc(100vw - 16px)',
          zIndex: 102,
        } : {
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: TIP_W,
          maxWidth: 'calc(100vw - 16px)',
          zIndex: 102,
        }}
      >
        <div
          className="bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 bg-dark-700">
            <div className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-dark-500" />
              <span className="text-[11px] font-medium text-dark-500 uppercase tracking-wider">{step + 1} / {STEPS.length}</span>
            </div>
            <button onClick={close} className="p-1.5 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-3 mb-2.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cur.iconBg}`}>
                <Icon className={`w-5 h-5 ${cur.iconColor}`} />
              </div>
              <h2 className={`text-base font-bold ${isLast ? 'text-green-400' : 'text-white'}`}>{cur.title}</h2>
            </div>

            <p className="text-dark-300 text-sm leading-relaxed mb-2.5">
              {cur.description.split('**').map((p, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{p}</strong> : p)}
            </p>

            {cur.tip && (
              <div className="flex items-start gap-2 p-2.5 bg-primary-500/8 border border-primary-500/15 rounded-lg">
                <HelpCircle className="w-3.5 h-3.5 text-primary-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-primary-300/80 leading-relaxed">{cur.tip}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-dark-700/50">
            <div>
              {isFirst ? (
                <button onClick={close} className="text-xs text-dark-500 hover:text-dark-300 transition-colors">Skip tour</button>
              ) : (
                <button onClick={() => go(-1)} className="flex items-center gap-1 text-xs text-dark-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-4 h-1.5 bg-primary-500' : i < step ? 'w-1.5 h-1.5 bg-primary-500/40' : 'w-1.5 h-1.5 bg-dark-600'}`} />
              ))}
            </div>

            <button
              onClick={isLast ? close : () => go(1)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLast ? 'bg-green-500 hover:bg-green-600 text-white'
                : isFirst ? 'bg-primary-500 hover:bg-primary-600 text-white'
                : 'bg-dark-700 hover:bg-dark-600 text-white'
              }`}
            >
              {isLast ? <>Get Started <ArrowRight className="w-3.5 h-3.5" /></>
               : isFirst ? <>Start Tour <ChevronRight className="w-3.5 h-3.5" /></>
               : <>Next <ChevronRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
