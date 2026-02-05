'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check, X, Mic, ArrowRight, Building2, Users, 
  Zap, Shield, Headphones, HelpCircle
} from 'lucide-react';

interface PricingPlan {
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  setupFee: number | null;
  highlighted: boolean;
  cta: string;
  href: string;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plans: PricingPlan[] = [
    {
      name: 'Starter',
      description: 'For small agencies getting organized',
      monthlyPrice: 299,
      annualPrice: 3049,
      setupFee: null,
      highlighted: false,
      cta: 'Get Started',
      href: '/register?plan=starter',
    },
    {
      name: 'Growth',
      description: 'For growing teams',
      monthlyPrice: 599,
      annualPrice: 6109,
      setupFee: null,
      highlighted: true,
      cta: 'Get Started',
      href: '/register?plan=growth',
    },
    {
      name: 'Pro',
      description: 'For high-volume teams',
      monthlyPrice: 1299,
      annualPrice: 13249,
      setupFee: null,
      highlighted: false,
      cta: 'Get Started',
      href: '/register?plan=pro',
    },
  ];

  const getPrice = (plan: PricingPlan): number | null => {
    if (plan.monthlyPrice === null || plan.annualPrice === null) return null;
    return billingCycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12);
  };

  const getAnnualSavings = (plan: PricingPlan): number => {
    if (plan.monthlyPrice === null || plan.annualPrice === null) return 0;
    return (plan.monthlyPrice * 12) - plan.annualPrice;
  };

  // Feature comparison data
  const featureCategories = [
    {
      name: 'Core Features',
      features: [
        { name: 'Generated contracts / month', values: ['5', '25', 'Unlimited'] },
        { name: 'Clients in CRM', values: ['50', '200', '1,000'] },
        { name: 'Caregivers in CRM', values: ['25', '100', '500'] },
        { name: 'Team seats', values: ['1', '10', 'Unlimited'] },
        { name: 'Assessment intake', values: [true, true, true] },
        { name: 'Transcript import/upload', values: [true, true, true] },
        { name: 'AI billables extraction', values: [true, true, true] },
        { name: 'Contract templates', values: ['Basic', 'Advanced', 'Advanced'] },
        { name: 'PDF exports', values: [true, true, true] },
      ],
    },
    {
      name: 'Advanced',
      features: [
        { name: 'Timesheet CSV exports', values: [false, true, true] },
        { name: 'Multi-location management', values: [false, false, true] },
        { name: 'Advanced analytics', values: [false, false, true] },
        { name: 'Integrations & API', values: [false, false, true] },
        { name: 'Custom templates', values: [false, false, true] },
      ],
    },
    {
      name: 'Support',
      features: [
        { name: 'Email support', values: [true, true, true] },
        { name: 'Priority support', values: [false, true, true] },
        { name: 'Dedicated success manager', values: [false, false, true] },
        { name: 'Custom onboarding', values: [false, false, true] },
        { name: 'SLA guarantee', values: [false, false, true] },
      ],
    },
  ];

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-400 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-dark-500 mx-auto" />
      );
    }
    return <span className="text-white text-sm">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700/50 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Homecare AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-dark-300 hover:text-white transition">
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-dark-400 mb-8">
            Choose the plan that fits your agency. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-dark-800 p-1.5 rounded-xl mb-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-primary-500 text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                billingCycle === 'annual'
                  ? 'bg-primary-500 text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = getPrice(plan);
              const savings = getAnnualSavings(plan);

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-6 ${
                    plan.highlighted
                      ? 'bg-gradient-to-b from-primary-500/20 to-dark-800 border-2 border-primary-500'
                      : 'bg-dark-800 border border-dark-700'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-dark-400 text-sm">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    {price !== null ? (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-white">
                            ${price.toLocaleString()}
                          </span>
                          <span className="text-dark-400">/mo</span>
                        </div>
                        {billingCycle === 'annual' && savings > 0 && (
                          <p className="text-green-400 text-sm mt-1">
                            Save ${savings.toLocaleString()}/year
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-3xl font-bold text-white">Custom</div>
                    )}
                  </div>

                  <Link
                    href={plan.href}
                    className={`block w-full py-3 rounded-xl font-medium text-center transition ${
                      plan.highlighted
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-dark-700 text-white hover:bg-dark-600'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Compare plans
          </h2>
          <p className="text-dark-400 text-center mb-12">
            Find the perfect plan for your agency
          </p>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-dark-700 bg-dark-800">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-dark-850 border-b border-dark-700">
              <div className="p-6">
                <span className="text-dark-400 text-sm font-medium">Features</span>
              </div>
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`p-6 text-center ${
                    plan.highlighted ? 'bg-primary-500/10' : ''
                  }`}
                >
                  <h4 className="text-white font-semibold">{plan.name}</h4>
                  {getPrice(plan) !== null ? (
                    <p className="text-dark-400 text-sm">
                      ${getPrice(plan)?.toLocaleString()}/mo
                    </p>
                  ) : (
                    <p className="text-dark-400 text-sm">Custom</p>
                  )}
                </div>
              ))}
            </div>

            {/* Feature Rows */}
            {featureCategories.map((category) => (
              <div key={category.name}>
                {/* Category Header */}
                <div className="grid grid-cols-4 bg-dark-800/50 border-b border-dark-700/50">
                  <div className="col-span-4 px-6 py-3">
                    <span className="text-primary-400 text-sm font-semibold uppercase tracking-wider">
                      {category.name}
                    </span>
                  </div>
                </div>

                {/* Features */}
                {category.features.map((feature, idx) => (
                  <div
                    key={feature.name}
                    className={`grid grid-cols-4 border-b border-dark-700/30 ${
                      idx % 2 === 0 ? 'bg-dark-800' : 'bg-dark-800/50'
                    }`}
                  >
                    <div className="p-4 flex items-center">
                      <span className="text-dark-300 text-sm">{feature.name}</span>
                    </div>
                    {feature.values.map((value, planIdx) => (
                      <div
                        key={planIdx}
                        className={`p-4 text-center flex items-center justify-center ${
                          plans[planIdx].highlighted ? 'bg-primary-500/5' : ''
                        }`}
                      >
                        {renderFeatureValue(value)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {/* CTA Row */}
            <div className="grid grid-cols-4 border-t border-dark-700">
              <div className="p-6"></div>
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`p-6 text-center ${
                    plan.highlighted ? 'bg-primary-500/10' : ''
                  }`}
                >
                  <Link
                    href={plan.href}
                    className={`inline-block px-6 py-2.5 rounded-xl font-medium text-sm transition ${
                      plan.highlighted
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-dark-700 text-white hover:bg-dark-600'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Feature Cards */}
          <div className="lg:hidden space-y-6">
            {plans.map((plan, planIdx) => (
              <div
                key={plan.name}
                className={`rounded-2xl overflow-hidden ${
                  plan.highlighted
                    ? 'border-2 border-primary-500'
                    : 'border border-dark-700'
                }`}
              >
                <div className={`p-6 ${plan.highlighted ? 'bg-primary-500/20' : 'bg-dark-800'}`}>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  {getPrice(plan) !== null ? (
                    <p className="text-2xl font-bold text-white">
                      ${getPrice(plan)?.toLocaleString()}
                      <span className="text-dark-400 text-base font-normal">/mo</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-white">Custom pricing</p>
                  )}
                </div>

                <div className="bg-dark-800 p-6 space-y-4">
                  {featureCategories.map((category) => (
                    <div key={category.name}>
                      <h4 className="text-primary-400 text-xs font-semibold uppercase tracking-wider mb-3">
                        {category.name}
                      </h4>
                      <ul className="space-y-2">
                        {category.features.map((feature) => {
                          const value = feature.values[planIdx];
                          if (value === false) return null;
                          return (
                            <li key={feature.name} className="flex items-center gap-3">
                              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                              <span className="text-dark-300 text-sm">
                                {feature.name}
                                {typeof value === 'string' && value !== 'true' && (
                                  <span className="text-white ml-1">({value})</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}

                  <Link
                    href={plan.href}
                    className={`block w-full py-3 rounded-xl font-medium text-center transition mt-6 ${
                      plan.highlighted
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-dark-700 text-white hover:bg-dark-600'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 bg-dark-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Questions & Answers
          </h2>
          <p className="text-dark-400 text-center mb-12">
            Everything you need to know about Homecare AI
          </p>

          <div className="space-y-4">
            {[
              {
                q: 'Is there a free trial?',
                a: 'Yes! All plans include a 14-day free trial. No credit card required to start.',
              },
              {
                q: 'Can I switch plans at any time?',
                a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately.',
              },
              {
                q: 'What happens if I exceed my limits?',
                a: "We'll notify you when you're approaching your limits. You can upgrade anytime or we can discuss custom options.",
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. We use bank-level encryption, are HIPAA compliant, and never share your data with third parties.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees.',
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group bg-dark-800 rounded-xl border border-dark-700 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="text-white font-medium">{faq.q}</span>
                  <HelpCircle className="w-5 h-5 text-dark-400 group-open:text-primary-400 transition" />
                </summary>
                <div className="px-5 pb-5 text-dark-400">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-dark-400 mb-4">Still have questions?</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium"
            >
              Talk to our team <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your agency?
          </h2>
          <p className="text-dark-400 mb-8">
            Join hundreds of home healthcare agencies using Homecare AI to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-600 transition"
            >
              Start free trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-dark-300 hover:text-white transition"
            >
              Schedule a demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-dark-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>HIPAA Compliant</span>
            <span className="mx-2">•</span>
            <span>SOC 2 Type II</span>
          </div>
          <p className="text-dark-500 text-sm">
            © 2024 Homecare AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
