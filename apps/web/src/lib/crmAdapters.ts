/** Map between CRM API rows and legacy UI appointment shapes. */

export type UiAppointment = {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  type: 'assessment' | 'review' | 'meeting' | 'visit';
  notes: string;
  googleEventId?: string;
  clientId?: string;
  isFollowUp?: boolean;
};

export function minutesToDurationLabel(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${minutes} min`;
}

export function durationLabelToMinutes(label: string): number {
  const lower = label.toLowerCase();
  if (lower.includes('hour')) {
    const n = parseFloat(lower) || 1;
    return Math.round(n * 60);
  }
  const m = parseInt(lower, 10);
  return Number.isFinite(m) && m > 0 ? m : 60;
}

export function appointmentFromApi(row: Record<string, unknown>): UiAppointment {
  const mins = Number(row.duration_minutes) || 60;
  return {
    id: String(row.id),
    title: String(row.title || ''),
    client: String(row.client_name || ''),
    date: String(row.appointment_date || ''),
    time: String(row.appointment_time || '09:00'),
    duration: minutesToDurationLabel(mins),
    location: String(row.location || ''),
    type: (row.appointment_type as UiAppointment['type']) || 'visit',
    notes: String(row.notes || ''),
    googleEventId: row.google_event_id ? String(row.google_event_id) : undefined,
    clientId: row.client_id ? String(row.client_id) : undefined,
    isFollowUp: Boolean(row.is_follow_up),
  };
}

export function appointmentToApi(
  apt: Omit<UiAppointment, 'id'>,
  opts?: { clientId?: string; isFollowUp?: boolean }
): Record<string, unknown> {
  return {
    title: apt.title,
    client_name: apt.client || null,
    client_id: opts?.clientId || apt.clientId || null,
    appointment_date: apt.date,
    appointment_time: apt.time,
    duration_minutes: durationLabelToMinutes(apt.duration),
    location: apt.location || null,
    appointment_type: apt.type,
    notes: apt.notes || null,
    google_event_id: apt.googleEventId || null,
    is_follow_up: opts?.isFollowUp ?? apt.isFollowUp ?? false,
  };
}

export function careEntryFromApi(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    clientId: String(row.client_id || ''),
    clientName: '',
    stage: (row.stage as 'follow_up' | 'plan_review' | 'ongoing') || 'follow_up',
    priority: (row.priority as 'routine' | 'moderate' | 'high' | 'critical') || 'routine',
    assignedTo: String(row.assigned_to_name || ''),
    careSpecialty: String(row.care_specialty || ''),
    startDate: row.start_date ? String(row.start_date) : '',
    targetDate: row.target_date ? String(row.target_date) : '',
    lastContact: row.last_contact ? String(row.last_contact) : '',
    nextFollowUp: row.next_follow_up ? String(row.next_follow_up) : '',
    notes: String(row.notes || ''),
    phone: String(row.phone || ''),
    caregiverId: row.caregiver_id ? String(row.caregiver_id) : undefined,
  };
}

export function careEntryToApi(item: Record<string, unknown>, clients: Array<{ id: string; full_name: string }>) {
  const client = clients.find((c) => c.id === item.clientId);
  return {
    client_id: item.clientId,
    caregiver_id: item.caregiverId || null,
    stage: item.stage,
    priority: item.priority,
    care_specialty: item.careSpecialty || null,
    start_date: item.startDate || null,
    target_date: item.targetDate || null,
    last_contact: item.lastContact || null,
    next_follow_up: item.nextFollowUp || null,
    notes: item.notes || null,
    phone: item.phone || client?.full_name ? item.phone : null,
    assigned_to_name: item.assignedTo || null,
  };
}

export function leadFromApi(row: Record<string, unknown>) {
  const status = String(row.status || 'new');
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return {
    id: String(row.id),
    name: String(row.name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    source: String(row.source || 'Website'),
    status: label === 'New' || label === 'Contacted' || label === 'Qualified' ? label : 'New',
    notes: String(row.notes || ''),
    created: row.created_at ? new Date(String(row.created_at)).toLocaleDateString() : '',
    insurance_type: (['medicaid', 'medicare', 'private'].includes(String(row.insurance_type || ''))
      ? String(row.insurance_type)
      : '') as '' | 'medicaid' | 'medicare' | 'private',
    insurance_id: String(row.insurance_id || ''),
  };
}

export function leadToApi(lead: Record<string, unknown>) {
  return {
    name: lead.name,
    email: lead.email || null,
    phone: lead.phone || null,
    source: lead.source || 'Website',
    status: String(lead.status || 'New').toLowerCase(),
    notes: lead.notes || null,
    insurance_type: lead.insurance_type || null,
    insurance_id: lead.insurance_id || null,
  };
}
