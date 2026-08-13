'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText, Mic, Sparkles, Zap } from 'lucide-react';
import { Orb } from './Orb';
import { TRANSCRIPT_SEGMENTS } from './data';

interface LaunchIntroProps {
  /** Called when the visitor clicks past the intro to reach the hero page. */
  onEnter: () => void;
}

const STEPS = [
  { icon: Mic, title: 'Record' },
  { icon: Zap, title: 'Transcribe' },
  { icon: FileText, title: 'Contract' },
];

const STEP_CAPTIONS = [
  'Staff records the client assessment on a phone. One tap to start.',
  'AI writes the transcript and pulls out care needs, meds, and billables.',
  'A state-specific service agreement, built from what was said. Ready to sign.',
];

// A short, self-contained snippet of the assessment for the splash.
const INTRO_LINES = TRANSCRIPT_SEGMENTS.slice(0, 3);
const INTRO_WORDS = INTRO_LINES.reduce((sum, seg) => sum + seg.words.length, 0);

// Deterministic ambient particles (positions/sizes/timing).
const PARTICLES = [
  { left: '12%', top: '72%', size: 3, dur: 15, delay: 0 },
  { left: '22%', top: '40%', size: 2, dur: 19, delay: 3 },
  { left: '34%', top: '84%', size: 4, dur: 17, delay: 6 },
  { left: '48%', top: '30%', size: 2, dur: 21, delay: 2 },
  { left: '61%', top: '78%', size: 3, dur: 16, delay: 5 },
  { left: '73%', top: '46%', size: 2, dur: 20, delay: 1 },
  { left: '82%', top: '68%', size: 4, dur: 18, delay: 7 },
  { left: '90%', top: '36%', size: 2, dur: 22, delay: 4 },
];

/**
 * Full-screen launch splash: a cinematic hook that introduces the product.
 * Fits one viewport (no scroll on typical phones/desktops). The PALM orb
 * reverberates as it "records" a live assessment, a three-step pipeline fills
 * in, then the visitor is handed to the hero page. Shown once per browser
 * session and respects reduced-motion.
 */
