'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, ChevronRight, ChevronLeft, Home, Users, Calendar, Mic,
  FileText, MessageSquare, Bell, BarChart3, CalendarDays,
  Target, UserCheck, Settings, Heart, Sparkles, CheckCircle,
  ArrowRight, Activity, HelpCircle, BookOpen, Navigation
} from 'lucide-react';
import { useWalkthrough } from '@/lib/walkthrough';

/* ─── Types ─── */
interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  tip?: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  route?: string;
  illustration?: 'welcome' | 'done';
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Homecare AI',
    description: 'This quick tour will walk you through the key features of your homecare CRM. It takes about 2 minutes and you can revisit it anytime from Help & Support.',
    tip: 'Use arrow keys to navigate. Press Escape to exit.',
    icon: Sparkles,
    iconBg: 'bg-gradient-to-br from-primary-500 to-accent-cyan',
    iconColor: 'text-white',
    illustration: 'welcome',
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'Your command center. See active clients, assessments in progress, upcoming tasks, and your client pipeline at a glance. The onboarding checklist tracks your setup progress until you dismiss it.',
    tip: 'The dashboard auto-refreshes so you always see live data.',
    icon: Home,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    route: '/dashboard',
  },
  {
    id: 'clients',
    title: 'Client Management',
    description: 'Manage your entire client base. The **Table View** groups clients by status. The **Pipeline View** is a drag-and-drop Kanban board — drag clients between stages like New Referrals, In Assessment, Awaiting Approval, and Active Care.',
    tip: 'Use the quick-add button to create a new referral in seconds with priority level and care specialty.',
    icon: Users,
    iconBg: 'bg-green-500/15',
    iconColor: 'text-green-400',
    route: '/clients',
  },
  {
    id: 'assessments',
    title: 'Assessments & Voice Recording',
    description: 'Upload an audio recording of a care assessment or record one live. Our AI transcribes it, extracts key client information, identifies billable services, and generates visit notes — all automatically.',
    tip: 'Supported formats: MP3, WAV, M4A. Most recordings process in 2-5 minutes.',
    icon: Mic,
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-400',
    route: '/visits',
  },
  {
    id: 'contracts',
    title: 'Proposals & Contracts',
    description: 'After an assessment is processed, generate a professional service contract with one click. Review the AI-extracted details, make edits, then export as PDF or email directly to the client.',
    tip: 'Contracts automatically pull in your agency branding from Settings.',
    icon: FileText,
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-400',
    route: '/proposals',
  },
  {
    id: 'schedule',
    title: 'My Schedule',
    description: 'Plan your day with three calendar views — **Day** (visual timeline), **Week** (7-day overview), and **Month**. Click any time slot to quickly book an appointment. Connect Google Calendar for two-way sync.',
    tip: 'Appointments are color-coded by type: Assessment, Care Review, Meeting, Home Visit.',
    icon: CalendarDays,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    route: '/schedule',
  },
  {
    id: 'care-tracker',
    title: 'Post-Visit Care Tracker',
    description: 'Track what happens after each visit. The **Timeline View** shows progress bars from start to target date with overdue alerts. The **Board View** is a Kanban with stages: Follow-up Needed, Care Plan Under Review, and Ongoing Care.',
    tip: 'Clients with no contact in 7+ days are automatically flagged.',
    icon: Activity,
    iconBg: 'bg-teal-500/15',
    iconColor: 'text-teal-400',
    route: '/care-tracker',
  },
  {
    id: 'pipeline',
    title: 'Deals Pipeline',
    description: 'Track your sales opportunities from initial referral through to signed contracts. Each deal card shows the client, estimated value, and status. Move deals between stages to track your revenue pipeline.',
    tip: 'Great for tracking which referrals convert into active clients.',
    icon: Target,
    iconBg: 'bg-pink-500/15',
    iconColor: 'text-pink-400',
    route: '/pipeline',
  },
  {
    id: 'team-chat',
    title: 'Team Chat & Email',
    description: 'Coordinate with your care team in real-time. Create channels for different topics (scheduling, urgent, general). The Gmail tab lets you view and manage emails right from the app.',
    tip: 'Use @mentions to get a team member\'s attention quickly.',
    icon: MessageSquare,
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
    route: '/team-chat',
  },
  {
    id: 'notifications',
    title: 'Smart Notifications',
    description: 'The notification bell in the top bar aggregates alerts from everywhere — upcoming appointments, overdue tasks, unread messages, emails, and follow-up reminders. Notifications are sorted by priority so you never miss what matters.',
    tip: 'Click any notification to jump directly to the relevant page.',
    icon: Bell,
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-400',
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'View detailed reports on assessments completed, revenue trends, client growth, and caregiver performance. Export reports as PDFs for stakeholders or compliance audits.',
    tip: 'Reports update in real-time as you complete assessments and sign contracts.',
    icon: BarChart3,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
    route: '/reports',
  },
  {
    id: 'settings',
    title: 'Agency Settings',
    description: 'Customize your experience. Set up your agency profile (logo, address, contact info), configure notification preferences, manage team members, and connect Google Calendar and Gmail.',
    tip: 'Your agency profile appears on all generated contracts and proposals.',
    icon: Settings,
    iconBg: 'bg-dark-600',
    iconColor: 'text-dark-300',
    route: '/settings',
  },
  {
    id: 'done',
    title: 'You\'re All Set!',
    description: 'You now know the key features of Homecare AI. Start by adding your first client, then try recording an assessment. You can revisit this tour anytime from Help & Support.',
    icon: CheckCircle,
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    iconColor: 'text-white',
    illustration: 'done',
  },
];

