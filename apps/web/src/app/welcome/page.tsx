'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic, FileText, Users, CheckCircle, ArrowRight, ArrowLeft,
  Upload, Sparkles, Clock, Building2, Play, ChevronRight,
  FileCheck, Calendar, Mail, Settings, Loader2, AlertCircle
} from 'lucide-react';
import { useAuth, getStoredToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: string;
  href: string;
  completed: boolean;
}

export default function WelcomePage() {
  const router = useRouter();
  const { token, user, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showWalkthrough, setShowWalkthrough] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [agencyName, setAgencyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Walkthrough steps
  const steps: WalkthroughStep[] = [
    {
      id: 'settings',
      title: 'Set Up Your Agency',
      description: 'Add your company logo, address, and contact information. This will appear on all contracts and documents.',
      icon: Building2,
      action: 'Go to Settings',
      href: '/settings',
      completed: completedSteps.includes('settings'),
    },
    {
      id: 'client',
      title: 'Add Your First Client',
      description: 'Create a client profile with their contact info, medical history, and care preferences.',
      icon: Users,
      action: 'Add Client',
      href: '/clients?action=new',
      completed: completedSteps.includes('client'),
    },
    {
      id: 'assessment',
      title: 'Record an Assessment',
      description: 'Use voice recording or upload an existing assessment. Our AI will transcribe and extract key information.',
      icon: Mic,
      action: 'Start Assessment',
      href: '/visits/new',
      completed: completedSteps.includes('assessment'),
    },
    {
      id: 'contract',
      title: 'Generate a Contract',
      description: 'After the AI processes your assessment, review the extracted details and generate a professional contract.',
      icon: FileCheck,
      action: 'View Contracts',
      href: '/contracts',
      completed: completedSteps.includes('contract'),
    },
  ];

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [token, isLoading, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      
      try {
        // Load agency info
        const agencyRes = await fetch(`${API_BASE}/agency`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (agencyRes.ok) {
          const data = await agencyRes.json();
          if (data.name) {
            setAgencyName(data.name);
            setCompletedSteps(prev => [...prev, 'settings']);
          }
        }

        // Check for clients
        const clientsRes = await fetch(`${API_BASE}/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (clientsRes.ok) {
          const clients = await clientsRes.json();
          if (clients.length > 0) {
            setCompletedSteps(prev => [...prev, 'client']);
          }
        }

        // Check for visits/assessments
        const visitsRes = await fetch(`${API_BASE}/visits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (visitsRes.ok) {
          const visits = await visitsRes.json();
          if (visits.length > 0) {
            setCompletedSteps(prev => [...prev, 'assessment']);
          }
          // Check for contracts
          const hasContract = visits.some((v: any) => v.contract_generated);
          if (hasContract) {
            setCompletedSteps(prev => [...prev, 'contract']);
          }
        }
      } catch (err: any) {
        console.error('Error loading walkthrough data:', err);
        setError(err?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const completedCount = steps.filter(s => completedSteps.includes(s.id)).length;
  const progress = (completedCount / steps.length) * 100;

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome to Homecare AI
                </h1>
                <p className="text-dark-400">
                  {agencyName || 'Let\'s get your agency set up'}
                </p>
              </div>
            </div>
            <Link
              href="/visits"
              className="text-dark-400 hover:text-white transition flex items-center gap-2"
            >
              Skip to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Getting Started</h2>
            <span className="text-dark-400 text-sm">{completedCount} of {steps.length} completed</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            const isNext = !isCompleted && steps.slice(0, index).every(s => completedSteps.includes(s.id));
            
            return (
              <div
                key={step.id}
                className={`relative p-6 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-green-500/10 border-green-500/30'
                    : isNext
                    ? 'bg-primary-500/10 border-primary-500/50 ring-2 ring-primary-500/30'
                    : 'bg-dark-800 border-dark-700'
                }`}
              >
                {/* Step number */}
                <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isNext
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-600 text-dark-400'
                }`}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-500/20'
                      : isNext
                      ? 'bg-primary-500/20'
                      : 'bg-dark-700'
                  }`}>
                    <StepIcon className={`w-6 h-6 ${
                      isCompleted
                        ? 'text-green-400'
                        : isNext
                        ? 'text-primary-400'
                        : 'text-dark-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${
                      isCompleted ? 'text-green-400' : 'text-white'
                    }`}>
                      {step.title}
                      {isCompleted && <span className="ml-2 text-xs">Completed</span>}
                    </h3>
                    <p className="text-dark-400 text-sm mb-4">{step.description}</p>
                    <Link
                      href={step.href}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                        isCompleted
                          ? 'bg-dark-700 text-dark-300 hover:text-white'
                          : isNext
                          ? 'bg-primary-500 text-white hover:bg-primary-600'
                          : 'bg-dark-700 text-dark-400 hover:text-white'
                      }`}
                    >
                      {isCompleted ? 'Review' : step.action}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Start Video/Demo Section */}
        <div className="bg-gradient-to-r from-primary-500/10 to-purple-500/10 rounded-2xl border border-primary-500/30 p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">
                See It In Action
              </h2>
              <p className="text-dark-300 mb-6">
                Watch how easy it is to record an assessment and generate a contract in under 5 minutes.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/visits/new"
                  className="inline-flex items-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600 transition"
                >
                  <Play className="w-5 h-5" />
                  Try Demo Assessment
                </Link>
                <Link
                  href="/visits"
                  className="inline-flex items-center gap-2 bg-dark-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-dark-600 transition"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
            <div className="w-full md:w-80 aspect-video bg-dark-800 rounded-xl flex items-center justify-center border border-dark-600">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-primary-400" />
                </div>
                <p className="text-dark-400 text-sm">AI-Powered Assessment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">What You Can Do</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                title: 'Voice Recording',
                description: 'Record assessments hands-free. Our AI transcribes everything automatically.',
              },
              {
                icon: Sparkles,
                title: 'AI Extraction',
                description: 'Automatically extract client info, care needs, and billable services.',
              },
              {
                icon: FileCheck,
                title: 'Contract Generation',
                description: 'Generate professional service contracts from your assessments.',
              },
              {
                icon: Calendar,
                title: 'Google Calendar',
                description: 'Sync appointments and visits with Google Calendar.',
              },
              {
                icon: Mail,
                title: 'Gmail Integration',
                description: 'Send contracts and documents directly via Gmail.',
              },
              {
                icon: FileText,
                title: 'Export Documents',
                description: 'Export visit notes, care plans, and reports as PDFs.',
              },
            ].map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <div key={feature.title} className="bg-dark-800 rounded-xl p-5 border border-dark-700">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center mb-3">
                    <FeatureIcon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-white font-medium mb-1">{feature.title}</h3>
                  <p className="text-dark-400 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Need Help?</h2>
          <p className="text-dark-400 mb-6">
            Our team is here to help you get started. Reach out anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:support@palmtai.com"
              className="inline-flex items-center gap-2 bg-dark-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-dark-600 transition"
            >
              <Mail className="w-5 h-5" />
              Email Support
            </a>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 bg-dark-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-dark-600 transition"
            >
              <Settings className="w-5 h-5" />
              Account Settings
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
