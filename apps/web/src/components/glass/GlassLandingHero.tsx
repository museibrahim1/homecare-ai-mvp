'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import PalmOrb from './PalmOrb';
import WaveField from './WaveField';

const NAV = [
  { href: '/features', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/compare', label: 'Compare' },
  { href: '/#how-it-works', label: 'How it works' },
];

const PROOF = [
  '4 documents, one recording',
  '50-state contract rules',
  'Minutes, not hours',
];

const SOCIAL = [
  { href: 'https://www.linkedin.com/company/palmtechnologies', label: 'LinkedIn' },
  { href: 'https://www.instagram.com/palmcareai', label: 'Instagram' },
  { href: 'https://www.facebook.com/palmtechnologies', label: 'Facebook' },
  { href: 'https://www.threads.net/@palmcareai', label: 'Threads' },
];

/** Paper Web Glass Landing first viewport (artboard Landing). */
export default function GlassLandingHero() {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative min-h-[100svh] bg-[#E7F1EF] antialiased flex flex-col">
      <WaveField />

      {/* Nav */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-10 lg:px-16 h-[72px] lg:h-[88px] shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <PalmOrb size={40} />
          <span className="text-lg font-bold tracking-[0.02em] text-[#10211F]">PALM</span>
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] font-medium text-[#4B6B66] hover:text-[#10211F] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3.5">
          <Link
            href="/login"
            className="py-2.5 px-5 rounded-full text-[15px] font-semibold text-[#4B6B66] hover:text-[#10211F] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="py-2.5 px-[22px] rounded-full bg-primary-500 text-[15px] font-semibold text-white hover:bg-primary-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden p-2 text-[#4B6B66]"
          aria-label="Menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[280px] glass-rail p-6 flex flex-col gap-6">
            <button
              type="button"
              className="self-end p-2 text-slate-500"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-[#10211F]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="text-base font-semibold text-[#4B6B66]">
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="text-center py-3 rounded-full bg-primary-500 text-white font-semibold"
            >
              Get started
            </Link>
          </div>
        </div>
      )}

      {/* Hero body */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12 px-5 sm:px-10 lg:px-16 pt-8 lg:pt-16 pb-10 lg:pb-14 max-w-[1440px] mx-auto w-full">
        <div className="w-full max-w-[600px] flex flex-col items-start gap-6 lg:gap-7">
          <p className="text-[13px] tracking-[0.18em] font-semibold text-primary-500">
            HOME CARE DOCUMENTATION
          </p>
          <div className="flex flex-col">
            <span className="text-[72px] sm:text-[100px] lg:text-[132px] leading-[0.92] tracking-[-0.04em] font-extrabold text-[#10211F]">
              Palm
            </span>
            <span className="text-[72px] sm:text-[100px] lg:text-[132px] leading-[0.94] tracking-[-0.04em] font-extrabold text-primary-500">
              It.
            </span>
          </div>
          <p className="max-w-[520px] text-lg leading-8 text-[#4B6B66]">
            Record the visit. PALM writes the care plan, the billables, the notes, and the contract.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-3 py-4 px-7 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-[17px] font-bold shadow-[0_12px_26px_#0D948852] hover:shadow-[0_16px_32px_#0D948860] hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="flex items-end gap-[3px] h-7" aria-hidden>
                <span className="w-[3px] h-[10px] rounded-sm bg-white" />
                <span className="w-[3px] h-5 rounded-sm bg-white" />
                <span className="w-[3px] h-7 rounded-sm bg-white" />
                <span className="w-[3px] h-4 rounded-sm bg-white" />
                <span className="w-[3px] h-[9px] rounded-sm bg-white" />
              </span>
              Palm It
            </Link>
            <Link
              href="/book-demo"
              className="inline-flex items-center justify-center py-4 px-[26px] rounded-full border-[1.5px] border-primary-500 text-primary-500 text-[17px] font-semibold hover:bg-white/60 hover:-translate-y-0.5 transition-all duration-200"
            >
              Book a demo
            </Link>
          </div>
        </div>

        <div className="relative w-full max-w-[560px] flex items-center justify-center py-6 lg:py-0 lg:pb-16">
          <PalmOrb size={280} className="sm:w-[320px] sm:h-[320px] lg:w-[340px] lg:h-[340px]" />
          <div className="absolute -bottom-2 lg:bottom-0 left-1/2 lg:left-auto lg:right-0 -translate-x-1/2 lg:translate-x-0 w-[min(360px,92%)] flex items-center gap-3.5 py-[18px] px-5 rounded-[18px] bg-[#FFFFFFB8] border border-white shadow-[0_16px_40px_#10211F14] backdrop-blur-xl">
            <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">EW</span>
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="text-base font-semibold text-[#10211F] truncate">Eleanor Whitfield</span>
              <span className="text-[13px] font-medium text-[#4B6B66] truncate">
                Care plan, billables, notes, contract
              </span>
            </div>
            <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-[#0D948814] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              <span className="text-xs font-semibold text-primary-500">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proof chips + social — in-flow so nothing clips at the viewport edge */}
      <div className="relative z-10 shrink-0 px-5 sm:px-10 lg:px-16 pb-8 lg:pb-10 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4 lg:gap-5">
          <div className="flex flex-wrap items-center gap-3">
            {PROOF.map((label) => (
              <div
                key={label}
                className="flex items-center gap-2.5 py-3 px-5 rounded-full bg-[#FFFFFFA3] border border-white shadow-[0_8px_24px_#10211F0F] backdrop-blur-md"
              >
                <span className="w-[7px] h-[7px] rounded-full bg-primary-500 shrink-0" />
                <span className="text-[14px] sm:text-[15px] font-semibold text-[#10211F]">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 xl:ml-auto">
            <span className="text-[12px] tracking-[0.08em] font-semibold text-[#4B6B66] uppercase">
              Follow
            </span>
            {SOCIAL.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] font-semibold text-[#0F766E] hover:text-primary-600 underline-offset-2 hover:underline"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
