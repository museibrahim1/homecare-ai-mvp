'use client';

import { useState, useEffect } from 'react';
import { 
  X, User, Phone, MapPin, Heart, Shield, Calendar, Save, Loader2, Trash2,
  Award, Clock, Star, Languages, CheckCircle, Briefcase, Mail, Home, FileCheck
} from 'lucide-react';

interface Caregiver {
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
  employee_id?: string;
  hire_date?: string;
  certification_level?: string;
  certifications?: any[];
  specializations?: string[];
  languages?: string[];
  can_handle_high_care?: boolean;
  can_handle_moderate_care?: boolean;
  can_handle_low_care?: boolean;
  max_clients?: number;
  current_client_count?: number;
  available_days?: string;
  available_hours?: string;
  preferred_areas?: string;
  max_travel_miles?: number;
  years_experience?: number;
  rating?: number;
  total_assignments?: number;
  status?: string;
  notes?: string;
  background_check_date?: string;
  background_check_status?: string;
  external_id?: string;
  external_source?: string;
}

interface CaregiverModalProps {
  caregiver?: Caregiver | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (caregiver: Caregiver) => Promise<void>;
  onDelete?: (caregiverId: string) => Promise<void>;
}

type Tab = 'personal' | 'contact' | 'professional' | 'capabilities' | 'availability' | 'compliance' | 'performance';

const emptyCaregiver: Caregiver = {
  full_name: '',
  status: 'active',
  can_handle_low_care: true,
  can_handle_moderate_care: true,
  can_handle_high_care: false,
  max_clients: 5,
  current_client_count: 0,
  years_experience: 0,
  rating: 5.0,
  max_travel_miles: 25,
  languages: ['English'],
  specializations: [],
};

