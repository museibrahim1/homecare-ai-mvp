export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'caregiver';
  is_active: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  care_plan?: string;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  client_id: string;
  caregiver_id: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  pipeline_state: Record<string, any>;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  caregiver?: User;
}

export interface TranscriptSegment {
  id: string;
  visit_id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  speaker_label?: string;
  speaker?: string;  // Alias for speaker_label for compatibility
  confidence?: number;
  created_at: string;
}

export interface DiarizationTurn {
  id: string;
  visit_id: string;
  speaker: string;
  start_ms: number;
  end_ms: number;
  confidence?: number;
  created_at: string;
}

export interface BillableItem {
  id: string;
  visit_id: string;
  code: string;
  category: string;
  description?: string;
  start_ms: number;
  end_ms: number;
  minutes: number;
  evidence: any[];
  is_approved: boolean;
  is_flagged: boolean;
  flag_reason?: string;
  adjusted_minutes?: number;
  adjustment_reason?: string;
  created_at: string;
}

export interface Note {
  id: string;
  visit_id: string;
  structured_data: Record<string, any>;
  narrative?: string;
  is_approved: boolean;
  approved_by_id?: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  contract_number?: string;
  title: string;
  services: any[];
  schedule: Record<string, any>;
  hourly_rate?: number;
  weekly_hours?: number;
  start_date?: string;
  end_date?: string;
  cancellation_policy?: string;
  terms_and_conditions?: string;
  status: string;
  client_signature_date?: string;
  agency_signature_date?: string;
  created_at: string;
  updated_at: string;
}
