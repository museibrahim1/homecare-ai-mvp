'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, Save, Loader2, CheckCircle, AlertCircle,
  Upload, Globe, Phone, Mail, MapPin
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface BusinessProfile {
  id: string;
  name: string;
  dba_name?: string;
  entity_type: string;
  state_of_incorporation: string;
  registration_number?: string;
  ein_last_4?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email: string;
  website?: string;
  verification_status: string;
  sos_verified_at?: string;
  approved_at?: string;
  logo_url?: string;
  primary_color?: string;
  created_at: string;
}

const ENTITY_TYPES = [
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'nonprofit', label: 'Non-Profit' },
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export default function BusinessSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [formData, setFormData] = useState({
    dba_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    website: '',
    logo_url: '',
    primary_color: '#6366f1',
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/business/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          dba_name: data.dba_name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          phone: data.phone || '',
          website: data.website || '',
          logo_url: data.logo_url || '',
          primary_color: data.primary_color || '#6366f1',
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/business/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setToast({ type: 'success', message: 'Profile updated successfully' });
        fetchProfile();
      } else {
        const err = await response.json();
        setToast({ type: 'error', message: err.detail || 'Failed to update profile' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Business Profile</h1>
            <p className="text-dark-400 mt-1">Manage your business information and settings</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Verification Status */}
              <div className={`p-4 rounded-xl border ${
                profile.verification_status === 'approved' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  {profile.verification_status === 'approved' ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      profile.verification_status === 'approved' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {profile.verification_status === 'approved' 
                        ? 'Business Verified' 
                        : `Status: ${profile.verification_status.replace(/_/g, ' ')}`}
                    </p>
                    {profile.approved_at && (
                      <p className="text-sm text-dark-400">
                        Approved on {new Date(profile.approved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Information (Read-only) */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
                <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Information
                </h2>
                <p className="text-sm text-dark-400 mb-4">
                  These details cannot be changed. Contact support if you need to update them.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Legal Business Name</label>
                    <p className="text-white font-medium">{profile.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Entity Type</label>
                    <p className="text-white font-medium">
                      {ENTITY_TYPES.find(e => e.value === profile.entity_type)?.label || profile.entity_type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">State of Incorporation</label>
                    <p className="text-white font-medium">{profile.state_of_incorporation}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Registration Number</label>
                    <p className="text-white font-medium">{profile.registration_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">EIN</label>
                    <p className="text-white font-medium">
                      {profile.ein_last_4 ? `***-**-${profile.ein_last_4}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Business Email</label>
                    <p className="text-white font-medium">{profile.email}</p>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
                <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Contact & Address
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-dark-300 mb-1">DBA (Doing Business As)</label>
                    <input
                      type="text"
                      value={formData.dba_name}
                      onChange={e => updateForm('dba_name', e.target.value)}
                      className="input-dark w-full"
                      placeholder="Optional trade name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-dark-300 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => updateForm('address', e.target.value)}
                      className="input-dark w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => updateForm('city', e.target.value)}
                      className="input-dark w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">State</label>
                    <select
                      value={formData.state}
                      onChange={e => updateForm('state', e.target.value)}
                      className="input-dark w-full"
                    >
                      <option value="">Select...</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={formData.zip_code}
                      onChange={e => updateForm('zip_code', e.target.value)}
                      className="input-dark w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => updateForm('phone', e.target.value)}
                      className="input-dark w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-dark-300 mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={e => updateForm('website', e.target.value)}
                      className="input-dark w-full"
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
                <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Branding
                </h2>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Logo URL</label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={e => updateForm('logo_url', e.target.value)}
                      className="input-dark w-full"
                      placeholder="https://example.com/logo.png"
                    />
                    {formData.logo_url && (
                      <div className="mt-2 p-2 bg-dark-700 rounded-lg">
                        <img 
                          src={formData.logo_url} 
                          alt="Logo preview" 
                          className="max-h-16 object-contain"
                          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={e => updateForm('primary_color', e.target.value)}
                        className="w-12 h-10 rounded-lg border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={e => updateForm('primary_color', e.target.value)}
                        className="input-dark flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-dark-400">Failed to load business profile</p>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-4 p-4 rounded-xl shadow-lg flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span className={toast.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
}
