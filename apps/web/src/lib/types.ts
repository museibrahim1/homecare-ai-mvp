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

export interface PipelineStepState {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error?: string;
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
  pipeline_state: Record<string, PipelineStepState>;
  audio_assets?: { id: string; url: string; filename?: string }[];
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  caregiver?: User;
  contract_generated?: boolean;
  note_generated?: boolean;
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

export interface BillableEvidence {
  text: string;
  start_ms?: number;
  end_ms?: number;
  speaker?: string;
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
  evidence: BillableEvidence[];
  is_approved: boolean;
  is_flagged: boolean;
  flag_reason?: string;
  adjusted_minutes?: number;
  adjustment_reason?: string;
  created_at: string;
}

export interface NoteStructuredData {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  tasks_performed?: (string | { task?: string; duration_minutes?: number; details?: string; client_response?: string })[];
  [key: string]: unknown;
}

export interface Note {
  id: string;
  visit_id: string;
  structured_data: NoteStructuredData;
  narrative?: string;
  is_approved: boolean;
  approved_by_id?: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface ContractService {
  name: string;
  rate?: number;
  unit?: string;
  description?: string;
}

export interface ContractSchedule {
  days?: string[];
  hours_per_week?: number;
  start_time?: string;
  end_time?: string;
  [key: string]: unknown;
}

export interface Contract {
  id: string;
  client_id: string;
  contract_number?: string;
  title: string;
  services: ContractService[];
  schedule: ContractSchedule;
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
