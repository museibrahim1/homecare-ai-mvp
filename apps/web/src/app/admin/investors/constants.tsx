// Shared constants for the Investors page.
import React from 'react';
import { Circle, Eye, Mail, Send, MailOpen, Calendar, CheckCircle2, X, DollarSign } from 'lucide-react';

export const API_BASE = '/api';

export const STATUS_OPTIONS = [
  'new', 'researched', 'contacted', 'email_sent', 'responded',
  'meeting_scheduled', 'interested', 'passed', 'committed',
] as const;

export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  new: { label: 'New', color: 'bg-slate-500/20 text-slate-600', icon: Circle },
  researched: { label: 'Researched', color: 'bg-blue-500/20 text-blue-400', icon: Eye },
  contacted: { label: 'Contacted', color: 'bg-indigo-500/20 text-indigo-400', icon: Mail },
  email_sent: { label: 'Email Sent', color: 'bg-violet-500/20 text-violet-400', icon: Send },
  responded: { label: 'Responded', color: 'bg-cyan-500/20 text-cyan-400', icon: MailOpen },
  meeting_scheduled: { label: 'Meeting', color: 'bg-amber-500/20 text-amber-400', icon: Calendar },
  interested: { label: 'Interested', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 },
  passed: { label: 'Passed', color: 'bg-red-500/20 text-red-400', icon: X },
  committed: { label: 'Committed', color: 'bg-green-500/20 text-green-300', icon: DollarSign },
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-500/15 border-red-500/30',
  medium: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

export const TYPE_OPTIONS = ['vc_fund', 'angel', 'accelerator', 'syndicate'] as const;
export const TYPE_LABELS: Record<string, string> = {
  vc_fund: 'VC Fund',
  angel: 'Angel',
  accelerator: 'Accelerator',
  syndicate: 'Syndicate',
};