export function LaunchIntro({ onEnter }: LaunchIntroProps) {
  const [leaving, setLeaving] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [orbSize, setOrbSize] = useState(160);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const finished = visibleWords >= INTRO_WORDS;

  // Which step is lit: Record from the start, Transcribe once words flow,
  // Contract once the snippet completes.
  const activeStep = finished ? 2 : visibleWords > 0 ? 1 : 0;
  const progress = activeStep / (STEPS.length - 1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReducedMotion(true);
      setVisibleWords(INTRO_WORDS);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Keep the orb small enough that the full splash stays on one screen.
      if (h < 700) setOrbSize(112);
      else if (h < 780 || w < 640) setOrbSize(132);
      else setOrbSize(156);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const start = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleWords(prev => {
          if (prev >= INTRO_WORDS) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 80);
    }, 900);
    return () => clearTimeout(start);
  }, [reducedMotion]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [visibleWords]);

  function handleEnter() {
    setLeaving(true);
    window.setTimeout(onEnter, 500);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') handleEnter();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let wordsBefore = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to PalmCare AI"
      className={`fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden text-white transition-all duration-500 ${
        leaving ? 'opacity-0 scale-[1.03]' : 'opacity-100 scale-100'
      }`}
      style={{ background: '#03110f' }}
    >
      {/* ── Ambient background layers ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1200px 820px at 50% -12%, rgba(20,131,120,0.55) 0%, rgba(8,60,56,0.35) 40%, rgba(3,20,18,0.9) 72%, #03110f 100%)',
          }}
        />
        <div
          className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[110px]"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.55), transparent 65%)', animation: 'li-aurora 16s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/3 -left-24 h-[320px] w-[320px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4), transparent 65%)', animation: 'li-aurora 22s ease-in-out infinite', animationDelay: '-6s' }}
        />
        <div
          className="absolute bottom-[-120px] right-[-80px] h-[360px] w-[360px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.32), transparent 65%)', animation: 'li-aurora 19s ease-in-out infinite', animationDelay: '-11s' }}
        />
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-teal-200/80 shadow-[0_0_6px_rgba(153,246,228,0.6)]"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animation: `li-float ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
        />
      </div>

      {/* ── Top bar ── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
        <div className="li-rise flex items-center gap-2" style={{ animationDelay: '60ms' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm sm:h-9 sm:w-9 sm:rounded-xl">
            <Sparkles className="h-3.5 w-3.5 text-teal-200 sm:h-4 sm:w-4" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white sm:text-[15px]">PalmCare AI</span>
        </div>
        <button
          onClick={handleEnter}
          className="li-rise rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition hover:border-white/25 hover:text-white sm:px-4 sm:py-2 sm:text-sm"
          style={{ animationDelay: '60ms' }}
        >
          Skip intro
        </button>
      </div>

      {/* ── Center content: one column, even gaps, fits the remaining viewport ── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-4 pb-4 pt-1 text-center sm:gap-3 sm:px-6 sm:pb-6">
        {/* Eyebrow */}
        <div
          className="li-rise inline-flex max-w-full shrink-0 items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1 text-[11px] font-medium tracking-wide text-teal-100 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-xs"
          style={{ animationDelay: '120ms' }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-300" />
          </span>
          <span className="truncate">AI documentation for home care agencies</span>
        </div>

        {/* Orb with reverberation ripples */}
        <div
          className="animate-orb-scale-in relative flex shrink-0 items-center justify-center"
          style={{ width: orbSize, height: orbSize }}
        >
          {!reducedMotion && [0, 1, 2].map(i => (
            <span
              key={i}
              className="li-ripple absolute rounded-full border border-teal-300/25"
              style={{ width: orbSize, height: orbSize, animationDelay: `${i * 1.13}s` }}
            />
          ))}
          <Orb size={orbSize} active={!finished} />
        </div>

        {/* Headline + supporting line */}
        <div className="li-rise w-full max-w-xl shrink-0 px-1" style={{ animationDelay: '220ms' }}>
          <h1 className="text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
            Where care meets{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(100deg, #5eead4, #22d3ee 55%, #34d399)' }}
            >
              intelligence
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-snug text-teal-50/75 sm:mt-2.5 sm:text-[15px] sm:leading-relaxed">
            Record a client assessment. PALM writes the care plan, the billables, and a
            state-specific service contract. Minutes, not hours.
          </p>
        </div>

        {/* Live assessment card — shrink-0 so flex centering never crushes the transcript */}
        <div
          className="li-rise w-full max-w-md shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] text-left shadow-2xl shadow-teal-950/40 backdrop-blur-md sm:rounded-2xl"
          style={{ animationDelay: '380ms' }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex items-end gap-[3px]" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className={finished ? 'w-[3px] rounded-full bg-teal-300/40' : 'w-[3px] rounded-full bg-teal-300 animate-orb-bar'}
                    style={{ height: 10, animationDelay: `${i * 120}ms`, animationDuration: `${0.7 + i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="truncate text-xs font-medium text-white/70">Live assessment</span>
            </div>
            {finished ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-400/15 px-2 py-0.5 text-[11px] font-medium text-teal-200 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
                <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Contract ready
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-white/70 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse sm:h-2 sm:w-2" /> Recording
              </span>
            )}
          </div>
          <div ref={transcriptRef} className="scrollbar-hide h-[68px] space-y-2 overflow-y-auto px-3 py-2 sm:h-[80px] sm:space-y-2 sm:px-4 sm:py-2.5">
            {INTRO_LINES.map((seg, segIdx) => {
              const segStart = wordsBefore;
              wordsBefore += seg.words.length;
              const wordsToShow = Math.min(seg.words.length, Math.max(0, visibleWords - segStart));
              if (wordsToShow === 0) return null;
              const isLastVisible =
                !finished && segStart + wordsToShow === visibleWords;
              return (
                <div key={segIdx}>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-200/70">{seg.label}</p>
                  <p className="text-[13px] leading-snug text-white/90 sm:text-sm sm:leading-relaxed">
                    {seg.words.slice(0, wordsToShow).join(' ')}
                    {isLastVisible && (
                      <span className="li-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-teal-300" />
                    )}
                  </p>
                </div>
              );
            })}
            {visibleWords === 0 && (
              <p className="text-[13px] text-white/45 sm:text-sm">Starting assessment…</p>
            )}
          </div>
        </div>

        {/* Pipeline stepper — equal-width columns so icons, labels, and the track align */}
        <div className="li-rise w-full max-w-md shrink-0 px-6 sm:px-10" style={{ animationDelay: '460ms' }}>
          <div className="relative grid grid-cols-3">
            {/* Connector track sits on the icon midlines (centers of col 1 and col 3) */}
            <div
              className="pointer-events-none absolute top-4 h-px bg-white/12 sm:top-5"
              style={{ left: '16.666%', right: '16.666%' }}
            />
            <div
              className="pointer-events-none absolute top-4 h-px bg-gradient-to-r from-teal-400 to-cyan-300 transition-all duration-700 ease-out sm:top-5"
              style={{
                left: '16.666%',
                width: `calc(${progress} * (100% - 33.332%))`,
              }}
            />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const on = i <= activeStep;
              const current = i === activeStep && !finished;
              return (
                <div key={step.title} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-500 sm:h-10 sm:w-10 ${
                      on
                        ? 'border-teal-300/50 bg-teal-400/20 text-teal-100 shadow-[0_0_20px_rgba(45,212,191,0.35)]'
                        : 'border-white/12 bg-white/[0.04] text-white/40'
                    }`}
                  >
                    {current && (
                      <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-teal-400/20 sm:h-10 sm:w-10" />
                    )}
                    <Icon className="relative h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <span className={`text-[11px] font-semibold transition-colors duration-500 sm:text-xs ${on ? 'text-white' : 'text-white/45'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-1.5 min-h-[2.25rem] max-w-xs text-center text-xs leading-snug text-teal-50/70 transition-opacity duration-300 sm:mt-2 sm:min-h-[2.5rem] sm:text-sm">
            {STEP_CAPTIONS[activeStep]}
          </p>
        </div>

        {/* Enter CTA */}
        <div className="li-rise flex shrink-0 flex-col items-center gap-1.5" style={{ animationDelay: '540ms' }}>
          <button
            onClick={handleEnter}
            data-track="launch-enter"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-teal-900 shadow-xl shadow-teal-950/40 transition hover:shadow-teal-900/50 sm:px-8 sm:py-3 sm:text-base"
          >
            <span
              className="li-shimmer absolute inset-y-0 -left-8 w-16"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)' }}
              aria-hidden="true"
            />
            <span className="relative">Enter PalmCare AI</span>
            <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <p className="text-[11px] text-white/40 sm:text-xs">
            Press Enter or Esc to continue
          </p>
        </div>
      </div>
    </div>
  );
}
