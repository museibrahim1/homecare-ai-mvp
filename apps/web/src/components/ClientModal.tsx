'use client';

import { useState, useEffect } from 'react';
import { 
  X, User, Phone, MapPin, AlertCircle, Heart, FileText, 
  Shield, Calendar, Save, Loader2, Trash2, Clock, History,
  Building, CreditCard, Mail, Home, FileSignature, Eye, Download, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Client {
  id?: string;
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
  emergency_contact_2_name?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_2_relationship?: string;
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
  care_level?: string;
  care_plan?: string;
  special_requirements?: string;
  insurance_provider?: string;
  insurance_id?: string;
  medicaid_id?: string;
  medicare_id?: string;
  billing_address?: string;
  preferred_days?: string;
  preferred_times?: string;
  intake_date?: string;
  discharge_date?: string;
  status?: string;
  notes?: string;
  external_id?: string;
  external_source?: string;
}

interface ClientModalProps {
  client?: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => Promise<void>;
  onDelete?: (clientId: string) => Promise<void>;
}

type Tab = 'personal' | 'contact' | 'emergency' | 'medical' | 'care' | 'insurance' | 'scheduling' | 'contracts';

interface Contract {
  id: string;
  client_id: string;
  contract_number?: string;
  title?: string;
  services?: any[];
  schedule?: any;
  hourly_rate?: number;
  weekly_hours?: number;
  status: string;
  start_date?: string;
  created_at: string;
}

export default function ClientModal({ client, isOpen, onClose, onSave, onDelete }: ClientModalProps) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [formData, setFormData] = useState<Client>({
    full_name: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    if (client) {
      setFormData(client);
    } else {
      setFormData({ full_name: '', status: 'active' });
    }
    setActiveTab('personal');
    setContracts([]);
    setSelectedContract(null);
  }, [client, isOpen]);

  // Load contracts when the contracts tab is selected
  useEffect(() => {
    if (activeTab === 'contracts' && client?.id && token) {
      loadContracts();
    }
  }, [activeTab, client?.id, token]);

  const loadContracts = async () => {
    if (!client?.id || !token) return;
    setLoadingContracts(true);
    try {
      const response = await fetch(`${API_BASE}/visits/clients/${client.id}/contracts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setContracts(data);
      }
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoadingContracts(false);
    }
  };

  if (!isOpen) return null;

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      alert('Please enter a name');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client?.id || !onDelete) return;
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    setDeleting(true);
    try {
      await onDelete(client.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete client');
    } finally {
      setDeleting(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
    { id: 'emergency', label: 'Emergency', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'medical', label: 'Medical', icon: <Heart className="w-4 h-4" /> },
    { id: 'care', label: 'Care Plan', icon: <FileText className="w-4 h-4" /> },
    { id: 'insurance', label: 'Insurance', icon: <Shield className="w-4 h-4" /> },
    { id: 'scheduling', label: 'Scheduling', icon: <Calendar className="w-4 h-4" /> },
    { id: 'contracts', label: 'Contracts', icon: <FileSignature className="w-4 h-4" /> },
  ];

  const InputField = ({ label, field, type = 'text', placeholder = '', required = false }: {
    label: string;
    field: keyof Client;
    type?: string;
    placeholder?: string;
    required?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={(formData[field] as string) || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );

  const TextArea = ({ label, field, placeholder = '', rows = 3 }: {
    label: string;
    field: keyof Client;
    placeholder?: string;
    rows?: number;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <textarea
        value={(formData[field] as string) || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
      />
    </div>
  );

  const SelectField = ({ label, field, options }: {
    label: string;
    field: keyof Client;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <select
        value={(formData[field] as string) || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">
            {client?.id ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 px-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Full Name" field="full_name" required placeholder="John Smith" />
                <InputField label="Preferred Name" field="preferred_name" placeholder="Johnny" />
                <InputField label="Date of Birth" field="date_of_birth" type="date" />
                <SelectField label="Gender" field="gender" options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Status" field="status" options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'discharged', label: 'Discharged' },
                ]} />
                <InputField label="Intake Date" field="intake_date" type="date" />
              </div>
              <TextArea label="General Notes" field="notes" placeholder="Any general notes about this client..." rows={4} />
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Phone Numbers</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Primary Phone" field="phone" placeholder="(555) 123-4567" />
                <InputField label="Secondary Phone" field="phone_secondary" placeholder="(555) 987-6543" />
              </div>

              <div className="flex items-center gap-2 mb-4 mt-8">
                <Mail className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Email</h3>
              </div>
              <InputField label="Email Address" field="email" type="email" placeholder="john@example.com" />

              <div className="flex items-center gap-2 mb-4 mt-8">
                <Home className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Address</h3>
              </div>
              <div className="space-y-4">
                <InputField label="Street Address" field="address" placeholder="123 Main Street, Apt 4B" />
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="City" field="city" placeholder="Lincoln" />
                  <InputField label="State" field="state" placeholder="NE" />
                  <InputField label="ZIP Code" field="zip_code" placeholder="68501" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-white">Primary Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="Full Name" field="emergency_contact_name" placeholder="Jane Smith" />
                  <InputField label="Phone Number" field="emergency_contact_phone" placeholder="(555) 999-8888" />
                  <InputField label="Relationship" field="emergency_contact_relationship" placeholder="Daughter" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-white">Secondary Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="Full Name" field="emergency_contact_2_name" placeholder="Bob Smith" />
                  <InputField label="Phone Number" field="emergency_contact_2_phone" placeholder="(555) 888-7777" />
                  <InputField label="Relationship" field="emergency_contact_2_relationship" placeholder="Son" />
                </div>
              </div>

              <div className="p-4 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-400">
                  <strong className="text-white">Note:</strong> Emergency contacts will be notified in case of medical emergencies or if the client cannot be reached for scheduled visits.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Diagnoses</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Primary Diagnosis" field="primary_diagnosis" placeholder="Type 2 Diabetes" />
                <InputField label="Secondary Diagnoses" field="secondary_diagnoses" placeholder="Hypertension, Arthritis, COPD" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Allergies</label>
                  <textarea
                    value={formData.allergies || ''}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                    placeholder="Penicillin, Shellfish, Latex..."
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Current Medications</label>
                  <textarea
                    value={formData.medications || ''}
                    onChange={(e) => handleChange('medications', e.target.value)}
                    placeholder="Metformin 500mg, Lisinopril 10mg..."
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Building className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Primary Care Physician</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Physician Name" field="physician_name" placeholder="Dr. Sarah Johnson" />
                <InputField label="Physician Phone" field="physician_phone" placeholder="(555) 000-1111" />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Physical & Cognitive Status</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Mobility Status" field="mobility_status" options={[
                  { value: 'independent', label: 'Independent' },
                  { value: 'uses_cane', label: 'Uses Cane' },
                  { value: 'uses_walker', label: 'Uses Walker' },
                  { value: 'uses_wheelchair', label: 'Uses Wheelchair' },
                  { value: 'bedridden', label: 'Bedridden' },
                ]} />
                <SelectField label="Cognitive Status" field="cognitive_status" options={[
                  { value: 'intact', label: 'Intact' },
                  { value: 'mild_impairment', label: 'Mild Impairment' },
                  { value: 'moderate_impairment', label: 'Moderate Impairment' },
                  { value: 'severe_impairment', label: 'Severe Impairment' },
                ]} />
              </div>

              <TextArea label="Additional Medical Notes" field="medical_notes" placeholder="Additional medical history, precautions, or important information..." rows={4} />
            </div>
          )}

          {activeTab === 'care' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Care Requirements</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Care Level" field="care_level" options={[
                  { value: 'LOW', label: 'Low - Companionship/Light Assistance' },
                  { value: 'MODERATE', label: 'Moderate - Daily Living Assistance' },
                  { value: 'HIGH', label: 'High - Skilled/Medical Care' },
                ]} />
                <SelectField label="Living Situation" field="living_situation" options={[
                  { value: 'lives_alone', label: 'Lives Alone' },
                  { value: 'lives_with_spouse', label: 'Lives with Spouse' },
                  { value: 'lives_with_family', label: 'Lives with Family' },
                  { value: 'assisted_living', label: 'Assisted Living Facility' },
                  { value: 'nursing_home', label: 'Nursing Home' },
                ]} />
              </div>

              <TextArea label="Care Plan Details" field="care_plan" placeholder="Describe the care plan, daily routines, and specific care goals..." rows={5} />
              
              <TextArea label="Special Requirements" field="special_requirements" placeholder="Any special needs, dietary restrictions, religious considerations, preferences..." rows={4} />
            </div>
          )}

          {activeTab === 'insurance' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Primary Insurance</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Insurance Provider" field="insurance_provider" placeholder="Blue Cross Blue Shield" />
                <InputField label="Insurance ID / Policy Number" field="insurance_id" placeholder="XYZ123456789" />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <CreditCard className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Government Programs</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Medicaid ID" field="medicaid_id" placeholder="MCD987654321" />
                <InputField label="Medicare ID" field="medicare_id" placeholder="MCR123456789" />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Billing Address</h3>
              </div>
              <TextArea label="Billing Address (if different from home address)" field="billing_address" placeholder="123 Billing Street, City, State ZIP" rows={2} />
            </div>
          )}

          {activeTab === 'scheduling' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Scheduling Preferences</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Preferred Days</label>
                  <input
                    type="text"
                    value={formData.preferred_days || ''}
                    onChange={(e) => handleChange('preferred_days', e.target.value)}
                    placeholder="Monday, Wednesday, Friday"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Days when care visits are preferred</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Preferred Times</label>
                  <input
                    type="text"
                    value={formData.preferred_times || ''}
                    onChange={(e) => handleChange('preferred_times', e.target.value)}
                    placeholder="9:00 AM - 1:00 PM"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Time slots when care visits are preferred</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Important Dates</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Intake Date" field="intake_date" type="date" />
                <InputField label="Discharge Date" field="discharge_date" type="date" />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Building className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">External System Integration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="External ID" field="external_id" placeholder="CRM-12345" />
                <SelectField label="External Source" field="external_source" options={[
                  { value: 'monday', label: 'Monday.com' },
                  { value: 'salesforce', label: 'Salesforce' },
                  { value: 'hubspot', label: 'HubSpot' },
                  { value: 'csv', label: 'CSV Import' },
                  { value: 'manual', label: 'Manual Entry' },
                ]} />
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Service Contracts</h3>
                </div>
                <span className="text-sm text-slate-400">
                  {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {!client?.id ? (
                <div className="text-center py-12">
                  <FileSignature className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">Save the client first to view contracts</p>
                </div>
              ) : loadingContracts ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 text-purple-400 animate-spin" />
                  <p className="text-slate-400">Loading contracts...</p>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-12">
                  <FileSignature className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400 mb-2">No contracts yet</p>
                  <p className="text-sm text-slate-500">Contracts are generated from assessments</p>
                </div>
              ) : selectedContract ? (
                // Contract Detail View
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedContract(null)}
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to list
                  </button>
                  
                  <div className="bg-slate-700/50 rounded-xl p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">
                          {selectedContract.title || `Contract #${selectedContract.contract_number || selectedContract.id.slice(0, 8)}`}
                        </h4>
                        <p className="text-sm text-slate-400">
                          Created: {new Date(selectedContract.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedContract.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        selectedContract.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {selectedContract.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-600">
                      <div>
                        <p className="text-sm text-slate-400">Hourly Rate</p>
                        <p className="text-xl font-bold text-green-400">
                          ${Number(selectedContract.hourly_rate || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Weekly Hours</p>
                        <p className="text-xl font-bold text-white">
                          {Number(selectedContract.weekly_hours || 0)} hrs
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Weekly Cost</p>
                        <p className="text-lg font-semibold text-white">
                          ${(Number(selectedContract.hourly_rate || 0) * Number(selectedContract.weekly_hours || 0)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Monthly Estimate</p>
                        <p className="text-lg font-semibold text-white">
                          ${(Number(selectedContract.hourly_rate || 0) * Number(selectedContract.weekly_hours || 0) * 4.33).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {selectedContract.services && selectedContract.services.length > 0 && (
                      <div className="pt-4 border-t border-slate-600">
                        <p className="text-sm text-slate-400 mb-2">Services</p>
                        <div className="space-y-2">
                          {selectedContract.services.map((service: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-white">
                              <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs text-purple-400">
                                {idx + 1}
                              </span>
                              {typeof service === 'string' ? service : service.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedContract.schedule && (
                      <div className="pt-4 border-t border-slate-600">
                        <p className="text-sm text-slate-400 mb-2">Schedule</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedContract.schedule.care_need_level && (
                            <div>
                              <span className="text-slate-500">Care Level:</span>{' '}
                              <span className={`font-medium ${
                                selectedContract.schedule.care_need_level === 'HIGH' ? 'text-red-400' :
                                selectedContract.schedule.care_need_level === 'MODERATE' ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {selectedContract.schedule.care_need_level}
                              </span>
                            </div>
                          )}
                          {selectedContract.schedule.frequency && (
                            <div>
                              <span className="text-slate-500">Frequency:</span>{' '}
                              <span className="text-white">{selectedContract.schedule.frequency}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-600 flex gap-2">
                      <a
                        href={`/visits?client=${client.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View in Assessments
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                // Contract List View
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      onClick={() => setSelectedContract(contract)}
                      className="bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-medium text-white">
                              {contract.title || `Contract #${contract.contract_number || contract.id.slice(0, 8)}`}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              contract.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              contract.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {contract.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>${Number(contract.hourly_rate || 0).toFixed(2)}/hr</span>
                            <span>{Number(contract.weekly_hours || 0)} hrs/week</span>
                            <span>{new Date(contract.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/50">
          <div>
            {client?.id && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Client
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
