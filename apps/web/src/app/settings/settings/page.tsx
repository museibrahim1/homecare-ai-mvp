'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, Building2, FileText, Check, X, Trash2, FileUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface AgencySettings {
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
  cancellation_policy: string | null;
  terms_and_conditions: string | null;
}

const defaultSettings: AgencySettings = {
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
  cancellation_policy: null,
  terms_and_conditions: null,
};

export default function SettingsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<AgencySettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'agency' | 'template'>('agency');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!authLoading && !token) router.push('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) loadSettings();
  }, [token]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/agency`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings({ ...defaultSettings, ...data });
        if (data.logo) setLogoPreview(data.logo);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/agency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        // Also update localStorage for offline access
        localStorage.setItem('agencySettings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        const newSettings = { ...settings, logo: base64 };
        setSettings(newSettings);
        // Auto-save
        await saveSettings(newSettings);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const newSettings = {
          ...settings,
          contract_template: base64,
          contract_template_name: file.name,
          contract_template_type: file.type,
        };
        setSettings(newSettings);
        
        // Auto-save template
        await saveSettings(newSettings);
        
        // Extract agency info from template
        try {
          const extractResponse = await fetch(`${API_BASE}/template/extract-agency-info`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              template_data: base64,
              template_name: file.name,
              template_type: file.type,
            }),
          });
          
          if (extractResponse.ok) {
            const extracted = await extractResponse.json();
            
            // Auto-fill agency info from extracted data
            const updatedSettings = {
              ...newSettings,
              name: extracted.name || newSettings.name,
              address: extracted.address || newSettings.address,
              city: extracted.city || newSettings.city,
              state: extracted.state || newSettings.state,
              zip_code: extracted.zip_code || newSettings.zip_code,
              phone: extracted.phone || newSettings.phone,
              email: extracted.email || newSettings.email,
              website: extracted.website || newSettings.website,
            };
            
            setSettings(updatedSettings);
            await saveSettings(updatedSettings);
            
            // Show success message
            if (extracted.name || extracted.address || extracted.phone) {
              showToast('Agency info extracted from template', 'success');
            }
          }
        } catch (err) {
          console.error('Failed to extract agency info:', err);
        }
        
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async (newSettings: AgencySettings) => {
    try {
      const response = await fetch(`${API_BASE}/agency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });
      
      if (response.ok) {
        localStorage.setItem('agencySettings', JSON.stringify(newSettings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const autoFillFromTemplate = async () => {
    if (!settings.contract_template) {
      showToast('Please upload a template first', 'error');
      return;
    }
    
    setExtracting(true);
    try {
      const response = await fetch(`${API_BASE}/template/extract-agency-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          template_data: settings.contract_template,
          template_name: settings.contract_template_name || 'template',
          template_type: settings.contract_template_type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      });
      
      if (response.ok) {
        const extracted = await response.json();
        console.log('Extracted:', extracted);
        
        // Update settings with extracted data
        const updatedSettings = {
          ...settings,
          name: extracted.name || settings.name,
          address: extracted.address || settings.address,
          city: extracted.city || settings.city,
          state: extracted.state || settings.state,
          zip_code: extracted.zip_code || settings.zip_code,
          phone: extracted.phone || settings.phone,
          email: extracted.email || settings.email,
          website: extracted.website || settings.website,
        };
        
        setSettings(updatedSettings);
        await saveSettings(updatedSettings);
        
        // Show what was found
        const foundFields = [];
        if (extracted.name) foundFields.push('Name');
        if (extracted.address) foundFields.push('Address');
        if (extracted.city) foundFields.push('City');
        if (extracted.state) foundFields.push('State');
        if (extracted.zip_code) foundFields.push('ZIP');
        if (extracted.phone) foundFields.push('Phone');
        if (extracted.email) foundFields.push('Email');
        
        if (foundFields.length > 0) {
          showToast(`Auto-filled: ${foundFields.join(', ')}`, 'success');
        } else {
          showToast('No agency info found in template', 'error');
        }
      } else {
        showToast('Failed to extract agency info', 'error');
      }
    } catch (err) {
      console.error('Auto-fill failed:', err);
      showToast('Failed to extract agency info', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const removeTemplate = async () => {
    // Clear template AND agency info that was extracted from it
    const newSettings = {
      ...settings,
      contract_template: null,
      contract_template_name: null,
      contract_template_type: null,
      // Reset agency info to defaults
      name: 'Home Care Services Agency',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      email: '',
      website: '',
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const removeLogo = async () => {
    setLogoPreview(null);
    const newSettings = { ...settings, logo: null };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'agency', label: 'Agency Info', icon: Building2 },
    { id: 'template', label: 'Contract Template', icon: FileText },
  ];

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Agency Settings</h1>
            <p className="text-dark-400 mt-1">Configure your agency information and contract templates</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 py-2.5 px-5"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-dark-700 pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Agency Info Tab */}
        {activeTab === 'agency' && (
          <div className="space-y-6">
            {/* Logo */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Logo</h2>
              <div className="flex items-start gap-6">
                <div className="w-32 h-32 bg-dark-700 border-2 border-dashed border-dark-500 rounded-xl flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center text-dark-400">
                      <Upload className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">No logo</p>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-dark-300 text-sm mb-4">
                    Upload your agency logo to appear on contracts. This logo will be used when generating contracts.
                  </p>
                  <div className="flex gap-3">
                    <label className="btn-primary py-2 px-4 cursor-pointer text-sm">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <Upload className="w-4 h-4 inline mr-2" />
                      Upload Logo
                    </label>
                    {logoPreview && (
                      <button onClick={removeLogo} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm">
                        <X className="w-4 h-4 inline mr-2" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Agency Details */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Agency Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm text-dark-300 mb-2">Agency Name *</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Your Agency Name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-dark-300 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={settings.address || ''}
                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">City</label>
                  <input
                    type="text"
                    value={settings.city || ''}
                    onChange={e => setSettings({ ...settings, city: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">State</label>
                    <input
                      type="text"
                      value={settings.state || ''}
                      onChange={e => setSettings({ ...settings, state: e.target.value })}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="NE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">ZIP</label>
                    <input
                      type="text"
                      value={settings.zip_code || ''}
                      onChange={e => setSettings({ ...settings, zip_code: e.target.value })}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="68000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={settings.phone || ''}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="info@agency.com"
                  />
                </div>
              </div>
            </div>

            {/* Branding Colors */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Branding Colors</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.primary_color}
                      onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={settings.primary_color}
                      onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                      className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.secondary_color || '#3b82f6'}
                      onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={settings.secondary_color || '#3b82f6'}
                      onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Template Tab */}
        {activeTab === 'template' && (
          <div className="space-y-6">
            {/* Upload Template */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Your Contract Template</h2>
              <p className="text-dark-400 text-sm mb-6">
                Upload your agency's contract template. The system will use your template design and fill in client data automatically.
              </p>

              {settings.contract_template ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-lg border border-green-500/30">
                    <div className="w-14 h-14 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-7 h-7 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{settings.contract_template_name}</p>
                      <p className="text-green-400 text-sm">Template uploaded - will be used for all contracts</p>
                    </div>
                    <button
                      onClick={removeTemplate}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                      title="Remove template"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Auto-fill button */}
                  <button
                    onClick={autoFillFromTemplate}
                    disabled={extracting}
                    className="w-full py-3 px-4 bg-primary-500/20 border border-primary-500/30 text-primary-400 rounded-lg hover:bg-primary-500/30 transition flex items-center justify-center gap-2 font-medium"
                  >
                    {extracting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                        Extracting Agency Info...
                      </>
                    ) : (
                      <>
                        <FileUp className="w-5 h-5" />
                        Auto-fill Agency Info from Template
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-dark-600 rounded-xl cursor-pointer hover:border-primary-500/50 hover:bg-dark-800/50 transition">
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                    onChange={handleTemplateUpload}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileUp className="w-12 h-12 text-dark-400 mb-3" />
                      <p className="text-white font-medium text-lg">Upload Your Contract Template</p>
                      <p className="text-dark-400 text-sm mt-2">Supports .doc, .docx, and .pdf files</p>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* How it works */}
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-6">
              <h3 className="text-primary-400 font-semibold mb-4">How It Works</h3>
              <div className="space-y-4 text-dark-200 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">1</div>
                  <p><strong>Upload your template</strong> - Use your agency's existing contract document (Word or PDF)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">2</div>
                  <p><strong>Agency info auto-fills</strong> - Your logo, name, address, and contact info are added automatically</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">3</div>
                  <p><strong>Client data fills in</strong> - After an assessment, client info is extracted and filled into the contract</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">4</div>
                  <p><strong>Ready to print</strong> - The final contract uses your branding and is ready for signatures</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification - Bottom Left */}
      {toast && (
        <div className={`fixed bottom-6 left-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50 ${
          toast.type === 'success' ? 'bg-green-500/90 text-white' :
          toast.type === 'error' ? 'bg-red-500/90 text-white' :
          'bg-dark-700 text-white border border-dark-600'
        }`}>
          {toast.type === 'success' && <Check className="w-5 h-5" />}
          {toast.type === 'error' && <X className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast(null)} 
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
