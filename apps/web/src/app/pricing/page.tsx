'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Zap, Building2, TrendingUp, Phone, CreditCard, Shield, Clock, BadgeCheck } from 'lucide-react';

// Prices match Apple's App Store price points exactly. Annual saves at least
// 20% versus monthly (Enterprise Annual is capped at Apple's $10,000 max,
// which works out to about 30% off).
const PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 199,
    annualPrice: 1899.99,
    description: 'For solo owners and small agencies signing their first contracts with AI. Record the visit and PALM writes the notes, the billables, and a state compliant service agreement in minutes.',
    icon: Zap,
    assessments: 20,
    teamMembers: '5',
    features: [
      '20 AI assessments a month',
      '5 team members',
      'AI voice to contract',
      'Smart SOAP notes',
      'Basic reporting',
      'Email support',
      '10 GB storage',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=starter',
    popular: false,
    hasTrial: true,
  },
  {
    name: 'Growth',
    tier: 'growth',
    monthlyPrice: 699,
    annualPrice: 6699.99,
    description: 'For agencies building a steady client pipeline. Everything in Starter plus advanced analytics, custom contract templates, and priority support so your team closes contracts faster.',
    icon: TrendingUp,
    assessments: 75,
    teamMembers: '20',
    features: [
      '75 AI assessments a month',
      '20 team members',
      'AI voice to contract',
      'Smart SOAP notes',
      'Advanced analytics and reporting',
      'Custom contract templates',
      'Team management',
      'Priority support',
      '50 GB storage',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=growth',
    popular: true,
    hasTrial: true,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    monthlyPrice: 1199.99,
    annualPrice: 10000,
    description: 'For established agencies running at scale. Unlimited assessments, unlimited team members, a dedicated account manager, and the full 50 state compliance engine.',
    icon: Building2,
    assessments: null,
    teamMembers: 'Unlimited',
    features: [
      'Unlimited AI assessments',
      'Unlimited team members',
      'AI voice to contract',
      'Smart SOAP notes',
      'Custom analytics and dashboards',
      'Dedicated account manager',
      '50 state compliance engine',
      'HIPAA BAA included',
      'SLA guarantee',
      '250 GB storage',
    ],
    cta: 'Get Started',
    href: '/register?plan=enterprise',
    popular: false,
    hasTrial: false,
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
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-2">
          Start with a 14-day free trial. Cancel anytime before your trial ends.
        </p>
        <p className="text-sm text-white/40 max-w-xl mx-auto mb-8">
          No credit card required to start. Subscriptions are purchased and managed in the PalmCare iOS app via your Apple ID.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-semibold transition ${!annual ? 'text-white' : 'text-white/40'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-teal-500' : 'bg-white/20'}`}
            aria-label="Toggle annual billing"
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${annual ? 'translate-x-7' : 'translate-x-0'}`}
            />
          </button>
          <span className={`text-sm font-semibold transition ${annual ? 'text-white' : 'text-white/40'}`}>
            Annual
          </span>
          {annual && (
            <span className="text-teal-400 text-xs font-semibold bg-teal-400/10 px-2.5 py-1 rounded-full border border-teal-400/20">
              Save 20%
            </span>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const monthlyDisplay = plan.monthlyPrice
              ? annual
                ? ((plan.annualPrice ?? 0) / 12).toFixed(2)
                : plan.monthlyPrice.toFixed(2)
              : null;
            const annualTotal = plan.annualPrice;
            const monthlySavings = plan.monthlyPrice && plan.annualPrice
              ? (plan.monthlyPrice * 12 - plan.annualPrice).toFixed(0)
              : null;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
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

                <div className="mb-1">
                  {monthlyDisplay !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">${monthlyDisplay}</span>
                      <span className="text-white/40 text-sm">/mo</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-white">Custom</div>
                  )}
                </div>

                {annual && monthlySavings && annualTotal ? (
                  <p className="text-teal-400 text-xs font-medium mb-4">
                    ${annualTotal.toLocaleString()}/yr — save ${monthlySavings}/yr
                  </p>
                ) : plan.monthlyPrice ? (
                  <p className="text-white/30 text-xs mb-4">
                    {annual ? '' : `$${((plan.annualPrice ?? 0) / 12).toFixed(2)}/mo billed annually`}
                  </p>
                ) : (
                  <p className="text-white/30 text-xs mb-4">Tailored to your needs</p>
                )}

                <p className="text-white/50 text-sm mb-4 leading-relaxed">{plan.description}</p>

                {/* Trial / No-overage pill */}
                {plan.hasTrial ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4 w-fit">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">14 day free trial</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4 w-fit">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">No overage fees</span>
                  </div>
                )}

                {/* Key metrics */}
                {plan.assessments !== null ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-white">{plan.assessments}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Assessments</p>
                    </div>
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-white">{plan.teamMembers}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Team Members</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-white">∞</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Assessments</p>
                    </div>
                    <div className="bg-white/5 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-white">∞</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Team Members</p>
                    </div>
                  </div>
                )}

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/70">
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

                {plan.hasTrial && (
                  <p className="text-center text-white/30 text-xs mt-3">14 day free trial included</p>
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
            {
              q: 'Do I need a credit card for the free trial?',
              a: 'No. You can create your account and start a 14-day free trial with full access — no credit card required. When you\'re ready to subscribe, you do so in the PalmCare iOS app through your Apple ID.',
            },
            {
              q: 'How do subscriptions and payments work?',
              a: 'Subscriptions are purchased and billed through Apple In-App Purchase in the PalmCare iOS app. Open the app, go to Settings → Subscription, and choose your plan. Apple handles payment securely with your Apple ID.',
            },
            {
              q: 'What happens after the 14-day trial?',
              a: 'When your trial ends, subscribe in the PalmCare iOS app to keep full access: Starter ($199/mo), Growth ($699/mo), or Enterprise ($1,199.99/mo). Annual billing saves 20% on every plan. Your data is preserved while you decide.',
            },
            {
              q: 'Which plans include the free trial?',
              a: 'Starter and Growth both include a 14 day free trial through your Apple ID. Enterprise does not include a trial, but you can book a live demo with our team before subscribing.',
            },
            {
              q: 'How does annual billing work?',
              a: 'Every plan has an annual option that saves at least 20% versus paying monthly: Starter is $1,899.99/yr, Growth is $6,699.99/yr, and Enterprise is $10,000/yr (about 30% off). Annual plans are billed once a year through your Apple ID.',
            },
            {
              q: 'What happens if I exceed my assessment limit?',
              a: 'Starter includes 20 assessments a month and Growth includes 75. If you need more, upgrade to the next plan at any time. Enterprise includes unlimited assessments.',
            },
            {
              q: 'Can I change plans later?',
              a: 'Yes. You can upgrade or downgrade anytime in the iOS app under Settings → Subscription. Plan changes are handled by Apple and take effect per Apple\'s billing rules.',
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
