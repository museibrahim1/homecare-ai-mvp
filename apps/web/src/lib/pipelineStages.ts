/** Single source of truth for agency CRM pipeline stages. */

export type PipelineStageId =
  | 'intake'
  | 'assessment'
  | 'proposal'
  | 'active'
  | 'follow_up';

export const PIPELINE_KANBAN_STAGES: {
  id: PipelineStageId;
  name: string;
  color: string;
  barColor: string;
  statuses: string[];
}[] = [
  { id: 'intake', name: 'Intake', color: 'bg-blue-500', barColor: '#3b82f6', statuses: ['intake', 'new'] },
  { id: 'assessment', name: 'Assessment', color: 'bg-purple-500', barColor: '#8b5cf6', statuses: ['assessment', 'pending'] },
  { id: 'proposal', name: 'Proposal Sent', color: 'bg-orange-500', barColor: '#f59e0b', statuses: ['proposal', 'pending_review'] },
  { id: 'active', name: 'Active Client', color: 'bg-green-500', barColor: '#10b981', statuses: ['active', 'assigned'] },
  { id: 'follow_up', name: 'Follow-up', color: 'bg-yellow-500', barColor: '#eab308', statuses: ['follow_up', 'review'] },
];

export const TERMINAL_CLIENT_STATUSES = ['inactive', 'discharged'] as const;

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
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

export const PIPELINE_BG: Record<string, string> = {
  intake: 'bg-blue-50 text-blue-600',
  assessment: 'bg-purple-50 text-purple-600',
  proposal: 'bg-amber-50 text-amber-600',
  active: 'bg-emerald-50 text-emerald-600',
  follow_up: 'bg-yellow-50 text-yellow-700',
};

export function resolveStageFromStatus(rawStatus?: string | null): PipelineStageId {
  const status = (rawStatus || 'intake').toLowerCase();
  if (TERMINAL_CLIENT_STATUSES.includes(status as (typeof TERMINAL_CLIENT_STATUSES)[number])) {
    return 'follow_up';
  }
  for (const stage of PIPELINE_KANBAN_STAGES) {
    if (stage.statuses.includes(status)) return stage.id;
  }
  return 'intake';
}

/** Primary client.status when a card is dropped on a kanban column. */
export function resolveStatusFromStage(stageId: PipelineStageId): string {
  const stage = PIPELINE_KANBAN_STAGES.find((s) => s.id === stageId);
  return stage?.statuses[0] || 'intake';
}

export function careLevelFallbackValue(careLevel?: string | null): number {
  const level = (careLevel || '').toUpperCase();
  if (level === 'HIGH') return 4500;
  if (level === 'MODERATE') return 3200;
  return 2000;
}

export function resolvePipelineValue(
  client: { estimated_monthly_value?: number | null; care_level?: string | null },
  latestVisit?: { pipeline_state?: { contract?: { monthly_value?: number; status?: string } } } | null
): number {
  if (client.estimated_monthly_value != null && client.estimated_monthly_value > 0) {
    return client.estimated_monthly_value;
  }
  const contractValue = latestVisit?.pipeline_state?.contract?.monthly_value;
  if (contractValue != null && contractValue > 0) return contractValue;
  return careLevelFallbackValue(client.care_level);
}

export type AgreementSendStatus = 'sent' | 'delivered' | 'opened' | 'signed' | 'bounced' | null;

export function resolveAgreementStatus(
  agreementSend?: Record<string, unknown> | null
): AgreementSendStatus {
  if (!agreementSend) return null;
  const raw = String(agreementSend.status || '').toLowerCase();
  if (['sent', 'delivered', 'opened', 'signed', 'bounced'].includes(raw)) {
    return raw as AgreementSendStatus;
  }
  return null;
}

export const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  opened: 'Opened',
  signed: 'Signed',
  bounced: 'Bounced',
};
