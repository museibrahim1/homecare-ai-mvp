// Shared types for the Settings page.

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  category: 'contract_template' | 'policy' | 'procedure' | 'letterhead' | 'other';
  content: string;
  uploaded_at: string;
}

export interface AgencySettings {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  documents: UploadedDocument[];
  cancellation_policy: string;
  terms_and_conditions: string;
  license_number: string;
  npi_number: string;
  contact_person: string;
  contact_title: string;
  // Billing & rate config
  pay_sources: string[];
  service_types: string[];
  billing_type: string;
  default_hourly_rate: number | null;
  medicaid_companion_rate: number | null;
  medicaid_personal_care_rate: number | null;
  medicaid_respite_rate: number | null;
  medicare_skilled_rate: number | null;
  medicare_aide_rate: number | null;
  private_pay_rate: number | null;
  accepts_medicaid: boolean;
  accepts_medicare: boolean;
  accepts_private_pay: boolean;
  accepts_insurance: boolean;
  accepts_va: boolean;
}
