'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Zap, Building2, Rocket, Phone } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: 179,
    period: '/mo',
    description: 'For small agencies getting started with AI-powered documentation',
    icon: Zap,
    color: 'teal',
    features: [
      'Up to 3 users',
      'Up to 50 clients',
      '200 visits/month',
      'AI voice-to-contract',
      'Smart assessments',
      'Basic reporting',
      'Email support',
      '5 GB storage',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=starter',
    popular: false,
  },
  {
    name: 'Growth',
    price: 399,
    period: '/mo',
    description: 'For growing agencies that need advanced features and more capacity',
    icon: Rocket,
    color: 'indigo',
    features: [
      'Up to 10 users',
      'Up to 200 clients',
      '1,000 visits/month',
      'AI voice-to-contract',
      'Smart assessments',
      'Advanced analytics & reporting',
      'Priority support',
      '25 GB storage',
      'Custom contract templates',
      'Team management',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=growth',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: null,
    period: '',
    description: 'For large agencies with custom requirements and dedicated support',
    icon: Building2,
    color: 'slate',
    features: [
      'Unlimited users',
      'Unlimited clients',
      'Unlimited visits',
      'AI voice-to-contract',
      'Smart assessments',
      'Custom analytics & dashboards',
      'Dedicated account manager',
      'Unlimited storage',
      'Custom integrations',
      'HIPAA BAA included',
      'On-site training',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: '/#book-demo',
    popular: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);

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
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
          Start with a 7-day free trial. No credit card required. Cancel anytime.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-white/40'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition ${annual ? 'bg-teal-500' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-white/40'}`}>
            Annual <span className="text-teal-400 text-xs font-semibold ml-1">Save 17%</span>
          </span>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const monthlyPrice = plan.price;
            const displayPrice = monthlyPrice ? (annual ? Math.round(monthlyPrice * 10 / 12) : monthlyPrice) : null;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  plan.popular
                    ? 'border-teal-500/50 bg-gradient-to-b from-teal-500/10 to-transparent shadow-lg shadow-teal-500/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.popular ? 'bg-teal-500/20' : 'bg-white/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${plan.popular ? 'text-teal-400' : 'text-white/60'}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  {displayPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${displayPrice}</span>
                      <span className="text-white/40 text-sm">/mo</span>
                      {annual && monthlyPrice && (
                        <span className="text-white/30 text-sm line-through ml-2">${monthlyPrice}</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-white">Custom</div>
                  )}
                </div>

                <p className="text-white/50 text-sm mb-6 leading-relaxed">{plan.description}</p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => router.push(plan.href)}
                  className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    plan.popular
                      ? 'bg-teal-500 hover:bg-teal-600 text-white'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>

                {plan.price && (
                  <p className="text-center text-white/30 text-xs mt-3">7-day free trial included</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: 'Do I need a credit card for the free trial?', a: 'No. Sign up and use PalmCare AI for 7 days completely free. We only ask for payment when your trial ends.' },
            { q: 'Can I change plans later?', a: 'Yes. You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.' },
            { q: 'What happens after my trial ends?', a: 'You can choose a plan to continue using PalmCare AI. If you don\'t subscribe, your account will be paused but your data is preserved for 30 days.' },
            { q: 'Is my data secure?', a: 'Absolutely. PalmCare AI is HIPAA-compliant with end-to-end encryption, audit logging, and role-based access controls.' },
            { q: 'Do you offer discounts for larger teams?', a: 'Yes. Our Enterprise plan is custom-priced for agencies with 10+ users. Contact us for a quote.' },
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
          <p className="text-white/60 mb-6">Start your 7-day free trial today. No credit card required.</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#book-demo"
              className="bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-white/10"
            >
              <Phone className="w-4 h-4" /> Book a Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
