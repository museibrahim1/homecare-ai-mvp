'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Lock, Mic, Shield } from 'lucide-react';
import { MEDICAL_KEYWORDS, TRANSCRIPT_SEGMENTS, TranscriptSegment } from './data';

export function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [visibleSegments, setVisibleSegments] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  const totalWords = TRANSCRIPT_SEGMENTS.reduce((sum, seg) => sum + seg.words.length, 0);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  useEffect(() => {
    const t = setTimeout(() => setIsRecording(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const t = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleWords(prev => {
          if (prev >= totalWords) { clearInterval(interval); return prev; }
          return prev + 1;
        });
      }, 120);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(t);
  }, [isRecording, totalWords]);

  useEffect(() => {
    let wc = 0;
    for (let i = 0; i < TRANSCRIPT_SEGMENTS.length; i++) {
      if (visibleWords > wc) setVisibleSegments(i + 1);
      wc += TRANSCRIPT_SEGMENTS[i].words.length;
    }
  }, [visibleWords]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [visibleWords]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const SIZE = 320;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const t0 = performance.now();

    function orbPath(cx: number, cy: number, radius: number, phase: number, audio: number, n = 120) {
      ctx!.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = radius
          + Math.sin(a * 3 + phase * Math.PI * 2) * (4 + audio * 8)
          + Math.cos(a * 2 - phase * Math.PI * 1.5) * (3 + audio * 6)
          + Math.sin(a * 5 + phase * Math.PI * 3) * (2 + audio * 4);
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();
    }

    function draw() {
      const t = (performance.now() - t0) / 1000;
      const phase = (Math.sin(t * Math.PI / 2) + 1) / 2;
      const rot = t * (Math.PI * 2 / 20);
      const glow = (Math.sin(t * Math.PI * 2 / 3) + 1) / 2;
      const active = isRecordingRef.current;
      const audio = active ? 0.4 + glow * 0.3 : 0;
      const cx = SIZE / 2, cy = SIZE / 2;

      ctx!.clearRect(0, 0, SIZE, SIZE);

      const rings = [
        { r: 130, rot: rot, po: 1.4, op: active ? 0.3 : 0.12, lw: 1.5 },
        { r: 115, rot: -rot * 0.8, po: 0.7, op: active ? 0.22 : 0.09, lw: 1.5 },
        { r: 100, rot: rot * 1.2, po: 0, op: active ? 0.18 : 0.07, lw: 1 },
      ];

      for (const ring of rings) {
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(ring.rot);
        ctx!.translate(-cx, -cy);
        ctx!.globalAlpha = ring.op;
        orbPath(cx, cy, ring.r, phase + ring.po, audio * 0.3, 100);
        try {
          const g = ctx!.createConicGradient(0, cx, cy);
          g.addColorStop(0, '#0d9488');
          g.addColorStop(0.33, '#0891b2');
          g.addColorStop(0.66, '#2dd4bf');
          g.addColorStop(1, '#0d9488');
          ctx!.strokeStyle = g;
        } catch {
          ctx!.strokeStyle = '#0d9488';
        }
        ctx!.lineWidth = ring.lw;
        ctx!.stroke();
        ctx!.restore();
      }

      ctx!.save();
      orbPath(cx, cy, 70, phase, audio);
      try {
        const og = ctx!.createConicGradient(0, cx, cy);
        og.addColorStop(0, '#0d9488');
        og.addColorStop(0.33, '#0891b2');
        og.addColorStop(0.66, '#2dd4bf');
        og.addColorStop(1, '#0d9488');
        ctx!.fillStyle = og;
      } catch {
        ctx!.fillStyle = '#0d9488';
      }
      ctx!.fill();

      ctx!.save();
      orbPath(cx, cy, 70, phase, audio);
      ctx!.clip();
      const hl = ctx!.createRadialGradient(cx - 20, cy - 20, 0, cx, cy, 80);
      hl.addColorStop(0, 'rgba(255,255,255,0.2)');
      hl.addColorStop(1, 'transparent');
      ctx!.fillStyle = hl;
      ctx!.fillRect(0, 0, SIZE, SIZE);
      ctx!.restore();

      ctx!.restore();
      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative px-6 pt-24 pb-8 overflow-hidden" style={{ background: '#000' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)' }} />

      <div className="text-center mb-8 relative z-10 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          Record It. Transcribe It.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan">Contract It.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 mt-4 max-w-xl mx-auto">
          Watch a live assessment become a signed contract — automatically.
        </p>
      </div>

      <div className="relative flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          style={{
            width: 320,
            height: 320,
            maxWidth: '80vw',
            filter: isRecording
              ? 'drop-shadow(0 0 40px rgba(13,148,136,0.5)) drop-shadow(0 0 80px rgba(8,145,178,0.2))'
              : 'drop-shadow(0 0 20px rgba(13,148,136,0.25))',
            transition: 'filter 1s ease',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {!isRecording ? (
            <Mic className="w-12 h-12 text-white/80" />
          ) : (
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-1.5 bg-white/80 rounded-full animate-orb-bar"
                  style={{ height: '28px', animationDelay: `${i * 150}ms`, animationDuration: `${0.6 + i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 relative z-10">
        {isRecording ? (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-white/40 font-medium">Recording Assessment...</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-primary-500 rounded-full" />
            <span className="text-sm text-white/30 font-medium">Tap to start assessment</span>
          </>
        )}
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="max-h-[200px] overflow-y-auto scrollbar-hide px-2" ref={transcriptRef}>
          {visibleSegments === 0 && isRecording && (
            <div className="flex items-center gap-2 text-white/30 text-sm justify-center">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Listening...</span>
            </div>
          )}
          <div className="space-y-4">
            {TRANSCRIPT_SEGMENTS.slice(0, visibleSegments).map((seg, segIdx) => {
              const segStartIdx = TRANSCRIPT_SEGMENTS.slice(0, segIdx).reduce((s, x) => s + x.words.length, 0);
              const wordsToShow = Math.max(0, visibleWords - segStartIdx);
              return (
                <div key={segIdx} className="animate-transcript-fade">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${seg.speaker === 'nurse' ? 'bg-primary-500' : 'bg-cyan-500'}`} />
                    <span className="text-xs font-semibold text-white/40">{seg.label}</span>
                  </div>
                  <p className="text-sm md:text-base leading-relaxed pl-4">
                    {seg.words.slice(0, wordsToShow).map((word, wIdx) => {
                      const clean = word.replace(/[.,!?'"]/g, '').toLowerCase();
                      const isMedical = MEDICAL_KEYWORDS.has(clean);
                      return (
                        <span key={wIdx} className={isMedical ? 'text-primary-400 font-medium' : 'text-white/70'}>
                          {word}{' '}
                        </span>
                      );
                    })}
                    {wordsToShow < seg.words.length && wordsToShow > 0 && (
                      <span className="inline-block w-0.5 h-4 bg-primary-400 animate-pulse align-middle ml-0.5" />
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-8 relative z-10">
        <Link href="/register" data-track="hero-cta-trial" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
          Start Your 14-Day Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
        <a href="#features" data-track="hero-cta-features" className="flex items-center gap-2 py-4 px-8 text-lg rounded-lg text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition">
          See How It Works <ChevronDown className="w-5 h-5" />
        </a>
      </div>

      <div className="flex items-center flex-wrap gap-4 mt-6 relative z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 border border-green-500/20 rounded-full">
          <Shield className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-green-500/80 font-medium">HIPAA Compliant</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-blue-500/20 rounded-full">
          <Lock className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-blue-500/80 font-medium">256-bit Encrypted</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-scroll-bounce">
        <ChevronDown className="w-6 h-6 text-white/20" />
      </div>
    </section>
  );
}

/* ───────────────────── LANDING PAGE ───────────────────── */

