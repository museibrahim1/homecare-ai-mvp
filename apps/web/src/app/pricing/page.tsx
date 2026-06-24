'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Zap, Building2, Rocket, TrendingUp, Phone, CreditCard, Shield, Clock, AlertTriangle, BadgeCheck } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    monthlyPrice: 89.99,
    annualPrice: 899,
    description: 'For small agencies getting started with AI-powered documentation',
    icon: Zap,
    assessments: 5,
    teamMembers: '5',
    features: [
      '5 assessments/month',
      '5 team members',
      'AI voice-to-contract',
      'Smart SOAP notes',
      'Basic reporting',
      'Email support',
      '5 GB storage',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=starter',
    popular: false,
    hasOverage: true,
  },
  {
    name: 'Growth',
    tier: 'growth',
    monthlyPrice: 179.99,
    annualPrice: 1799,
    description: 'For growing agencies scaling their documentation workflow',
    icon: TrendingUp,
    assessments: 25,
    teamMembers: '15',
    features: [
      '25 assessments/month',
      '15 team members',
      'AI voice-to-contract',
      'Smart SOAP notes',
      'Advanced analytics & reporting',
      'Priority support',
      '15 GB storage',
      'Custom contract templates',
      'Team management',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=growth',
    popular: true,
    hasOverage: true,
  },
  {
    name: 'Professional',
    tier: 'professional',
    monthlyPrice: 299.99,
    annualPrice: 2999,
    description: 'For established agencies that need maximum capacity',
    icon: Rocket,
    assessments: 75,
    teamMembers: 'Unlimited',
    features: [
      '75 assessments/month',
      'Unlimited team members',
      'AI voice-to-contract',
      'Smart SOAP notes',
      'Advanced analytics & dashboards',
      'Priority support',
      '50 GB storage',
      'Custom contract templates',
      'Team management',
      '50-state compliance engine',
    ],
    cta: 'Start Free Trial',
    href: '/register?plan=professional',
    popular: false,
    hasOverage: true,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    monthlyPrice: null,
    annualPrice: null,
    description: 'For large agencies with custom requirements and dedicated support',
    icon: Building2,
    assessments: null,
    teamMembers: 'Unlimited',
    features: [
      'Unlimited assessments',
      'Unlimited team members',
      'AI voice-to-contract',
      'Smart SOAP notes',
      'Custom analytics & dashboards',
      'Dedicated account manager',
      'Unlimited storage',
      'Custom integrations',
      'HIPAA BAA included',
      'On-site training',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: '/contact?inquiry=enterprise',
    popular: false,
    hasOverage: false,
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
              2 months free
            </span>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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

                {/* Overage / No-overage pill */}
                {plan.hasOverage ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 w-fit">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">$13/extra assessment</span>
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

                {plan.monthlyPrice && (
                  <p className="text-center text-white/30 text-xs mt-3">14-day free trial included</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Extended trial banner */}
        <div className="mt-8 bg-gradient-to-r from-amber-500/10 to-teal-500/10 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-white font-semibold text-sm mb-1">Want more time?</p>
          <p className="text-white/60 text-sm">
            Get a <span className="text-amber-400 font-semibold">30-day extended trial</span> for just
            <span className="text-white font-semibold"> $39.99</span>. Choose this option during signup.
          </p>
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
              a: 'When your trial ends, subscribe in the PalmCare iOS app to keep full access: Starter ($89.99/mo), Growth ($179.99/mo), or Professional ($299.99/mo). Your data is preserved while you decide.',
            },
            {
              q: 'What happens if I exceed my assessment limit?',
              a: 'On Starter, Growth, and Professional plans, each assessment beyond your monthly limit costs $13. Enterprise plans include unlimited assessments with no overage fees.',
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
