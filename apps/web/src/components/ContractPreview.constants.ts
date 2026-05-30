// Shared constants for ContractPreview.
import { AgencySettings } from './ContractPreview.types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const defaultAgency: AgencySettings = {
  name: 'Home Care Services Agency',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  logo: null,
  primary_color: '#1e3a8a',
  secondary_color: '#3b82f6',
  documents: [],
  contract_template: null,
  contract_template_name: null,
  contract_template_type: null,
};

