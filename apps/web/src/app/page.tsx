'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ChatWidget from '@/components/ChatWidget';
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
        description: 'Record any client assessment on your phone. AI transcribes the conversation, identifies speakers, and captures care-specific terminology automatically.',
        color: 'from-blue-500 to-cyan-500',
        image: '/screenshots/care-tracker.png',
      },
      {
        icon: Brain,
        title: 'Smart Contract Generation',
        description: 'AI generates a complete care plan and service agreement from a single recording with auto-populated fields and proposal-ready formatting.',
        color: 'from-teal-500 to-cyan-500',
        image: '/screenshots/contract-preview.png',
      },
      {
        icon: Zap,
        title: 'Intelligent Data Extraction',
        description: 'Every assessment is analyzed for billable items, care needs, medications, and safety concerns, then synced into your workflow automatically.',
        color: 'from-yellow-500 to-orange-500',
        image: '/screenshots/transcript.png',
      },
      {
        icon: FileText,
        title: 'Contract Workflow',
        description: 'Move from assessment to finalized contract with guided review, template support, and one-click export for signatures.',
        color: 'from-green-500 to-emerald-500',
        image: '/screenshots/smart-contract.png',
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
        description: 'Track every client from first contact through active care with a visual pipeline, custom stages, and full activity history.',
        color: 'from-blue-500 to-indigo-500',
        image: '/screenshots/client-crm.png',
      },
      {
        icon: ClipboardList,
        title: 'Document Management',
        description: 'Manage contracts, assessments, recordings, and notes in one place with smart search, filters, and export-ready organization.',
        color: 'from-teal-500 to-cyan-500',
        image: '/screenshots/contract-form.png',
      },
      {
        icon: Calendar,
        title: 'Assessments & Visits',
        description: 'Monitor every assessment from recording through contract generation and track visit status, history, and care progression in real time.',
        color: 'from-cyan-500 to-blue-500',
        image: '/screenshots/scheduling.png',
      },
      {
        icon: Settings,
        title: 'Operations Dashboard',
        description: 'Get a real-time view of agency workload, pipeline stage movement, and team execution from one centralized dashboard.',
        color: 'from-slate-500 to-gray-500',
        image: '/screenshots/dashboard.png',
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
        description: 'AI extracts hours, rates, services, and special charges directly from assessments so billing is faster and significantly more accurate.',
        color: 'from-green-500 to-emerald-500',
        image: '/screenshots/smart-contract.png',
      },
      {
        icon: PieChart,
        title: 'Revenue Dashboard',
        description: 'See real-time KPIs for client volume, assessment throughput, pipeline value, and revenue trends to guide daily decisions.',
        color: 'from-orange-500 to-amber-500',
        image: '/screenshots/dashboard.png',
      },
      {
        icon: TrendingUp,
        title: 'Custom Reporting',
        description: 'Generate detailed billing, performance, and activity reports with export-ready outputs for leadership and compliance review.',
        color: 'from-cyan-500 to-blue-500',
        image: '/screenshots/client-detail.png',
      },
      {
        icon: Shield,
        title: 'HIPAA-Compliant Security',
        description: 'Protect PHI with encryption, secure storage, and role-based controls designed for healthcare-grade compliance requirements.',
        color: 'from-amber-500 to-orange-500',
        image: '/screenshots/hipaa-compliance.png',
      },
    ],
  },
  {
    id: 'caregiver',
    label: 'Mobile App',
    features: [
      {
        icon: Smartphone,
        title: 'iOS Mobile App',
        description: 'A native iOS app for care teams to record assessments, review transcriptions, manage clients, and generate contracts on the go.',
        color: 'from-teal-500 to-emerald-500',
        image: '/screenshots/ios/00_landing_fresh.png',
      },
      {
        icon: HeartPulse,
        title: 'Client Care Profiles',
        description: 'Access medical history, emergency contacts, medications, and visit notes from one complete client profile during every shift.',
        color: 'from-emerald-500 to-teal-500',
        image: '/screenshots/adl-logging.png',
      },
      {
        icon: Globe,
        title: 'Agency Dashboard',
        description: 'Give agency leaders real-time visibility into assessment progress, client status, and team performance across the organization.',
        color: 'from-blue-500 to-sky-500',
        image: '/screenshots/client-crm.png',
      },
      {
        icon: Headphones,
        title: 'Visit Workflow',
        description: 'Coordinate visit schedules, track execution, and keep care documentation updated from the field without returning to the office.',
        color: 'from-amber-500 to-yellow-500',
        image: '/screenshots/voice-assessment.png',
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

/* Stats bar removed — will re-add when we have real traction numbers */

const SOLUTIONS = [
  {
    size: 'Small Agencies',
    clients: 'Up to 30 Clients',
    description: 'Close faster, document smarter. Focus on building client relationships while PalmCare AI handles the paperwork. One tap — AI does the rest.',
    features: ['Voice-powered assessments', 'Contract auto-generation', 'Client CRM', 'Caregiver mobile app', 'Email support'],
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    size: 'Medium Agencies',
    clients: '30 - 200 Clients',
    description: 'Scale your team without scaling your admin work. Improve caregiver coordination, enhance client satisfaction, and close more clients — faster.',
    features: ['Everything in Small', 'Custom templates & forms', 'Advanced reporting', 'Multi-user access', 'Priority support'],
    icon: TrendingUp,
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    size: 'Enterprise',
    clients: '200+ Clients',
    description: 'Manage multiple locations, complex billing, and large caregiver teams — all from one AI-native platform built specifically for home care.',
    features: ['Everything in Medium', 'Multi-location management', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
    icon: Globe,
    gradient: 'from-orange-500 to-amber-500',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What makes PalmCare AI different from other home care software?',
    a: 'PalmCare AI is the first AI-native documentation platform built specifically for home care. Our competitors — AxisCare, WellSky, CareTime — are legacy scheduling and billing systems. They are not AI-first. PalmCare AI was built from the ground up with voice-powered assessments, automatic contract generation, and OCR — your data flows from recording to signed contract without manual re-entry.',
  },
  {
    q: 'How does the voice assessment feature work?',
    a: 'One tap to start. Staff records a client assessment on their phone — in person, over the phone, or by uploading an audio file. AI transcribes the conversation, identifies who is speaking, and extracts care needs, services, medications, and billing items automatically. No forms to fill, no clicks to learn — just record and review.',
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

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

const SERVICES_OPTIONS = ['Hospice', 'Intellectual and Developmental Disabilities (IDD)', 'Non-Skilled Services', 'Skilled Nursing Services', 'Personal Care', 'Companion Care'];

const ROLE_OPTIONS = ['Agency Owner', 'Administrator', 'Office Manager', 'Clinical Director', 'Billing Manager', 'Other'];

const CLIENT_RANGES = ['1-10', '11-25', '26-50', '51-100', '101-250', '250+'];

const SOFTWARE_OPTIONS = ['None / Pen & Paper', 'AxisCare', 'ClearCare / WellSky', 'Alora', 'HHAeXchange', 'Axxess', 'MatrixCare', 'KanTime', 'Sandata', 'Other'];

const REFERRAL_SOURCES = ['Google Search', 'LinkedIn', 'Facebook', 'Instagram', 'Referral from a Friend/Colleague', 'Industry Conference/Event', 'Email', 'Phone Call', 'Other'];

const DEMO_STEPS = [
  { title: 'Step 1: Record It', description: 'Staff records the client assessment on their phone — one tap to start', duration: 5000 },
  { title: 'Step 2: Transcribe It', description: 'AI transcribes the conversation and identifies who is speaking', duration: 4000 },
  { title: 'Step 3: Extract It', description: 'AI captures care needs, services, schedule, and billable items', duration: 4000 },
  { title: 'Step 4: Contract It', description: 'Complete care plan and service agreement — ready to sign', duration: 5000 },
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
              <p className="text-sm text-dark-400">See how Palm It works</p>
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
                    { initial: 'C', color: 'teal', speaker: 'Caregiver (00:00)', text: 'Good morning Mrs. Johnson, I\'m here to do your care assessment today.' },
                    { initial: 'M', color: 'green', speaker: 'Mrs. Johnson (00:05)', text: 'Hello dear, thank you for coming. I\'ve been having trouble with my daily activities.' },
                    { initial: 'C', color: 'teal', speaker: 'Caregiver (00:12)', text: 'I understand. Let\'s go through what kind of help you need...' },
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
              <a href="#book-demo" onClick={onClose} className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition">Schedule a Demo</a>
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

/* ───────────────────── SCHEDULE DEMO (Multi-Step) ───────────────────── */

function BookDemoSection() {
  const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookedDate, setBookedDate] = useState('');
  const [bookedTime, setBookedTime] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '',
    company_name: '', state: '', role: '', services: [] as string[],
    estimated_clients: '', current_software: '', referral_source: '',
    date: '', time_slot: '',
  });

  const toggleService = (svc: string) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svc) ? prev.services.filter(s => s !== svc) : [...prev.services, svc],
    }));
  };

  const STEP_NAMES: Record<number, string> = { 1: 'contact_info', 2: 'agency_info', 3: 'details', 4: 'pick_time', 5: 'booked' };

  const trackStep = (stepNum: number) => {
    try {
      fetch(`${API}/demos/funnel-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepNum,
          email: form.email || undefined,
          name: form.first_name ? `${form.first_name} ${form.last_name}` : undefined,
          company: form.company_name || undefined,
          referrer: document.referrer || undefined,
        }),
      }).catch(() => {});
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', `demo_step_${STEP_NAMES[stepNum] || stepNum}`, {
          event_category: 'demo_funnel',
          event_label: `Step ${stepNum}`,
          value: stepNum,
        });
      }
    } catch {}
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    trackStep(nextStep);
  };

  const loadSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`${API}/demos/slots`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || {});
      }
    } catch { /* slots will be empty, user can still submit */ }
    finally { setLoadingSlots(false); }
  };

  const sectionRef = useRef<HTMLDivElement>(null);
  const trackedView = useRef(false);
  useEffect(() => {
    if (!sectionRef.current || trackedView.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !trackedView.current) {
        trackedView.current = true;
        trackStep(1);
      }
    }, { threshold: 0.3 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const canProceed1 = form.email && form.first_name && form.last_name && form.phone;
  const canProceed2 = form.company_name && form.state && form.role && form.services.length > 0;
  const canProceed3 = form.estimated_clients && form.current_software;
  const canSubmit = canProceed3 && form.date && form.time_slot;

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTimeLabel = (slot: string) => {
    const [h, m] = slot.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/demos/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.first_name} ${form.last_name}`,
          email: form.email,
          company_name: form.company_name,
          phone: form.phone,
          state: form.state,
          role: form.role,
          services: form.services,
          estimated_clients: form.estimated_clients,
          current_software: form.current_software,
          date: form.date,
          time_slot: form.time_slot,
          referral_source: form.referral_source,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookedDate(data.date || formatDateLabel(form.date));
        setBookedTime(data.time || formatTimeLabel(form.time_slot));
        setMeetLink(data.meeting_link || '');
        setSubmitted(true);
        trackStep(5);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || 'Something went wrong. Please try again.');
      }
    } catch { alert('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const totalSteps = 4;
  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-10">
      {[1, 2, 3, 4].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-dark-700 text-dark-400 border border-dark-600'}`}>{s}</div>
          {s < totalSteps && <div className={`w-8 h-0.5 rounded ${step > s ? 'bg-primary-500' : 'bg-dark-600'}`} />}
        </div>
      ))}
    </div>
  );

  if (submitted) {
    return (
      <section id="book-demo" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-xl mx-auto text-center animate-fadeIn">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10 text-green-400" /></div>
          <h2 className="text-3xl font-bold text-white mb-4">You&apos;re Scheduled!</h2>
          <p className="text-dark-300 text-lg mb-6">Your demo has been confirmed. Check your email for the calendar invite and meeting details.</p>
          <div className="card p-6 text-left space-y-3 border-primary-500/20">
            <div className="flex justify-between"><span className="text-dark-400">Company</span><span className="text-white font-medium">{form.company_name}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Contact</span><span className="text-white font-medium">{form.first_name} {form.last_name}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Email</span><span className="text-white font-medium">{form.email}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Date</span><span className="text-white font-medium">{bookedDate}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Time</span><span className="text-white font-medium">{bookedTime} ET</span></div>
            {meetLink && (
              <div className="pt-3 border-t border-dark-600">
                <a href={meetLink} target="_blank" rel="noopener noreferrer"
                  className="w-full btn-primary py-3 text-center flex items-center justify-center gap-2 rounded-xl">
                  <Video className="w-5 h-5" /> Join Google Meet
                </a>
              </div>
            )}
          </div>
          <p className="text-dark-500 text-sm mt-4">A confirmation email with the meeting link has been sent to {form.email}</p>
          <button onClick={() => { setSubmitted(false); setStep(1); setForm({ email: '', first_name: '', last_name: '', phone: '', company_name: '', state: '', role: '', services: [], estimated_clients: '', current_software: '', referral_source: '', date: '', time_slot: '' }); }}
            className="text-primary-400 hover:text-primary-300 text-sm font-medium transition mt-4 inline-block">Submit another request</button>
        </div>
        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        `}</style>
      </section>
    );
  }

  return (
    <section id="book-demo" ref={sectionRef} className="py-20 px-6 bg-dark-800/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full mb-6">
            <Video className="w-4 h-4 text-green-400" /><span className="text-sm text-green-400">Live Product Demo</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Schedule a Live Demo</h2>
          <p className="text-xl text-dark-400">See how PalmCare AI can transform your agency&apos;s workflow.</p>
        </div>

        <div className="card p-8 md:p-10 border-primary-500/20">
          {stepIndicator}

          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-xl font-semibold text-white mb-2">Your Contact Information</h3>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Work Email<span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">First Name<span className="text-red-400">*</span></label>
                  <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="First name"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Last Name<span className="text-red-400">*</span></label>
                  <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Last name"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone Number<span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000"
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
              </div>
              <p className="text-xs text-red-400/80 italic">If you are a caregiver, please visit our <a href="/contact" className="underline hover:text-red-300">caregiver resources page</a> instead.</p>
              <button disabled={!canProceed1} onClick={() => goToStep(2)}
                className="w-full btn-primary py-3.5 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2">
                Next <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-xl font-semibold text-white mb-2">About Your Agency</h3>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Company Name<span className="text-red-400">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input type="text" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Your agency name"
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">State<span className="text-red-400">*</span></label>
                <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition appearance-none cursor-pointer">
                  <option value="" className="bg-dark-800">Select state</option>
                  {US_STATES.map(s => <option key={s.code} value={s.code} className="bg-dark-800">{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Role<span className="text-red-400">*</span></label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition appearance-none cursor-pointer">
                  <option value="" className="bg-dark-800">Select role</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r} className="bg-dark-800">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">What services do you provide?<span className="text-red-400">*</span></label>
                <div className="space-y-2">
                  {SERVICES_OPTIONS.map(svc => (
                    <label key={svc} onClick={() => toggleService(svc)} className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition cursor-pointer group">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${form.services.includes(svc) ? 'bg-primary-500 border-primary-500' : 'border-dark-500 group-hover:border-dark-400'}`}>
                        {form.services.includes(svc) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-white text-sm">{svc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => goToStep(1)} className="flex-1 py-3.5 text-lg font-semibold rounded-xl bg-dark-700 text-white hover:bg-dark-600 transition">Previous</button>
                <button disabled={!canProceed2} onClick={() => goToStep(3)}
                  className="flex-1 btn-primary py-3.5 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  Next <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-xl font-semibold text-white mb-2">A Few More Details</h3>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Current Number of Clients<span className="text-red-400">*</span></label>
                <select value={form.estimated_clients} onChange={e => setForm({ ...form, estimated_clients: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition appearance-none cursor-pointer">
                  <option value="" className="bg-dark-800">Select range</option>
                  {CLIENT_RANGES.map(r => <option key={r} value={r} className="bg-dark-800">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Current Software<span className="text-red-400">*</span></label>
                <select value={form.current_software} onChange={e => setForm({ ...form, current_software: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition appearance-none cursor-pointer">
                  <option value="" className="bg-dark-800">Select software</option>
                  {SOFTWARE_OPTIONS.map(s => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">How did you hear about us?</label>
                <select value={form.referral_source} onChange={e => setForm({ ...form, referral_source: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition appearance-none cursor-pointer">
                  <option value="" className="bg-dark-800">Select an option</option>
                  {REFERRAL_SOURCES.map(s => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => goToStep(2)} className="flex-1 py-3.5 text-lg font-semibold rounded-xl bg-dark-700 text-white hover:bg-dark-600 transition">Previous</button>
                <button disabled={!canProceed3} onClick={() => { goToStep(4); loadSlots(); }}
                  className="flex-1 btn-primary py-3.5 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  Pick a Time <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-xl font-semibold text-white mb-1">Pick Your Demo Time</h3>
              <p className="text-dark-400 text-sm">30-minute live demo — all times are Eastern (ET)</p>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                  <span className="ml-3 text-dark-300">Loading available times...</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-400" /> Select a Date
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                      {Object.keys(availableSlots).sort().map(dateStr => (
                        <button key={dateStr} onClick={() => setForm({ ...form, date: dateStr, time_slot: '' })}
                          className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            form.date === dateStr
                              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                              : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-primary-500/50 hover:text-white'
                          }`}>
                          {formatDateLabel(dateStr)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.date && (
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-400" /> Select a Time
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {(availableSlots[form.date] || []).map(slot => (
                          <button key={slot} onClick={() => setForm({ ...form, time_slot: slot })}
                            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              form.time_slot === slot
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-primary-500/50 hover:text-white'
                            }`}>
                            {formatTimeLabel(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.date && form.time_slot && (
                    <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-primary-400 shrink-0" />
                      <p className="text-white text-sm">
                        <span className="font-semibold">{formatDateLabel(form.date)}</span> at{' '}
                        <span className="font-semibold">{formatTimeLabel(form.time_slot)} ET</span> — 30 min demo
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-2">
                <button onClick={() => goToStep(3)} className="flex-1 py-3.5 text-lg font-semibold rounded-xl bg-dark-700 text-white hover:bg-dark-600 transition">Previous</button>
                <button disabled={!canSubmit || submitting} onClick={handleSubmit}
                  className="flex-1 btn-primary py-3.5 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Booking...</> : <>Confirm Booking</>}
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-dark-500 text-xs mt-4">By submitting, you agree to receive communications from PalmCare AI.</p>
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

/* ───────────────────── TRANSCRIPT SIMULATION DATA ───────────────────── */

const MEDICAL_KEYWORDS = new Set([
  'diabetes', 'medication', 'insulin', 'bathing', 'dressing', 'meals',
  'blood', 'pressure', 'mobility', 'walker', 'wheelchair', 'physical',
  'therapy', 'ADLs', 'careplan', 'assessment', 'vitals', 'dosage',
  'morning', 'evening', 'twice', 'daily', 'prescription', 'metformin',
  'hypertension', 'arthritis', 'fall', 'risk', 'glucose', 'monitoring',
]);

interface TranscriptSegment {
  speaker: 'nurse' | 'client';
  label: string;
  words: string[];
}

const TRANSCRIPT_SEGMENTS: TranscriptSegment[] = [
  {
    speaker: 'nurse',
    label: 'Nurse Sarah',
    words: 'Good morning Mrs. Johnson, I\'m here to complete your care assessment today. Can you tell me about your daily routine?'.split(' '),
  },
  {
    speaker: 'client',
    label: 'Mrs. Johnson',
    words: 'Well, I need help with bathing and dressing most mornings. My arthritis makes it difficult to manage on my own.'.split(' '),
  },
  {
    speaker: 'nurse',
    label: 'Nurse Sarah',
    words: 'I understand. And how about your medication — are you currently taking anything for the diabetes and hypertension?'.split(' '),
  },
  {
    speaker: 'client',
    label: 'Mrs. Johnson',
    words: 'Yes, I take metformin twice daily and my blood pressure medication each morning. I sometimes forget the evening dosage.'.split(' '),
  },
  {
    speaker: 'nurse',
    label: 'Nurse Sarah',
    words: 'We\'ll set up medication reminders for you. Do you use a walker or any mobility aids around the house?'.split(' '),
  },
  {
    speaker: 'client',
    label: 'Mrs. Johnson',
    words: 'I use a walker when moving between rooms. My physical therapy sessions have been helping with my mobility though.'.split(' '),
  },
];

/* ───────────────────── HERO ORB + TRANSCRIPTION ───────────────────── */

function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [visibleWords, setVisibleWords] = useState(0);
  const [visibleSegments, setVisibleSegments] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  const totalWords = TRANSCRIPT_SEGMENTS.reduce((sum, seg) => sum + seg.words.length, 0);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  useEffect(() => {
    const t = setTimeout(() => setIsRecording(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const t = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleWords(prev => {
          if (prev >= totalWords) { clearInterval(interval); return prev; }
          return prev + 1;
        });
      }, 120);
      return () => clearInterval(interval);
    }, 500);
    return () => clearTimeout(t);
  }, [isRecording, totalWords]);

  useEffect(() => {
    let wc = 0;
    for (let i = 0; i < TRANSCRIPT_SEGMENTS.length; i++) {
      if (visibleWords > wc) setVisibleSegments(i + 1);
      wc += TRANSCRIPT_SEGMENTS[i].words.length;
    }
  }, [visibleWords]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [visibleWords]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const SIZE = 320;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const t0 = performance.now();

    function orbPath(cx: number, cy: number, radius: number, phase: number, audio: number, n = 120) {
      ctx!.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = radius
          + Math.sin(a * 3 + phase * Math.PI * 2) * (4 + audio * 8)
          + Math.cos(a * 2 - phase * Math.PI * 1.5) * (3 + audio * 6)
          + Math.sin(a * 5 + phase * Math.PI * 3) * (2 + audio * 4);
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
      }
      ctx!.closePath();
    }

    function draw() {
      const t = (performance.now() - t0) / 1000;
      const phase = (Math.sin(t * Math.PI / 2) + 1) / 2;
      const rot = t * (Math.PI * 2 / 20);
      const glow = (Math.sin(t * Math.PI * 2 / 3) + 1) / 2;
      const active = isRecordingRef.current;
      const audio = active ? 0.4 + glow * 0.3 : 0;
      const cx = SIZE / 2, cy = SIZE / 2;

      ctx!.clearRect(0, 0, SIZE, SIZE);

      const rings = [
        { r: 130, rot: rot, po: 1.4, op: active ? 0.3 : 0.12, lw: 1.5 },
        { r: 115, rot: -rot * 0.8, po: 0.7, op: active ? 0.22 : 0.09, lw: 1.5 },
        { r: 100, rot: rot * 1.2, po: 0, op: active ? 0.18 : 0.07, lw: 1 },
      ];

      for (const ring of rings) {
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(ring.rot);
        ctx!.translate(-cx, -cy);
        ctx!.globalAlpha = ring.op;
        orbPath(cx, cy, ring.r, phase + ring.po, audio * 0.3, 100);
        try {
          const g = ctx!.createConicGradient(0, cx, cy);
          g.addColorStop(0, '#0d9488');
          g.addColorStop(0.33, '#0891b2');
          g.addColorStop(0.66, '#2dd4bf');
          g.addColorStop(1, '#0d9488');
          ctx!.strokeStyle = g;
        } catch {
          ctx!.strokeStyle = '#0d9488';
        }
        ctx!.lineWidth = ring.lw;
        ctx!.stroke();
        ctx!.restore();
      }

      ctx!.save();
      orbPath(cx, cy, 70, phase, audio);
      try {
        const og = ctx!.createConicGradient(0, cx, cy);
        og.addColorStop(0, '#0d9488');
        og.addColorStop(0.33, '#0891b2');
        og.addColorStop(0.66, '#2dd4bf');
        og.addColorStop(1, '#0d9488');
        ctx!.fillStyle = og;
      } catch {
        ctx!.fillStyle = '#0d9488';
      }
      ctx!.fill();

      ctx!.save();
      orbPath(cx, cy, 70, phase, audio);
      ctx!.clip();
      const hl = ctx!.createRadialGradient(cx - 20, cy - 20, 0, cx, cy, 80);
      hl.addColorStop(0, 'rgba(255,255,255,0.2)');
      hl.addColorStop(1, 'transparent');
      ctx!.fillStyle = hl;
      ctx!.fillRect(0, 0, SIZE, SIZE);
      ctx!.restore();

      ctx!.restore();
      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative px-6 pt-24 pb-8 overflow-hidden" style={{ background: '#000' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)' }} />

      <div className="text-center mb-8 relative z-10 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          Record It. Transcribe It.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan">Contract It.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 mt-4 max-w-xl mx-auto">
          Watch a live assessment become a signed contract — automatically.
        </p>
      </div>

      <div className="relative flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          style={{
            width: 320,
            height: 320,
            filter: isRecording
              ? 'drop-shadow(0 0 40px rgba(13,148,136,0.5)) drop-shadow(0 0 80px rgba(8,145,178,0.2))'
              : 'drop-shadow(0 0 20px rgba(13,148,136,0.25))',
            transition: 'filter 1s ease',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {!isRecording ? (
            <Mic className="w-12 h-12 text-white/80" />
          ) : (
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-1.5 bg-white/80 rounded-full animate-orb-bar"
                  style={{ height: '28px', animationDelay: `${i * 150}ms`, animationDuration: `${0.6 + i * 0.1}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 relative z-10">
        {isRecording ? (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-white/40 font-medium">Recording Assessment...</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-primary-500 rounded-full" />
            <span className="text-sm text-white/30 font-medium">Tap to start assessment</span>
          </>
        )}
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="max-h-[200px] overflow-y-auto scrollbar-hide px-2" ref={transcriptRef}>
          {visibleSegments === 0 && isRecording && (
            <div className="flex items-center gap-2 text-white/30 text-sm justify-center">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Listening...</span>
            </div>
          )}
          <div className="space-y-4">
            {TRANSCRIPT_SEGMENTS.slice(0, visibleSegments).map((seg, segIdx) => {
              const segStartIdx = TRANSCRIPT_SEGMENTS.slice(0, segIdx).reduce((s, x) => s + x.words.length, 0);
              const wordsToShow = Math.max(0, visibleWords - segStartIdx);
              return (
                <div key={segIdx} className="animate-transcript-fade">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${seg.speaker === 'nurse' ? 'bg-primary-500' : 'bg-cyan-500'}`} />
                    <span className="text-xs font-semibold text-white/40">{seg.label}</span>
                  </div>
                  <p className="text-sm md:text-base leading-relaxed pl-4">
                    {seg.words.slice(0, wordsToShow).map((word, wIdx) => {
                      const clean = word.replace(/[.,!?'"]/g, '').toLowerCase();
                      const isMedical = MEDICAL_KEYWORDS.has(clean);
                      return (
                        <span key={wIdx} className={isMedical ? 'text-primary-400 font-medium' : 'text-white/70'}>
                          {word}{' '}
                        </span>
                      );
                    })}
                    {wordsToShow < seg.words.length && wordsToShow > 0 && (
                      <span className="inline-block w-0.5 h-4 bg-primary-400 animate-pulse align-middle ml-0.5" />
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-8 relative z-10">
        <a href="#book-demo" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
          Book Your Free Demo <ArrowRight className="w-5 h-5" />
        </a>
        <a href="#features" className="flex items-center gap-2 py-4 px-8 text-lg rounded-lg text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition">
          See How It Works <ChevronDown className="w-5 h-5" />
        </a>
      </div>

      <div className="flex items-center gap-4 mt-6 relative z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 border border-green-500/20 rounded-full">
          <Shield className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-green-500/80 font-medium">HIPAA Compliant</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-blue-500/20 rounded-full">
          <Lock className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs text-blue-500/80 font-medium">256-bit Encrypted</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-scroll-bounce">
        <ChevronDown className="w-6 h-6 text-white/20" />
      </div>
    </section>
  );
}

/* ───────────────────── LANDING PAGE ───────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState('ai');
  const [navDropdown, setNavDropdown] = useState<string | null>(null);

  return (
    <div className="min-h-screen landing-dark" style={{ background: '#000' }}>
      {/* ── NAVIGATION ── */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {/* Features dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('features')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Features <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'features' && (
                  <div className="absolute top-full left-0 pt-2 w-[520px]">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-3">
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
                  </div>
                )}
              </div>

              {/* Solutions dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('solutions')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Solutions <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'solutions' && (
                  <div className="absolute top-full left-0 pt-2 w-72">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                      {[
                        { label: 'Small Agencies', desc: 'Up to 30 clients', href: '#solutions' },
                        { label: 'Medium Agencies', desc: '30–200 clients', href: '#solutions' },
                        { label: 'Enterprise', desc: '200+ clients', href: '#solutions' },
                      ].map(item => (
                        <a key={item.label} href={item.href} onClick={() => setNavDropdown(null)} className="block p-3 rounded-lg hover:bg-dark-700 transition">
                          <p className="text-white font-medium text-sm">{item.label}</p>
                          <p className="text-dark-400 text-xs">{item.desc}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resources dropdown */}
              <div className="relative" onMouseEnter={() => setNavDropdown('resources')} onMouseLeave={() => setNavDropdown(null)}>
                <button className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg">
                  Resources <ChevronDown className="w-4 h-4" />
                </button>
                {navDropdown === 'resources' && (
                  <div className="absolute top-full left-0 pt-2 w-64">
                    <div className="bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
                      {[
                        { label: 'Blog', href: '/blog' },
                        { label: 'FAQ', href: '/faq' },
                        { label: 'Contact Us', href: '/contact' },
                        { label: 'System Status', href: '/status' },
                        { label: 'Privacy Policy', href: '/privacy' },
                      ].map(item => (
                        <Link key={item.label} href={item.href} className="block p-3 rounded-lg hover:bg-dark-700 transition text-white text-sm font-medium">{item.label}</Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/mobile-app" className="px-3 py-2 text-dark-300 hover:text-white transition">Mobile App</Link>
              <a href="#book-demo" className="px-3 py-2 text-dark-300 hover:text-white transition">Book Demo</a>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-dark-300 hover:text-white transition px-3 py-2">Sign In</Link>
              <a href="#book-demo" className="btn-primary py-2 px-5 text-sm">Book Your Free Demo</a>
            </div>

            <button aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-dark-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pt-4 pb-2 space-y-3 border-t border-dark-700 mt-4">
              <Link href="/features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Features</Link>
              <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Solutions</a>
              <Link href="/mobile-app" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Mobile App</Link>
              <a href="#book-demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Book Demo</a>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Contact</Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
              <a href="#book-demo" onClick={() => setMobileMenuOpen(false)} className="block btn-primary py-2 px-5 text-sm text-center mt-4">Book Your Free Demo</a>
            </div>
          )}
        </div>
      </nav>

      <main>
      {/* ═══ 1. HERO — The Hook ═══ */}
      <HeroOrb />

      {/* ═══ 2. HOW IT WORKS — Instant clarity ═══ */}
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Three Steps. Zero Paperwork.</h2>
            <p className="text-xl text-dark-400">From assessment to signed contract — AI handles the rest.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Record It', description: 'Staff records a client assessment interview on their phone — in person or over the phone. One tap to start.', icon: Mic },
              { step: '2', title: 'Transcribe It', description: 'AI transcribes the conversation, identifies speakers, and extracts every care need and billable item automatically.', icon: Zap },
              { step: '3', title: 'Contract It', description: 'A complete assessment, care plan, and service agreement is generated — ready to send and sign.', icon: FileText },
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
          <div className="text-center mt-12">
            <a href="#book-demo" className="btn-primary inline-flex items-center gap-2 py-4 px-8 text-lg">
              Book Your Free Demo <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-dark-500 text-sm mt-4">5 minutes is all it takes to see the difference</p>
          </div>
        </div>
      </section>

      {/* ═══ 3. BOOK DEMO — Primary conversion point ═══ */}
      <BookDemoSection />

      {/* ═══ 4. FEATURES — Detail for deeper researchers ═══ */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-6">
              <Settings className="w-4 h-4 text-primary-400" /><span className="text-sm text-primary-400">Platform Features</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Run Your Agency</h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">Built for care professionals. Not retrofitted from generic software.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {FEATURES_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveFeatureTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeFeatureTab === tab.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-dark-800 text-dark-300 hover:text-white border border-dark-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES_TABS.find(t => t.id === activeFeatureTab)?.features.map((feature, i) => (
              <div key={i} className="card p-6 group hover:border-primary-500/30 transition-all h-full flex flex-col">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden border border-dark-700 mb-5 bg-dark-900/60 flex items-center justify-center shrink-0">
                  <Image
                    src={feature.image}
                    alt={`${feature.title} screenshot`}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
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

      {/* ═══ 5. SOLUTIONS BY SIZE — Self-identification ═══ */}
      <section id="solutions" className="py-20 px-6 bg-dark-800/30">
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
                <a href="#book-demo" className="mt-6 block text-center py-3 rounded-xl font-medium bg-primary-500 text-white hover:bg-primary-600 transition">Book Your Free Demo</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. TESTIMONIALS — Social proof ═══ */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by Care Professionals</h2>
            <p className="text-xl text-dark-400">See why agencies are switching to PalmCare AI</p>
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

      {/* ═══ 7. GETTING STARTED — Ease of entry ═══ */}
      <section className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Getting Started is Easy</h2>
            <p className="text-xl text-dark-400">Three simple steps — then Palm It</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Book a Free Demo', description: 'Fill out a short form. Our team schedules a personalized, no-obligation walkthrough in under 24 hours.', icon: Video },
              { step: '2', title: 'See It in Action', description: 'Watch a live assessment become a signed contract in real-time. 5 minutes — that\'s all it takes to see the difference.', icon: Play },
              { step: '3', title: 'Palm It', description: 'Start your trial, onboard your team, and watch paperwork disappear. Your next client is waiting.', icon: TrendingUp },
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
        </div>
      </section>

      {/* ═══ 8. FINAL CTA — Last conversion push ═══ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
            <h2 className="text-4xl font-bold text-white mb-4">Your Next Client is Waiting</h2>
            <p className="text-xl text-dark-300 mb-8">Close faster. Document smarter. Never lose a client to paperwork again.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#book-demo" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Book Your Free Demo <ArrowRight className="w-5 h-5" /></a>
            </div>
            <p className="text-dark-400 text-sm mt-6">Free personalized demo &bull; No credit card &bull; No commitment</p>
          </div>
        </div>
      </section>

      {/* ═══ 9. FAQ — Bottom, for hesitant visitors ═══ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
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
            <div className="flex justify-center gap-4">
              <Link href="/faq" className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-medium transition">
                View all FAQs <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 text-dark-400 hover:text-white font-medium transition">
                Contact our team <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
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
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
                <span className="text-xl font-bold text-white">PalmCare AI</span>
              </Link>
              <p className="text-dark-400 text-sm mb-4 leading-relaxed">
                Record it. Transcribe it. Contract it. All in your palm. Built for care professionals.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-dark-400 text-sm">HIPAA Compliant</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Product</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="/mobile-app" className="hover:text-white transition">Mobile App</Link></li>
                <li><a href="#book-demo" className="hover:text-white transition">Book a Demo</a></li>
                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
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
          <p className="text-white text-sm font-medium hidden sm:block">Your next client is waiting</p>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <a href="#book-demo" className="flex-1 text-center btn-primary py-2.5 px-4 text-sm">Book Your Free Demo</a>
          </div>
        </div>
      </div>

      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
      <ChatWidget />
    </div>
  );
}
