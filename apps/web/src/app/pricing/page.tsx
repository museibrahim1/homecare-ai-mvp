'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check, Mic, ArrowRight, Building2, Users, FileText,
  BarChart3, Zap, Shield, Clock, Headphones, Star
} from 'lucide-react';

interface PricingPlan {
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  setupFee: number | null;
  features: string[];
  highlighted: boolean;
  cta: string;
  href: string;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plans: PricingPlan[] = [
    {
      name: 'Starter',
      description: 'For small agencies getting organized fast',
      monthlyPrice: 295,
      annualPrice: 3009, // ~15% off
      setupFee: null,
      features: [
        '25 generated contracts / month',
        'Up to 50 clients in CRM',
        'Up to 25 caregivers in CRM',
        '3 team seats included',
        'Assessment intake + transcript import/upload',
        'AI billables extraction',
        'Contract templates + PDF exports',
        'Basic reports',
      ],
      highlighted: false,
      cta: 'Get Started',
      href: '/register?plan=starter',
    },
    {
      name: 'Growth',
      description: 'For growing teams running consistent assessments',
      monthlyPrice: 495,
      annualPrice: 5049, // ~15% off
      setupFee: null,
      features: [
        '100 generated contracts / month',
        'Up to 200 clients in CRM',
        'Up to 100 caregivers in CRM',
        '10 team seats included',
        'Everything in Starter, plus:',
        'Advanced contract templates',
        'Exports: contract PDF + timesheet CSV',
        'Priority support',
      ],
      highlighted: true,
      cta: 'Get Started',
      href: '/register?plan=growth',
    },
    {
      name: 'Pro',
      description: 'For high-volume teams that need scale and control',
      monthlyPrice: 895,
      annualPrice: 9129, // ~15% off
      setupFee: null,
      features: [
        '300 generated contracts / month',
        'Up to 1,000 clients in CRM',
        'Up to 500 caregivers in CRM',
        'Unlimited team seats',
        'Everything in Growth, plus:',
        'Multi-location management',
        'Advanced analytics',
        'Integrations & API',
      ],
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
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-dark-300 mb-8">
            Costs less than one part-time admin and pays for itself within the first month.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-dark-800 rounded-xl mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-lg font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-primary-500 text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-primary-500 text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              Annual
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                Save 15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const price = getPrice(plan);
            const savings = getAnnualSavings(plan);
            
            return (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-primary-500/10 to-dark-800 border-primary-500/50'
                    : 'bg-dark-800 border-dark-700'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-full flex items-center gap-1.5">
                      <Star className="w-4 h-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-dark-400 text-sm mb-6">{plan.description}</p>

                {price !== null ? (
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">${price.toLocaleString()}</span>
                      <span className="text-dark-400">/month</span>
                    </div>
                    {billingCycle === 'annual' && savings > 0 && (
                      <p className="text-green-400 text-sm mt-1">
                        Save ${savings.toLocaleString()}/year
                      </p>
                    )}
                    {plan.setupFee && (
                      <p className="text-dark-500 text-sm mt-2">
                        ${plan.setupFee.toLocaleString()} one-time setup
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-white">Custom</span>
                    <p className="text-dark-400 text-sm mt-1">Tailored to your needs</p>
                  </div>
                )}

                <Link
                  href={plan.href}
                  className={`block w-full py-3 px-4 rounded-xl font-medium text-center transition mb-8 ${
                    plan.highlighted
                      ? 'bg-primary-500 text-white hover:bg-primary-600'
                      : 'bg-dark-700 text-white hover:bg-dark-600'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="inline-block w-4 h-4 ml-2" />
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        i === 0 && plan.name !== 'Growth' ? 'text-primary-400' : 'text-green-400'
                      }`} />
                      <span className={`text-sm ${
                        i === 0 && plan.name !== 'Growth' ? 'text-primary-400 font-medium' : 'text-dark-300'
                      }`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Value Prop */}
      <section className="py-20 px-6 bg-dark-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12">
            Why agencies choose Homecare AI
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-primary-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Save 20+ hours/week</h3>
              <p className="text-dark-400 text-sm">
                Automate assessments, billing, and documentation
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Increase revenue</h3>
              <p className="text-dark-400 text-sm">
                AI captures billable items you might miss
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">HIPAA compliant</h3>
              <p className="text-dark-400 text-sm">
                Enterprise-grade security and compliance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
              <h3 className="text-white font-semibold mb-2">Do you charge a setup fee?</h3>
              <p className="text-dark-400">
                No setup fee for standard onboarding. If you want white-glove onboarding (template customization,
                workflow setup, and team training), we offer optional onboarding packages.
              </p>
            </div>
            <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
              <h3 className="text-white font-semibold mb-2">Can I switch plans later?</h3>
              <p className="text-dark-400">
                Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, 
                and downgrades apply at the start of your next billing cycle.
              </p>
            </div>
            <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
              <h3 className="text-white font-semibold mb-2">How do limits work (contracts, clients, caregivers, seats)?</h3>
              <p className="text-dark-400">
                Each plan includes monthly generated contracts plus CRM limits for clients, caregivers, and team seats.
                If you outgrow a limit, you can upgrade any time.
              </p>
            </div>
            <div className="p-6 bg-dark-800 rounded-xl border border-dark-700">
              <h3 className="text-white font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-dark-400">
                We offer a guided demo and pilot program for qualified agencies.
                Start with Starter, or contact us if you want a pilot workflow configured for your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-b from-primary-500/10 to-dark-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to transform your agency?
          </h2>
          <p className="text-xl text-dark-300 mb-8">
            Join hundreds of home healthcare agencies saving time and increasing revenue.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-dark-800 text-white rounded-xl font-medium hover:bg-dark-700 transition border border-dark-700"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-dark-700">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">Homecare AI</span>
          </div>
          <p className="text-dark-500 text-sm">
            © {new Date().getFullYear()} Homecare AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
