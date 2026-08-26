'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  Sparkles,
  Infinity,
  Play,
  Calendar,
  Users,
  Kanban,
  ClipboardList,
  Activity,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import type { WhatsNewIcon, WhatsNewRelease } from '@/lib/whatsNew';

const ICON_MAP: Record<WhatsNewIcon, LucideIcon> = {
  sparkles: Sparkles,
  infinity: Infinity,
  play: Play,
  calendar: Calendar,
  users: Users,
  kanban: Kanban,
  clipboard: ClipboardList,
  activity: Activity,
};

const EXIT_MS = 260;

interface WhatsNewModalProps {
  release: WhatsNewRelease;
  onClose: () => void;
}

export default function WhatsNewModal({ release, onClose }: WhatsNewModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'enter' | 'idle' | 'exit'>('enter');

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setPhase('idle'), 520);
    return () => window.clearTimeout(enterTimer);
  }, []);

  const dismiss = useCallback(() => {
    if (phase === 'exit') return;
    setPhase('exit');
    window.setTimeout(onClose, EXIT_MS);
  }, [onClose, phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dismiss]);

  const handlePrimaryAction = () => {
    dismiss();
    window.setTimeout(() => router.push(release.ctaHref), EXIT_MS);
  };

  const panelClass =
    phase === 'exit'
      ? 'animate-whats-new-panel-out'
      : phase === 'enter'
        ? 'animate-whats-new-panel-in'
        : '';

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss what's new"
        className={`fixed inset-0 z-[88] cursor-default bg-transparent ${
          phase === 'exit' ? 'animate-whats-new-backdrop-out' : 'animate-whats-new-backdrop-in'
        }`}
        onClick={dismiss}
      />

      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="whats-new-title"
        className={`fixed bottom-4 right-4 z-[89] w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${panelClass}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-[148px] w-full overflow-hidden">
          <div className="absolute inset-0 animate-whats-new-hero-zoom">
            <Image
              src={release.heroImage}
              alt={release.heroAlt}
              fill
              priority
              className="object-cover object-top"
              sizes="380px"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/30 to-transparent" />

          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-[min(52vh,360px)] overflow-y-auto px-5 pb-5 pt-4">
          <p className="animate-whats-new-label text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
            {release.label}
          </p>
          <h2
            id="whats-new-title"
            className="animate-whats-new-title mt-1.5 text-[18px] font-semibold leading-snug text-white"
          >
            {release.title}
          </h2>

          <ul className="mt-4 space-y-3.5">
            {release.features.map((feature, index) => {
              const Icon = ICON_MAP[feature.icon];
              return (
                <li
                  key={feature.title}
                  className="animate-whats-new-feature flex gap-2.5"
                  style={{ animationDelay: `${180 + index * 90}ms` }}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/85">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{feature.title}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[#A0A0A0]">{feature.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div
            className="animate-whats-new-footer mt-5 flex items-center justify-between gap-3"
            style={{ animationDelay: `${180 + release.features.length * 90}ms` }}
          >
            {release.learnMoreUrl ? (
              <Link
                href={release.learnMoreUrl}
                onClick={dismiss}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-white/80 transition hover:text-white"
              >
                {release.learnMoreLabel ?? 'Learn more'}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={handlePrimaryAction}
              className="rounded-xl bg-[#8BA4BC] px-3.5 py-2 text-[12px] font-semibold text-[#10211F] transition hover:bg-[#9BB3C8]"
            >
              {release.ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
