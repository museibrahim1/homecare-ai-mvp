'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 transition"
      >
        <span className="text-slate-900 font-medium text-[15px]">{q}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 text-slate-600 text-[15px] leading-relaxed">{a}</div>}
    </div>
  );
}
