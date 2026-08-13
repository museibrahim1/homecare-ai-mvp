'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowRight, Zap, Phone, CreditCard, Shield, Clock, BadgeCheck } from 'lucide-react';

// One plan, one price. $199/month, everything included, 14 day free trial.
// Priced to match Apple's App Store price point exactly.
const PLAN = {
  name: 'PalmCare AI',
  tier: 'starter',
  monthlyPrice: 199,
  description:
    'One plan. Everything included. Record the visit and PALM writes the notes, the billables, and a state compliant service agreement in minutes.',
  features: [
    'Unlimited AI assessments',
    'Unlimited team members',
    'AI voice to contract',
    'Smart SOAP notes',
    'Advanced analytics and reporting',
    'Custom contract templates',
    '50 state compliance engine',
    'HIPAA BAA included',
    'Priority support',
    '250 GB storage',
  ],
  href: '/register',
};

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            <span className="text-teal-400">Palm</span>Care AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-white/70 hover:text-white text-sm font-medium transition">Sign In</Link>
            <Link href="/register" className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          One plan. One price.
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-2">
          Everything PalmCare does, for a flat $199 a month. Start with a 14-day free trial. Cancel anytime before it ends.
        </p>
        <p className="text-sm text-white/40 max-w-xl mx-auto mb-4">
          No credit card required to start. Subscriptions are purchased and managed in the PalmCare iOS app via your Apple ID.
        </p>
      </div>

      {/* Plan Card */}
      <div className="max-w-md mx-auto px-6 pb-20">
        <div className="relative rounded-2xl border border-teal-500/50 bg-gradient-to-b from-teal-500/10 to-transparent shadow-lg shadow-teal-500/10 p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500/20">
              <Zap className="w-5 h-5 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{PLAN.name}</h3>
          </div>

          <div className="mb-2 flex items-baseline gap-1">
            <span className="text-5xl font-bold text-white">${PLAN.monthlyPrice}</span>
            <span className="text-white/40 text-base">/mo</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4 w-fit">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">14 day free trial</span>
          </div>

          <p className="text-white/50 text-sm mb-6 leading-relaxed">{PLAN.description}</p>

          <ul className="space-y-2.5 mb-8 flex-1">
            {PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => router.push(PLAN.href)}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition bg-teal-500 hover:bg-teal-600 text-white"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-white/30 text-xs mt-3">14 day free trial included</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Do I need a credit card for the free trial?',
              a: 'No. You can create your account and start a 14-day free trial with full access, no credit card required. When you\'re ready to subscribe, you do so in the PalmCare iOS app through your Apple ID.',
            },
            {
              q: 'How do subscriptions and payments work?',
              a: 'Subscriptions are purchased and billed through Apple In-App Purchase in the PalmCare iOS app. Open the app, go to Settings → Subscription, and choose your plan. Apple handles payment securely with your Apple ID.',
            },
            {
              q: 'What happens after the 14-day trial?',
              a: 'When your trial ends, subscribe in the PalmCare iOS app to keep full access for $199 a month. Everything is included, so there are no tiers to compare or upgrades to buy. Your data is preserved while you decide.',
            },
            {
              q: 'What do I get for $199 a month?',
              a: 'Everything. Unlimited AI assessments, unlimited team members, AI voice to contract, smart SOAP notes, advanced analytics, custom contract templates, the 50 state compliance engine, a HIPAA BAA, and priority support. One price, no add-ons, no overage fees.',
            },
            {
              q: 'Are there any usage limits?',
              a: 'No overage fees and no assessment caps. The $199 plan includes unlimited assessments and unlimited team members so your whole agency can use PalmCare.',
            },
            {
              q: 'How do I cancel?',
              a: 'Manage or cancel your subscription anytime from iPhone Settings → [your name] → Subscriptions, or in the PalmCare app. If you cancel, you keep access until the end of your current billing period, and your data is preserved for 30 days after cancellation.',
            },
            {
              q: 'Is my data secure?',
              a: 'Absolutely. PalmCare AI is HIPAA-compliant with end-to-end encryption, audit logging, and role-based access controls.',
            },
          ].map(({ q, a }) => (
            <details key={q} className="group border border-white/10 rounded-xl overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer text-white font-medium text-sm flex items-center justify-between hover:bg-white/[0.02] transition">
                {q}
                <span className="text-white/30 group-open:rotate-45 transition-transform text-lg">+</span>
              </summary>
              <div className="px-6 pb-4 text-white/50 text-sm leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <div className="bg-gradient-to-r from-teal-500/20 to-indigo-500/20 rounded-2xl border border-white/10 p-10">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to transform your agency?</h2>
          <p className="text-white/60 mb-6">Start your 14-day free trial today. Cancel anytime.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/book-demo"
              className="bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-white/10"
            >
              <Phone className="w-4 h-4" /> Book a Demo
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-white/30 text-xs">
            <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> HIPAA Compliant</div>
            <div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Billed via App Store</div>
            <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Cancel Anytime</div>
          </div>
        </div>
      </div>
    </div>
  );
}
