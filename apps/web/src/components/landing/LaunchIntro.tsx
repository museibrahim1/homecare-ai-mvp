'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText, Mic, Zap } from 'lucide-react';
import { Orb } from './Orb';
import { TRANSCRIPT_SEGMENTS } from './data';

interface LaunchIntroProps {
  /** Called when the visitor clicks past the intro to reach the hero page. */
  onEnter: () => void;
}

const STEPS = [
  { icon: Mic, title: 'Record', copy: 'Staff records the client assessment on their phone.' },
  { icon: Zap, title: 'Transcribe', copy: 'AI writes the transcript and pulls out care needs.' },
  { icon: FileText, title: 'Contract', copy: 'A state-specific service agreement, ready to sign.' },
];

// A short, self-contained snippet of the assessment for the splash.
const INTRO_LINES = TRANSCRIPT_SEGMENTS.slice(0, 3);
const INTRO_WORDS = INTRO_LINES.reduce((sum, seg) => sum + seg.words.length, 0);

/**
 * Full-screen launch splash. Shows the PALM orb reverberating as it "records"
 * a live assessment, explains what the app does in three steps, then hands the
 * visitor to the hero page. Shown once per browser session.
 */
export function LaunchIntro({ onEnter }: LaunchIntroProps) {
  const [leaving, setLeaving] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const finished = visibleWords >= INTRO_WORDS;

  // Which step is lit: Record from the start, Transcribe once words flow,
  // Contract once the snippet completes.
  const activeStep = finished ? 2 : visibleWords > 0 ? 1 : 0;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReducedMotion(true);
      setVisibleWords(INTRO_WORDS);
    }
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
      }, 85);
    }, 700);
    return () => clearTimeout(start);
  }, [reducedMotion]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [visibleWords]);

  function handleEnter() {
    setLeaving(true);
    window.setTimeout(onEnter, 450);
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
      className={`fixed inset-0 z-[100] overflow-y-auto transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{
        background:
          'radial-gradient(1100px 700px at 50% -10%, #0f766e 0%, #0b3b38 42%, #05201f 72%, #020c0c 100%)',
      }}
    >
      {/* Skip */}
      <button
        onClick={handleEnter}
        className="absolute top-5 right-5 z-10 text-sm font-medium text-white/70 hover:text-white transition px-3 py-2 rounded-lg"
      >
        Skip intro
      </button>

      <div className="min-h-full flex flex-col items-center justify-center px-5 py-16 text-center">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <span className="text-base font-semibold text-white tracking-wide">PalmCare AI</span>
        </div>

        {/* Orb reverberating as it records */}
        <div className="animate-orb-scale-in">
          <Orb size={200} active={!finished} />
        </div>

        <h1 className="mt-8 text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight max-w-2xl">
          Where care meets intelligence
        </h1>
        <p className="mt-4 text-base sm:text-lg text-teal-50/80 leading-relaxed max-w-xl">
          Record a client assessment. PALM writes the care plan, the billables, and a
          state-specific service contract from what was actually said. Minutes, not hours.
        </p>

        {/* Live assessment snippet */}
        <div className="mt-8 w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden text-left">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <span className="text-xs font-medium text-white/70">Live assessment</span>
            {finished ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-200">
                <FileText className="w-3.5 h-3.5" /> Contract generated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Recording
              </span>
            )}
          </div>
          <div ref={transcriptRef} className="h-[104px] overflow-y-auto scrollbar-hide px-4 py-3 space-y-2.5">
            {INTRO_LINES.map((seg, segIdx) => {
              const segStart = wordsBefore;
              wordsBefore += seg.words.length;
              const wordsToShow = Math.min(seg.words.length, Math.max(0, visibleWords - segStart));
              if (wordsToShow === 0) return null;
              return (
                <div key={segIdx}>
                  <p className="text-[10px] font-semibold text-teal-200/70 uppercase tracking-wide mb-0.5">{seg.label}</p>
                  <p className="text-sm leading-relaxed text-white/90">
                    {seg.words.slice(0, wordsToShow).join(' ')}
                  </p>
                </div>
              );
            })}
            {visibleWords === 0 && (
              <p className="text-sm text-white/50">Starting assessment…</p>
            )}
          </div>
        </div>

        {/* Three steps */}
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-xl">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const on = i <= activeStep;
            return (
              <div
                key={step.title}
                className={`rounded-xl border p-3 sm:p-4 text-left transition-all duration-500 ${
                  on ? 'border-teal-300/40 bg-teal-400/10' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors duration-500 ${
                    on ? 'bg-teal-400/20 text-teal-100' : 'bg-white/5 text-white/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className={`text-sm font-semibold transition-colors duration-500 ${on ? 'text-white' : 'text-white/50'}`}>
                  {step.title}
                </p>
                <p className="hidden sm:block text-xs mt-1 text-white/50 leading-snug">{step.copy}</p>
              </div>
            );
          })}
        </div>

        {/* Enter the site */}
        <button
          onClick={handleEnter}
          data-track="launch-enter"
          className="mt-10 inline-flex items-center justify-center gap-2 py-3.5 px-8 text-base font-semibold rounded-xl bg-white text-teal-800 hover:bg-teal-50 transition shadow-lg shadow-teal-950/40"
        >
          Enter PalmCare AI <ArrowRight className="w-4 h-4" />
        </button>
        <p className="mt-4 text-xs text-white/40">Press Enter or Esc to continue</p>
      </div>
    </div>
  );
}
