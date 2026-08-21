'use client';

import Link from 'next/link';
import { Check, ArrowRight, Phone, CreditCard, Shield, Clock, BadgeCheck, Zap } from 'lucide-react';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';

const PLAN = {
  name: 'PalmCare AI',
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
};

const FAQS = [
  {
    q: 'Do I need a payment method for the free trial?',
    a: 'Yes. The 30-day free trial starts only when you subscribe in the PalmCare iOS app through Apple In-App Purchase. Apple requires a payment method on your Apple ID. Creating a web account alone does not unlock assessments.',
  },
  {
    q: 'How do subscriptions and payments work?',
    a: 'Subscriptions are purchased and billed through Apple In-App Purchase in the PalmCare iOS app. Open the app, go to Settings → Your Plan, and start the trial or subscribe. Apple handles payment with your Apple ID.',
  },
  {
    q: 'What happens after the 30-day trial?',
    a: 'Unless you cancel at least 24 hours before the trial ends, Apple automatically charges $199 for the next month and renews monthly until you cancel in iPhone Settings → Apple ID → Subscriptions. Your data stays available while you decide.',
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
    a: 'Manage or cancel your subscription anytime from iPhone Settings → [your name] → Subscriptions, or via links in the PalmCare app. If you cancel, you keep access until the end of your current billing period, and your data is preserved for 30 days after cancellation.',
  },
  {
    q: 'Is my data secure?',
    a: 'PalmCare AI is HIPAA-compliant with encryption, audit logging, and role-based access controls.',
  },
];

export default function PricingPage() {
  return (
    <GlassMarketingShell>
      <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 pt-10 sm:pt-16 pb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#10211F] tracking-tight mb-4">
          One plan. One price.
        </h1>
        <p className="text-lg text-[#4B6B66] max-w-2xl mx-auto mb-2">
          Everything PalmCare does, for a flat $199 a month. Start a 30-day free trial in the iOS app. Cancel anytime before it ends.
        </p>
        <p className="text-sm text-[#7A8C88] max-w-xl mx-auto">
          Trial starts when you subscribe with your Apple ID. Apple auto-charges after 30 days unless you cancel.
        </p>
      </div>

      <div className="max-w-md mx-auto px-5 sm:px-6 pb-16">
        <div className="glass-card p-8 flex flex-col border border-primary-500/25 shadow-[0_12px_40px_#0D948820]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-500/15">
              <Zap className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-[#10211F]">{PLAN.name}</h2>
          </div>

          <div className="mb-2 flex items-baseline gap-1">
            <span className="text-5xl font-bold text-[#10211F]">${PLAN.monthlyPrice}</span>
            <span className="text-[#7A8C88] text-base">/mo</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-500/30 rounded-full mb-4 w-fit bg-primary-500/5">
            <BadgeCheck className="w-3.5 h-3.5 text-primary-600" />
            <span className="text-xs font-semibold text-primary-700">30 day free trial</span>
          </div>

          <p className="text-[#4B6B66] text-sm mb-6 leading-relaxed">{PLAN.description}</p>

          <ul className="space-y-2.5 mb-8 flex-1">
            {PLAN.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#10211F]">
                <Check className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white transition"
          >
            Start free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-center text-[#7A8C88] text-xs mt-3">30 day free trial via Apple. Auto-renews after unless cancelled.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-6 pb-16">
        <h2 className="text-2xl font-bold text-[#10211F] text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group glass-card overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer text-[#10211F] font-medium text-sm flex items-center justify-between list-none">
                {q}
                <span className="text-[#7A8C88] group-open:rotate-45 transition-transform text-lg leading-none">+</span>
              </summary>
              <div className="px-5 pb-4 text-[#4B6B66] text-sm leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 pb-20 text-center">
        <div className="glass-card p-10">
          <h2 className="text-2xl font-bold text-[#10211F] mb-3">Ready to try PalmCare?</h2>
          <p className="text-[#4B6B66] mb-6">Start your 30-day free trial in the PalmCare iOS app. Cancel anytime before it ends.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-full text-sm font-semibold transition flex items-center gap-2"
            >
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/book-demo"
              className="px-6 py-3 rounded-full text-sm font-semibold transition flex items-center gap-2 border border-[#10211F18] text-[#10211F] hover:bg-white/40"
            >
              <Phone className="w-4 h-4" /> Book a demo
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-[#7A8C88] text-xs flex-wrap">
            <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> HIPAA Compliant</div>
            <div className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Billed via App Store</div>
            <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Cancel anytime</div>
          </div>
        </div>
      </div>
    </GlassMarketingShell>
  );
}
