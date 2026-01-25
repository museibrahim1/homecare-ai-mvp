'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Building2,
  Save,
  Check,
  Upload,
  Image,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface AgencySettings {
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
  contract_template: string | null;
  contract_template_name: string | null;
  contract_template_type: string | null;
  cancellation_policy: string;
  terms_and_conditions: string;
}

const defaultAgency: AgencySettings = {
  name: 'Home Care Services Agency',
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
  contract_template: null,
  contract_template_name: null,
  contract_template_type: null,
  cancellation_policy: '',
  terms_and_conditions: '',
};

export default function SettingsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'notifications' | 'security'>('agency');
  
  // Agency settings state
  const [agency, setAgency] = useState<AgencySettings>(defaultAgency);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadAgencySettings();
    }
  }, [token]);

  const loadAgencySettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/agency/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgency(data);
        if (data.logo) {
          setLogoPreview(data.logo);
        }
        if (data.contract_template_name) {
          setTemplateName(data.contract_template_name);
        }
      }
    } catch (err) {
      console.error('Failed to load agency settings:', err);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo must be under 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setLogoPreview(base64);
      setAgency(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Template must be under 10MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setTemplateName(file.name);
      setAgency(prev => ({ 
        ...prev, 
        contract_template: base64,
        contract_template_name: file.name,
        contract_template_type: file.type,
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setAgency(prev => ({ ...prev, logo: null }));
  };

  const removeTemplate = () => {
    setTemplateName(null);
    setAgency(prev => ({ 
      ...prev, 
      contract_template: null,
      contract_template_name: null,
      contract_template_type: null,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/agency/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(agency),
      });
      
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-300">Loading...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'agency', label: 'Agency / Business', icon: Building2 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
              <p className="text-dark-300">Manage your account and agency settings</p>
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : saved ? (
                <Check className="w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-dark-700 pb-4">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Agency Settings Tab */}
          {activeTab === 'agency' && (
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary-400" />
                  Company Logo
                </h2>
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Company logo" 
                          className="w-32 h-32 object-contain bg-dark-700 rounded-xl border border-dark-600"
                        />
                        <button
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-32 h-32 bg-dark-700 rounded-xl border-2 border-dashed border-dark-600 hover:border-primary-500 flex flex-col items-center justify-center cursor-pointer transition"
                      >
                        <Upload className="w-8 h-8 text-dark-500 mb-2" />
                        <span className="text-dark-400 text-xs">Upload Logo</span>
                      </div>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-dark-300 text-sm mb-3">
                      Upload your company logo. This will appear on contracts and documents.
                    </p>
                    <p className="text-dark-500 text-xs">
                      Recommended: PNG or SVG, at least 200x200px. Max 5MB.
                    </p>
                    {!logoPreview && (
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="mt-3 btn-secondary text-sm"
                      >
                        Choose File
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-400" />
                  Company Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-dark-300 text-sm mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={agency.name}
                      onChange={(e) => setAgency(prev => ({ ...prev, name: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="Your Home Care Agency"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-dark-300 text-sm mb-1">Street Address</label>
                    <input
                      type="text"
                      value={agency.address}
                      onChange={(e) => setAgency(prev => ({ ...prev, address: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">City</label>
                    <input
                      type="text"
                      value={agency.city}
                      onChange={(e) => setAgency(prev => ({ ...prev, city: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="City"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-dark-300 text-sm mb-1">State</label>
                      <input
                        type="text"
                        value={agency.state}
                        onChange={(e) => setAgency(prev => ({ ...prev, state: e.target.value }))}
                        className="input-dark w-full"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-300 text-sm mb-1">ZIP</label>
                      <input
                        type="text"
                        value={agency.zip_code}
                        onChange={(e) => setAgency(prev => ({ ...prev, zip_code: e.target.value }))}
                        className="input-dark w-full"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">Phone</label>
                    <input
                      type="tel"
                      value={agency.phone}
                      onChange={(e) => setAgency(prev => ({ ...prev, phone: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">Email</label>
                    <input
                      type="email"
                      value={agency.email}
                      onChange={(e) => setAgency(prev => ({ ...prev, email: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="contact@agency.com"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-dark-300 text-sm mb-1">Website</label>
                    <input
                      type="url"
                      value={agency.website}
                      onChange={(e) => setAgency(prev => ({ ...prev, website: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="https://www.youragency.com"
                    />
                  </div>
                </div>
              </div>

              {/* Contract Template */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-400" />
                  Contract Template
                </h2>
                <p className="text-dark-300 text-sm mb-4">
                  Upload a DOCX template for contracts. The AI will auto-fill client and service details.
                </p>
                
                {templateName ? (
                  <div className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{templateName}</p>
                        <p className="text-dark-400 text-sm">Contract template</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => templateInputRef.current?.click()}
                        className="btn-secondary text-sm"
                      >
                        Replace
                      </button>
                      <button
                        onClick={removeTemplate}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => templateInputRef.current?.click()}
                    className="border-2 border-dashed border-dark-600 hover:border-primary-500 rounded-xl p-8 text-center cursor-pointer transition"
                  >
                    <Upload className="w-10 h-10 text-dark-500 mx-auto mb-3" />
                    <p className="text-white font-medium mb-1">Upload Contract Template</p>
                    <p className="text-dark-400 text-sm">DOCX files only • Max 10MB</p>
                  </div>
                )}
                <input
                  ref={templateInputRef}
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleTemplateUpload}
                  className="hidden"
                />
              </div>

              {/* Brand Colors */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Brand Colors</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-dark-300 text-sm mb-2">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={agency.primary_color}
                        onChange={(e) => setAgency(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-12 h-10 rounded cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={agency.primary_color}
                        onChange={(e) => setAgency(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="input-dark flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-2">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={agency.secondary_color}
                        onChange={(e) => setAgency(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="w-12 h-10 rounded cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={agency.secondary_color}
                        onChange={(e) => setAgency(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="input-dark flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Policies */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Default Policies</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-dark-300 text-sm mb-2">Cancellation Policy</label>
                    <textarea
                      value={agency.cancellation_policy}
                      onChange={(e) => setAgency(prev => ({ ...prev, cancellation_policy: e.target.value }))}
                      className="input-dark w-full h-24 resize-none"
                      placeholder="24-hour notice required for cancellations..."
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-2">Terms & Conditions</label>
                    <textarea
                      value={agency.terms_and_conditions}
                      onChange={(e) => setAgency(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                      className="input-dark w-full h-32 resize-none"
                      placeholder="Standard terms and conditions for your services..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-400" />
                Profile Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-1">Full Name</label>
                  <input type="text" defaultValue="Admin User" className="input-dark w-full" />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-1">Email</label>
                  <input type="email" defaultValue="admin@homecare.ai" className="input-dark w-full" />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm mb-1">Phone</label>
                  <input type="tel" placeholder="+1 (555) 000-0000" className="input-dark w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-400" />
                Notification Preferences
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Email Notifications', value: true },
                  { label: 'Visit Reminders', value: true },
                  { label: 'Weekly Summary', value: false },
                  { label: 'New Client Alerts', value: true },
                ].map((setting, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-dark-600/50 last:border-0">
                    <span className="text-dark-200">{setting.label}</span>
                    <button className={`w-12 h-6 rounded-full transition-colors relative ${setting.value ? 'bg-primary-500' : 'bg-dark-600'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${setting.value ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-400" />
                  Security Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-dark-600/50">
                    <div>
                      <p className="text-dark-200">Two-Factor Authentication</p>
                      <p className="text-dark-500 text-sm">Add an extra layer of security</p>
                    </div>
                    <button className="btn-secondary text-sm">Enable</button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-dark-200">Change Password</p>
                      <p className="text-dark-500 text-sm">Update your account password</p>
                    </div>
                    <button className="btn-secondary text-sm">Change</button>
                  </div>
                </div>
              </div>

              <div className="card p-6 border-red-500/30">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-red-400" />
                  Danger Zone
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-200">Delete Account</p>
                    <p className="text-dark-500 text-sm">Permanently delete your account and all data</p>
                  </div>
                  <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
