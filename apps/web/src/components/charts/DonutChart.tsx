'use client';

import { useMemo } from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export default function DonutChart({
  segments,
  size = 160,
  thickness = 24,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const arcs = useMemo(() => {
    if (total === 0) return [];
    let cumulative = 0;
    return segments
      .filter(s => s.value > 0)
      .map((seg) => {
        const pct = seg.value / total;
        const offset = circumference * (1 - cumulative) + circumference * 0.25;
        cumulative += pct;
        return {
          ...seg,
          pct,
          dashArray: `${circumference * pct} ${circumference * (1 - pct)}`,
          dashOffset: offset,
        };
      });
  }, [segments, total, circumference]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Background ring */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {/* Segments */}
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={thickness}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            className="transition-all duration-700"
          >
            <title>{`${arc.label}: ${arc.value} (${Math.round(arc.pct * 100)}%)`}</title>
          </circle>
        ))}
      </svg>
      {/* Center text */}
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-2xl font-bold text-dark-50">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-[11px] text-dark-400">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
