// Shared types for the Investors page.

export interface Investor {
  id: string;
  fund_name: string;
  investor_type: string | null;
  website: string | null;
  focus_sectors: string[];
  focus_stages: string[];
  check_size_display: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  priority: string;
  email_send_count: number;
  email_open_count: number;
  last_email_sent_at: string | null;
  campaign_tag: string | null;
  source: string | null;
  relevance_reason: string | null;
  created_at: string | null;
}

export interface InvestorStats {
  total: number;
  has_email: number;
  vc_funds: number;
  angels: number;
  new: number;
  email_sent: number;
  responded: number;
  interested: number;
  contacted: number;
  meeting_scheduled: number;
  passed: number;
  committed: number;
  avg_priority_score: number;
}

