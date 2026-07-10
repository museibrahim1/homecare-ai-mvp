// Shared constants and small helper components for the Command Center page.
import React from 'react';
import { Sun, Coffee, Moon } from 'lucide-react';

export const API_BASE = '/api';

export function greetingByTime(): { text: string; Icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Coffee };
  if (h < 17) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

export const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export function priorityBadge(p: string) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[p] || PRIORITY_BADGE.low}`}>
      {p}
    </span>
  );
}

export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-200 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}