/* ─── Component ─── */
export default function WalkthroughGuide() {
  const router = useRouter();
  const { isOpen, close } = useWalkthrough();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  // Reset step when opening
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const goNext = useCallback(() => {
    if (step >= WALKTHROUGH_STEPS.length - 1) {
      close();
      return;
    }
    setDirection('next');
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimating(false);
    }, 150);
  }, [step, close]);

  const goPrev = useCallback(() => {
    if (step <= 0) return;
    setDirection('prev');
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setAnimating(false);
    }, 150);
  }, [step]);

  const goToStep = useCallback((i: number) => {
    setDirection(i > step ? 'next' : 'prev');
    setAnimating(true);
    setTimeout(() => {
      setStep(i);
      setAnimating(false);
    }, 150);
  }, [step]);

  const goToPage = useCallback(() => {
    const current = WALKTHROUGH_STEPS[step];
    if (current.route) {
      close();
      router.push(current.route);
    }
  }, [step, router, close]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close, goNext, goPrev]);

  if (!isOpen) return null;

  const current = WALKTHROUGH_STEPS[step];
  const IconComponent = current.icon;
  const isFirst = step === 0;
  const isLast = step === WALKTHROUGH_STEPS.length - 1;
  const progress = ((step + 1) / WALKTHROUGH_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      {/* Card */}
      <div
        className={`relative w-full max-w-lg transition-all duration-150 ease-out ${
          animating
            ? direction === 'next'
              ? 'opacity-0 translate-x-4'
              : 'opacity-0 -translate-x-4'
            : 'opacity-100 translate-x-0'
        }`}
      >
        <div className="bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden">

          {/* Progress bar */}
          <div className="h-1 bg-dark-700">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-dark-500" />
              <span className="text-[11px] font-medium text-dark-500 uppercase tracking-wider">
                Step {step + 1} of {WALKTHROUGH_STEPS.length}
              </span>
            </div>
            <button
              onClick={close}
              className="p-1.5 text-dark-500 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Illustration area for welcome & done */}
            {current.illustration === 'welcome' && (
              <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-cyan/10 border border-primary-500/20">
                <div className="flex -space-x-2">
                  {[Home, Users, Mic, FileText, Calendar].map((Icon, i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-dark-700 border-2 border-dark-800 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary-400" />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-dark-400">
                  <span className="text-white font-medium">{WALKTHROUGH_STEPS.length - 2} features</span> to explore
                </div>
              </div>
            )}

            {current.illustration === 'done' && (
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Icon + Title (non-illustration steps) */}
            {!current.illustration && (
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${current.iconBg}`}>
                <IconComponent className={`w-7 h-7 ${current.iconColor}`} />
              </div>
            )}

            {current.illustration && (
              <div className="flex justify-center mb-2">
                {!current.illustration.includes('done') && (
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${current.iconBg}`}>
                    <IconComponent className={`w-7 h-7 ${current.iconColor}`} />
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <h2 className={`text-xl font-bold mb-2 ${current.illustration === 'done' ? 'text-green-400 text-center' : 'text-white'}`}>
              {current.title}
            </h2>

            {/* Description with markdown-style bold */}
            <p className={`text-dark-300 text-sm leading-relaxed mb-3 ${current.illustration === 'done' ? 'text-center' : ''}`}>
              {current.description.split('**').map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
              )}
            </p>

            {/* Tip */}
            {current.tip && (
              <div className="flex items-start gap-2.5 p-3 bg-primary-500/8 border border-primary-500/15 rounded-xl">
                <HelpCircle className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                <p className="text-xs text-primary-300/80 leading-relaxed">{current.tip}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-dark-700/50 bg-dark-850/50">
            {/* Left: Back or Skip */}
            <div>
              {isFirst ? (
                <button onClick={close} className="text-xs text-dark-500 hover:text-dark-300 transition-colors">
                  Skip tour
                </button>
              ) : (
                <button onClick={goPrev} className="flex items-center gap-1 text-xs text-dark-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
            </div>

            {/* Center: Progress dots */}
            <div className="flex items-center gap-1">
              {WALKTHROUGH_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-5 h-1.5 bg-primary-500'
                      : i < step
                      ? 'w-1.5 h-1.5 bg-primary-500/40 hover:bg-primary-400/60'
                      : 'w-1.5 h-1.5 bg-dark-600 hover:bg-dark-500'
                  }`}
                  title={WALKTHROUGH_STEPS[i].title}
                />
              ))}
            </div>

            {/* Right: Navigate / Next / Finish */}
            <div className="flex items-center gap-2">
              {current.route && !isFirst && !isLast && (
                <button
                  onClick={goToPage}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                  title={`Open ${current.title}`}
                >
                  <Navigation className="w-3 h-3" />
                  Open
                </button>
              )}
              <button
                onClick={isLast ? close : goNext}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isLast
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : isFirst
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-dark-700 hover:bg-dark-600 text-white'
                }`}
              >
                {isLast ? (
                  <>
                    Get Started
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : isFirst ? (
                  <>
                    Start Tour
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
