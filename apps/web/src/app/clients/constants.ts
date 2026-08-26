// Shared constants for the Clients page — re-exported from pipelineStages.

export {
  STATUS_CONFIG,
  PIPELINE_KANBAN_STAGES,
  PIPELINE_BG,
  resolveStageFromStatus,
  resolveStatusFromStage,
  resolvePipelineValue,
  resolveAgreementStatus,
  AGREEMENT_STATUS_LABELS,
} from '@/lib/pipelineStages';

export const API_BASE = '/api';

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
