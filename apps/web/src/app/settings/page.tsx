'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings,
  User,
  Users,
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
  Loader2,
  Sparkles,
  File,
  FileCheck,
  AlertCircle,
  Plus,
  Trash2,
  Mic,
  Square,
  Play,
  Volume2,
  UserPlus,
  Mail,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  category: 'contract_template' | 'policy' | 'procedure' | 'letterhead' | 'other';
  content: string;
  uploaded_at: string;
}

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
  documents: UploadedDocument[];
  cancellation_policy: string;
  terms_and_conditions: string;
  // Extracted from documents
  tax_id: string;
  license_number: string;
  npi_number: string;
  contact_person: string;
  contact_title: string;
}

const defaultAgency: AgencySettings = {
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
  tax_id: '',
  license_number: '',
  npi_number: '',
  contact_person: '',
  contact_title: '',
};

const documentCategories = [
  { id: 'contract_template', label: 'Contract Template', icon: FileCheck },
  { id: 'policy', label: 'Policy Document', icon: FileText },
  { id: 'procedure', label: 'Procedure Manual', icon: File },
  { id: 'letterhead', label: 'Letterhead / Branding', icon: Image },
  { id: 'other', label: 'Other Document', icon: File },
];

export default function SettingsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'agency' | 'documents' | 'profile' | 'voiceprint' | 'team' | 'notifications' | 'security'>('agency');
  
  // Team state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLimits, setTeamLimits] = useState<{
    current_users: number;
    max_users: number;
    plan_name: string;
    can_invite: boolean;
    remaining_seats?: number;
    upgrade_options?: Array<{
      name: string;
      tier: string;
      max_users: number;
      monthly_price: number;
      additional_users: number;
    }>;
  } | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('caregiver');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  
  // Voiceprint state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasVoiceprint, setHasVoiceprint] = useState(false);
  const [voiceprintCreatedAt, setVoiceprintCreatedAt] = useState<string | null>(null);
  const [uploadingVoiceprint, setUploadingVoiceprint] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Agency settings state
  const [agency, setAgency] = useState<AgencySettings>(defaultAgency);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);
  
  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('contract_template');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadAgencySettings();
      loadVoiceprintStatus();
    }
  }, [token]);
  
  // Load team when tab changes - must be before any early returns!
  useEffect(() => {
    if (activeTab === 'team' && token) {
      loadTeamMembersInternal();
    }
  }, [activeTab, token]);
  
  const loadTeamMembersInternal = async () => {
    if (!token) return;
    setLoadingTeam(true);
    try {
      const response = await fetch(`${API_BASE}/auth/business/team`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array) and new format (object with members and limits)
        if (Array.isArray(data)) {
          setTeamMembers(data);
        } else {
          setTeamMembers(data.members || []);
          if (data.limits) {
            setTeamLimits(data.limits);
          }
        }
      }
      
      // Also fetch detailed limits
      const limitsResponse = await fetch(`${API_BASE}/auth/business/team/limits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        setTeamLimits(limitsData);
      }
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Load voiceprint status
  const loadVoiceprintStatus = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/voiceprint/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHasVoiceprint(data.has_voiceprint);
        setVoiceprintCreatedAt(data.created_at);
      }
    } catch (error) {
      console.error('Failed to load voiceprint status:', error);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time every second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Upload voiceprint
  const uploadVoiceprint = async () => {
    if (!audioBlob || !token) return;

    setUploadingVoiceprint(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_sample.wav');

      const response = await fetch(`${API_BASE}/voiceprint/create`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setHasVoiceprint(true);
        setVoiceprintCreatedAt(data.created_at);
        setAudioBlob(null);
        alert('Voice ID created successfully! Your voice will now be automatically identified in assessments.');
      } else {
        const error = await response.json();
        alert(`Failed to create Voice ID: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to upload voiceprint:', error);
      alert('Failed to create Voice ID. Please try again.');
    } finally {
      setUploadingVoiceprint(false);
    }
  };

  // Delete voiceprint
  const deleteVoiceprint = async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete your Voice ID?')) return;

    try {
      const response = await fetch(`${API_BASE}/voiceprint/delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setHasVoiceprint(false);
        setVoiceprintCreatedAt(null);
      }
    } catch (error) {
      console.error('Failed to delete voiceprint:', error);
    }
  };

  const loadAgencySettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/agency`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgency({ ...defaultAgency, ...data, documents: data.documents || [] });
        if (data.logo) {
          setLogoPreview(data.logo);
        }
      }
    } catch (err) {
      console.error('Failed to load agency settings:', err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo must be under 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setLogoPreview(base64);
      setAgency(prev => ({ ...prev, logo: base64 }));
      
      // Try to extract company info from logo/letterhead
      if (file.type.includes('image')) {
        await extractCompanyInfo(base64, 'letterhead');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 25 * 1024 * 1024) {
      alert('Document must be under 25MB');
      return;
    }
    
    // Validate contract templates must be DOCX files
    if (selectedCategory === 'contract_template') {
      const isDocx = file.name.toLowerCase().endsWith('.docx') || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (!isDocx) {
        alert('Contract templates must be .docx files (Microsoft Word format). Please upload a DOCX file, not a PDF, image, or other file type.');
        return;
      }
    }
    
    setUploadingDoc(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      const newDoc: UploadedDocument = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        category: selectedCategory as any,
        content: base64,
        uploaded_at: new Date().toISOString(),
      };
      
      const updatedDocs = [...agency.documents, newDoc];
      
      setAgency(prev => ({
        ...prev,
        documents: updatedDocs,
      }));
      
      // Auto-save documents to API
      try {
        const res = await fetch(`${API_BASE}/agency`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ documents: updatedDocs }),
        });
        
        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } catch (err) {
        console.error('Failed to save document:', err);
      }
      
      // Extract company info from document
      await extractCompanyInfo(base64, selectedCategory);
      
      setUploadingDoc(false);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (docInputRef.current) {
      docInputRef.current.value = '';
    }
  };

  const extractCompanyInfo = async (content: string, docType: string) => {
    setExtracting(true);
    setExtractionMessage('AI is analyzing document for company information...');
    
    try {
      const res = await fetch(`${API_BASE}/agency/extract-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, document_type: docType }),
      });
      
      if (res.ok) {
        const extracted = await res.json();
        
        // Only update fields that were extracted and are currently empty
        setAgency(prev => ({
          ...prev,
          name: extracted.name || prev.name,
          address: extracted.address || prev.address,
          city: extracted.city || prev.city,
          state: extracted.state || prev.state,
          zip_code: extracted.zip_code || prev.zip_code,
          phone: extracted.phone || prev.phone,
          email: extracted.email || prev.email,
          website: extracted.website || prev.website,
          tax_id: extracted.tax_id || prev.tax_id,
          license_number: extracted.license_number || prev.license_number,
          npi_number: extracted.npi_number || prev.npi_number,
          contact_person: extracted.contact_person || prev.contact_person,
          contact_title: extracted.contact_title || prev.contact_title,
          cancellation_policy: extracted.cancellation_policy || prev.cancellation_policy,
          terms_and_conditions: extracted.terms_and_conditions || prev.terms_and_conditions,
        }));
        
        setExtractionMessage('✓ Company information extracted and auto-filled!');
        setTimeout(() => setExtractionMessage(null), 3000);
      } else {
        setExtractionMessage('Could not extract info - please fill manually');
        setTimeout(() => setExtractionMessage(null), 3000);
      }
    } catch (err) {
      console.error('Extraction failed:', err);
      setExtractionMessage(null);
    } finally {
      setExtracting(false);
    }
  };

  const removeDocument = (docId: string) => {
    setAgency(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== docId),
    }));
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setAgency(prev => ({ ...prev, logo: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/agency`, {
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
    { id: 'agency', label: 'Company Info', icon: Building2 },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'voiceprint', label: 'Voice ID', icon: Volume2 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];
  
  // Invite team member
  const handleInvite = async () => {
    if (!token || !inviteEmail || !inviteName) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    
    try {
      const response = await fetch(`${API_BASE}/auth/business/team/invite?email=${encodeURIComponent(inviteEmail)}&full_name=${encodeURIComponent(inviteName)}&role=${inviteRole}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send invitation');
      }
      
      setInviteSuccess(`Invitation sent to ${inviteEmail}. Temporary password: ${data.temp_password}`);
      setInviteEmail('');
      setInviteName('');
      loadTeamMembersInternal();
      
      // Auto-close modal after 5 seconds
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 5000);
      
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };
  
  // Update team member
  const handleUpdateMember = async (memberId: string, updates: { role?: string; is_active?: boolean }) => {
    if (!token) return;
    
    try {
      const params = new URLSearchParams();
      if (updates.role) params.set('role', updates.role);
      if (updates.is_active !== undefined) params.set('is_active', String(updates.is_active));
      
      const response = await fetch(`${API_BASE}/auth/business/team/${memberId}?${params}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        loadTeamMembersInternal();
      }
    } catch (err) {
      console.error('Failed to update member:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
              <p className="text-dark-300">Manage your company and account settings</p>
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

          {/* AI Extraction Status */}
          {extractionMessage && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              extractionMessage.includes('✓') 
                ? 'bg-accent-green/10 border border-accent-green/30' 
                : 'bg-primary-500/10 border border-primary-500/30'
            }`}>
              {extracting ? (
                <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-accent-green" />
              )}
              <span className={extractionMessage.includes('✓') ? 'text-accent-green' : 'text-primary-400'}>
                {extractionMessage}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-dark-700 pb-4 overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
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

          {/* Company Info Tab */}
          {activeTab === 'agency' && (
            <div className="space-y-6">
              {/* Quick Upload for Auto-Fill */}
              <div className="card p-6 bg-gradient-to-r from-primary-500/10 to-purple-500/10 border-primary-500/30">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Auto-Fill Company Info</h3>
                    <p className="text-dark-300 text-sm mb-3">
                      Upload any document with your company letterhead, and AI will extract your business information automatically.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => docInputRef.current?.click()}
                        className="btn-primary text-sm flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Document to Extract
                      </button>
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={handleDocumentUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

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
                    <p className="text-dark-300 text-sm mb-2">
                      Upload your company logo. This will appear on contracts, invoices, and documents.
                    </p>
                    <p className="text-dark-500 text-xs">
                      PNG, JPG, or SVG. At least 200x200px. Max 5MB.
                    </p>
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
                      placeholder="123 Main Street, Suite 100"
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

              {/* Business Identifiers */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Business Identifiers</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">Tax ID / EIN</label>
                    <input
                      type="text"
                      value={agency.tax_id}
                      onChange={(e) => setAgency(prev => ({ ...prev, tax_id: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="XX-XXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">License Number</label>
                    <input
                      type="text"
                      value={agency.license_number}
                      onChange={(e) => setAgency(prev => ({ ...prev, license_number: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="License #"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">NPI Number</label>
                    <input
                      type="text"
                      value={agency.npi_number}
                      onChange={(e) => setAgency(prev => ({ ...prev, npi_number: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="NPI #"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Primary Contact</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={agency.contact_person}
                      onChange={(e) => setAgency(prev => ({ ...prev, contact_person: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm mb-1">Title / Position</label>
                    <input
                      type="text"
                      value={agency.contact_title}
                      onChange={(e) => setAgency(prev => ({ ...prev, contact_title: e.target.value }))}
                      className="input-dark w-full"
                      placeholder="Administrator"
                    />
                  </div>
                </div>
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
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload New Document */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary-400" />
                  Upload Documents
                </h2>
                <p className="text-dark-300 text-sm mb-4">
                  Upload your policies, procedures, contract templates, and other business documents. 
                  AI will extract relevant information to auto-fill forms.
                </p>
                
                {/* Category Selection */}
                <div className="mb-4">
                  <label className="block text-dark-300 text-sm mb-2">Document Category</label>
                  <div className="flex flex-wrap gap-2">
                    {documentCategories.map((cat) => {
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedCategory === cat.id
                              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                              : 'bg-dark-700 text-dark-300 border border-dark-600 hover:border-dark-500'
                          }`}
                        >
                          <CatIcon className="w-4 h-4" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Upload Area */}
                <div
                  onClick={() => docInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    uploadingDoc 
                      ? 'border-primary-500/50 bg-primary-500/5' 
                      : 'border-dark-600 hover:border-primary-500 bg-dark-700/30'
                  }`}
                >
                  {uploadingDoc ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
                      <p className="text-primary-400 font-medium">Uploading & analyzing...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-dark-500 mx-auto mb-3" />
                      <p className="text-white font-medium mb-1">Click to upload document</p>
                      <p className="text-dark-400 text-sm">PDF, DOCX, DOC, PNG, JPG • Max 25MB</p>
                    </>
                  )}
                </div>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.rtf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </div>

              {/* Uploaded Documents List */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h2>
                
                {agency.documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                    <p className="text-dark-400">No documents uploaded yet</p>
                    <p className="text-dark-500 text-sm">Upload policies, procedures, and templates above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agency.documents.map((doc) => {
                      const category = documentCategories.find(c => c.id === doc.category);
                      const CatIcon = category?.icon || File;
                      
                      return (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl border border-dark-600"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                              <CatIcon className="w-5 h-5 text-primary-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{doc.name}</p>
                              <p className="text-dark-400 text-sm">{category?.label} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeDocument(doc.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Default Policies */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Default Policies</h2>
                <p className="text-dark-400 text-sm mb-4">
                  These will be used as defaults when generating contracts. You can also upload policy documents above for more detailed extraction.
                </p>
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

          {/* Voice ID Tab */}
          {activeTab === 'voiceprint' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary-400" />
                  Voice Identification
                </h2>
                <p className="text-dark-400 text-sm mb-6">
                  Record a voice sample so the system can automatically identify you as the assessor in recordings.
                  This helps distinguish between you and clients during assessments.
                </p>

                {hasVoiceprint ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <Check className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Voice ID Active</h3>
                        <p className="text-dark-400 text-sm">
                          Created: {voiceprintCreatedAt ? new Date(voiceprintCreatedAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <p className="text-green-300 text-sm mb-4">
                      Your voice will be automatically identified in assessment recordings.
                    </p>
                    <button
                      onClick={deleteVoiceprint}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Voice ID
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Recording Instructions */}
                    <div className="bg-dark-700/50 rounded-xl p-4">
                      <h3 className="text-white font-medium mb-2">Recording Tips:</h3>
                      <ul className="text-dark-300 text-sm space-y-1">
                        <li>• Find a quiet place without background noise</li>
                        <li>• Speak clearly at your normal pace</li>
                        <li>• Record for at least 10 seconds (max 30 seconds)</li>
                        <li>• You can say anything - introduce yourself or read some text</li>
                      </ul>
                    </div>

                    {/* Recording Interface */}
                    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
                      {!audioBlob ? (
                        <div className="text-center">
                          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 transition-all ${
                            isRecording 
                              ? 'bg-red-500 animate-pulse' 
                              : 'bg-primary-500/20 hover:bg-primary-500/30'
                          }`}>
                            {isRecording ? (
                              <div className="text-center">
                                <Square className="w-8 h-8 text-white" />
                              </div>
                            ) : (
                              <Mic className="w-10 h-10 text-primary-400" />
                            )}
                          </div>

                          {isRecording && (
                            <div className="mb-4">
                              <p className="text-white text-2xl font-mono">{recordingTime}s / 30s</p>
                              <div className="w-48 mx-auto h-2 bg-dark-600 rounded-full mt-2 overflow-hidden">
                                <div 
                                  className="h-full bg-red-500 transition-all duration-1000"
                                  style={{ width: `${(recordingTime / 30) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                              isRecording
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-primary-500 hover:bg-primary-600 text-white'
                            }`}
                          >
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-10 h-10 text-green-400" />
                          </div>
                          <p className="text-white mb-2">Recording Complete!</p>
                          <p className="text-dark-400 text-sm mb-6">{recordingTime} seconds recorded</p>
                          
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => {
                                setAudioBlob(null);
                                setRecordingTime(0);
                              }}
                              className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors"
                            >
                              Record Again
                            </button>
                            <button
                              onClick={uploadVoiceprint}
                              disabled={uploadingVoiceprint}
                              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              {uploadingVoiceprint ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Creating Voice ID...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  Create Voice ID
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="card p-6">
                <h3 className="text-white font-medium mb-4">How Voice ID Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center mb-3">
                      <Mic className="w-5 h-5 text-primary-400" />
                    </div>
                    <h4 className="text-white text-sm font-medium mb-1">1. Record Sample</h4>
                    <p className="text-dark-400 text-xs">Create a short voice sample that captures your unique voice</p>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                      <Database className="w-5 h-5 text-purple-400" />
                    </div>
                    <h4 className="text-white text-sm font-medium mb-1">2. Voice Analysis</h4>
                    <p className="text-dark-400 text-xs">AI creates a unique voiceprint from your recording</p>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg p-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                    <h4 className="text-white text-sm font-medium mb-1">3. Auto-Identify</h4>
                    <p className="text-dark-400 text-xs">Your voice is automatically identified in future assessments</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Plan Usage Banner */}
              {teamLimits && (
                <div className={`p-4 rounded-xl border ${
                  teamLimits.can_invite 
                    ? 'bg-dark-800 border-dark-700'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        teamLimits.can_invite ? 'bg-primary-500/20' : 'bg-yellow-500/20'
                      }`}>
                        <Users className={`w-5 h-5 ${teamLimits.can_invite ? 'text-primary-400' : 'text-yellow-400'}`} />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {teamLimits.current_users} / {teamLimits.max_users} Team Members
                        </p>
                        <p className="text-dark-400 text-sm">
                          {teamLimits.plan_name} Plan
                          {teamLimits.remaining_seats !== undefined && teamLimits.remaining_seats > 0 && (
                            <span> · {teamLimits.remaining_seats} seat{teamLimits.remaining_seats !== 1 ? 's' : ''} available</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {!teamLimits.can_invite && teamLimits.upgrade_options && teamLimits.upgrade_options.length > 0 && (
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition"
                      >
                        Upgrade Plan
                      </button>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        teamLimits.can_invite ? 'bg-primary-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, (teamLimits.current_users / teamLimits.max_users) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Team Header */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-400" />
                      Team Members
                    </h2>
                    <p className="text-dark-400 text-sm mt-1">Manage your team and their permissions</p>
                  </div>
                  {teamLimits?.can_invite ? (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Member
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="btn-secondary flex items-center gap-2"
                      title="Upgrade your plan to invite more team members"
                    >
                      <UserPlus className="w-4 h-4" />
                      Upgrade to Invite
                    </button>
                  )}
                </div>
                
                {/* Team List */}
                {loadingTeam ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                    <p className="text-dark-400">No team members yet</p>
                    <p className="text-dark-500 text-sm">Invite your first team member to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-dark-700/50">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                            <span className="text-primary-400 font-medium">
                              {member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{member.full_name}</p>
                            <p className="text-dark-400 text-sm">{member.email}</p>
                          </div>
                          {member.voiceprint_created && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                              Voice ID Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMember(member.id, { role: e.target.value })}
                            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-white"
                          >
                            <option value="user">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="caregiver">Caregiver</option>
                          </select>
                          <button
                            onClick={() => handleUpdateMember(member.id, { is_active: !member.is_active })}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              member.is_active 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {member.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Voice ID Setup Tip */}
              <div className="card p-6 border border-primary-500/20 bg-primary-500/5">
                <div className="flex gap-4">
                  <Volume2 className="w-6 h-6 text-primary-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-medium mb-1">Voice ID for Team Members</h3>
                    <p className="text-dark-400 text-sm">
                      Each team member can set up their Voice ID in Settings &gt; Voice ID. This allows the system 
                      to automatically identify who is speaking during assessments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-dark-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary-400" />
                    Invite Team Member
                  </h3>
                  <button onClick={() => { setShowInviteModal(false); setInviteError(null); setInviteSuccess(null); }} className="p-2 hover:bg-dark-700 rounded-lg">
                    <X className="w-5 h-5 text-dark-400" />
                  </button>
                </div>
                
                {inviteSuccess ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                    <p className="text-green-400 text-sm">{inviteSuccess}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="input-dark w-full"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">Email Address *</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="input-dark w-full"
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="input-dark w-full"
                      >
                        <option value="caregiver">Caregiver</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    
                    {inviteError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-400 text-sm">{inviteError}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setShowInviteModal(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleInvite}
                        disabled={inviting || !inviteEmail || !inviteName}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {inviting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        Send Invite
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upgrade Modal */}
          {showUpgradeModal && teamLimits?.upgrade_options && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-dark-800 rounded-2xl p-6 w-full max-w-lg border border-dark-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-400" />
                    Upgrade Your Plan
                  </h3>
                  <button onClick={() => setShowUpgradeModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                    <X className="w-5 h-5 text-dark-400" />
                  </button>
                </div>
                
                <p className="text-dark-400 text-sm mb-6">
                  Your current <span className="text-white font-medium">{teamLimits.plan_name}</span> plan 
                  allows {teamLimits.max_users} team member{teamLimits.max_users !== 1 ? 's' : ''}. 
                  Upgrade to add more users and unlock additional features.
                </p>
                
                <div className="space-y-4">
                  {teamLimits.upgrade_options.map((plan, index) => (
                    <div 
                      key={plan.name}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        index === 0 
                          ? 'bg-primary-500/10 border-primary-500/30 hover:border-primary-500/50' 
                          : 'bg-dark-700/50 border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold ${index === 0 ? 'text-primary-400' : 'text-white'}`}>
                            {plan.name}
                          </h4>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-white font-bold">
                          ${plan.monthly_price}<span className="text-dark-400 font-normal text-sm">/mo</span>
                        </p>
                      </div>
                      <p className="text-dark-400 text-sm">
                        Up to {plan.max_users} team members 
                        <span className="text-green-400 ml-1">
                          (+{plan.additional_users} more than current)
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-dark-700">
                  <a 
                    href="/pricing" 
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    View All Plans & Pricing
                  </a>
                  <p className="text-dark-500 text-xs text-center mt-3">
                    Contact us for custom enterprise pricing
                  </p>
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
                  { label: 'Contract Expiration Alerts', value: true },
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
