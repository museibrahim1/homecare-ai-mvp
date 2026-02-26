'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle, Circle, ChevronRight, X, Sparkles,
  Building2, Users, Mic, FileCheck, ArrowRight
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: any;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'settings',
    title: 'Set up your agency profile',
    description: 'Add logo, address, and contact info',
    href: '/settings',
    icon: Building2,
  },
  {
    id: 'client',
    title: 'Add your first client',
    description: 'Create a client profile',
    href: '/clients?action=new',
    icon: Users,
  },
  {
    id: 'assessment',
    title: 'Complete an assessment',
    description: 'Record or upload a visit',
    href: '/visits/new',
    icon: Mic,
  },
  {
    id: 'contract',
    title: 'Generate a contract',
    description: 'Create your first service agreement',
    href: '/contracts',
    icon: FileCheck,
  },
];

export default function OnboardingChecklist() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('onboarding-dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    const checkProgress = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const completed: string[] = [];

      try {
        const agencyRes = await fetch(`${API_BASE}/agency`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (agencyRes.ok) {
          const data = await agencyRes.json();
          if (data.name && data.name.trim()) {
            completed.push('settings');
          }
        }

        const clientsRes = await fetch(`${API_BASE}/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (clientsRes.ok) {
          const clients = await clientsRes.json();
          if (Array.isArray(clients) && clients.length > 0) {
            completed.push('client');
          }
        }

        const visitsRes = await fetch(`${API_BASE}/visits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (visitsRes.ok) {
          const visits = await visitsRes.json();
          if (Array.isArray(visits) && visits.length > 0) {
            completed.push('assessment');
          }
          if (Array.isArray(visits) && visits.some((v: any) => v.contract_generated)) {
            completed.push('contract');
          }
        }

        setCompletedSteps(completed);

        if (completed.length === CHECKLIST_ITEMS.length) {
          setTimeout(() => {
            setDismissed(true);
            localStorage.setItem('onboarding-dismissed', 'true');
          }, 2000);
        }
      } catch (err) {
        console.error('Error checking onboarding progress:', err);
      } finally {
        setLoading(false);
      }
    };

    checkProgress();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('onboarding-dismissed', 'true');
  };

  if (loading || dismissed) return null;

  const completedCount = completedSteps.length;
  const progress = (completedCount / CHECKLIST_ITEMS.length) * 100;
  const allComplete = completedCount === CHECKLIST_ITEMS.length;

  return (
    <div className={`rounded-xl border p-5 mb-6 ${
      allComplete 
        ? 'bg-emerald-50 border-emerald-200' 
        : 'bg-primary-50 border-primary-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            allComplete ? 'bg-emerald-100' : 'bg-primary-100'
          }`}>
            {allComplete ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <Sparkles className="w-5 h-5 text-primary-600" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${allComplete ? 'text-emerald-700' : 'text-slate-800'}`}>
              {allComplete ? 'Setup Complete!' : 'Getting Started'}
            </h3>
            <p className="text-slate-500 text-sm">
              {allComplete 
                ? 'You\'re all set to use PalmCare AI' 
                : `${completedCount} of ${CHECKLIST_ITEMS.length} tasks completed`
              }
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-4">
        <div 
          className={`h-full transition-all duration-500 ${
            allComplete ? 'bg-emerald-500' : 'bg-primary-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => {
          const isCompleted = completedSteps.includes(item.id);
          const ItemIcon = item.icon;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${
                isCompleted 
                  ? 'bg-white/60' 
                  : 'bg-white hover:bg-slate-50 border border-slate-100'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isCompleted ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ItemIcon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
                }`}>
                  {item.title}
                </p>
                {!isCompleted && (
                  <p className="text-xs text-slate-400">{item.description}</p>
                )}
              </div>
              {!isCompleted && (
                <ChevronRight className="w-4 h-4 text-slate-300" />
              )}
            </Link>
          );
        })}
      </div>

      {!allComplete && (
        <Link
          href="/welcome"
          className="flex items-center justify-center gap-2 mt-4 text-primary-600 text-sm hover:text-primary-700 transition font-medium"
        >
          View full setup guide
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
