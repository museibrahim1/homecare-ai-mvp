'use client';

import Link from 'next/link';
import { Mic, ArrowRight, Shield, Heart, Zap, Globe, Users, Award, Lock } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold text-white">PalmCare AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-dark-300 hover:text-white transition">Features</Link>
            <Link href="/#pricing" className="text-dark-300 hover:text-white transition">Pricing</Link>
            <Link href="/contact" className="text-dark-300 hover:text-white transition">Contact</Link>
            <Link href="/login" className="text-dark-300 hover:text-white transition">Sign In</Link>
            <Link href="/register" className="btn-primary py-2 px-5 text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20">
        {/* Hero */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <Heart className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-primary-400">About PalmCare AI</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              A Story of Innovation and
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan"> Compassionate Care</span>
            </h1>
            <p className="text-xl text-dark-300 leading-relaxed max-w-3xl mx-auto">
              We built PalmCare AI because we saw caregivers drowning in paperwork instead of doing what they do best — caring for people. 
              Our platform puts AI to work on the administrative burden so agencies can focus on delivering exceptional care.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="px-6 py-16 bg-dark-800/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Our Mission: Empower Every Agency</h2>
                <p className="text-dark-300 mb-4 leading-relaxed">
                  In home care, technology should enhance the human experience — not replace it. We chose a different path from legacy software vendors: 
                  one that combines cutting-edge AI with deep understanding of how agencies actually operate.
                </p>
                <p className="text-dark-300 mb-4 leading-relaxed">
                  Every feature in PalmCare AI was designed from the perspective of the people who use it — caregivers in the field, 
                  administrators managing schedules, and agency owners scaling their businesses.
                </p>
                <p className="text-dark-300 leading-relaxed">
                  The result is a platform that feels intuitive from day one, eliminates hours of manual paperwork, 
                  and gives agencies the data they need to make smart decisions and grow with confidence.
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
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    <p className="text-dark-400 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Different */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-12 text-center">Why PalmCare AI is Different</h2>
            <div className="space-y-8">
              {[
                {
                  icon: Mic,
                  title: 'Voice-Native Intelligence',
                  description: 'Other platforms make you type everything. PalmCare AI starts with voice — record an assessment, and AI does the rest. Transcription, data extraction, contract generation, and billing — all from a single recording.',
                },
                {
                  icon: Zap,
                  title: 'Speed That Matters',
                  description: 'What used to take 3+ hours of paperwork now takes under 10 minutes. Our agencies report saving 20+ hours per week on administrative tasks, freeing staff to focus on client care and business growth.',
                },
                {
                  icon: Users,
                  title: 'Built For Home Care, Not Adapted',
                  description: 'We didn\'t build a generic business tool and add "home care" to the name. Every field, workflow, and automation was designed specifically for the unique needs of home care agencies — from intake assessments to caregiver scheduling.',
                },
                {
                  icon: Award,
                  title: 'Customer-Obsessed Support',
                  description: 'We don\'t just sell software. Every customer gets hands-on onboarding, dedicated support, and a team that understands home care. Our average support response time is under 15 minutes.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center shrink-0">
                    <item.icon className="w-7 h-7 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-dark-300 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to See the Difference?</h2>
              <p className="text-xl text-dark-300 mb-8">Book a free demo and see why 500+ agencies trust PalmCare AI.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Start Free Trial<ArrowRight className="w-5 h-5" /></Link>
                <Link href="/#book-demo" className="btn-secondary py-4 px-8 text-lg">Book a Demo</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-dark-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /><span className="text-dark-400 text-sm">HIPAA Compliant</span></div>
            <div className="flex items-center gap-2"><Lock className="w-5 h-5 text-blue-400" /><span className="text-dark-400 text-sm">256-bit Encrypted</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
