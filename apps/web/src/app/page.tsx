'use client';

import { useState, useEffect, useMemo } from 'react';
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
  User
} from 'lucide-react';

const FEATURES = [
  {
    icon: Mic,
    title: 'Voice-Powered Assessments',
    description: 'Record care assessments naturally. Our AI transcribes and extracts key information automatically.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: FileText,
    title: 'Auto-Generated Contracts',
    description: 'Transform assessments into professional, proposal-ready contracts in seconds.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Client Management',
    description: 'CRM-style pipeline to track clients from intake through active care.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: BarChart3,
    title: 'Billing & Reports',
    description: 'Automatic billable extraction and comprehensive reporting dashboard.',
    color: 'from-orange-500 to-red-500',
  },
];

const TESTIMONIALS = [
  {
    quote: "PalmCare AI cut our contract generation time from hours to minutes. Game changer.",
    author: "Sarah M.",
    role: "Agency Owner, Texas",
    rating: 5,
  },
  {
    quote: "The voice assessment feature lets our caregivers focus on clients, not paperwork.",
    author: "Michael R.",
    role: "Operations Director, Florida",
    rating: 5,
  },
  {
    quote: "Finally, a system built for home care agencies. Not retrofitted from something else.",
    author: "Jennifer L.",
    role: "Care Coordinator, California",
    rating: 5,
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: 299,
    description: 'For small agencies getting organized',
    features: ['25 contracts/month', '50 clients in CRM', '25 caregivers', '3 team seats', 'Email support'],
    popular: false,
  },
  {
    name: 'Growth',
    price: 599,
    description: 'For growing teams',
    features: ['100 contracts/month', '200 clients in CRM', '100 caregivers', '10 team seats', 'Priority support'],
    popular: true,
  },
  {
    name: 'Pro',
    price: 1299,
    description: 'For high-volume teams',
    features: ['300 contracts/month', '1,000 clients in CRM', '500 caregivers', 'Unlimited seats', 'Advanced analytics'],
    popular: false,
  },
];

// Demo steps data
const DEMO_STEPS = [
  {
    title: 'Step 1: Record Assessment',
    description: 'Caregiver records the client intake assessment using voice',
    duration: 5000,
  },
  {
    title: 'Step 2: AI Transcription',
    description: 'Our AI transcribes and identifies speakers automatically',
    duration: 4000,
  },
  {
    title: 'Step 3: Extract Care Needs',
    description: 'AI extracts services, schedule, and billable items',
    duration: 4000,
  },
  {
    title: 'Step 4: Generate Contract',
    description: 'Professional contract is generated instantly',
    duration: 5000,
  },
];

