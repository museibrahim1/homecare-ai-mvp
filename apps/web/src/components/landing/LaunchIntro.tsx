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
 * The PALM orb reverberates as it "records" a live assessment, a three-step
 * pipeline fills in, then the visitor is handed to the hero page. Shown once
 * per browser session and respects reduced-motion.
 */
export function LaunchIntro({ onEnter }: LaunchIntroProps) {
  const [leaving, setLeaving] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [orbSize, setOrbSize] = useState(200);
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
    const sync = () => setOrbSize(window.innerWidth < 640 ? 168 : 210);
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
      className={`fixed inset-0 z-[100] overflow-y-auto text-white transition-all duration-500 ${
        leaving ? 'opacity-0 scale-[1.03]' : 'opacity-100 scale-100'
      }`}
      style={{ background: '#03110f' }}
    >
      {/* ── Ambient background layers ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Base wash */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1200px 820px at 50% -12%, rgba(20,131,120,0.55) 0%, rgba(8,60,56,0.35) 40%, rgba(3,20,18,0.9) 72%, #03110f 100%)',
          }}
        />
        {/* Drifting aurora blobs */}
        <div
          className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[110px]"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.55), transparent 65%)', animation: 'li-aurora 16s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/3 -left-24 h-[420px] w-[420px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4), transparent 65%)', animation: 'li-aurora 22s ease-in-out infinite', animationDelay: '-6s' }}
        />
        <div
          className="absolute bottom-[-120px] right-[-80px] h-[460px] w-[460px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.32), transparent 65%)', animation: 'li-aurora 19s ease-in-out infinite', animationDelay: '-11s' }}
        />
        {/* Floating specks */}
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
        {/* Fine grain to kill gradient banding */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        {/* Edge vignette */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 120% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
        />
      </div>

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5">
        <div className="li-rise flex items-center gap-2.5" style={{ animationDelay: '60ms' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-teal-200" />
          </div>
          <span className="text-[15px] font-semibold tracking-wide text-white">PalmCare AI</span>
        </div>
        <button
          onClick={handleEnter}
          className="li-rise rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur-sm transition hover:border-white/25 hover:text-white"
          style={{ animationDelay: '60ms' }}
        >
          Skip intro
        </button>
      </div>

      {/* ── Center content ── */}
      <div className="relative z-10 flex min-h-[calc(100dvh-76px)] flex-col items-center justify-center px-5 pb-16 pt-4 text-center">
        {/* Eyebrow */}
        <div
          className="li-rise mb-8 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-1.5 text-xs font-medium tracking-wide text-teal-100 backdrop-blur-sm"
          style={{ animationDelay: '120ms' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-300" />
          </span>
          AI documentation for home care agencies
        </div>

        {/* Orb with reverberation ripples + halo */}
        <div className="animate-orb-scale-in relative flex items-center justify-center">
          {!reducedMotion && [0, 1, 2].map(i => (
            <span
              key={i}
              className="li-ripple absolute rounded-full border border-teal-300/25"
              style={{ width: orbSize, height: orbSize, animationDelay: `${i * 1.13}s` }}
            />
          ))}
          <Orb size={orbSize} active={!finished} />
        </div>

        {/* Headline */}
        <h1
          className="li-rise mt-9 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl"
          style={{ animationDelay: '220ms' }}
        >
          Where care meets{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(100deg, #5eead4, #22d3ee 55%, #34d399)' }}
          >
            intelligence
          </span>
        </h1>
        <p
          className="li-rise mt-4 max-w-xl text-base leading-relaxed text-teal-50/75 sm:text-lg"
          style={{ animationDelay: '300ms' }}
        >
          Record a client assessment. PALM writes the care plan, the billables, and a
          state-specific service contract from what was actually said. Minutes, not hours.
        </p>

        {/* Live assessment card */}
        <div
          className="li-rise mt-9 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-left shadow-2xl shadow-teal-950/40 backdrop-blur-md"
          style={{ animationDelay: '380ms' }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              {/* Equalizer bars */}
              <div className="flex items-end gap-[3px]" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className={finished ? 'w-[3px] rounded-full bg-teal-300/40' : 'w-[3px] rounded-full bg-teal-300 animate-orb-bar'}
                    style={{ height: 12, animationDelay: `${i * 120}ms`, animationDuration: `${0.7 + i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-white/70">Live assessment</span>
            </div>
            {finished ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/15 px-2.5 py-1 text-xs font-medium text-teal-200">
                <FileText className="h-3.5 w-3.5" /> Contract generated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Recording
              </span>
            )}
          </div>
          <div ref={transcriptRef} className="scrollbar-hide h-[112px] space-y-3 overflow-y-auto px-4 py-3.5">
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
                  <p className="text-sm leading-relaxed text-white/90">
                    {seg.words.slice(0, wordsToShow).join(' ')}
                    {isLastVisible && (
                      <span className="li-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-teal-300" />
                    )}
                  </p>
                </div>
              );
            })}
            {visibleWords === 0 && (
              <p className="text-sm text-white/45">Starting assessment…</p>
            )}
          </div>
        </div>

        {/* Pipeline stepper */}
        <div className="li-rise mt-9 w-full max-w-sm" style={{ animationDelay: '460ms' }}>
          <div className="relative flex items-start justify-between">
            {/* Connector track + fill */}
            <div className="absolute left-5 right-5 top-5 h-px bg-white/12" />
            <div
              className="absolute left-5 top-5 h-px bg-gradient-to-r from-teal-400 to-cyan-300 transition-all duration-700 ease-out"
              style={{ width: `calc(${progress} * (100% - 2.5rem))` }}
            />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const on = i <= activeStep;
              const current = i === activeStep && !finished;
              return (
                <div key={step.title} className="relative z-10 flex flex-col items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-500 ${
                      on
                        ? 'border-teal-300/50 bg-teal-400/20 text-teal-100 shadow-[0_0_20px_rgba(45,212,191,0.35)]'
                        : 'border-white/12 bg-white/[0.04] text-white/40'
                    }`}
                  >
                    {current && (
                      <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-teal-400/20" />
                    )}
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-xs font-semibold transition-colors duration-500 ${on ? 'text-white' : 'text-white/45'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 h-8 text-sm leading-snug text-teal-50/70 transition-opacity duration-300">
            {STEP_CAPTIONS[activeStep]}
          </p>
        </div>

        {/* Enter CTA */}
        <button
          onClick={handleEnter}
          data-track="launch-enter"
          className="li-rise group relative mt-6 inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-base font-semibold text-teal-900 shadow-xl shadow-teal-950/40 transition hover:shadow-teal-900/50"
          style={{ animationDelay: '540ms' }}
        >
          <span
            className="li-shimmer absolute inset-y-0 -left-8 w-16"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)' }}
            aria-hidden="true"
          />
          <span className="relative">Enter PalmCare AI</span>
          <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
        <p className="li-rise mt-4 text-xs text-white/40" style={{ animationDelay: '600ms' }}>
          Press Enter or Esc to continue
        </p>
      </div>
    </div>
  );
}
