export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'user' | 'caregiver';
  company_name?: string;
  phone?: string;
  is_active: boolean;
}

export interface Client {
  id: string;
  full_name: string;
  preferred_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_name_2?: string;
  emergency_contact_phone_2?: string;
  emergency_contact_relationship_2?: string;
  primary_diagnosis?: string;
  secondary_diagnoses?: string;
  allergies?: string;
  medications?: string;
  physician_name?: string;
  physician_phone?: string;
  medical_notes?: string;
  mobility_status?: string;
  cognitive_status?: string;
  living_situation?: string;
  care_level?: 'LOW' | 'MODERATE' | 'HIGH';
  care_plan?: string;
  special_requirements?: string;
  insurance_provider?: string;
  insurance_id?: string;
  medicaid_id?: string;
  medicare_id?: string;
  billing_address?: string;
  preferred_days?: string;
  preferred_times?: string;
  status: 'active' | 'inactive' | 'discharged' | 'pending';
  intake_date?: string;
  discharge_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface Contract {
  id: string;
  client_id: string;
  contract_number?: string;
  title?: string;
  services?: ServiceItem[];
  schedule?: ScheduleInfo;
  hourly_rate?: number;
  weekly_hours?: number;
  start_date?: string;
  end_date?: string;
  cancellation_policy?: string;
  terms_and_conditions?: string;
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'cancelled';
  client_signature_date?: string;
  agency_signature_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface ServiceItem {
  name: string;
  rate?: number;
  unit?: string;
  description?: string;
}

export interface ScheduleInfo {
  days?: string[];
  hours_per_week?: number;
  start_time?: string;
  end_time?: string;
}

export interface Visit {
  id: string;
  client_id: string;
  caregiver_id?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  status: 'scheduled' | 'in_progress' | 'pending_review' | 'approved' | 'exported';
  pipeline_state?: PipelineState;
  client?: Client;
  created_at: string;
}

export interface PipelineStage {
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  task_id?: string;
  error?: string;
}

export interface PipelineState {
  transcription?: PipelineStage;
  diarization?: PipelineStage;
  alignment?: PipelineStage;
  billing?: PipelineStage;
  note?: PipelineStage;
  contract?: PipelineStage;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
}

export interface UsageStats {
  total_visits: number;
  visits_this_month: number;
  plan_limit?: number;
  plan_name?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  requires_mfa?: boolean;
  mfa_token?: string;
}
