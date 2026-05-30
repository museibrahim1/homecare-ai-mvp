'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-dark-600 rounded-xl overflow-hidden transition-all">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/50 transition">
        <span className="text-white font-medium pr-4">{q}</span>
        {open ? <Minus className="w-5 h-5 text-primary-400 shrink-0" /> : <Plus className="w-5 h-5 text-dark-400 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 text-dark-300 leading-relaxed">{a}</div>}
    </div>
  );
}

/* ───────────────────── TRANSCRIPT SIMULATION DATA ───────────────────── */

