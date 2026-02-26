'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export default function Sparkline({
  data,
  width = 80,
  height = 28,
  color = '#0d9488',
  fillColor,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const padY = 2;
    const chartH = height - padY * 2;
    const stepX = width / (data.length - 1);

    const points = data.map((v, i) => ({
      x: i * stepX,
      y: padY + chartH - ((v - min) / range) * chartH,
    }));

    let line = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      line += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    return line;
  }, [data, width, height]);

  const fillPath = useMemo(() => {
    if (!fillColor || !path) return '';
    const last = data.length - 1;
    const stepX = width / (data.length - 1);
    return `${path} L${last * stepX},${height} L0,${height} Z`;
  }, [fillColor, path, data.length, width, height]);

  if (data.length < 2) return null;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {fillPath && fillColor && (
        <path d={fillPath} fill={fillColor} opacity="0.15" />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
