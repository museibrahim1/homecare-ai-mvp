// Shared constants for the Sales Leads page.
import React from 'react';
import {
  Mail, MailOpen, MessageSquare, Phone, Circle, Calendar, Eye, TrendingUp,
  CheckCircle2, X, Clock, Zap, Sparkles, Send,
} from 'lucide-react';

export const API_BASE = '/api';

export const STATE_OPTIONS = [
  { value: '', label: 'All States' },
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'Washington DC' },
  { value: '---', label: '── Canada ──', disabled: true },
  { value: 'BC', label: 'British Columbia' }, { value: 'ON', label: 'Ontario' }, { value: 'QC', label: 'Quebec' },
  { value: 'AB', label: 'Alberta' }, { value: 'MB', label: 'Manitoba' }, { value: 'SK', label: 'Saskatchewan' },
  { value: 'NS', label: 'Nova Scotia' }, { value: 'NB', label: 'New Brunswick' },
];

export const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  warm_open: Mail,
  pattern_interrupt: Zap,
  aspiration: Sparkles,
  proof_point: TrendingUp,
  graceful_exit: Send,
};

export const TEMPLATE_COLORS: Record<string, string> = {
  warm_open: 'from-amber-500 to-orange-400',
  pattern_interrupt: 'from-violet-500 to-fuchsia-500',
  aspiration: 'from-indigo-500 to-purple-500',
  proof_point: 'from-emerald-500 to-cyan-500',
  graceful_exit: 'from-slate-500 to-gray-500',
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  new: { label: 'New', color: 'bg-slate-500/20 text-slate-600', icon: Circle },
  contacted: { label: 'Contacted', color: 'bg-blue-50 text-blue-600', icon: Phone },
  email_sent: { label: 'Email Sent', color: 'bg-indigo-50 text-indigo-600', icon: Mail },
  email_opened: { label: 'Opened', color: 'bg-purple-50 text-purple-600', icon: MailOpen },
  responded: { label: 'Responded', color: 'bg-emerald-50 text-emerald-400', icon: MessageSquare },
  meeting_scheduled: { label: 'Meeting', color: 'bg-cyan-50 text-cyan-600', icon: Calendar },
  demo_given: { label: 'Demo Given', color: 'bg-amber-50 text-amber-600', icon: Eye },
  negotiating: { label: 'Negotiating', color: 'bg-orange-50 text-orange-600', icon: TrendingUp },
  converted: { label: 'Converted', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  not_interested: { label: 'Not Interested', color: 'bg-red-50 text-red-600', icon: X },
  no_response: { label: 'No Response', color: 'bg-gray-500/20 text-slate-500', icon: Clock },
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};
