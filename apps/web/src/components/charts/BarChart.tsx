'use client';

import { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  showValues?: boolean;
  barRadius?: number;
  gap?: number;
  horizontal?: boolean;
}

export default function BarChart({
  data,
  height = 160,
  color = '#0d9488',
  showLabels = true,
  showValues = true,
  barRadius = 4,
  gap = 8,
  horizontal = false,
}: BarChartProps) {
  const maxVal = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No data
      </div>
    );
  }

  if (horizontal) {
    return (
      <div className="space-y-2">
        {data.map((item, i) => {
          const pct = (item.value / maxVal) * 100;
          return (
            <div key={i} className="flex items-center gap-3">
              {showLabels && (
                <span className="text-xs text-slate-500 w-20 truncate text-right">{item.label}</span>
              )}
              <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: item.color || color,
                    borderRadius: barRadius,
                  }}
                />
              </div>
              {showValues && (
                <span className="text-xs font-medium text-slate-700 w-8 text-right">{item.value}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const labelHeight = showLabels ? 24 : 0;
  const valueHeight = showValues ? 18 : 0;
  const barAreaHeight = height - labelHeight - valueHeight;

  return (
    <div className="flex items-end" style={{ height, gap }}>
      {data.map((item, i) => {
        const pct = (item.value / maxVal) * 100;
        const barH = Math.max((pct / 100) * barAreaHeight, 3);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height }}>
            {showValues && (
              <span className="text-[11px] font-medium text-slate-600 mb-1">{item.value}</span>
            )}
            <div
              className="w-full transition-all duration-500 hover:opacity-80"
              style={{
                height: barH,
                backgroundColor: item.color || color,
                borderRadius: `${barRadius}px ${barRadius}px 0 0`,
              }}
              title={`${item.label}: ${item.value}`}
            />
            {showLabels && (
              <span className="text-[10px] text-slate-400 mt-1.5 truncate w-full text-center">{item.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
