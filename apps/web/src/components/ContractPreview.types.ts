// Shared types for ContractPreview.

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  content: string;
  uploaded_at: string;
}

export interface AgencySettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  documents: UploadedDocument[];
  contract_template: string | null;
  contract_template_name: string | null;
  contract_template_type: string | null;
}

export interface ContractPreviewProps {
  contract: any;
  client: any;
  visitId?: string;
  onContractUpdate?: (contract: any) => void;
}
