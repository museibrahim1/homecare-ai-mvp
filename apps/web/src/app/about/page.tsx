'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mic, ArrowRight, Shield, Heart, Zap, Globe, Users, Award, Lock } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
            <span className="text-xl font-bold text-slate-900">PalmCare AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-slate-600 hover:text-slate-900 transition">Features</Link>
            <Link href="/#pricing" className="text-slate-600 hover:text-slate-900 transition">Pricing</Link>
            <Link href="/contact" className="text-slate-600 hover:text-slate-900 transition">Contact</Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 transition">Sign In</Link>
            <Link href="/#book-demo" className="btn-primary py-2 px-5 text-sm">Schedule Demo</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20">
        {/* Hero */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200 rounded-full mb-6">
              <Heart className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-primary-400">About PalmCare AI</span>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              Built by Someone Who Knows
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan"> the Grind</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Home care agencies lose hours every week to manual documentation. Assessments are hand-written, contracts are generic, 
              and paperwork delays cost time and money. PalmCare AI eliminates that entirely. One tap. AI handles the rest.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="px-6 py-16 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6">Where Care Meets Intelligence</h2>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  PalmCare AI was founded by Muse Ibrahim — someone who has worked in home care and knows the grind. 
                  We chose a different path from legacy software: one that combines AI with deep understanding of how agencies actually operate.
                </p>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Your caregivers shouldn&apos;t need software training. No forms to fill, no clicks to learn — just record and review. 
                  Every feature was designed for the people who use it: caregivers in the field, administrators managing caseloads, and agency owners scaling their businesses.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  The result is a platform that feels intuitive from day one. Staff records an assessment, AI generates the contract, 
                  and the client signs — all before you leave the chair.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Zap, title: 'AI-First', desc: 'Built with AI at the core, not bolted on' },
                  { icon: Heart, title: 'People-First', desc: 'Technology that empowers, not complicates' },
                  { icon: Shield, title: 'HIPAA Compliant', desc: 'Enterprise-grade security from day one' },
                  { icon: Globe, title: 'Built to Scale', desc: 'From 5 clients to 5,000+' },
                ].map((item, i) => (
                  <div key={i} className="card p-5">
                    <item.icon className="w-8 h-8 text-primary-400 mb-3" />
                    <h3 className="text-slate-900 font-semibold mb-1">{item.title}</h3>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Different */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Why PalmCare AI is Different</h2>
            <div className="space-y-8">
              {[
                {
                  icon: Mic,
                  title: 'Voice-Native Intelligence',
                  description: 'Other platforms make you type everything. PalmCare AI starts with voice — one tap to start, AI handles the rest. Transcription, data extraction, contract generation, and billing — all from a single recording.',
                },
                {
                  icon: Zap,
                  title: 'Speed That Matters',
                  description: 'What used to take 3+ hours of paperwork now takes under 10 minutes. Our agencies report saving 20+ hours per week on administrative tasks, freeing staff to focus on client care and business growth.',
                },
                {
                  icon: Users,
                  title: 'Built For Care Professionals',
                  description: 'We didn\'t build a generic business tool and add "home care" to the name. Every field, workflow, and automation was designed specifically for home care agency workflows — from intake assessments to signed contracts.',
                },
                {
                  icon: Award,
                  title: 'Customer-Obsessed Support',
                  description: 'We don\'t just sell software. Every customer gets hands-on onboarding, dedicated support, and a team that understands home care. Our average support response time is under 15 minutes.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center shrink-0">
                    <item.icon className="w-7 h-7 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-200">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to See the Difference?</h2>
              <p className="text-xl text-slate-600 mb-8">Book a free demo and see why 500+ agencies trust PalmCare AI.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/#book-demo" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Schedule a Demo<ArrowRight className="w-5 h-5" /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" /><span className="text-slate-500 text-sm">HIPAA Compliant</span></div>
            <div className="flex items-center gap-2"><Lock className="w-5 h-5 text-blue-600" /><span className="text-slate-500 text-sm">256-bit Encrypted</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
