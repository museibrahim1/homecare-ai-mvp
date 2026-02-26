'use client';

import { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  showDots?: boolean;
  animate?: boolean;
}

export default function AreaChart({
  data,
  height = 180,
  color = '#0d9488',
  gradientFrom,
  gradientTo,
  showGrid = true,
  showLabels = true,
  showValues = true,
  showDots = true,
  animate = true,
}: AreaChartProps) {
  const padding = { top: 20, right: 12, bottom: showLabels ? 28 : 8, left: showValues ? 40 : 8 };
  const width = 500;

  const { points, areaPath, linePath, maxVal, gridLines } = useMemo(() => {
    if (data.length === 0) return { points: [], areaPath: '', linePath: '', maxVal: 0, gridLines: [] };

    const values = data.map(d => d.value);
    const max = Math.max(...values, 1);
    const roundedMax = Math.ceil(max / (Math.pow(10, Math.floor(Math.log10(max || 1))) || 1)) * (Math.pow(10, Math.floor(Math.log10(max || 1))) || 1);
    const effectiveMax = roundedMax || 1;

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;

    const pts = data.map((d, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + chartH - (d.value / effectiveMax) * chartH,
      ...d,
    }));

    let line = '';
    let area = '';

    if (pts.length === 1) {
      line = `M${pts[0].x},${pts[0].y}`;
      area = `M${pts[0].x},${padding.top + chartH} L${pts[0].x},${pts[0].y} L${pts[0].x},${padding.top + chartH} Z`;
    } else {
      // Smooth curve using cardinal spline
      line = `M${pts[0].x},${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const tension = 0.3;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        line += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
      area = line + ` L${pts[pts.length - 1].x},${padding.top + chartH} L${pts[0].x},${padding.top + chartH} Z`;
    }

    const gridCount = 4;
    const grids = Array.from({ length: gridCount + 1 }, (_, i) => {
      const val = Math.round((effectiveMax / gridCount) * i);
      const y = padding.top + chartH - (val / effectiveMax) * chartH;
      return { val, y };
    });

    return { points: pts, areaPath: area, linePath: line, maxVal: effectiveMax, gridLines: grids };
  }, [data, height, padding.top, padding.right, padding.bottom, padding.left]);

  const gFrom = gradientFrom || color;
  const gTo = gradientTo || 'transparent';
  const uid = useMemo(() => `area-${Math.random().toString(36).slice(2, 8)}`, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No data
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gFrom} stopOpacity="0.2" />
          <stop offset="100%" stopColor={gTo} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {showGrid && gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={g.y}
            x2={width - padding.right}
            y2={g.y}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray={i === 0 ? 'none' : '4,4'}
          />
          {showValues && (
            <text x={padding.left - 6} y={g.y + 4} textAnchor="end" className="text-[10px] fill-slate-400">
              {g.val}
            </text>
          )}
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${uid})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'animate-draw' : ''}
      />

      {/* Dots */}
      {showDots && points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
          {/* Hover target */}
          <circle cx={p.x} cy={p.y} r="12" fill="transparent" className="cursor-pointer">
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
        </g>
      ))}

      {/* X-axis labels */}
      {showLabels && points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 4}
          textAnchor="middle"
          className="text-[10px] fill-slate-400"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
