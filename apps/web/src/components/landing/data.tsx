import {
  BarChart3, Brain, Building2, Calendar, ClipboardList, FileText, Globe,
  Headphones, HeartPulse, Mic, PieChart, Settings, Shield, Smartphone,
  TrendingUp, Users, Zap,
} from 'lucide-react';

export const FEATURES_TABS = [
  {
    id: 'ai',
    label: 'AI Intelligence',
    features: [
      {
        icon: Mic,
        title: 'Voice Assessments',
        description: 'Record the visit on your phone. AI transcribes it, separates speakers, and handles medical terminology.',
        color: 'from-blue-500 to-cyan-500',
        image: '/screenshots/care-tracker.png',
      },
      {
        icon: Brain,
        title: 'Contract Generation',
        description: 'One recording becomes a care plan and a state-specific service agreement, pre-filled and ready to sign.',
        color: 'from-teal-500 to-cyan-500',
        image: '/screenshots/contract-preview.png',
      },
      {
        icon: Zap,
        title: 'Data Extraction',
        description: 'Billables, care needs, medications, and safety risks are pulled from the conversation — nothing re-typed.',
        color: 'from-yellow-500 to-orange-500',
        image: '/screenshots/transcript.png',
      },
      {
        icon: FileText,
        title: 'Review & Sign',
        description: 'Staff review what the AI wrote, adjust anything, and export for signature. Humans approve every document.',
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
        title: 'Client CRM',
        description: 'Every client from first call to active care, in one pipeline with full history.',
        color: 'from-blue-500 to-indigo-500',
        image: '/screenshots/client-crm.png',
      },
      {
        icon: ClipboardList,
        title: 'Documents',
        description: 'Contracts, assessments, recordings, and notes — searchable in one place.',
        color: 'from-teal-500 to-cyan-500',
        image: '/screenshots/contract-form.png',
      },
      {
        icon: Calendar,
        title: 'Assessments & Visits',
        description: 'Track each assessment from recording to signed contract, with visit status in real time.',
        color: 'from-cyan-500 to-blue-500',
        image: '/screenshots/scheduling.png',
      },
      {
        icon: Settings,
        title: 'Dashboard',
        description: 'Workload, pipeline movement, and team activity at a glance.',
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
        title: 'Billing Extraction',
        description: 'Hours, rates, and services come straight from the assessment — fewer billing errors.',
        color: 'from-green-500 to-emerald-500',
        image: '/screenshots/smart-contract.png',
      },
      {
        icon: PieChart,
        title: 'Revenue Dashboard',
        description: 'Client volume, pipeline value, and revenue trends in real time.',
        color: 'from-orange-500 to-amber-500',
        image: '/screenshots/dashboard.png',
      },
      {
        icon: TrendingUp,
        title: 'Reports & Exports',
        description: 'Billing, performance, and activity reports, exportable for leadership and audits.',
        color: 'from-cyan-500 to-blue-500',
        image: '/screenshots/client-detail.png',
      },
      {
        icon: Shield,
        title: 'HIPAA Security',
        description: '256-bit encryption, role-based access, and audit trails on every record.',
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
        title: 'iOS App',
        description: 'Record assessments, review transcripts, and generate contracts from the field.',
        color: 'from-teal-500 to-emerald-500',
        image: '/screenshots/ios/00_landing_fresh.png',
      },
      {
        icon: HeartPulse,
        title: 'Care Profiles',
        description: 'Medical history, medications, contacts, and visit notes in one client view.',
        color: 'from-emerald-500 to-teal-500',
        image: '/screenshots/adl-logging.png',
      },
      {
        icon: Globe,
        title: 'Agency View',
        description: 'Leaders see assessment progress and client status across the whole team.',
        color: 'from-blue-500 to-sky-500',
        image: '/screenshots/client-crm.png',
      },
      {
        icon: Headphones,
        title: 'Visit Workflow',
        description: 'Schedules, visit tracking, and documentation — no trip back to the office.',
        color: 'from-amber-500 to-yellow-500',
        image: '/screenshots/voice-assessment.png',
      },
    ],
  },
];

