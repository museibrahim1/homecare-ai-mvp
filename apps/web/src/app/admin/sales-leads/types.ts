// Shared types for the Sales Leads page.

export interface Lead {
  id: string;
  provider_name: string;
  state: string;
  city: string | null;
  phone: string | null;
  ownership_type: string | null;
  years_in_operation: number | null;
  star_rating: string | null;
  status: string;
  priority: string;
  contact_email: string | null;
  contact_name: string | null;
  email_send_count: number;
  email_open_count: number;
  last_email_sent_at: string | null;
  is_contacted: boolean;
  is_converted: boolean;
  campaign_tag: string | null;
  created_at: string | null;
}

export interface LeadDetail {
  id: string;
  provider_name: string;
  state: string;
  city: string | null;
  address: string | null;
  zip_code: string | null;
  phone: string | null;
  ownership_type: string | null;
  ccn: string | null;
  certification_date: string | null;
  years_in_operation: number | null;
  star_rating: string | null;
  offers_nursing: boolean;
  offers_pt: boolean;
  offers_ot: boolean;
  offers_speech: boolean;
  offers_social: boolean;
  offers_aide: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_title: string | null;
  website: string | null;
  status: string;
  priority: string;
  notes: string | null;
  last_email_sent_at: string | null;
  last_email_subject: string | null;
  email_send_count: number;
  email_open_count: number;
  last_email_opened_at: string | null;
  last_response_at: string | null;
  campaign_tag: string | null;
  source: string | null;
  is_contacted: boolean;
  is_converted: boolean;
  activity_log: { action: string; subject?: string; notes?: string; at?: string }[];
}

export interface Stats {
  total: number;
  new: number;
  contacted: number;
  email_sent: number;
  email_opened: number;
  responded: number;
  converted: number;
  not_interested: number;
  no_response: number;
  nebraska_count: number;
  iowa_count: number;
  last_5_years: number;
  last_10_years: number;
  has_email: number;
  has_website: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  body: string;
  sequence_day?: number;
}

export interface CampaignPreview {
  total_recipients: number;
  sample: { provider_name: string; city: string; state: string; contact_email: string }[];
}

