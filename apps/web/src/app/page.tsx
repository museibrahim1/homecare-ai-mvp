'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Mic, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Play,
  Star,
  Zap,
  Shield,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Pause,
  SkipForward,
  Volume2,
  Video,
  Loader2,
  Mail,
  Building2,
  Phone,
  User,
  Brain,
  ClipboardList,
  HeartPulse,
  TrendingUp,
  Award,
  Globe,
  Headphones,
  Lock,
  Smartphone,
  PieChart,
  Settings,
  HelpCircle,
  Plus,
  Minus
} from 'lucide-react';

/* ───────────────────── DATA ───────────────────── */

const FEATURES_TABS = [
  {
    id: 'ai',
    label: 'AI Intelligence',
    features: [
      {
        icon: Mic,
        title: 'Voice-Powered Assessments',
        description: 'Record care assessments naturally — in person or over the phone. Our AI transcribes conversations, identifies speakers, and extracts care-specific terminology automatically.',
        color: 'from-blue-500 to-cyan-500',
      },
      {
        icon: Brain,
        title: 'Smart Contract Generation',
        description: 'AI reads your assessments and generates professional, proposal-ready contracts complete with services, schedule, rates, and billing terms — in seconds, not hours.',
        color: 'from-purple-500 to-pink-500',
      },
      {
        icon: Zap,
        title: 'Intelligent Data Extraction',
        description: 'Automatically extract billable items, care needs, medications, and special requirements from voice recordings. No manual data entry needed.',
        color: 'from-yellow-500 to-orange-500',
      },
      {
        icon: FileText,
        title: 'OCR Template Engine',
        description: 'Upload your existing contract templates and our OCR engine maps every field to your database. New templates are automatically reconciled with previous versions.',
        color: 'from-green-500 to-emerald-500',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Agency Operations',
    features: [
      {
        icon: Users,
        title: 'Client Management (CRM)',
        description: 'Full pipeline from intake to active care. Track prospects, assessments, and active clients in one unified dashboard with custom stages and notes.',
        color: 'from-blue-500 to-indigo-500',
      },
      {
        icon: ClipboardList,
        title: 'Contract Management',
        description: 'Create, manage, and track all service agreements from a central hub. Upload templates, preview with live data, export to DOCX, and send for signature.',
        color: 'from-teal-500 to-cyan-500',
      },
      {
        icon: Calendar,
        title: 'Scheduling & Visits',
        description: 'Schedule caregiver visits, track clock-in/out, and manage care plans. Caregivers get a mobile companion app for real-time updates.',
        color: 'from-purple-500 to-violet-500',
      },
      {
        icon: Settings,
        title: 'Custom Forms & Templates',
        description: 'Build customized intake forms, assessments, and contracts. Upload your own templates or choose from our professional gallery.',
        color: 'from-slate-500 to-gray-500',
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Reports',
    features: [
      {
        icon: BarChart3,
        title: 'Automatic Billing Extraction',
        description: 'Our AI extracts billable items directly from care assessments — hours, rates, services, and special charges are calculated automatically.',
        color: 'from-green-500 to-emerald-500',
      },
      {
        icon: PieChart,
        title: 'Revenue Analytics',
        description: 'Real-time dashboards showing revenue, client hours, caregiver utilization, and pipeline value. Make data-driven decisions with confidence.',
        color: 'from-orange-500 to-red-500',
      },
      {
        icon: TrendingUp,
        title: 'Custom Reporting',
        description: 'Generate detailed reports on any metric: billing, payroll, hours, referrals, and more. Export to PDF or Excel for stakeholders.',
        color: 'from-cyan-500 to-blue-500',
      },
      {
        icon: Shield,
        title: 'HIPAA-Compliant Security',
        description: '256-bit encryption, role-based access, audit trails, and secure document storage. Your data is protected to the highest healthcare standards.',
        color: 'from-red-500 to-pink-500',
      },
    ],
  },
  {
    id: 'caregiver',
    label: 'Caregiver Tools',
    features: [
      {
        icon: Smartphone,
        title: 'Caregiver Mobile App',
        description: 'Caregivers clock in/out via GPS, log ADLs, view schedules, and receive real-time updates — all from their phone. No training required.',
        color: 'from-violet-500 to-purple-500',
      },
      {
        icon: HeartPulse,
        title: 'ADL & Care Logging',
        description: 'Simple tap-to-log interface for Activities of Daily Living. Track bathing, dressing, medication reminders, meals, and more per visit.',
        color: 'from-pink-500 to-rose-500',
      },
      {
        icon: Globe,
        title: 'Agency Dashboard',
        description: 'Agencies get real-time visibility into every caregiver shift, client status, and care delivery metric across all locations.',
        color: 'from-blue-500 to-sky-500',
      },
      {
        icon: Headphones,
        title: 'Priority Support',
        description: 'Dedicated account manager, live chat, and phone support. Average response time under 15 minutes during business hours.',
        color: 'from-amber-500 to-yellow-500',
      },
    ],
  },
];

const TESTIMONIALS = [
  {
    quote: "PalmCare AI cut our contract generation time from hours to minutes. We went from 3 hours of paperwork per client to under 10 minutes.",
    author: "Sarah Mitchell",
    role: "Agency Owner",
    company: "Sunrise Home Care, TX",
    rating: 5,
    metric: "95% time saved",
  },
  {
    quote: "The voice assessment feature lets our caregivers focus on clients, not paperwork. Our caregiver satisfaction scores went up 40% since switching.",
    author: "Michael Rodriguez",
    role: "Operations Director",
    company: "Coastal Care Services, FL",
    rating: 5,
    metric: "40% retention boost",
  },
  {
    quote: "Finally, a system built for home care agencies. Not retrofitted from something else. The AI actually understands care terminology.",
    author: "Jennifer Liu",
    role: "Care Coordinator",
    company: "Golden State Home Health, CA",
    rating: 5,
    metric: "Zero learning curve",
  },
  {
    quote: "We onboarded 50 caregivers in a single week. The mobile app is so intuitive that training took 15 minutes per person.",
    author: "David Okonkwo",
    role: "Regional Manager",
    company: "Heritage Care Group, GA",
    rating: 5,
    metric: "15-min onboarding",
  },
  {
    quote: "The OCR template engine saved us from re-entering data across 200+ contracts when we updated our service agreement format.",
    author: "Patricia Hernandez",
    role: "Compliance Officer",
    company: "Compassion Home Services, AZ",
    rating: 5,
    metric: "200+ contracts migrated",
  },
  {
    quote: "We reduced billing errors by 80% and our collections improved by 35%. The automated extraction from assessments is incredibly accurate.",
    author: "Robert Chen",
    role: "CFO",
    company: "Pacific Care Alliance, WA",
    rating: 5,
    metric: "80% fewer billing errors",
  },
];

const STATS = [
  { value: '500+', label: 'Agencies Served', suffix: '' },
  { value: '50K+', label: 'Contracts Generated', suffix: '' },
  { value: '2M+', label: 'Care Hours Tracked', suffix: '' },
  { value: '99.9%', label: 'Uptime Guaranteed', suffix: '' },
];

const SOLUTIONS = [
  {
    size: 'Small Agencies',
    clients: 'Up to 30 Clients',
    description: 'Simplify operations and provide exceptional care. Focus on building lasting client relationships while PalmCare AI handles the paperwork.',
    features: ['Voice-powered assessments', 'Contract auto-generation', 'Client CRM', 'Caregiver mobile app', 'Email support'],
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    size: 'Medium Agencies',
    clients: '30 - 200 Clients',
    description: 'Optimize efficiency and scale your team. Improve caregiver coordination, enhance client satisfaction, and maintain operational excellence.',
    features: ['Everything in Small', 'Custom templates & forms', 'Advanced reporting', 'Multi-user access', 'Priority support'],
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    size: 'Enterprise',
    clients: '200+ Clients',
    description: 'Unleash your full potential with customizable solutions. Manage multiple locations, complex billing, and large caregiver teams from one platform.',
    features: ['Everything in Medium', 'Multi-location management', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
    icon: Globe,
    gradient: 'from-orange-500 to-red-500',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What makes PalmCare AI different from other home care software?',
    a: 'PalmCare AI is the only platform built from the ground up with AI at its core. While other solutions retrofit AI onto legacy systems, our voice-powered assessment engine, automatic contract generation, and OCR template technology were designed together — meaning your data flows seamlessly from recording to signed contract without manual re-entry.',
  },
  {
    q: 'How does the voice assessment feature work?',
    a: 'Simply record your care assessment conversation — in person, over the phone, or upload an existing audio file. Our AI transcribes the conversation, identifies who is speaking, and extracts care needs, services, schedules, medications, and billing items automatically. The entire process takes under 2 minutes.',
  },
  {
    q: 'Is PalmCare AI HIPAA compliant?',
    a: 'Absolutely. We use 256-bit AES encryption for data at rest and in transit, role-based access controls, comprehensive audit trails, and secure cloud infrastructure. All voice recordings and patient data are handled in full compliance with HIPAA regulations.',
  },
  {
    q: 'Can I use my existing contract templates?',
    a: 'Yes! Our OCR Template Engine lets you upload your existing Word or PDF templates. The system scans every field, maps it to your database, and auto-fills contracts with client data. When you update your template, the engine reconciles changes so nothing is lost.',
  },
  {
    q: 'How long does it take to get set up?',
    a: 'Most agencies are up and running within 24 hours. Our onboarding team helps migrate your existing data, configure your templates, and train your staff. Caregivers typically learn the mobile app in under 15 minutes.',
  },
  {
    q: 'What support do you offer?',
    a: 'All plans include email support with same-day response. Growth and Pro plans include priority live chat and phone support with average response times under 15 minutes. Enterprise customers get a dedicated account manager and custom SLA.',
  },
  {
    q: 'Can caregivers use PalmCare AI on their phones?',
    a: 'Yes. Our companion mobile app lets caregivers clock in/out via GPS, log Activities of Daily Living (ADLs), view their schedule, and receive real-time updates. Agencies can track all caregiver activity from the admin dashboard.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes — every plan comes with a 14-day free trial with full access to all features. No credit card required to start. You can also book a free 30-minute demo with our team to see the platform in action before signing up.',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: 379.99,
    description: 'For small agencies getting organized',
    features: ['5 contracts/month', '20 clients in CRM', '10 caregivers', '29 seats included', 'Email support', 'Caregiver mobile app'],
    popular: false,
  },
  {
    name: 'Growth',
    price: 639.99,
    description: 'For growing teams scaling up',
    features: ['15 contracts/month', '75 clients in CRM', '40 caregivers', '49 seats included', 'Priority support', 'Custom templates', 'Advanced analytics'],
    popular: true,
  },
  {
    name: 'Pro',
    price: 1299,
    description: 'For high-volume agencies',
    features: ['Unlimited contracts', '500 clients in CRM', '200 caregivers', '99 seats included', 'Dedicated manager', 'Custom integrations', 'SLA guarantee'],
    popular: false,
  },
];

const DEMO_STEPS = [
  { title: 'Step 1: Record Assessment', description: 'Caregiver records the client intake assessment using voice', duration: 5000 },
  { title: 'Step 2: AI Transcription', description: 'Our AI transcribes and identifies speakers automatically', duration: 4000 },
  { title: 'Step 3: Extract Care Needs', description: 'AI extracts services, schedule, and billable items', duration: 4000 },
  { title: 'Step 4: Generate Contract', description: 'Professional contract is generated instantly', duration: 5000 },
];

/* ───────────────────── DEMO MODAL ───────────────────── */

function DemoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) { setCurrentStep(0); setProgress(0); setIsPlaying(true); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isPlaying || currentStep >= DEMO_STEPS.length) return;
    const stepDuration = DEMO_STEPS[currentStep].duration;
    const interval = 50;
    const increment = (interval / stepDuration) * 100;
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentStep < DEMO_STEPS.length - 1) { setCurrentStep(s => s + 1); return 0; }
          else { setIsPlaying(false); return 100; }
        }
        return prev + increment;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 rounded-2xl w-full max-w-4xl overflow-hidden border border-dark-600 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Product Demo</h3>
              <p className="text-sm text-dark-400">See how PalmCare AI works</p>
            </div>
          </div>
          <button aria-label="Close demo" onClick={onClose} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            {DEMO_STEPS.map((_, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1 rounded-full transition-all ${i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-primary-500' : 'bg-dark-600'}`}>
                  {i === currentStep && <div className="h-full bg-primary-400 rounded-full transition-all" style={{ width: `${progress}%` }} />}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-white mb-2">{DEMO_STEPS[currentStep]?.title}</h4>
            <p className="text-dark-400">{DEMO_STEPS[currentStep]?.description}</p>
          </div>
          <div className="bg-dark-900 rounded-xl p-6 min-h-[300px] relative overflow-hidden">
            {currentStep === 0 && (
              <div className="flex flex-col items-center justify-center h-full animate-fadeIn">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-red-500/30"><Mic className="w-12 h-12 text-white" /></div>
                <div className="flex items-center gap-1 h-16 mb-4">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} className="w-1.5 bg-red-500 rounded-full animate-waveform" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 30}ms` }} />
                  ))}
                </div>
                <div className="bg-dark-800 rounded-xl p-4 max-w-md">
                  <p className="text-dark-300 text-sm italic">&quot;Mrs. Johnson needs assistance with bathing, dressing, and meal preparation. She has diabetes and requires medication reminders twice daily...&quot;</p>
                </div>
              </div>
            )}
            {currentStep === 1 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center"><Volume2 className="w-5 h-5 text-blue-400" /></div>
                  <span className="text-white font-medium">AI Transcribing...</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { initial: 'C', color: 'purple', speaker: 'Caregiver (00:00)', text: 'Good morning Mrs. Johnson, I\'m here to do your care assessment today.' },
                    { initial: 'M', color: 'green', speaker: 'Mrs. Johnson (00:05)', text: 'Hello dear, thank you for coming. I\'ve been having trouble with my daily activities.' },
                    { initial: 'C', color: 'purple', speaker: 'Caregiver (00:12)', text: 'I understand. Let\'s go through what kind of help you need...' },
                  ].map((msg, i) => (
                    <div key={i} className="flex gap-3 animate-slideIn" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className={`w-8 h-8 bg-${msg.color}-500 rounded-full flex items-center justify-center text-white text-sm font-bold`}>{msg.initial}</div>
                      <div className="flex-1 bg-dark-800 rounded-xl p-3">
                        <p className={`text-xs text-${msg.color}-400 mb-1`}>{msg.speaker}</p>
                        <p className="text-dark-200 text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {currentStep === 2 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center"><Zap className="w-5 h-5 text-yellow-400" /></div>
                  <span className="text-white font-medium">Extracting Care Needs...</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn">
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Services Identified</h5>
                    <ul className="space-y-2">
                      {['Bathing Assistance', 'Dressing Assistance', 'Meal Preparation', 'Medication Reminders'].map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-dark-200"><CheckCircle className="w-4 h-4 text-green-400" />{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn" style={{ animationDelay: '200ms' }}>
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Schedule</h5>
                    <ul className="space-y-2 text-sm text-dark-200">
                      <li className="flex justify-between"><span>Days:</span><span className="text-white">Mon, Wed, Fri</span></li>
                      <li className="flex justify-between"><span>Time:</span><span className="text-white">9:00 AM - 1:00 PM</span></li>
                      <li className="flex justify-between"><span>Hours/Week:</span><span className="text-white">12 hours</span></li>
                    </ul>
                  </div>
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn" style={{ animationDelay: '400ms' }}>
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Medical Notes</h5>
                    <p className="text-sm text-dark-200">Type 2 Diabetes, requires medication reminders at 9am and 6pm</p>
                  </div>
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn" style={{ animationDelay: '600ms' }}>
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Billing Estimate</h5>
                    <p className="text-2xl font-bold text-green-400">$35/hr</p>
                    <p className="text-sm text-dark-400">$420/week &bull; $1,820/month</p>
                  </div>
                </div>
              </div>
            )}
            {currentStep === 3 && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-400" /></div>
                  <span className="text-xl font-bold text-white">Contract Ready!</span>
                </div>
                <div className="bg-white rounded-xl p-6 max-w-md mx-auto shadow-2xl">
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Home Care Service Agreement</h5>
                    <p className="text-sm text-gray-500">Contract #HC-2024-0847</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    {[['Client:', 'Margaret Johnson'], ['Services:', 'Personal Care'], ['Schedule:', 'Mon, Wed, Fri'], ['Hours/Week:', '12 hours']].map(([l, v], i) => (
                      <div key={i} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="text-gray-900 font-medium">{v}</span></div>
                    ))}
                    <div className="flex justify-between border-t border-gray-200 pt-3">
                      <span className="text-gray-900 font-bold">Monthly Total:</span>
                      <span className="text-green-600 font-bold">$1,820.00</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">Download PDF</button>
                    <button className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">Send to Client</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-dark-400">Step {currentStep + 1} of {DEMO_STEPS.length}</div>
            <div className="flex items-center gap-3">
              {!isPlaying && currentStep === DEMO_STEPS.length - 1 ? (
                <button onClick={() => { setCurrentStep(0); setProgress(0); setIsPlaying(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition">Watch Again</button>
              ) : (
                <>
                  <button aria-label={isPlaying ? 'Pause demo' : 'Play demo'} onClick={() => setIsPlaying(!isPlaying)} className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
                  <button aria-label="Skip" onClick={() => { if (currentStep < DEMO_STEPS.length - 1) { setCurrentStep(s => s + 1); setProgress(0); } }} className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"><SkipForward className="w-5 h-5" /></button>
                </>
              )}
              <Link href="/register" className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition">Try It Free</Link>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes waveform { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slideIn { animation: slideIn 0.4s ease-out forwards; }
        .animate-waveform { animation: waveform 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ───────────────────── BOOK DEMO ───────────────────── */

function BookDemoSection() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'date' | 'form' | 'success'>('date');
  const [submitting, setSubmitting] = useState(false);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmTime, setConfirmTime] = useState('');
  const [form, setForm] = useState({ name: '', email: '', company_name: '', phone: '' });
  const [viewMonth, setViewMonth] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() }; });

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isSelectable = (d: Date) => { const dow = d.getDay(); if (dow === 0 || dow === 6) return false; if (d <= today) return false; return (d.getTime() - today.getTime()) / 864e5 <= 30; };
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const canGoPrev = viewMonth.month > today.getMonth() || viewMonth.year > today.getFullYear();
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1);
  const canGoNext = viewMonth.year < maxMonth.getFullYear() || viewMonth.month < maxMonth.getMonth();
  const prevMonth = () => setViewMonth(prev => { const d = new Date(prev.year, prev.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const nextMonth = () => setViewMonth(prev => { const d = new Date(prev.year, prev.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const timeSlots = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
  const formatSlot = (slot: string) => { const [h, m] = slot.split(':').map(Number); return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T12:00:00') : null;

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/demos/book`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, date: selectedDate, time_slot: selectedTime }) });
      const data = await res.json();
      if (res.ok && data.success) { setMeetLink(data.meeting_link || null); setConfirmDate(data.date); setConfirmTime(data.time); setStep('success'); }
      else alert(data.detail || 'Failed to book demo. Please try again.');
    } catch { alert('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <section id="book-demo" className="py-20 px-6 bg-dark-800/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full mb-6">
            <Video className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400">Live Product Demo</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">See PalmCare AI in Action</h2>
          <p className="text-xl text-dark-400 max-w-2xl mx-auto">Book a free 30-minute demo with our team. We&apos;ll show you how to turn assessments into contracts in minutes.</p>
        </div>
        <div className="card p-6 md:p-8 border-primary-500/20">
          {step === 'date' && (
            <div className="grid md:grid-cols-[1fr_340px] gap-8">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-primary-400" />{monthLabel}</h3>
                  <div className="flex items-center gap-1">
                    <button aria-label="Previous month" onClick={prevMonth} disabled={!canGoPrev} className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /></button>
                    <button aria-label="Next month" onClick={nextMonth} disabled={!canGoNext} className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 mb-1">{DOW.map(d => (<div key={d} className="py-2 text-center text-xs font-semibold text-dark-400 uppercase tracking-wide">{d}</div>))}</div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} className="aspect-square" />;
                    const iso = toIso(day);
                    const selectable = isSelectable(day);
                    const isSelected = iso === selectedDate;
                    const isToday = day.getTime() === today.getTime();
                    return (
                      <button key={iso} disabled={!selectable} onClick={() => { setSelectedDate(iso); setSelectedTime(null); }}
                        className={`aspect-square flex items-center justify-center text-sm font-medium rounded-xl transition-all relative ${isSelected ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : selectable ? 'text-dark-200 hover:bg-dark-700 hover:text-white cursor-pointer' : 'text-dark-600 cursor-not-allowed'}`}>
                        {day.getDate()}
                        {isToday && !isSelected && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-dark-500 mt-3">Weekdays only, up to 30 days out</p>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-dark-600/50 pt-6 md:pt-0 md:pl-8">
                {selectedDate && selectedDateObj ? (
                  <div className="animate-fadeIn">
                    <h3 className="text-lg font-semibold text-white mb-1">{selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                    <p className="text-sm text-dark-400 mb-5 flex items-center gap-1.5"><Clock className="w-4 h-4" />30 min &bull; Eastern Time</p>
                    <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-hide">
                      {timeSlots.map(slot => (
                        <button key={slot} onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${selectedTime === slot ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-dark-700/50 text-dark-300 hover:bg-dark-700 hover:text-white border border-dark-600'}`}>
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                    {selectedTime && <button onClick={() => setStep('form')} className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-5">Continue<ArrowRight className="w-4 h-4" /></button>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 md:py-0">
                    <Calendar className="w-10 h-10 text-dark-600 mb-3" />
                    <p className="text-dark-400 text-sm">Select a date to see available times</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 'form' && (
            <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
              <button onClick={() => setStep('date')} className="text-sm text-dark-400 hover:text-white flex items-center gap-1 transition"><ChevronLeft className="w-4 h-4" /> Back to calendar</button>
              <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center"><Calendar className="w-6 h-6 text-primary-400" /></div>
                <div>
                  <p className="text-white font-semibold">{selectedDateObj?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <p className="text-dark-400 text-sm">{formatSlot(selectedTime!)} ET — 30 min demo via Google Meet</p>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white">Your Details</h3>
              <div className="space-y-4">
                {[
                  { icon: User, placeholder: 'Full name *', key: 'name' as const, type: 'text' },
                  { icon: Mail, placeholder: 'Work email *', key: 'email' as const, type: 'email' },
                  { icon: Building2, placeholder: 'Company / Agency name *', key: 'company_name' as const, type: 'text' },
                  { icon: Phone, placeholder: 'Phone number (optional)', key: 'phone' as const, type: 'tel' },
                ].map(({ icon: Icon, placeholder, key, type }) => (
                  <div key={key} className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                  </div>
                ))}
              </div>
              <button onClick={handleSubmit} disabled={submitting || !form.name || !form.email || !form.company_name}
                className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Booking...</> : <><Video className="w-5 h-5" />Book My Demo</>}
              </button>
              <p className="text-center text-dark-500 text-xs">By booking, you agree to receive a calendar invite and follow-up emails.</p>
            </div>
          )}
          {step === 'success' && (
            <div className="max-w-lg mx-auto text-center space-y-6 animate-fadeIn py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="w-10 h-10 text-green-400" /></div>
              <h3 className="text-2xl font-bold text-white">Demo Booked!</h3>
              <p className="text-dark-300">Your demo is confirmed for <span className="text-white font-semibold">{confirmDate}</span> at <span className="text-white font-semibold">{confirmTime} ET</span>.</p>
              {meetLink && <a href={meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition shadow-lg shadow-green-500/30"><Video className="w-5 h-5" />Join Google Meet</a>}
              <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4"><p className="text-dark-400 text-sm">Check your email at <span className="text-white">{form.email}</span> for the calendar invite and meeting details.</p></div>
              <button onClick={() => { setStep('date'); setSelectedDate(null); setSelectedTime(null); setForm({ name: '', email: '', company_name: '', phone: '' }); }} className="text-primary-400 hover:text-primary-300 text-sm font-medium transition">Book another demo</button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </section>
  );
}

/* ───────────────────── FAQ ITEM ───────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-dark-600 rounded-xl overflow-hidden transition-all">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/50 transition">
        <span className="text-white font-medium pr-4">{q}</span>
        {open ? <Minus className="w-5 h-5 text-primary-400 shrink-0" /> : <Plus className="w-5 h-5 text-dark-400 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 text-dark-300 leading-relaxed">{a}</div>}
    </div>
  );
}

/* ───────────────────── LANDING PAGE ───────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState('ai');
  const [navDropdown, setNavDropdown] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* ── NAVIGATION ── */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {/* Features dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('features')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Features <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'features' && (
                  <div className="absolute top-full left-0 mt-1 w-[520px] bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-3">
                    {[
                      { href: '/features#ai', icon: Brain, label: 'AI Intelligence', desc: 'Voice assessments & smart contracts' },
                      { href: '/features#ops', icon: ClipboardList, label: 'Agency Operations', desc: 'CRM, scheduling & visit management' },
                      { href: '/features#billing', icon: BarChart3, label: 'Billing & Reports', desc: 'Automated billing & analytics' },
                      { href: '/features#caregiver', icon: Smartphone, label: 'Caregiver Tools', desc: 'Mobile app & ADL logging' },
                      { href: '/features#templates', icon: FileText, label: 'Templates & OCR', desc: 'Upload & auto-fill contracts' },
                      { href: '/features#security', icon: Lock, label: 'Security & Compliance', desc: 'HIPAA compliant & encrypted' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-dark-700 transition group">
                        <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition">
                          <item.icon className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{item.label}</p>
                          <p className="text-dark-400 text-xs">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Solutions dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('solutions')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Solutions <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'solutions' && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                    {[
                      { label: 'Small Agencies', desc: 'Up to 30 clients', href: '#solutions' },
                      { label: 'Medium Agencies', desc: '30–200 clients', href: '#solutions' },
                      { label: 'Enterprise', desc: '200+ clients', href: '#solutions' },
                    ].map(item => (
                      <a key={item.label} href={item.href} className="block p-3 rounded-lg hover:bg-dark-700 transition">
                        <p className="text-white font-medium text-sm">{item.label}</p>
                        <p className="text-dark-400 text-xs">{item.desc}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Resources dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('resources')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Resources <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'resources' && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                    {[
                      { label: 'Help Center', href: '/help' },
                      { label: 'System Status', href: '/status' },
                      { label: 'Privacy Policy', href: '/privacy' },
                      { label: 'Contact Us', href: '/contact' },
                    ].map(item => (
                      <Link key={item.label} href={item.href} className="block p-3 rounded-lg hover:bg-dark-700 transition text-white text-sm font-medium">{item.label}</Link>
                    ))}
                  </div>
                )}
              </div>

              <a href="#pricing" className="px-3 py-2 text-dark-300 hover:text-white transition">Pricing</a>
              <a href="#book-demo" className="px-3 py-2 text-dark-300 hover:text-white transition">Book Demo</a>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-dark-300 hover:text-white transition px-3 py-2">Sign In</Link>
              <Link href="/register" className="btn-primary py-2 px-5 text-sm">Get Started Free</Link>
            </div>

            <button aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-dark-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pt-4 pb-2 space-y-3 border-t border-dark-700 mt-4">
              <Link href="/features" className="block py-2 text-dark-300 hover:text-white">Features</Link>
              <a href="#solutions" className="block py-2 text-dark-300 hover:text-white">Solutions</a>
              <a href="#pricing" className="block py-2 text-dark-300 hover:text-white">Pricing</a>
              <a href="#book-demo" className="block py-2 text-dark-300 hover:text-white">Book Demo</a>
              <Link href="/contact" className="block py-2 text-dark-300 hover:text-white">Contact</Link>
              <Link href="/login" className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
              <Link href="/register" className="block btn-primary py-2 px-5 text-sm text-center mt-4">Get Started Free</Link>
            </div>
          )}
        </div>
      </nav>

      <main>
      {/* ── HERO ── */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
                <Zap className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-primary-400">AI-Powered Home Care Management</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Turn Care Assessments Into
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan"> Contracts in Minutes</span>
              </h1>
              
              <p className="text-xl text-dark-300 mb-8 leading-relaxed">
                Stop spending hours on paperwork. Record assessments by voice, auto-generate contracts,
                and manage your home care agency — all from one powerful AI platform.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Start Free Trial<ArrowRight className="w-5 h-5" /></Link>
                <button onClick={() => setDemoOpen(true)} className="btn-secondary flex items-center gap-2 py-4 px-8 text-lg"><Play className="w-5 h-5" />Watch Demo</button>
              </div>

              <div className="flex items-center gap-6 mt-10">
                <div className="flex -space-x-3">
                  {['S', 'M', 'J', 'R', 'D'].map((initial, i) => (
                    <div key={i} className={`w-10 h-10 rounded-full border-2 border-dark-900 flex items-center justify-center text-white font-semibold text-sm ${['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500'][i]}`}>{initial}</div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                    <span className="text-sm text-dark-300 ml-1">4.9/5</span>
                  </div>
                  <p className="text-sm text-dark-400">Trusted by 500+ home care agencies</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-cyan/20 blur-3xl" />
              <div className="relative bg-dark-800 border border-dark-600 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-4">
                  <div className="bg-dark-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center"><Mic className="w-5 h-5 text-white" /></div>
                      <div><p className="text-white font-medium">Recording Assessment...</p><p className="text-sm text-dark-400">Client: Margaret Johnson</p></div>
                    </div>
                    <div className="flex items-center gap-1 h-8">
                      {Array.from({ length: 30 }).map((_, i) => <div key={i} className="w-1 bg-primary-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 50}ms` }} />)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-dark-700 rounded-xl p-3"><p className="text-2xl font-bold text-white">24</p><p className="text-xs text-dark-400">Clients</p></div>
                    <div className="bg-dark-700 rounded-xl p-3"><p className="text-2xl font-bold text-green-400">12</p><p className="text-xs text-dark-400">Contracts</p></div>
                    <div className="bg-dark-700 rounded-xl p-3"><p className="text-2xl font-bold text-cyan-400">$8.2k</p><p className="text-xs text-dark-400">This Month</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="py-8 px-6 border-y border-dark-700/50 bg-dark-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat, i) => (
              <div key={i}>
                <p className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan">{stat.value}</p>
                <p className="text-sm text-dark-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOOK DEMO ── */}
      <BookDemoSection />

      {/* ── FEATURES (TABBED) ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <Settings className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">Platform Features</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Run Your Agency</h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">Built specifically for home care agencies. Not adapted from generic software.</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {FEATURES_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveFeatureTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeFeatureTab === tab.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-dark-800 text-dark-300 hover:text-white border border-dark-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES_TABS.find(t => t.id === activeFeatureTab)?.features.map((feature, i) => (
              <div key={i} className="card p-6 group hover:border-primary-500/30 transition-all">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/features" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium transition">
              View All Features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">From Assessment to Contract in 3 Steps</h2>
            <p className="text-xl text-dark-400">Simple workflow, powerful results</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Record Assessment', description: 'Use voice or upload existing recordings. Our AI understands care-specific terminology.', icon: Mic },
              { step: '2', title: 'AI Processes Data', description: 'Automatic transcription, speaker identification, and extraction of care needs and billable items.', icon: Zap },
              { step: '3', title: 'Generate Contract', description: 'Get a professional, proposal-ready contract with services, schedule, rates, and policies.', icon: FileText },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">{item.step}</div>
                <div className="card p-8 pt-10">
                  <item.icon className="w-10 h-10 text-primary-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-dark-400">{item.description}</p>
                </div>
                {i < 2 && <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2"><ChevronRight className="w-8 h-8 text-dark-600" /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTIONS BY SIZE ── */}
      <section id="solutions" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <Building2 className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">Solutions by Agency Size</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Built for Agencies of Every Size</h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">Whether you serve 10 clients or 1,000+, PalmCare AI scales with your agency.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {SOLUTIONS.map((sol, i) => (
              <div key={i} className="card p-8 group hover:border-primary-500/30 transition-all">
                <div className={`w-14 h-14 bg-gradient-to-br ${sol.gradient} rounded-2xl flex items-center justify-center mb-5`}>
                  <sol.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{sol.size}</h3>
                <p className="text-primary-400 font-medium text-sm mb-4">{sol.clients}</p>
                <p className="text-dark-400 mb-6 leading-relaxed">{sol.description}</p>
                <ul className="space-y-2">
                  {sol.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-dark-300 text-sm"><CheckCircle className="w-4 h-4 text-green-400 shrink-0" />{f}</li>
                  ))}
                </ul>
                <a href="#book-demo" className="mt-6 block text-center py-3 rounded-xl font-medium bg-dark-700 text-white hover:bg-dark-600 transition">Schedule a Demo</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by Home Care Agencies</h2>
            <p className="text-xl text-dark-400">See what our customers are saying</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card p-8 flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-dark-200 text-lg mb-6 flex-1">&ldquo;{t.quote}&rdquo;</p>
                {t.metric && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full mb-4 w-fit">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">{t.metric}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">{t.author}</p>
                  <p className="text-sm text-dark-400">{t.role}</p>
                  <p className="text-xs text-dark-500">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-dark-400">Start free, upgrade as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan, i) => (
              <div key={i} className={`card p-6 relative ${plan.popular ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 rounded-full text-sm font-medium text-white">Most Popular</div>}
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-dark-400 text-sm mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-dark-400">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => <li key={j} className="flex items-center gap-3 text-dark-300 text-sm"><CheckCircle className="w-5 h-5 text-green-400 shrink-0" />{f}</li>)}
                </ul>
                <Link href={`/register?plan=${plan.name.toLowerCase()}`} className={`block text-center py-3 rounded-xl font-medium transition ${plan.popular ? 'btn-primary' : 'bg-primary-500 text-white hover:bg-primary-600'}`}>Get Started</Link>
              </div>
            ))}
          </div>
          <p className="text-center text-dark-500 text-sm mt-6">All plans include 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-dark-400">Everything you need to know about PalmCare AI</p>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
          <div className="text-center mt-8">
            <p className="text-dark-400 mb-3">Still have questions?</p>
            <Link href="/contact" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium transition">
              Contact our team <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── GETTING STARTED ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Getting Started is Easy</h2>
            <p className="text-xl text-dark-400">Three simple steps to transform your agency</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Book a Free Demo', description: 'Fill out a short request form and one of our team members will schedule a personalized, no-obligation demo.', icon: Video },
              { step: '2', title: 'See It in Action', description: 'Our experts walk you through the platform. See how voice assessments become contracts in real-time.', icon: Play },
              { step: '3', title: 'Scale Your Agency', description: 'Start your 14-day trial and watch your paperwork disappear. Full onboarding support included.', icon: TrendingUp },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/20">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-primary-400 mb-2">Step {item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-dark-400">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <a href="#book-demo" className="btn-primary inline-flex items-center gap-2 py-4 px-8 text-lg">
              Schedule Your Free Demo <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Agency?</h2>
            <p className="text-xl text-dark-300 mb-8">Join 500+ home care agencies using AI to streamline their operations.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Start Your Free Trial<ArrowRight className="w-5 h-5" /></Link>
              <a href="#book-demo" className="btn-secondary py-4 px-8 text-lg">Book a Demo</a>
            </div>
            <p className="text-dark-400 text-sm mt-6">No credit card required &bull; 14-day free trial &bull; Cancel anytime</p>
          </div>
        </div>
      </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-16 px-6 border-t border-dark-700 bg-dark-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
                <span className="text-xl font-bold text-white">PalmCare AI</span>
              </Link>
              <p className="text-dark-400 text-sm mb-4 leading-relaxed">
                AI-powered home care management platform. Turn voice assessments into professional contracts in minutes, not hours.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <span className="text-dark-400 text-sm">4.9/5 rating</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Product</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
                <li><Link href="/status" className="hover:text-white transition">System Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Company</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><a href="#book-demo" className="hover:text-white transition">Book a Demo</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Legal</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/privacy#hipaa" className="hover:text-white transition">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-dark-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-400 text-sm">&copy; 2026 PalmCare AI. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-dark-400 text-sm">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span className="text-dark-400 text-sm">256-bit Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-sm border-t border-dark-700 py-3 px-6 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-white text-sm font-medium hidden sm:block">Start your free trial today</p>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <a href="#book-demo" className="flex-1 sm:flex-none text-center py-2.5 px-4 bg-dark-700 text-white rounded-lg text-sm font-medium">Book Demo</a>
            <Link href="/register" className="flex-1 sm:flex-none text-center btn-primary py-2.5 px-4 text-sm">Get Started</Link>
          </div>
        </div>
      </div>

      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
