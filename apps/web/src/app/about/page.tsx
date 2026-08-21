'use client';

import Link from 'next/link';
import { Mic, ArrowRight, Shield, Heart, Zap, Globe, Users, Award, Lock } from 'lucide-react';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';

export default function AboutPage() {
  return (
    <GlassMarketingShell>
      <main className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 pt-10 sm:pt-14 pb-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full mb-6">
            <Heart className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-700 font-medium">About PalmCare AI</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#10211F] mb-6 tracking-tight">
            Built by someone who knows the grind
          </h1>
          <p className="text-lg text-[#4B6B66] leading-relaxed max-w-3xl mx-auto">
            Home care agencies lose hours every week to manual documentation. Assessments are handwritten,
            contracts are generic, and paperwork delays cost time and money. PalmCare AI cuts that work.
            One tap. AI handles the rest.
          </p>
        </div>

        <section className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold text-[#10211F] mb-6">Where care meets intelligence</h2>
            <p className="text-[#4B6B66] mb-4 leading-relaxed">
              PalmCare AI was founded by Muse Ibrahim, someone who has worked in home care and knows the grind.
              We chose a different path from legacy software: AI paired with how agencies actually operate.
            </p>
            <p className="text-[#4B6B66] mb-4 leading-relaxed">
              Your caregivers should not need software training. No forms to fill, no clicks to learn. Just
              record and review. Every feature was designed for caregivers in the field, administrators
              managing caseloads, and owners scaling their businesses.
            </p>
            <p className="text-[#4B6B66] leading-relaxed">
              Staff records an assessment, AI generates the contract, and the client signs. Often before you
              leave the chair.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, title: 'AI-first', desc: 'Built with AI at the core, not bolted on' },
              { icon: Heart, title: 'People-first', desc: 'Technology that helps, not complicates' },
              { icon: Shield, title: 'HIPAA compliant', desc: 'Security and BAA from day one' },
              { icon: Globe, title: 'Built to scale', desc: 'From a handful of clients to thousands' },
            ].map((item) => (
              <div key={item.title} className="glass-card p-5">
                <item.icon className="w-8 h-8 text-primary-600 mb-3" />
                <h3 className="text-[#10211F] font-semibold mb-1">{item.title}</h3>
                <p className="text-[#4B6B66] text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-[#10211F] mb-10 text-center">Why PalmCare AI is different</h2>
          <div className="space-y-8">
            {[
              {
                icon: Mic,
                title: 'Voice-native',
                description:
                  'Other platforms make you type everything. PalmCare starts with voice. Transcription, extraction, contract generation, and billables from a single recording.',
              },
              {
                icon: Zap,
                title: 'Minutes, not hours',
                description:
                  'Record the visit. PalmCare writes the care plan, the billables, and the contract. Most agencies finish paperwork the same day.',
              },
              {
                icon: Users,
                title: 'Built for care professionals',
                description:
                  'Every field and workflow was designed for home care intake, not a generic CRM with a home care label.',
              },
              {
                icon: Award,
                title: 'Hands-on support',
                description:
                  'Onboarding help, responsive support, and a team that understands home care operations.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-5 items-start">
                <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center shrink-0">
                  <item.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#10211F] mb-2">{item.title}</h3>
                  <p className="text-[#4B6B66] leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="glass-card p-10 sm:p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[#10211F] mb-4">Ready to Palm It?</h2>
          <p className="text-lg text-[#4B6B66] mb-8">
            Book a short demo, or start a 30-day free trial in the iOS app and see the pipeline on your own cases.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 py-3 px-7 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600"
            >
              Start free trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/book-demo"
              className="inline-flex items-center gap-2 py-3 px-7 rounded-full border border-[#10211F18] text-[#10211F] font-semibold hover:bg-white/40"
            >
              Book a demo
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-[#7A8C88] text-sm">
            <span className="inline-flex items-center gap-2"><Shield className="w-4 h-4" /> HIPAA Compliant</span>
            <span className="inline-flex items-center gap-2"><Lock className="w-4 h-4" /> Encrypted</span>
          </div>
        </div>
      </main>
    </GlassMarketingShell>
  );
}
