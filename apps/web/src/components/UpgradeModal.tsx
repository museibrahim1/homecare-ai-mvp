'use client';

import { X, Zap, Check, Crown, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  usedCount: number;
  maxCount: number;
}

const PLANS = [
  {
    name: 'Starter',
    price: 299,
    period: '/mo',
    description: 'For small agencies getting organized',
    features: [
      '25 assessments/month',
      '50 clients in CRM',
      '25 caregivers',
      '3 team seats',
      'Email support',
    ],
    popular: false,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
  },
  {
    name: 'Growth',
    price: 599,
    period: '/mo',
    description: 'For growing teams',
    features: [
      '100 assessments/month',
      '200 clients in CRM',
      '100 caregivers',
      '10 team seats',
      'Priority support',
    ],
    popular: true,
    color: 'from-primary-500 to-purple-500',
    borderColor: 'border-primary-500/50',
  },
  {
    name: 'Pro',
    price: 1299,
    period: '/mo',
    description: 'For high-volume teams',
    features: [
      '300 assessments/month',
      '1,000 clients in CRM',
      '500 caregivers',
      'Unlimited seats',
      'Advanced analytics',
    ],
    popular: false,
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/30',
  },
];

export default function UpgradeModal({ isOpen, onClose, usedCount, maxCount }: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSelectPlan = (planName: string) => {
    // Navigate to pricing page or open Stripe checkout
    router.push('/#pricing');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-800 rounded-2xl border border-dark-600 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Free Plan Limit Reached
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Upgrade to Continue
          </h2>
          <p className="text-dark-400 max-w-lg mx-auto">
            You&apos;ve completed <span className="text-white font-semibold">{usedCount}</span> of{' '}
            <span className="text-white font-semibold">{maxCount}</span> free assessments.
            Upgrade your plan to unlock unlimited assessments and more features.
          </p>

          {/* Usage bar */}
          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex justify-between text-sm text-dark-400 mb-1">
              <span>Assessments used</span>
              <span className="text-amber-400 font-medium">{usedCount}/{maxCount}</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all"
                style={{ width: `${Math.min((usedCount / maxCount) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="p-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border ${
                  plan.popular
                    ? `${plan.borderColor} bg-dark-700/50`
                    : 'border-dark-600 bg-dark-750'
                } p-6 flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full text-white text-xs font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-bold text-white mt-1">{plan.name}</h3>
                <p className="text-dark-400 text-sm mt-1">{plan.description}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-dark-400 text-sm">{plan.period}</span>
                </div>

                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-dark-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`mt-6 w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white hover:opacity-90'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-dark-500 text-sm mt-6">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
