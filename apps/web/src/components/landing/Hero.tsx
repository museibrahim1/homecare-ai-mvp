'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, CheckCircle2, FileText, Lock, Shield } from 'lucide-react';
import { MEDICAL_KEYWORDS, TRANSCRIPT_SEGMENTS } from './data';
import { Orb } from './Orb';
import { trackAppStoreClick } from '@/lib/ga';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988';

export function Hero() {
  const [started, setStarted] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const totalWords = TRANSCRIPT_SEGMENTS.reduce((sum, seg) => sum + seg.words.length, 0);
  const finished = visibleWords >= totalWords;

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setVisibleWords(prev => {
        if (prev >= totalWords) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 110);
    return () => clearInterval(interval);
  }, [started, totalWords]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [visibleWords]);

  let wordsBefore = 0;

  return (
    <section className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <div>
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-4">
            AI documentation for home care agencies
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12]">
            Record it. Transcribe it.{' '}
            <span className="text-primary-600">Contract it.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mt-5 max-w-xl leading-relaxed">
            Record the assessment. PALM writes the care plan, the billables, and a
            state-specific service contract, built from what was actually said.
            Minutes, not hours of paperwork.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-8">
            <Link
              href="/register"
              data-track="hero-cta-trial"
              className="btn-primary inline-flex items-center justify-center gap-2 py-3.5 px-7 text-base"
            >
              Start your 14-day free trial <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Link
              href="/book-demo"
              data-track="hero-cta-demo"
              className="inline-flex items-center justify-center gap-2 py-3.5 px-7 text-base font-medium rounded-lg text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition"
            >
              <Calendar className="w-4 h-4 shrink-0" /> Book a demo
            </Link>
          </div>

          <div className="mt-4">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-track="hero-cta-appstore"
              onClick={() => trackAppStoreClick('hero')}
              className="inline-flex items-center gap-3 py-2.5 px-5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span className="text-left leading-tight">
                <span className="block text-[11px] text-white/70">Download on the</span>
                <span className="block text-base font-semibold">App Store</span>
              </span>
            </a>
          </div>

          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-8 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-600" /> HIPAA compliant
            </span>
            <span className="inline-flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary-600" /> 256-bit encryption
            </span>
            <span>No charge until the trial ends</span>
          </div>
        </div>

        {/* Live assessment demo — product window */}
        <div className="card overflow-hidden shadow-lg shadow-slate-900/5" aria-label="Live assessment transcription demo">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 bg-slate-50">
            <span className="text-sm font-medium text-slate-700">Client assessment</span>
            {finished ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </span>
            ) : started ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Recording
              </span>
            ) : (
              <span className="text-xs text-slate-400">Ready</span>
            )}
          </div>

          <div className="flex justify-center pt-5 pb-1 bg-white">
            <Orb size={140} active={started && !finished} />
          </div>

          <div ref={transcriptRef} className="h-[220px] sm:h-[250px] overflow-y-auto scrollbar-hide px-4 sm:px-5 py-4 space-y-4">
            {TRANSCRIPT_SEGMENTS.map((seg, segIdx) => {
              const segStart = wordsBefore;
              wordsBefore += seg.words.length;
              const wordsToShow = Math.min(seg.words.length, Math.max(0, visibleWords - segStart));
              if (wordsToShow === 0) return null;
              return (
                <div key={segIdx}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{seg.label}</p>
                  <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700">
                    {seg.words.slice(0, wordsToShow).map((word, wIdx) => {
                      const clean = word.replace(/[.,!?'"]/g, '').toLowerCase();
                      const isMedical = MEDICAL_KEYWORDS.has(clean);
                      return (
                        <span key={wIdx} className={isMedical ? 'text-primary-700 font-medium' : undefined}>
                          {word}{' '}
                        </span>
                      );
                    })}
                  </p>
                </div>
              );
            })}
            {!started && (
              <p className="text-sm text-slate-400">Starting assessment…</p>
            )}
          </div>

          <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50">
            {finished ? (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="w-4 h-4 text-primary-600" />
                Care plan and service agreement generated
              </span>
            ) : (
              <span className="text-sm text-slate-500">
                AI is extracting care needs, medications, and billable items…
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