// Demo Modal Component
function DemoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setProgress(0);
      setIsPlaying(true);
    }
  }, [isOpen]);

  // Animation timer
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    
    // Safety check
    if (currentStep >= DEMO_STEPS.length) return;

    const stepDuration = DEMO_STEPS[currentStep].duration;
    const interval = 50;
    const increment = (interval / stepDuration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentStep < DEMO_STEPS.length - 1) {
            setCurrentStep(s => s + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStep]);

  const handleSkip = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
      setProgress(0);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-dark-800 rounded-2xl w-full max-w-4xl overflow-hidden border border-dark-600 shadow-2xl">
        {/* Header */}
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
          <button aria-label="Close demo" onClick={onClose} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Demo Content */}
        <div className="p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {DEMO_STEPS.map((step, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1 rounded-full transition-all ${
                  i < currentStep ? 'bg-green-500' : 
                  i === currentStep ? 'bg-primary-500' : 'bg-dark-600'
                }`}>
                  {i === currentStep && (
                    <div 
                      className="h-full bg-primary-400 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current step title */}
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-white mb-2">{DEMO_STEPS[currentStep]?.title}</h4>
            <p className="text-dark-400">{DEMO_STEPS[currentStep]?.description}</p>
          </div>

          {/* Demo visualization */}
          <div className="bg-dark-900 rounded-xl p-6 min-h-[300px] relative overflow-hidden">
            {/* Step 1: Recording */}
            {currentStep === 0 && (
              <div className="flex flex-col items-center justify-center h-full animate-fadeIn">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-red-500/30">
                  <Mic className="w-12 h-12 text-white" />
                </div>
                <div className="flex items-center gap-1 h-16 mb-4">
                  {[...Array(40)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-red-500 rounded-full animate-waveform"
                      style={{ 
                        height: `${20 + Math.random() * 80}%`,
                        animationDelay: `${i * 30}ms`
                      }}
                    />
                  ))}
                </div>
                <div className="bg-dark-800 rounded-xl p-4 max-w-md">
                  <p className="text-dark-300 text-sm italic">
                    "Mrs. Johnson needs assistance with bathing, dressing, and meal preparation. 
                    She has diabetes and requires medication reminders twice daily..."
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Transcription */}
            {currentStep === 1 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-white font-medium">AI Transcribing...</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3 animate-slideIn" style={{ animationDelay: '0ms' }}>
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">C</div>
                    <div className="flex-1 bg-dark-800 rounded-xl p-3">
                      <p className="text-xs text-purple-400 mb-1">Caregiver (00:00)</p>
                      <p className="text-dark-200 text-sm">Good morning Mrs. Johnson, I'm here to do your care assessment today.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 animate-slideIn" style={{ animationDelay: '200ms' }}>
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">M</div>
                    <div className="flex-1 bg-dark-800 rounded-xl p-3">
                      <p className="text-xs text-green-400 mb-1">Mrs. Johnson (00:05)</p>
                      <p className="text-dark-200 text-sm">Hello dear, thank you for coming. I've been having trouble with my daily activities.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 animate-slideIn" style={{ animationDelay: '400ms' }}>
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">C</div>
                    <div className="flex-1 bg-dark-800 rounded-xl p-3">
                      <p className="text-xs text-purple-400 mb-1">Caregiver (00:12)</p>
                      <p className="text-dark-200 text-sm">I understand. Let's go through what kind of help you need...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Extraction */}
            {currentStep === 2 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-white font-medium">Extracting Care Needs...</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn" style={{ animationDelay: '0ms' }}>
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Services Identified</h5>
                    <ul className="space-y-2">
                      {['Bathing Assistance', 'Dressing Assistance', 'Meal Preparation', 'Medication Reminders'].map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-dark-200">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          {s}
                        </li>
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
                    <p className="text-sm text-dark-400">$420/week • $1,820/month</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Contract */}
            {currentStep === 3 && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="text-xl font-bold text-white">Contract Ready!</span>
                </div>
                <div className="bg-white rounded-xl p-6 max-w-md mx-auto shadow-2xl">
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Home Care Service Agreement</h5>
                    <p className="text-sm text-gray-500">Contract #HC-2024-0847</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Client:</span>
                      <span className="text-gray-900 font-medium">Margaret Johnson</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Services:</span>
                      <span className="text-gray-900 font-medium">Personal Care</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Schedule:</span>
                      <span className="text-gray-900 font-medium">Mon, Wed, Fri</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Hours/Week:</span>
                      <span className="text-gray-900 font-medium">12 hours</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-3">
                      <span className="text-gray-900 font-bold">Monthly Total:</span>
                      <span className="text-green-600 font-bold">$1,820.00</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">
                      Download PDF
                    </button>
                    <button className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                      Send to Client
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-dark-400">
              Step {currentStep + 1} of {DEMO_STEPS.length}
            </div>
            <div className="flex items-center gap-3">
              {!isPlaying && currentStep === DEMO_STEPS.length - 1 ? (
                <button 
                  onClick={handleRestart}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
                >
                  Watch Again
                </button>
              ) : (
                <>
                  <button 
                    aria-label={isPlaying ? 'Pause demo' : 'Play demo'}
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button 
                    aria-label="Skip to next step"
                    onClick={handleSkip}
                    className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </>
              )}
              <Link 
                href="/register"
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
              >
                Try It Free
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
        }
        .animate-waveform {
          animation: waveform 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Book Demo Component — rectangular calendar layout
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
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(year, month, d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const isSelectable = (d: Date) => {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    if (d <= today) return false;
    const diffMs = d.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  };

  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const canGoPrev = viewMonth.month > today.getMonth() || viewMonth.year > today.getFullYear();
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1);
  const canGoNext = viewMonth.year < maxMonth.getFullYear() || viewMonth.month < maxMonth.getMonth();

  const prevMonth = () => {
    setViewMonth(prev => {
      const d = new Date(prev.year, prev.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const nextMonth = () => {
    setViewMonth(prev => {
      const d = new Date(prev.year, prev.month + 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30',
  ];

  const formatSlot = (slot: string) => {
    const [h, m] = slot.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const selectedDateObj = selectedDate
    ? new Date(selectedDate + 'T12:00:00')
    : null;

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/demos/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          date: selectedDate,
          time_slot: selectedTime,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMeetLink(data.meeting_link || null);
        setConfirmDate(data.date);
        setConfirmTime(data.time);
        setStep('success');
      } else {
        alert(data.detail || 'Failed to book demo. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <section id="book-demo" className="py-20 px-6 bg-dark-800/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full mb-6">
            <Video className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Live Product Demo</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            See PalmCare AI in Action
          </h2>
          <p className="text-xl text-dark-400 max-w-2xl mx-auto">
            Book a free 30-minute demo with our team. We&apos;ll show you how to turn assessments into contracts in minutes.
          </p>
        </div>

        <div className="card p-6 md:p-8 border-primary-500/20">
          {step === 'date' && (
            <div className="grid md:grid-cols-[1fr_340px] gap-8">
              {/* Left: Calendar */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-400" />
                    {monthLabel}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Previous month"
                      onClick={prevMonth}
                      disabled={!canGoPrev}
                      className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      aria-label="Next month"
                      onClick={nextMonth}
                      disabled={!canGoNext}
                      className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 mb-1">
                  {DOW.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-dark-400 uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, i) => {
                    if (!day) {
                      return <div key={`empty-${i}`} className="aspect-square" />;
                    }
                    const iso = toIso(day);
                    const selectable = isSelectable(day);
                    const isSelected = iso === selectedDate;
                    const isToday = day.getTime() === today.getTime();

                    return (
                      <button
                        key={iso}
                        disabled={!selectable}
                        onClick={() => { setSelectedDate(iso); setSelectedTime(null); }}
                        className={`aspect-square flex items-center justify-center text-sm font-medium rounded-xl transition-all relative
                          ${isSelected
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : selectable
                              ? 'text-dark-200 hover:bg-dark-700 hover:text-white cursor-pointer'
                              : 'text-dark-600 cursor-not-allowed'
                          }
                        `}
                      >
                        {day.getDate()}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-dark-500 mt-3">Weekdays only, up to 30 days out</p>
              </div>

              {/* Right: Time slots + continue */}
              <div className="border-t md:border-t-0 md:border-l border-dark-600/50 pt-6 md:pt-0 md:pl-8">
                {selectedDate && selectedDateObj ? (
                  <div className="animate-fadeIn">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className="text-sm text-dark-400 mb-5 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      30 min &bull; Eastern Time
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-hide">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                            selectedTime === slot
                              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                              : 'bg-dark-700/50 text-dark-300 hover:bg-dark-700 hover:text-white border border-dark-600'
                          }`}
                        >
                          {formatSlot(slot)}
                        </button>
                      ))}
                    </div>
                    {selectedTime && (
                      <button
                        onClick={() => setStep('form')}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-5"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
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
              <button
                onClick={() => setStep('date')}
                className="text-sm text-dark-400 hover:text-white flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back to calendar
              </button>

              <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {selectedDateObj?.toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                  <p className="text-dark-400 text-sm">{formatSlot(selectedTime!)} ET — 30 min demo via Google Meet</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white">Your Details</h3>

              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text"
                    placeholder="Full name *"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="email"
                    placeholder="Work email *"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                    required
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text"
                    placeholder="Company / Agency name *"
                    value={form.company_name}
                    onChange={e => setForm({ ...form, company_name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !form.name || !form.email || !form.company_name}
                className="w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Book My Demo
                  </>
                )}
              </button>

              <p className="text-center text-dark-500 text-xs">
                By booking, you agree to receive a calendar invite and follow-up emails.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="max-w-lg mx-auto text-center space-y-6 animate-fadeIn py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Demo Booked!</h3>
              <p className="text-dark-300">
                Your demo is confirmed for <span className="text-white font-semibold">{confirmDate}</span> at{' '}
                <span className="text-white font-semibold">{confirmTime} ET</span>.
              </p>

              {meetLink && (
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition shadow-lg shadow-green-500/30"
                >
                  <Video className="w-5 h-5" />
                  Join Google Meet
                </a>
              )}

              <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-4">
                <p className="text-dark-400 text-sm">
                  Check your email at <span className="text-white">{form.email}</span> for the calendar invite and meeting details.
                </p>
              </div>

              <button
                onClick={() => { setStep('date'); setSelectedDate(null); setSelectedTime(null); setForm({ name: '', email: '', company_name: '', phone: '' }); }}
                className="text-primary-400 hover:text-primary-300 text-sm font-medium transition"
              >
                Book another demo
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </section>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Navigation */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">PalmCare AI</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-dark-300 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-dark-300 hover:text-white transition">Pricing</a>
              <a href="#book-demo" className="text-dark-300 hover:text-white transition">Book Demo</a>
              <Link href="/login" className="text-dark-300 hover:text-white transition">Sign In</Link>
              <Link href="/register" className="btn-primary py-2 px-5 text-sm">
                Get Started Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-dark-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-4 pb-2 space-y-3">
              <a href="#features" className="block py-2 text-dark-300 hover:text-white">Features</a>
              <a href="#pricing" className="block py-2 text-dark-300 hover:text-white">Pricing</a>
              <a href="#book-demo" className="block py-2 text-dark-300 hover:text-white">Book Demo</a>
              <Link href="/login" className="block py-2 text-dark-300 hover:text-white">Sign In</Link>
              <Link href="/register" className="block btn-primary py-2 px-5 text-sm text-center mt-4">
                Get Started Free
              </Link>
            </div>
          )}
        </div>
      </nav>

      <main>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
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
                Stop spending hours on paperwork. Record assessments, auto-generate contracts, 
                and manage your home care agency with one powerful AI platform.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => setDemoOpen(true)}
                  className="btn-secondary flex items-center gap-2 py-4 px-8 text-lg"
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>

              <div className="flex items-center gap-6 mt-10">
                <div className="flex -space-x-3">
                  {['S', 'M', 'J', 'R'].map((initial, i) => (
                    <div 
                      key={i}
                      className={`w-10 h-10 rounded-full border-2 border-dark-900 flex items-center justify-center text-white font-semibold text-sm
                        ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-purple-500' : i === 2 ? 'bg-green-500' : 'bg-orange-500'}`}
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-dark-400">Trusted by 500+ agencies</p>
                </div>
              </div>
            </div>

            {/* Hero Image / Demo */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-cyan/20 blur-3xl" />
              <div className="relative bg-dark-800 border border-dark-600 rounded-2xl p-6 shadow-2xl">
                {/* Mock Dashboard */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="space-y-4">
                  <div className="bg-dark-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-full flex items-center justify-center">
                        <Mic className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Recording Assessment...</p>
                        <p className="text-sm text-dark-400">Client: Margaret Johnson</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 h-8">
                      {[...Array(30)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-primary-500 rounded-full animate-pulse"
                          style={{ 
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 50}ms`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-dark-700 rounded-xl p-3">
                      <p className="text-2xl font-bold text-white">24</p>
                      <p className="text-xs text-dark-400">Clients</p>
                    </div>
                    <div className="bg-dark-700 rounded-xl p-3">
                      <p className="text-2xl font-bold text-green-400">12</p>
                      <p className="text-xs text-dark-400">Contracts</p>
                    </div>
                    <div className="bg-dark-700 rounded-xl p-3">
                      <p className="text-2xl font-bold text-cyan-400">$8.2k</p>
                      <p className="text-xs text-dark-400">This Month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Book a Demo Section */}
      <BookDemoSection />

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Run Your Agency
            </h2>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">
              Built specifically for home care agencies. Not adapted from generic software.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="card p-6 group hover:border-primary-500/30 transition-all">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-dark-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              From Assessment to Contract in 3 Steps
            </h2>
            <p className="text-xl text-dark-400">Simple workflow, powerful results</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Record Assessment',
                description: 'Use voice or upload existing recordings. Our AI understands care-specific terminology.',
                icon: Mic,
              },
              {
                step: '2',
                title: 'AI Processes Data',
                description: 'Automatic transcription, speaker identification, and extraction of care needs.',
                icon: Zap,
              },
              {
                step: '3',
                title: 'Generate Contract',
                description: 'Get a professional, proposal-ready contract with services, schedule, and pricing.',
                icon: FileText,
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {item.step}
                </div>
                <div className="card p-8 pt-10">
                  <item.icon className="w-10 h-10 text-primary-400 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-dark-400">{item.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ChevronRight className="w-8 h-8 text-dark-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-dark-400">Start free, upgrade as you grow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan, i) => (
              <div 
                key={i} 
                className={`card p-6 relative ${plan.popular ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-500 rounded-full text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-dark-400 text-sm mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  {plan.price ? (
                    <>
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-dark-400">/mo</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-white">Custom</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-dark-300 text-sm">
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link 
                  href={plan.price ? `/register?plan=${plan.name.toLowerCase()}` : '/contact?plan=enterprise'}
                  className={`block text-center py-3 rounded-xl font-medium transition ${
                    plan.popular 
                      ? 'btn-primary' 
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {plan.price ? 'Get Started' : 'Contact Sales'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by Home Care Agencies
            </h2>
            <p className="text-xl text-dark-400">See what our customers are saying</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="card p-8">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-dark-200 text-lg mb-6">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-dark-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="card p-12 text-center bg-gradient-to-br from-primary-500/10 to-accent-cyan/10 border-primary-500/30">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Agency?
            </h2>
            <p className="text-xl text-dark-300 mb-8">
              Join 500+ home care agencies using AI to streamline their operations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-primary flex items-center gap-2 py-4 px-8 text-lg">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#book-demo" className="btn-secondary py-4 px-8 text-lg">
                Book a Demo
              </a>
            </div>
            <p className="text-dark-400 text-sm mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-dark-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">PalmCare AI</span>
              </Link>
              <p className="text-dark-400 text-sm">
                AI-powered home care management platform. Turn assessments into contracts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Product</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
                <li><Link href="/status" className="hover:text-white transition">System Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Company</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4 text-base">Legal</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">HIPAA Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-dark-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-400 text-sm">
              © 2026 PalmCare AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-dark-400" />
              <span className="text-dark-400 text-sm">HIPAA Compliant</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
