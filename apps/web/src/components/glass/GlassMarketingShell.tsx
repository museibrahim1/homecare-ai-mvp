'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import PalmOrb from './PalmOrb';
import WaveField from './WaveField';

const NAV = [
  { href: '/features', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#how-it-works', label: 'How it works' },
];

const FOOTER = {
  product: [
    { href: '/features', label: 'Features' },
    { href: '/mobile-app', label: 'Mobile App' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/roi-calculator', label: 'ROI Calculator' },
    { href: '/faq', label: 'FAQ' },
    { href: '/login', label: 'Sign in' },
  ],
  company: [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
    { href: '/book-demo', label: 'Book a demo' },
    { href: '/status', label: 'System Status' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy#hipaa', label: 'HIPAA Compliance' },
  ],
};

const SOCIAL = [
  { href: 'https://www.linkedin.com/company/palmtechnologies', label: 'LinkedIn' },
  { href: 'https://www.instagram.com/palmcareai', label: 'Instagram' },
  { href: 'https://www.facebook.com/palmtechnologies', label: 'Facebook' },
  { href: 'https://www.threads.net/@palmcareai', label: 'Threads' },
];

type Props = {
  children: ReactNode;
  /** Hide the mint wave field (rare) */
  plain?: boolean;
};

/** Shared glass chrome for public marketing pages (matches Landing nav). */
export default function GlassMarketingShell({ children, plain = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen glass-page antialiased relative">
      {!plain && <WaveField className="opacity-50" />}

      <header className="relative z-20 flex items-center justify-between px-5 sm:px-10 lg:px-16 h-[72px] lg:h-[88px]">
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
            className="py-2.5 px-5 rounded-full text-[15px] font-semibold text-[#4B6B66] hover:text-[#10211F]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="py-2.5 px-[22px] rounded-full bg-primary-500 text-[15px] font-semibold text-white hover:bg-primary-600"
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

      <div className="relative z-10">{children}</div>

      <footer className="relative z-10 mt-8 border-t border-[#10211F12] px-5 sm:px-10 lg:px-16 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <PalmOrb size={36} />
                <span className="text-lg font-bold text-[#10211F]">PalmCare AI</span>
              </Link>
              <p className="text-[#4B6B66] text-sm leading-relaxed max-w-xs">
                AI documentation for home care agencies. Record it. Transcribe it. Contract it.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                {SOCIAL.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#0F766E] hover:text-primary-600"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-[#10211F] mb-4 text-sm">Product</h3>
              <ul className="space-y-2.5 text-[#4B6B66] text-sm">
                {FOOTER.product.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-[#10211F] transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#10211F] mb-4 text-sm">Company</h3>
              <ul className="space-y-2.5 text-[#4B6B66] text-sm">
                {FOOTER.company.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-[#10211F] transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#10211F] mb-4 text-sm">Legal</h3>
              <ul className="space-y-2.5 text-[#4B6B66] text-sm">
                {FOOTER.legal.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-[#10211F] transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[#7A8C88] text-sm pt-8 border-t border-[#10211F12]">
            &copy; 2026 Palm Technologies, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
