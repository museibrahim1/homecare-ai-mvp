// Shared constants for the Clients page.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  intake: { label: 'Intake', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-l-blue-500' },
  assessment: { label: 'Assessment', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-l-purple-500' },
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-l-yellow-500' },
  proposal: { label: 'Proposal Sent', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-l-orange-500' },
  active: { label: 'Active', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-l-emerald-500' },
  assigned: { label: 'Assigned', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-l-teal-500' },
  follow_up: { label: 'Follow-up', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-l-purple-500' },
  inactive: { label: 'Inactive', color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-l-slate-400' },
  discharged: { label: 'Discharged', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-l-red-500' },
};

export const CARE_SPECIALTY_OPTIONS = [
  'General Care',
  'Dementia Care',
  'Post-Surgery',
  'Cardiac Care',
  'Diabetes Management',
  'Hospice Support',
  'Physical Therapy',
  'Wound Care',
  'Respiratory Care',
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
];

// Quick Add Modal Component
