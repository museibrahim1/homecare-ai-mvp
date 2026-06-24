'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Honest, input-driven savings estimator. Every number comes from the user's
 * own inputs and a transparent, editable assumption for review time — there are
 * no hidden "90% faster" claims baked in.
 */
export default function RoiCalculator() {
  const [assessments, setAssessments] = useState(20);
  const [minutesNow, setMinutesNow] = useState(90);
  const [reviewMinutes, setReviewMinutes] = useState(10);
  const [hourlyCost, setHourlyCost] = useState(35);

  const r = useMemo(() => {
    const safeReview = Math.min(reviewMinutes, minutesNow);
    const hoursNowMo = (assessments * minutesNow) / 60;
    const hoursPalmMo = (assessments * safeReview) / 60;
    const hoursSavedMo = Math.max(hoursNowMo - hoursPalmMo, 0);
    const hoursSavedYr = hoursSavedMo * 12;
    const dollarsSavedMo = hoursSavedMo * hourlyCost;
    const dollarsSavedYr = dollarsSavedMo * 12;
    return { hoursNowMo, hoursSavedMo, hoursSavedYr, dollarsSavedMo, dollarsSavedYr };
  }, [assessments, minutesNow, reviewMinutes, hourlyCost]);

  const fmtH = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1));
  const fmt$ = (n: number) => '$' + Math.round(n).toLocaleString();

  const field = (
    label: string,
    value: number,
    setValue: (n: number) => void,
    min: number,
    max: number,
    step: number,
    suffix: string,
  ) => (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-semibold text-slate-900">
          {value}
          <span className="text-slate-400 font-normal"> {suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-primary-600"
        aria-label={label}
      />
    </div>
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
      {/* Inputs */}
      <div className="card p-6 sm:p-8">
        <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-5">Your numbers</p>
        <div className="space-y-6">
          {field('Assessments per month', assessments, setAssessments, 1, 200, 1, '/mo')}
          {field('Minutes of documentation per assessment today', minutesNow, setMinutesNow, 10, 240, 5, 'min')}
          {field('Minutes to review PALM’s output', reviewMinutes, setReviewMinutes, 1, 60, 1, 'min')}
          {field('Staff cost per hour', hourlyCost, setHourlyCost, 15, 120, 1, '/hr')}
        </div>
        <p className="text-xs text-slate-400 mt-6 leading-relaxed">
          Estimates use only the values you enter. “Review time” is the minutes a staff
          member spends checking and approving PALM’s draft — adjust it to match your team.
        </p>
      </div>

      {/* Results */}
      <div className="card p-6 sm:p-8 ring-1 ring-primary-100 bg-primary-50/30 flex flex-col">
        <p className="text-sm font-semibold text-primary-700 uppercase tracking-wider mb-5">Your estimated savings</p>
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{fmtH(r.hoursSavedMo)}</p>
            <p className="text-xs text-slate-500 mt-1">hours saved / month</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{fmtH(r.hoursSavedYr)}</p>
            <p className="text-xs text-slate-500 mt-1">hours saved / year</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl sm:text-3xl font-bold text-primary-700">{fmt$(r.dollarsSavedMo)}</p>
            <p className="text-xs text-slate-500 mt-1">labor saved / month</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-2xl sm:text-3xl font-bold text-primary-700">{fmt$(r.dollarsSavedYr)}</p>
            <p className="text-xs text-slate-500 mt-1">labor saved / year</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mt-6 leading-relaxed">
          That’s about <span className="font-semibold text-slate-900">{fmtH(r.hoursSavedMo)} hours</span> a
          month your team could spend on care instead of paperwork — roughly{' '}
          <span className="font-semibold text-slate-900">{fmt$(r.dollarsSavedYr)}</span> in staff time a year.
        </p>

        <div className="mt-auto pt-6">
          <Link href="/register" className="btn-primary inline-flex items-center justify-center gap-2 py-3 px-6 w-full sm:w-auto">
            Start your free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
