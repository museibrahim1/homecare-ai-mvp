'use client';

import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

interface OrbProps {
  size?: number;
  active?: boolean;
  className?: string;
}

/** PalmCare brand orb — animated teal canvas sphere with orbiting rings. */
export function Orb({ size = 200, active = false, className }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const frameRef = useRef<number>(0);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const t0 = performance.now();
    const scale = size / 320;

    function orbPath(cx: number, cy: number, radius: number, phase: number, audio: number, n = 120) {
      ctx!.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = radius
          + Math.sin(a * 3 + phase * Math.PI * 2) * (4 + audio * 8) * scale
          + Math.cos(a * 2 - phase * Math.PI * 1.5) * (3 + audio * 6) * scale
          + Math.sin(a * 5 + phase * Math.PI * 3) * (2 + audio * 4) * scale;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();
    }

    function tealGradient(cx: number, cy: number): CanvasGradient | string {
      try {
        const g = ctx!.createConicGradient(0, cx, cy);
        g.addColorStop(0, '#0d9488');
        g.addColorStop(0.33, '#0891b2');
        g.addColorStop(0.66, '#2dd4bf');
        g.addColorStop(1, '#0d9488');
        return g;
      } catch {
        return '#0d9488';
      }
    }

    function draw() {
      const t = (performance.now() - t0) / 1000;
      const phase = (Math.sin(t * Math.PI / 2) + 1) / 2;
      const rot = t * (Math.PI * 2 / 20);
      const glow = (Math.sin(t * Math.PI * 2 / 3) + 1) / 2;
      const isActive = activeRef.current;
      const audio = isActive ? 0.4 + glow * 0.3 : 0;
      const cx = size / 2, cy = size / 2;

      ctx!.clearRect(0, 0, size, size);

      const rings = [
        { r: 130 * scale, rot: rot, po: 1.4, op: isActive ? 0.35 : 0.16, lw: 1.5 },
        { r: 115 * scale, rot: -rot * 0.8, po: 0.7, op: isActive ? 0.26 : 0.12, lw: 1.5 },
        { r: 100 * scale, rot: rot * 1.2, po: 0, op: isActive ? 0.2 : 0.09, lw: 1 },
      ];

      for (const ring of rings) {
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(ring.rot);
        ctx!.translate(-cx, -cy);
        ctx!.globalAlpha = ring.op;
        orbPath(cx, cy, ring.r, phase + ring.po, audio * 0.3, 100);
        ctx!.strokeStyle = tealGradient(cx, cy);
        ctx!.lineWidth = ring.lw;
        ctx!.stroke();
        ctx!.restore();
      }

      ctx!.save();
      orbPath(cx, cy, 70 * scale, phase, audio);
      ctx!.fillStyle = tealGradient(cx, cy);
      ctx!.fill();

      // Soft highlight so the orb reads as a sphere on light backgrounds
      orbPath(cx, cy, 70 * scale, phase, audio);
      ctx!.clip();
      const hl = ctx!.createRadialGradient(cx - 20 * scale, cy - 20 * scale, 0, cx, cy, 80 * scale);
      hl.addColorStop(0, 'rgba(255,255,255,0.25)');
      hl.addColorStop(1, 'transparent');
      ctx!.fillStyle = hl;
      ctx!.fillRect(0, 0, size, size);
      ctx!.restore();

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [size]);

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          filter: active
            ? 'drop-shadow(0 0 24px rgba(13,148,136,0.35))'
            : 'drop-shadow(0 0 12px rgba(13,148,136,0.2))',
          transition: 'filter 1s ease',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        {!active ? (
          <Mic className="text-white/90" style={{ width: size * 0.13, height: size * 0.13 }} />
        ) : (
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-1 bg-white/90 rounded-full animate-orb-bar"
                style={{ height: size * 0.09, animationDelay: `${i * 150}ms`, animationDuration: `${0.6 + i * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