export default function CaregiverModal({ caregiver, isOpen, onClose, onSave, onDelete }: CaregiverModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [formData, setFormData] = useState<Caregiver>(emptyCaregiver);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  useEffect(() => {
    if (caregiver) {
      setFormData({ ...emptyCaregiver, ...caregiver });
    } else {
      setFormData(emptyCaregiver);
    }
    setActiveTab('personal');
  }, [caregiver, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Caregiver, value: any) => {
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
      alert('Failed to save caregiver');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!caregiver?.id || !onDelete) return;
    if (!confirm('Are you sure you want to delete this caregiver?')) return;
    
    setDeleting(true);
    try {
      await onDelete(caregiver.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete caregiver');
    } finally {
      setDeleting(false);
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      setFormData({
        ...formData,
        specializations: [...(formData.specializations || []), newSpecialization.trim()]
      });
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData({
      ...formData,
      specializations: (formData.specializations || []).filter(s => s !== spec)
    });
  };

  const addLanguage = () => {
    if (newLanguage.trim()) {
      setFormData({
        ...formData,
        languages: [...(formData.languages || []), newLanguage.trim()]
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData({
      ...formData,
      languages: (formData.languages || []).filter(l => l !== lang)
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
    { id: 'professional', label: 'Professional', icon: <Award className="w-4 h-4" /> },
    { id: 'capabilities', label: 'Skills', icon: <Heart className="w-4 h-4" /> },
    { id: 'availability', label: 'Availability', icon: <Calendar className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance', icon: <Shield className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Star className="w-4 h-4" /> },
  ];

  const InputField = ({ label, field, type = 'text', placeholder = '', required = false }: {
    label: string;
    field: keyof Caregiver;
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
        onChange={(e) => handleChange(field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );

  const TextArea = ({ label, field, placeholder = '', rows = 3 }: {
    label: string;
    field: keyof Caregiver;
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
    field: keyof Caregiver;
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

  const CheckboxField = ({ label, field, description }: {
    label: string;
    field: keyof Caregiver;
    description?: string;
  }) => (
    <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
      <input
        type="checkbox"
        checked={!!formData[field]}
        onChange={(e) => handleChange(field, e.target.checked)}
        className="w-5 h-5 rounded border-slate-500 mt-0.5"
      />
      <div>
        <span className="text-white font-medium">{label}</span>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
    </label>
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
            {caregiver?.id ? 'Edit Caregiver' : 'Add New Caregiver'}
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
                <InputField label="Full Name" field="full_name" required placeholder="Sarah Johnson" />
                <InputField label="Preferred Name" field="preferred_name" placeholder="Sarah" />
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
                  { value: 'on_leave', label: 'On Leave' },
                  { value: 'inactive', label: 'Inactive' },
                ]} />
                <InputField label="Employee ID" field="employee_id" placeholder="EMP-001" />
              </div>
              <TextArea label="Notes" field="notes" placeholder="Any general notes about this caregiver..." rows={3} />
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Phone Numbers</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Primary Phone" field="phone" placeholder="(555) 123-4567" />
                <InputField label="Secondary Phone" field="phone_secondary" placeholder="(555) 987-6543" />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Mail className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Email</h3>
              </div>
              <InputField label="Email Address" field="email" type="email" placeholder="sarah.johnson@email.com" />

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Home className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Address</h3>
              </div>
              <div className="space-y-4">
                <InputField label="Street Address" field="address" placeholder="456 Oak Avenue" />
                <div className="grid grid-cols-3 gap-4">
                  <InputField label="City" field="city" placeholder="Lincoln" />
                  <InputField label="State" field="state" placeholder="NE" />
                  <InputField label="ZIP Code" field="zip_code" placeholder="68502" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'professional' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Certifications</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Certification Level" field="certification_level" options={[
                  { value: 'CNA', label: 'CNA - Certified Nursing Assistant' },
                  { value: 'HHA', label: 'HHA - Home Health Aide' },
                  { value: 'LPN', label: 'LPN - Licensed Practical Nurse' },
                  { value: 'RN', label: 'RN - Registered Nurse' },
                  { value: 'PCA', label: 'PCA - Personal Care Assistant' },
                ]} />
                <InputField label="Years of Experience" field="years_experience" type="number" placeholder="5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Hire Date" field="hire_date" type="date" />
                <InputField label="Total Assignments Completed" field="total_assignments" type="number" placeholder="0" />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Languages className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Languages Spoken</h3>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add a language..."
                  value={newLanguage}
                  onChange={e => setNewLanguage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addLanguage()}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button onClick={addLanguage} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.languages || []).map((lang, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-500/20 rounded-lg text-sm text-purple-400 flex items-center gap-2">
                    {lang}
                    <button onClick={() => removeLanguage(lang)} className="text-purple-300 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'capabilities' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Care Level Capabilities</h3>
              </div>
              <div className="space-y-3">
                <CheckboxField 
                  label="Low Care" 
                  field="can_handle_low_care" 
                  description="Companionship, light housekeeping, meal prep, medication reminders"
                />
                <CheckboxField 
                  label="Moderate Care" 
                  field="can_handle_moderate_care" 
                  description="Daily living assistance, bathing, dressing, mobility support"
                />
                <CheckboxField 
                  label="High Care" 
                  field="can_handle_high_care" 
                  description="Skilled nursing care, wound care, complex medical needs"
                />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Specializations</h3>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add specialization (e.g., Dementia, Diabetes, Parkinson's)..."
                  value={newSpecialization}
                  onChange={e => setNewSpecialization(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSpecialization()}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button onClick={addSpecialization} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.specializations || []).map((spec, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-700 rounded-lg text-sm text-slate-300 flex items-center gap-2">
                    {spec}
                    <button onClick={() => removeSpecialization(spec)} className="text-slate-400 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Client Capacity</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Maximum Clients" field="max_clients" type="number" placeholder="5" />
                <InputField label="Current Client Count" field="current_client_count" type="number" placeholder="0" />
              </div>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Weekly Availability</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Available Days</label>
                  <input
                    type="text"
                    value={formData.available_days || ''}
                    onChange={(e) => handleChange('available_days', e.target.value)}
                    placeholder="Mon, Tue, Wed, Thu, Fri"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated days</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Available Hours</label>
                  <input
                    type="text"
                    value={formData.available_hours || ''}
                    onChange={(e) => handleChange('available_hours', e.target.value)}
                    placeholder="8:00 AM - 5:00 PM"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Service Area</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Maximum Travel Distance (miles)" field="max_travel_miles" type="number" placeholder="25" />
                <div className="col-span-2">
                  <TextArea label="Preferred Service Areas" field="preferred_areas" placeholder="Downtown Lincoln, South Lincoln, Near East neighborhoods..." rows={2} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Background Check</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Background Check Date" field="background_check_date" type="date" />
                <SelectField label="Background Check Status" field="background_check_status" options={[
                  { value: 'passed', label: 'Passed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'expired', label: 'Expired - Needs Renewal' },
                ]} />
              </div>

              <div className="p-4 bg-slate-700/50 rounded-lg mt-4">
                <p className="text-sm text-slate-400">
                  <strong className="text-white">Compliance Note:</strong> Background checks should be renewed annually. Caregivers with expired or failed checks should not be assigned to clients.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-6 mb-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">External System Integration</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="External ID" field="external_id" placeholder="WRK-12345" />
                <SelectField label="External Source" field="external_source" options={[
                  { value: 'monday', label: 'Monday.com' },
                  { value: 'workday', label: 'Workday' },
                  { value: 'bamboohr', label: 'BambooHR' },
                  { value: 'csv', label: 'CSV Import' },
                  { value: 'manual', label: 'Manual Entry' },
                ]} />
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Rating (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={formData.rating || 5.0}
                    onChange={(e) => handleChange('rating', parseFloat(e.target.value) || 5.0)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <InputField label="Years Experience" field="years_experience" type="number" placeholder="5" />
                <InputField label="Total Assignments" field="total_assignments" type="number" placeholder="0" />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-2xl font-bold text-white">{formData.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                  <p className="text-sm text-slate-400">Average Rating</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <span className="text-2xl font-bold text-white">{formData.years_experience || 0}</span>
                  </div>
                  <p className="text-sm text-slate-400">Years Experience</p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-2xl font-bold text-white">{formData.total_assignments || 0}</span>
                  </div>
                  <p className="text-sm text-slate-400">Completed Assignments</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/50">
          <div>
            {caregiver?.id && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Caregiver
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
              {saving ? 'Saving...' : 'Save Caregiver'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
