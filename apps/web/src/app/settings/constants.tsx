// Shared constants for the Settings page.
import { FileCheck, FileText, File, Image } from 'lucide-react';
import { AgencySettings } from './types';

export const API_BASE = '/api';

export const defaultAgency: AgencySettings = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  website: '',
  logo: null,
  primary_color: '#1e3a8a',
  secondary_color: '#3b82f6',
  documents: [],
  cancellation_policy: '',
  terms_and_conditions: '',
  license_number: '',
  npi_number: '',
  contact_person: '',
  contact_title: '',
  pay_sources: [],
  service_types: [],
  billing_type: 'hourly',
  default_hourly_rate: null,
  medicaid_companion_rate: null,
  medicaid_personal_care_rate: null,
  medicaid_respite_rate: null,
  medicare_skilled_rate: null,
  medicare_aide_rate: null,
  private_pay_rate: null,
  accepts_medicaid: false,
  accepts_medicare: false,
  accepts_private_pay: true,
  accepts_insurance: false,
  accepts_va: false,
};

export const documentCategories = [
  { id: 'contract_template', label: 'Contract Template', icon: FileCheck },
  { id: 'policy', label: 'Policy Document', icon: FileText },
  { id: 'procedure', label: 'Procedure Manual', icon: File },
  { id: 'letterhead', label: 'Letterhead / Branding', icon: Image },
  { id: 'other', label: 'Other Document', icon: File },
];