/*
 * Testimonials intentionally removed: the landing page no longer ships
 * fabricated quotes/metrics (brand voice: "earn it, don't claim it").
 * Add a TESTIMONIALS array of REAL, attributable agency quotes here and wire
 * it back into the landing page once we have permission to publish them.
 */

export const SOLUTIONS = [
  {
    size: 'Small Agencies',
    clients: 'Up to 30 Clients',
    description: 'One person can run intake end to end: record the assessment, review what the AI wrote, send the contract.',
    features: ['Voice-powered assessments', 'Contract auto-generation', 'Client CRM', 'Caregiver mobile app', 'Email support'],
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    size: 'Medium Agencies',
    clients: '30 - 200 Clients',
    description: 'Add staff without adding admin. A shared pipeline, templates, and reporting keep every coordinator consistent.',
    features: ['Everything in Small', 'Custom templates & forms', 'Advanced reporting', 'Multi-user access', 'Priority support'],
    icon: TrendingUp,
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    size: 'Enterprise',
    clients: '200+ Clients',
    description: 'Multi-location oversight, complex billing, and documentation that reads the same in every office.',
    features: ['Everything in Medium', 'Multi-location management', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
    icon: Globe,
    gradient: 'from-orange-500 to-amber-500',
  },
];

export const FAQ_ITEMS = [
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
    a: 'Yes — every plan comes with a 14-day free trial with full access to all features. No credit card required to start. When you\'re ready, subscriptions are purchased in the PalmCare iOS app via your Apple ID, and you can cancel anytime.',
  },
];

export const US_STATES = [
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

export const SERVICES_OPTIONS = ['Hospice', 'Intellectual and Developmental Disabilities (IDD)', 'Non-Skilled Services', 'Skilled Nursing Services', 'Personal Care', 'Companion Care'];

export const ROLE_OPTIONS = ['Agency Owner', 'Administrator', 'Office Manager', 'Clinical Director', 'Billing Manager', 'Other'];

export const CLIENT_RANGES = ['1-10', '11-25', '26-50', '51-100', '101-250', '250+'];

export const SOFTWARE_OPTIONS = ['None / Pen & Paper', 'AxisCare', 'ClearCare / WellSky', 'Alora', 'HHAeXchange', 'Axxess', 'MatrixCare', 'KanTime', 'Sandata', 'Other'];

export const REFERRAL_SOURCES = ['Google Search', 'LinkedIn', 'Facebook', 'Instagram', 'Referral from a Friend/Colleague', 'Industry Conference/Event', 'Email', 'Phone Call', 'Other'];

export const DEMO_STEPS = [
  { title: 'Step 1: Record It', description: 'Staff records the client assessment on their phone — one tap to start', duration: 5000 },
  { title: 'Step 2: Transcribe It', description: 'AI transcribes the conversation and identifies who is speaking', duration: 4000 },
  { title: 'Step 3: Extract It', description: 'AI captures care needs, services, schedule, and billable items', duration: 4000 },
  { title: 'Step 4: Contract It', description: 'Complete care plan and service agreement — ready to sign', duration: 5000 },
];

/* ───────────────────── DEMO MODAL ───────────────────── */


export const MEDICAL_KEYWORDS = new Set([
  'diabetes', 'medication', 'insulin', 'bathing', 'dressing', 'meals',
  'blood', 'pressure', 'mobility', 'walker', 'wheelchair', 'physical',
  'therapy', 'ADLs', 'careplan', 'assessment', 'vitals', 'dosage',
  'morning', 'evening', 'twice', 'daily', 'prescription', 'metformin',
  'hypertension', 'arthritis', 'fall', 'risk', 'glucose', 'monitoring',
]);

export interface TranscriptSegment {
  speaker: 'nurse' | 'client';
  label: string;
  words: string[];
}

export const TRANSCRIPT_SEGMENTS: TranscriptSegment[] = [
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

