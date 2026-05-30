// Shared types for the Command Center page (extracted from page.tsx).

export interface AgencyDraft {
  id: string;
  provider_name: string;
  city: string | null;
  state: string;
  contact_email: string | null;
  contact_name: string | null;
  phone: string | null;
  priority: string;
  status: string;
  email_send_count: number;
  last_email_sent_at: string | null;
  draft_subject: string;
  draft_body: string;
  is_html: boolean;
}

export interface InvestorDraft {
  id: string;
  fund_name: string;
  contact_name: string | null;
  contact_email: string | null;
  check_size_display: string | null;
  priority: string;
  status: string;
  email_send_count: number;
  last_email_sent_at: string | null;
  draft_subject: string;
  draft_body: string;
  is_html: boolean;
}

export interface CallRow {
  id: string;
  provider_name: string;
  city: string | null;
  state: string;
  phone: string | null;
  priority: string;
  notes: string;
  is_contacted: boolean;
  called_at?: string | null;
  callback_requested?: boolean;
  callback_date?: string | null;
  callback_notes?: string | null;
  assigned_to?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
}

export interface CallbackItem {
  id: string;
  provider_name: string;
  phone: string | null;
  state: string | null;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  callback_date: string | null;
  callback_notes: string | null;
  notes: string | null;
  priority: string;
  status: string;
  called_at: string | null;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  permissions: string[];
  is_active: boolean;
}

export interface StateCount {
  state: string;
  count: number;
}

export interface DayPlan {
  date: string;
  day_name: string;
  is_today: boolean;
  agency_drafts: AgencyDraft[];
  investor_drafts: InvestorDraft[];
  calls: CallRow[];
}

export interface WeeklyPlan {
  days: DayPlan[];
  stats: {
    total_leads: number;
    leads_with_email: number;
    leads_contacted: number;
    leads_remaining_email: number;
    leads_no_email: number;
    calls_remaining: number;
    total_investors: number;
    investors_with_email: number;
    investors_contacted: number;
    investors_remaining: number;
    unsent_agency_emails: number;
    unsent_investor_emails: number;
    total_called: number;
    total_with_phone: number;
  };
  week_start: string;
  week_end: string;
  week_offset: number;
  total_weeks: number;
  all_contacts_covered: boolean;
}

export interface DraftEdit {
  subject: string;
  body: string;
}

export type TabKey = 'agencies' | 'calls' | 'investors' | 'callbacks' | 'assignments';
