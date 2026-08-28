'use client';

import { X, Zap, Check, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  usedCount: number;
  maxCount: number;
}

const PLANS = [
  {
    name: 'PalmCare Mobile',
    price: '89.99',
    period: '/mo',
    description: '15 assessments and 30 clients per month. iPhone plus web CRM.',
    features: [
      '15 AI assessments per month',
      'Web CRM for up to 30 clients',
      'AI voice to contract',
      'SOAP notes and billables',
      '50-state compliance engine',
      'HIPAA BAA included',
    ],
    popular: false,
    borderColor: 'border-slate-200',
  },
  {
    name: 'PalmCare Platform',
    price: '199.99',
    period: '/mo',
    description: '30 assessments and 150 clients per month. Full CRM and team seats.',
    features: [
      '30 AI assessments per month',
      'Web CRM for up to 150 clients',
      'Team seats, pipeline, and calendar',
      'Custom contract templates',
      'Priority support',
    ],
    popular: true,
    borderColor: 'border-primary-500/50',
  },
];

export default function UpgradeModal({ isOpen, onClose, usedCount, maxCount }: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSelectPlan = (_planName: string) => {
    // Subscriptions are purchased via Apple In-App Purchase in the iOS app.
    router.push('/billing');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-600 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Free Plan Limit Reached
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Upgrade to Continue
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            You&apos;ve completed <span className="text-slate-900 font-semibold">{usedCount}</span> of{' '}
            <span className="text-slate-900 font-semibold">{maxCount}</span> free assessments.
            Choose Mobile or Platform in the iOS app to keep going.
          </p>

          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex justify-between text-sm text-slate-500 mb-1">
              <span>Assessments used</span>
              <span className="text-amber-600 font-medium">{usedCount}/{maxCount}</span>
            </div>
            <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all"
                style={{ width: `${Math.min((usedCount / maxCount) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-8 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border ${
                  plan.popular
                    ? `${plan.borderColor} bg-slate-100`
                    : 'border-slate-200 bg-slate-50'
                } p-6 flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full">
                    Most popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                  <span className="text-slate-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    plan.popular
                      ? 'bg-primary-500 hover:bg-primary-600 text-white'
                      : 'border border-primary-500/40 text-primary-700 hover:bg-primary-500/5'
                  }`}
                >
                  View in billing <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-6">
            Subscribe in the PalmCare iOS app (Apple In-App Purchase). Enterprise quotes at{' '}
            <button
              type="button"
              className="text-primary-600 underline"
              onClick={() => {
                router.push('/book-demo');
                onClose();
              }}
            >
              book a demo
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
