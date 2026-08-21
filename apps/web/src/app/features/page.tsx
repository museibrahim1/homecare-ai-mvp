'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle } from 'lucide-react';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';
import { FEATURES_TABS } from '@/components/landing/data';

const SECTION_META: Record<string, { subtitle: string; description: string }> = {
  ai: {
    subtitle: 'Record. Transcribe. Contract.',
    description:
      'PalmCare turns one visit recording into notes, billables, and a state-compliant service agreement.',
  },
  operations: {
    subtitle: 'One place for the agency',
    description:
      'Clients, visits, documents, and team activity in one glass workspace built for home care.',
  },
  billing: {
    subtitle: 'From visit to billables',
    description:
      'Billable items come out of the assessment. Dashboards and client detail keep leadership current.',
  },
  caregiver: {
    subtitle: 'Palm It in the field',
    description:
      'The iOS app covers recording, client profiles, schedules, and the full documentation pipeline.',
  },
};

export default function FeaturesPage() {
  const [active, setActive] = useState(FEATURES_TABS[0].id);
  const tab = FEATURES_TABS.find((t) => t.id === active) ?? FEATURES_TABS[0];
  const meta = SECTION_META[active] ?? SECTION_META.ai;

  return (
    <GlassMarketingShell>
      <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 pt-10 sm:pt-14 pb-6">
        <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Product</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#10211F] tracking-tight mb-4 max-w-3xl">
          Everything you need to run your agency
        </h1>
        <p className="text-lg text-[#4B6B66] max-w-2xl">
          Built for care professionals, not retrofitted from generic software.
        </p>
      </div>

      <div className="sticky top-0 z-30 border-y border-[#10211F12] bg-[#E7F1EF]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 overflow-x-auto scrollbar-hide">
          <div className="flex gap-6 sm:gap-8 min-w-max py-3">
            {FEATURES_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={`pb-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active === t.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-[#4B6B66] hover:text-[#10211F]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-12 sm:py-16">
        <p className="text-sm font-semibold text-primary-600 mb-2">{meta.subtitle}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#10211F] mb-3">{tab.label}</h2>
        <p className="text-[#4B6B66] max-w-2xl mb-10">{meta.description}</p>

        <div className="space-y-14">
          {tab.features.map((feature, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={feature.title}
                className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                  reverse ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-[#10211F]">{feature.title}</h3>
                  </div>
                  <p className="text-[#4B6B66] leading-relaxed mb-5">{feature.description}</p>
                  <ul className="space-y-2">
                    {['Live in the PalmCare product', 'Glass UI matching Paper designs', 'Works on web and iOS'].map(
                      (h) => (
                        <li key={h} className="flex items-center gap-2 text-sm text-[#10211F]">
                          <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" />
                          {h}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
                <div className="glass-card p-3 sm:p-4 overflow-hidden">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#10211F08]">
                    <Image
                      src={feature.image}
                      alt={`${feature.title} screen`}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 pb-20 text-center">
        <div className="glass-card p-10">
          <h2 className="text-2xl font-bold text-[#10211F] mb-3">See it on your agency</h2>
          <p className="text-[#4B6B66] mb-6">
            Start a 30-day free trial in the iOS app, or book a short demo with the team.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2"
            >
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 rounded-full text-sm font-semibold border border-[#10211F18] text-[#10211F] hover:bg-white/40"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </GlassMarketingShell>
  );
}
