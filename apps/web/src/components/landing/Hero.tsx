'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, Lock, Shield } from 'lucide-react';
import { MEDICAL_KEYWORDS, TRANSCRIPT_SEGMENTS } from './data';

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
            state-specific service contract — built from what was actually said.
            Minutes, not hours of paperwork.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              href="/register"
              data-track="hero-cta-trial"
              className="btn-primary inline-flex items-center justify-center gap-2 py-3.5 px-7 text-base"
            >
              Start your 14-day free trial <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Link
              href="/pricing"
              data-track="hero-cta-pricing"
              className="inline-flex items-center justify-center gap-2 py-3.5 px-7 text-base font-medium rounded-lg text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition"
            >
              View pricing
            </Link>
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

          <div ref={transcriptRef} className="h-[300px] sm:h-[340px] overflow-y-auto scrollbar-hide px-4 sm:px-5 py-4 space-y-4">
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
