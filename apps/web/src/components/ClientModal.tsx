'use client';

import { useState, useEffect } from 'react';
import { 
  X, User, Phone, MapPin, AlertCircle, Heart, FileText, 
  Shield, Calendar, Save, Loader2, Trash2
} from 'lucide-react';

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
  preferred_days?: string;
  preferred_times?: string;
  status?: string;
  notes?: string;
}

interface ClientModalProps {
  client?: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => Promise<void>;
  onDelete?: (clientId: string) => Promise<void>;
}

type Tab = 'personal' | 'contact' | 'medical' | 'care' | 'insurance';

export default function ClientModal({ client, isOpen, onClose, onSave, onDelete }: ClientModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [formData, setFormData] = useState<Client>({
    full_name: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData(client);
    } else {
      setFormData({ full_name: '', status: 'active' });
    }
    setActiveTab('personal');
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      alert('Please enter a name');
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
    { id: 'contact', label: 'Contact & Emergency', icon: <Phone className="w-4 h-4" /> },
    { id: 'medical', label: 'Medical', icon: <Heart className="w-4 h-4" /> },
    { id: 'care', label: 'Care Plan', icon: <FileText className="w-4 h-4" /> },
    { id: 'insurance', label: 'Insurance', icon: <Shield className="w-4 h-4" /> },
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
        <div className="flex border-b border-slate-700 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'personal' && (
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Full Name" field="full_name" required placeholder="John Smith" />
              <InputField label="Preferred Name" field="preferred_name" placeholder="Johnny" />
              <InputField label="Date of Birth" field="date_of_birth" type="date" />
              <SelectField label="Gender" field="gender" options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]} />
              <InputField label="Email" field="email" type="email" placeholder="john@example.com" />
              <SelectField label="Status" field="status" options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]} />
              <div className="col-span-2">
                <TextArea label="Notes" field="notes" placeholder="General notes about this client..." />
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Primary Phone" field="phone" placeholder="555-1234" />
                  <InputField label="Secondary Phone" field="phone_secondary" placeholder="555-5678" />
                  <div className="col-span-2">
                    <InputField label="Address" field="address" placeholder="123 Main Street" />
                  </div>
                  <InputField label="City" field="city" placeholder="Lincoln" />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="State" field="state" placeholder="NE" />
                    <InputField label="ZIP Code" field="zip_code" placeholder="68501" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Emergency Contact 1
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="Name" field="emergency_contact_name" placeholder="Jane Smith" />
                  <InputField label="Phone" field="emergency_contact_phone" placeholder="555-9999" />
                  <InputField label="Relationship" field="emergency_contact_relationship" placeholder="Daughter" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
                  Emergency Contact 2
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="Name" field="emergency_contact_2_name" placeholder="Bob Smith" />
                  <InputField label="Phone" field="emergency_contact_2_phone" placeholder="555-8888" />
                  <InputField label="Relationship" field="emergency_contact_2_relationship" placeholder="Son" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Primary Diagnosis" field="primary_diagnosis" placeholder="Type 2 Diabetes" />
                <InputField label="Secondary Diagnoses" field="secondary_diagnoses" placeholder="Hypertension, Arthritis" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Allergies" field="allergies" placeholder="Penicillin, Shellfish" />
                <InputField label="Current Medications" field="medications" placeholder="Metformin, Lisinopril" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Physician Name" field="physician_name" placeholder="Dr. Johnson" />
                <InputField label="Physician Phone" field="physician_phone" placeholder="555-0000" />
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
              <TextArea label="Medical Notes" field="medical_notes" placeholder="Additional medical information, history, precautions..." rows={4} />
            </div>
          )}

          {activeTab === 'care' && (
            <div className="space-y-4">
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
                  { value: 'assisted_living', label: 'Assisted Living' },
                  { value: 'nursing_home', label: 'Nursing Home' },
                ]} />
              </div>
              <TextArea label="Care Plan" field="care_plan" placeholder="Describe the care plan, goals, and daily routines..." rows={4} />
              <TextArea label="Special Requirements" field="special_requirements" placeholder="Any special needs, preferences, or requirements..." rows={3} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Preferred Days" field="preferred_days" placeholder="Mon, Wed, Fri" />
                <InputField label="Preferred Times" field="preferred_times" placeholder="9AM - 1PM" />
              </div>
            </div>
          )}

          {activeTab === 'insurance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Insurance Provider" field="insurance_provider" placeholder="Blue Cross Blue Shield" />
                <InputField label="Insurance ID" field="insurance_id" placeholder="XYZ123456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Medicaid ID" field="medicaid_id" placeholder="MCD987654" />
                <InputField label="Medicare ID" field="medicare_id" placeholder="MCR123456" />
              </div>
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
