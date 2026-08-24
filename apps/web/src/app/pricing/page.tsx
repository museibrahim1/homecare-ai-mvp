'use client';

import Link from 'next/link';
import { Check, ArrowRight, Phone, CreditCard, Shield, Clock, BadgeCheck, Smartphone, Zap } from 'lucide-react';
import GlassMarketingShell from '@/components/glass/GlassMarketingShell';

const PLANS = [
  {
    id: 'mobile',
    name: 'PalmCare Mobile',
    monthlyPrice: 80,
    icon: Smartphone,
    highlight: false,
    description:
      'Assessments on iPhone. Record the visit and PALM writes the notes, billables, and a state compliant service agreement.',
    features: [
      'Unlimited AI assessments on iPhone',
      'AI voice to contract',
      'Smart SOAP notes and billables',
      '50 state compliance engine',
      'HIPAA BAA included',
    ],
  },
  {
    id: 'platform',
    name: 'PalmCare Platform',
    monthlyPrice: 199,
    icon: Zap,
    highlight: true,
    description:
      'Full platform: web CRM, team seats, analytics, and unlimited assessments on iPhone and web.',
    features: [
      'Everything in Mobile',
      'Web dashboard and analytics',
      'Unlimited team members',
      'Custom contract templates',
      'Priority support',
      '250 GB storage',
    ],
  },
];

const FAQS = [
  {
    q: 'Do I need a payment method for the free trial?',
    a: 'Yes. The 30-day free trial starts only when you subscribe in the PalmCare iOS app through Apple In-App Purchase. Apple requires a payment method on your Apple ID. Creating a web account alone does not unlock assessments.',
  },
  {
    q: 'What is the difference between Mobile and Platform?',
    a: 'Mobile ($80/mo) is for caregivers who run assessments on iPhone only. Platform ($199/mo) adds the web CRM, team seats, analytics, and unlimited assessments on web and iPhone.',
  },
  {
    q: 'How do subscriptions and payments work?',
    a: 'Subscriptions are purchased and billed through Apple In-App Purchase in the PalmCare iOS app. Open the app, go to Settings → Your Plan, pick Mobile or Platform, and start the trial or subscribe.',
  },
  {
    q: 'What happens after the 30-day trial?',
    a: 'Unless you cancel at least 24 hours before the trial ends, Apple automatically charges your selected plan price and renews monthly until you cancel in iPhone Settings → Apple ID → Subscriptions.',
  },
  {
    q: 'Can I upgrade from Mobile to Platform?',
    a: 'Yes. Open the PalmCare app, go to Settings → Your Plan, and switch to PalmCare Platform. Apple prorates the change through your Apple ID subscription.',
  },
  {
    q: 'How do I cancel?',
    a: 'Manage or cancel your subscription anytime from iPhone Settings → [your name] → Subscriptions. If you cancel, you keep access until the end of your current billing period.',
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
          Two plans. Pick what fits.
        </h1>
        <p className="text-lg text-[#4B6B66] max-w-2xl mx-auto mb-2">
          Mobile for iPhone assessments. Platform for the full agency stack on web and iPhone.
        </p>
        <p className="text-sm text-[#7A8C88] max-w-xl mx-auto">
          Both include a 30-day free trial when you subscribe in the iOS app with your Apple ID.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 pb-16 grid md:grid-cols-2 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`glass-card p-8 flex flex-col ${
                plan.highlight
                  ? 'border border-primary-500/25 shadow-[0_12px_40px_#0D948820]'
                  : 'border border-[#10211F10]'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-500/15">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-[#10211F]">{plan.name}</h2>
              </div>

              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-[#10211F]">${plan.monthlyPrice}</span>
                <span className="text-[#7A8C88] text-base">/mo</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-500/30 rounded-full mb-4 w-fit bg-primary-500/5">
                <BadgeCheck className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-xs font-semibold text-primary-700">30 day free trial</span>
              </div>

              <p className="text-[#4B6B66] text-sm mb-6 leading-relaxed">{plan.description}</p>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#10211F]">
                    <Check className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`w-full py-3 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  plan.highlight
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'border border-primary-500/40 text-primary-700 hover:bg-primary-500/5'
                }`}
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-center text-[#7A8C88] text-xs mt-3">
                Subscribe in the iOS app after you create your account.
              </p>
            </div>
          );
        })}
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
          <p className="text-[#4B6B66] mb-6">Create your account, then start a 30-day free trial in the PalmCare iOS app.</p>
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
