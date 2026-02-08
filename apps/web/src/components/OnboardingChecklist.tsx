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
    // Check if dismissed
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
        // Check agency settings
        const agencyRes = await fetch(`${API_BASE}/agency`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (agencyRes.ok) {
          const data = await agencyRes.json();
          if (data.name && data.name.trim()) {
            completed.push('settings');
          }
        }

        // Check for clients
        const clientsRes = await fetch(`${API_BASE}/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (clientsRes.ok) {
          const clients = await clientsRes.json();
          if (Array.isArray(clients) && clients.length > 0) {
            completed.push('client');
          }
        }

        // Check for visits
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

        // Auto-dismiss if all completed
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
    <div className={`rounded-2xl border p-6 mb-6 ${
      allComplete 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-gradient-to-r from-primary-500/10 to-purple-500/10 border-primary-500/30'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            allComplete ? 'bg-green-500/20' : 'bg-primary-500/20'
          }`}>
            {allComplete ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Sparkles className="w-5 h-5 text-primary-400" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${allComplete ? 'text-green-400' : 'text-white'}`}>
              {allComplete ? 'Setup Complete!' : 'Getting Started'}
            </h3>
            <p className="text-dark-400 text-sm">
              {allComplete 
                ? 'You\'re all set to use Homecare AI' 
                : `${completedCount} of ${CHECKLIST_ITEMS.length} tasks completed`
              }
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 hover:bg-dark-700 rounded-lg transition"
          title="Dismiss"
        >
          <X className="w-4 h-4 text-dark-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden mb-4">
        <div 
          className={`h-full transition-all duration-500 ${
            allComplete ? 'bg-green-500' : 'bg-primary-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isCompleted = completedSteps.includes(item.id);
          const ItemIcon = item.icon;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-xl transition ${
                isCompleted 
                  ? 'bg-dark-800/50' 
                  : 'bg-dark-800 hover:bg-dark-700'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isCompleted ? 'bg-green-500/20' : 'bg-dark-700'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <ItemIcon className="w-4 h-4 text-dark-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isCompleted ? 'text-dark-400 line-through' : 'text-white'
                }`}>
                  {item.title}
                </p>
                {!isCompleted && (
                  <p className="text-xs text-dark-500">{item.description}</p>
                )}
              </div>
              {!isCompleted && (
                <ChevronRight className="w-4 h-4 text-dark-500" />
              )}
            </Link>
          );
        })}
      </div>

      {/* View full guide link */}
      {!allComplete && (
        <Link
          href="/welcome"
          className="flex items-center justify-center gap-2 mt-4 text-primary-400 text-sm hover:text-primary-300 transition"
        >
          View full setup guide
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
