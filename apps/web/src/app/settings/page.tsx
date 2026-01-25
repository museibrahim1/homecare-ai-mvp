'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Save,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  const settingsSections = [
    {
      title: 'Profile',
      icon: User,
      settings: [
        { label: 'Full Name', value: 'Admin User', type: 'text' },
        { label: 'Email', value: 'admin@homecare.ai', type: 'email' },
        { label: 'Phone', value: '', type: 'tel', placeholder: '+1 (555) 000-0000' },
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        { label: 'Email Notifications', value: true, type: 'toggle' },
        { label: 'Visit Reminders', value: true, type: 'toggle' },
        { label: 'Weekly Summary', value: false, type: 'toggle' },
      ]
    },
    {
      title: 'Security',
      icon: Shield,
      settings: [
        { label: 'Two-Factor Authentication', value: false, type: 'toggle' },
        { label: 'Session Timeout (minutes)', value: '60', type: 'number' },
      ]
    },
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
              <p className="text-dark-300">Manage your account and preferences</p>
            </div>
            <button 
              onClick={handleSave}
              className="btn-primary flex items-center gap-2"
            >
              {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {settingsSections.map((section, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                </div>
                
                <div className="space-y-4">
                  {section.settings.map((setting, settingIndex) => (
                    <div key={settingIndex} className="flex items-center justify-between py-3 border-b border-dark-600/50 last:border-0">
                      <label className="text-dark-200">{setting.label}</label>
                      {setting.type === 'toggle' ? (
                        <button 
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            setting.value ? 'bg-primary-500' : 'bg-dark-600'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            setting.value ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      ) : (
                        <input
                          type={setting.type}
                          defaultValue={setting.value as string}
                          placeholder={setting.placeholder}
                          className="input-dark w-64 text-right"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Danger Zone */}
            <div className="card p-6 border-red-500/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-200">Delete Account</p>
                  <p className="text-dark-400 text-sm">Permanently delete your account and all data</p>
                </div>
                <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
