'use client';

import { useState, useEffect } from 'react';
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

/* Stats bar removed — will re-add when we have real traction numbers */

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
                    <div
                      key={i}
                      className="w-1.5 bg-red-500 rounded-full animate-waveform"
                      style={{ height: `${28 + ((i * 11) % 58)}%`, animationDelay: `${i * 30}ms` }}
                    />
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
                    { initial: 'C', avatarClass: 'bg-purple-500', speakerClass: 'text-purple-400', speaker: 'Caregiver (00:00)', text: 'Good morning Mrs. Johnson, I\'m here to do your care assessment today.' },
                    { initial: 'M', avatarClass: 'bg-green-500', speakerClass: 'text-green-400', speaker: 'Mrs. Johnson (00:05)', text: 'Hello dear, thank you for coming. I\'ve been having trouble with my daily activities.' },
                    { initial: 'C', avatarClass: 'bg-purple-500', speakerClass: 'text-purple-400', speaker: 'Caregiver (00:12)', text: 'I understand. Let\'s go through what kind of help you need...' },
                  ].map((msg, i) => (
                    <div key={i} className="flex gap-3 animate-slideIn" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className={`w-8 h-8 ${msg.avatarClass} rounded-full flex items-center justify-center text-white text-sm font-bold`}>{msg.initial}</div>
                      <div className="flex-1 bg-dark-800 rounded-xl p-3">
                        <p className={`text-xs ${msg.speakerClass} mb-1`}>{msg.speaker}</p>
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
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '',
    company_name: '', state: '', role: '', services: [] as string[],
    estimated_clients: '', current_software: '',
  });

  const toggleService = (svc: string) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svc) ? prev.services.filter(s => s !== svc) : [...prev.services, svc],
    }));
  };

  const canProceed1 = form.email && form.first_name && form.last_name && form.phone;
  const canProceed2 = form.company_name && form.state && form.role && form.services.length > 0;
  const canSubmit = form.estimated_clients && form.current_software;

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
        }),
      });
      if (res.ok) { setSubmitted(true); }
      else { const data = await res.json().catch(() => ({})); alert(data.detail || 'Something went wrong. Please try again.'); }
    } catch { alert('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-10">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'bg-dark-700 text-dark-400 border border-dark-600'}`}>{s}</div>
          {s < 3 && <div className={`w-12 h-0.5 rounded ${step > s ? 'bg-primary-500' : 'bg-dark-600'}`} />}
        </div>
      ))}
    </div>
  );

  if (submitted) {
    return (
      <section id="book-demo" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-xl mx-auto text-center animate-fadeIn">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10 text-green-400" /></div>
          <h2 className="text-3xl font-bold text-white mb-4">Thank You!</h2>
          <p className="text-dark-300 text-lg mb-6">We&apos;ve received your demo request. Our team will reach out within 1 business day to schedule your personalized demo.</p>
          <div className="card p-6 text-left space-y-3 border-primary-500/20">
            <div className="flex justify-between"><span className="text-dark-400">Company</span><span className="text-white font-medium">{form.company_name}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Contact</span><span className="text-white font-medium">{form.first_name} {form.last_name}</span></div>
            <div className="flex justify-between"><span className="text-dark-400">Email</span><span className="text-white font-medium">{form.email}</span></div>
          </div>
          <button onClick={() => { setSubmitted(false); setStep(1); setForm({ email: '', first_name: '', last_name: '', phone: '', company_name: '', state: '', role: '', services: [], estimated_clients: '', current_software: '' }); }}
            className="text-primary-400 hover:text-primary-300 text-sm font-medium transition mt-6 inline-block">Submit another request</button>
        </div>
        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        `}</style>
      </section>
    );
  }

  return (
    <section id="book-demo" className="py-20 px-6 bg-dark-800/30">
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
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">First Name<span className="text-red-400">*</span></label>
                  <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="First name"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Last Name<span className="text-red-400">*</span></label>
                  <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Last name"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone Number<span className="text-red-400">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000"
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
                </div>
              </div>
              <p className="text-xs text-red-400/80 italic">If you are a caregiver, please visit our <a href="/contact" className="underline hover:text-red-300">caregiver resources page</a> instead.</p>
              <button disabled={!canProceed1} onClick={() => setStep(2)}
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
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition" />
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
                    <label key={svc} className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 border border-dark-600 hover:border-dark-500 transition cursor-pointer group">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${form.services.includes(svc) ? 'bg-primary-500 border-primary-500' : 'border-dark-500 group-hover:border-dark-400'}`}>
                        {form.services.includes(svc) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-white text-sm">{svc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(1)} className="flex-1 py-3.5 text-lg font-semibold rounded-xl bg-dark-700 text-white hover:bg-dark-600 transition">Previous</button>
                <button disabled={!canProceed2} onClick={() => setStep(3)}
                  className="flex-1 btn-primary py-3.5 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  Next <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-xl font-semibold text-white mb-2">Let&apos;s Get You Scheduled</h3>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Estimate Current Number of Clients<span className="text-red-400">*</span></label>
                <p className="text-xs text-dark-500 mb-2">How many clients are you currently serving?</p>
                <select value={form.estimated_clients} onChange={e => setForm({ ...form, estimated_clients: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition appearance-none cursor-pointer">
                  <option value="" className="bg-dark-800">Select range</option>
                  {CLIENT_RANGES.map(r => <option key={r} value={r} className="bg-dark-800">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">What is your current software?<span className="text-red-400">*</span></label>
                <select value={form.current_software} onChange={e => setForm({ ...form, current_software: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition appearance-none cursor-pointer">
                  <option value="" className="bg-dark-800">Select software</option>
                  {SOFTWARE_OPTIONS.map(s => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep(2)} className="flex-1 py-3.5 text-lg font-semibold rounded-xl bg-dark-700 text-white hover:bg-dark-600 transition">Previous</button>
                <button disabled={!canSubmit || submitting} onClick={handleSubmit}
                  className="flex-1 btn-primary py-3.5 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Submitting...</> : <>Submit</>}
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
  const faqId = `faq-${q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  return (
    <div className="border border-dark-600 rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={faqId}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-800/50 transition"
      >
        <span className="text-white font-medium pr-4">{q}</span>
        {open ? <Minus className="w-5 h-5 text-primary-400 shrink-0" /> : <Plus className="w-5 h-5 text-dark-400 shrink-0" />}
      </button>
      {open && <div id={faqId} className="px-5 pb-5 text-dark-300 leading-relaxed">{a}</div>}
    </div>
  );
}

/* ───────────────────── LANDING PAGE ───────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState('ai');
  const [navDropdown, setNavDropdown] = useState<string | null>(null);
  const isDropdownOpen = (id: string) => navDropdown === id;
  const openDropdown = (id: string) => setNavDropdown(id);
  const closeDropdown = () => setNavDropdown(null);
  const toggleDropdown = (id: string) => setNavDropdown(prev => (prev === id ? null : id));
  const handleDropdownKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown(id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  };
  const handleDropdownBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(next)) {
      closeDropdown();
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 landing-dark">
      {/* ── NAVIGATION ── */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center overflow-hidden"><Image src="/hand-icon-white.png" alt="PalmCare AI" width={30} height={30} className="object-contain" /></div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1" onKeyDown={(e) => e.key === 'Escape' && closeDropdown()}>
              {/* Features dropdown */}
              <div
                className="relative"
                onMouseEnter={() => openDropdown('features')}
                onMouseLeave={closeDropdown}
                onFocusCapture={() => openDropdown('features')}
                onBlurCapture={handleDropdownBlur}
              >
                <button
                  aria-haspopup="menu"
                  aria-expanded={isDropdownOpen('features')}
                  aria-controls="features-menu"
                  onClick={() => toggleDropdown('features')}
                  onKeyDown={(e) => handleDropdownKeyDown(e, 'features')}
                  className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg"
                >
                  Features <ChevronDown className="w-4 h-4" />
                </button>
                {isDropdownOpen('features') && (
                  <div id="features-menu" role="menu" className="absolute top-full left-0 mt-1 w-[520px] bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-3">
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
              <div
                className="relative"
                onMouseEnter={() => openDropdown('solutions')}
                onMouseLeave={closeDropdown}
                onFocusCapture={() => openDropdown('solutions')}
                onBlurCapture={handleDropdownBlur}
              >
                <button
                  aria-haspopup="menu"
                  aria-expanded={isDropdownOpen('solutions')}
                  aria-controls="solutions-menu"
                  onClick={() => toggleDropdown('solutions')}
                  onKeyDown={(e) => handleDropdownKeyDown(e, 'solutions')}
                  className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg"
                >
                  Solutions <ChevronDown className="w-4 h-4" />
                </button>
                {isDropdownOpen('solutions') && (
                  <div id="solutions-menu" role="menu" className="absolute top-full left-0 mt-1 w-72 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
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
              <div
                className="relative"
                onMouseEnter={() => openDropdown('resources')}
                onMouseLeave={closeDropdown}
                onFocusCapture={() => openDropdown('resources')}
                onBlurCapture={handleDropdownBlur}
              >
                <button
                  aria-haspopup="menu"
                  aria-expanded={isDropdownOpen('resources')}
                  aria-controls="resources-menu"
                  onClick={() => toggleDropdown('resources')}
                  onKeyDown={(e) => handleDropdownKeyDown(e, 'resources')}
                  className="flex items-center gap-1 px-3 py-2 text-dark-300 hover:text-white transition rounded-lg"
                >
                  Resources <ChevronDown className="w-4 h-4" />
                </button>
                {isDropdownOpen('resources') && (
                  <div id="resources-menu" role="menu" className="absolute top-full left-0 mt-1 w-64 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-3 space-y-1">
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

              <a href="#book-demo" className="px-3 py-2 text-dark-300 hover:text-white transition">Schedule Demo</a>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-dark-300 hover:text-white transition px-3 py-2">Sign In</Link>
              <a href="#book-demo" className="btn-primary py-2 px-5 text-sm">Schedule Demo</a>
            </div>

            <button aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="block lg:hidden p-2 text-dark-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pt-4 pb-2 space-y-3 border-t border-dark-700 mt-4">
              <Link href="/features" className="block py-2 text-dark-300 hover:text-white">Features</Link>
              <a href="#solutions" className="block py-2 text-dark-300 hover:text-white">Solutions</a>
              <a href="#book-demo" className="block py-2 text-dark-300 hover:text-white">Schedule Demo</a>
              <Link href="/contact" className="block py-2 text-dark-300 hover:text-white">Contact</Link>
              <Link href="/login" className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
              <a href="#book-demo" className="block btn-primary py-2 px-5 text-sm text-center mt-4">Schedule Demo</a>
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
                <a href="#book-demo" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Schedule a Demo<ArrowRight className="w-5 h-5" /></a>
                <button onClick={() => setDemoOpen(true)} className="btn-secondary flex items-center gap-2 py-4 px-8 text-lg"><Play className="w-5 h-5" />Watch Demo</button>
              </div>

              <div className="flex items-center gap-4 mt-10">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400 font-medium">256-bit Encrypted</span>
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
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary-500 rounded-full animate-pulse"
                          style={{ height: `${24 + ((i * 9) % 62)}%`, animationDelay: `${i * 50}ms` }}
                        />
                      ))}
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
            <p className="text-xl text-dark-300 mb-8">See how AI can streamline your agency&apos;s operations in a free demo.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#book-demo" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">Schedule Your Demo<ArrowRight className="w-5 h-5" /></a>
            </div>
            <p className="text-dark-400 text-sm mt-6">Free personalized demo &bull; No commitment required</p>
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
                AI-powered home care management platform. Turn voice assessments into professional contracts in minutes, not hours.
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
                <li><a href="#book-demo" className="hover:text-white transition">Schedule Demo</a></li>
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
          <p className="text-white text-sm font-medium hidden sm:block">See PalmCare AI in action</p>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <a href="#book-demo" className="flex-1 text-center btn-primary py-2.5 px-4 text-sm">Schedule a Demo</a>
          </div>
        </div>
      </div>

      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
      <ChatWidget />
    </div>
  );
}
