'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, User, FileText, CheckCircle, ChevronRight, ChevronLeft,
  Upload, AlertCircle, Shield, Loader2, Search, ExternalLink
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' },
];

const ENTITY_TYPES = [
  { value: 'llc', label: 'LLC (Limited Liability Company)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'nonprofit', label: 'Non-Profit Organization' },
];

const REQUIRED_DOCUMENTS = [
  { type: 'business_license', label: 'Business License', description: 'State or local business license' },
  { type: 'home_care_license', label: 'Home Care License', description: 'State home care agency license' },
  { type: 'liability_insurance', label: 'Liability Insurance', description: 'General liability insurance certificate' },
];

interface FormData {
  // Business Info
  name: string;
  dba_name: string;
  entity_type: string;
  state_of_incorporation: string;
  registration_number: string;
  ein: string;
  // Contact
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  // Owner
  owner_name: string;
  owner_email: string;
  owner_password: string;
  owner_password_confirm: string;
}

interface SOSResult {
  found: boolean;
  business_name?: string;
  status?: string;
  registration_number?: string;
  formation_date?: string;
  entity_type?: string;
  error?: string;
}

interface UploadedDoc {
  type: string;
  name: string;
  id?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    dba_name: '',
    entity_type: 'llc',
    state_of_incorporation: '',
    registration_number: '',
    ein: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    owner_password_confirm: '',
  });
  
  const [sosResult, setSosResult] = useState<SOSResult | null>(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const updateForm = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Step 1: Verify with Secretary of State
  const verifySOS = async () => {
    if (!formData.name || !formData.state_of_incorporation) {
      setError('Please enter business name and state');
      return;
    }

    setSosLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/business/verify-sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: formData.name,
          state: formData.state_of_incorporation,
          registration_number: formData.registration_number || null,
        }),
      });

      const data = await response.json();
      setSosResult(data);

      if (data.found && data.registration_number) {
        updateForm('registration_number', data.registration_number);
      }
    } catch (err) {
      setError('Failed to verify business. You can continue with manual verification.');
    } finally {
      setSosLoading(false);
    }
  };

  // Step 2: Submit registration
  const submitRegistration = async () => {
    // Validate
    if (formData.owner_password !== formData.owner_password_confirm) {
      setError('Passwords do not match');
      return;
    }
    if (formData.owner_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/business/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Registration failed');
      }

      const data = await response.json();
      setBusinessId(data.business_id);
      setStep(3); // Go to document upload
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Upload document
  const uploadDocument = async (docType: string, file: File) => {
    if (!businessId) return;

    setUploading(docType);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);

      const response = await fetch(`${API_BASE}/auth/business/upload-document/${businessId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedDocs(prev => [...prev, { type: docType, name: file.name, id: data.id }]);
    } catch (err) {
      setError('Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (docType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument(docType, file);
    }
  };

  const isDocUploaded = (type: string) => uploadedDocs.some(d => d.type === type);
  const allDocsUploaded = REQUIRED_DOCUMENTS.every(d => isDocUploaded(d.type));

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left Panel - Progress */}
      <div className="hidden lg:flex w-80 bg-dark-800 border-r border-dark-700 flex-col p-8">
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-white">Homecare AI</h1>
          <p className="text-dark-400 mt-1">Business Registration</p>
        </div>

        <div className="space-y-6">
          {[
            { num: 1, title: 'Business Information', desc: 'Company details & verification' },
            { num: 2, title: 'Owner Account', desc: 'Create admin account' },
            { num: 3, title: 'Documents', desc: 'Upload verification docs' },
            { num: 4, title: 'Review', desc: 'Submit for approval' },
          ].map((s) => (
            <div key={s.num} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                step > s.num ? 'bg-accent-green text-white' :
                step === s.num ? 'bg-primary-500 text-white' :
                'bg-dark-700 text-dark-400'
              }`}>
                {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <div>
                <p className={`font-medium ${step >= s.num ? 'text-white' : 'text-dark-400'}`}>{s.title}</p>
                <p className="text-sm text-dark-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 border-t border-dark-700">
          <p className="text-dark-400 text-sm">Already registered?</p>
          <button onClick={() => router.push('/login')} className="text-primary-400 hover:text-primary-300 font-medium">
            Sign in to your account
          </button>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Business Information</h2>
                <p className="text-dark-400 mt-1">Enter your business details for state verification</p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-dark-300 mb-1">Legal Business Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => updateForm('name', e.target.value)}
                    className="input-dark w-full"
                    placeholder="ABC Home Care Services LLC"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-dark-300 mb-1">DBA (Doing Business As)</label>
                  <input
                    type="text"
                    value={formData.dba_name}
                    onChange={e => updateForm('dba_name', e.target.value)}
                    className="input-dark w-full"
                    placeholder="ABC Home Care"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Entity Type *</label>
                  <select
                    value={formData.entity_type}
                    onChange={e => updateForm('entity_type', e.target.value)}
                    className="input-dark w-full"
                  >
                    {ENTITY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">State of Incorporation *</label>
                  <select
                    value={formData.state_of_incorporation}
                    onChange={e => updateForm('state_of_incorporation', e.target.value)}
                    className="input-dark w-full"
                  >
                    <option value="">Select state...</option>
                    {STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">State Registration Number</label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={e => updateForm('registration_number', e.target.value)}
                    className="input-dark w-full"
                    placeholder="Optional - helps with verification"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">EIN (Tax ID)</label>
                  <input
                    type="text"
                    value={formData.ein}
                    onChange={e => updateForm('ein', e.target.value)}
                    className="input-dark w-full"
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>

              {/* SOS Verification */}
              <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-400" />
                    <span className="font-medium text-white">State Verification</span>
                  </div>
                  <button
                    onClick={verifySOS}
                    disabled={sosLoading || !formData.name || !formData.state_of_incorporation}
                    className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sosLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Verify
                  </button>
                </div>

                {sosResult && (
                  <div className={`p-3 rounded-lg ${sosResult.found ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                    {sosResult.found ? (
                      <div className="space-y-1">
                        <p className="text-green-400 font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Business Verified
                        </p>
                        <p className="text-dark-300 text-sm">Name: {sosResult.business_name}</p>
                        <p className="text-dark-300 text-sm">Status: {sosResult.status}</p>
                        {sosResult.registration_number && (
                          <p className="text-dark-300 text-sm">Reg #: {sosResult.registration_number}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-yellow-400 font-medium">Business Not Found</p>
                        <p className="text-dark-400 text-sm mt-1">
                          {sosResult.error || 'You can continue - documents will be reviewed manually.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <h3 className="text-lg font-medium text-white pt-4">Business Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-dark-300 mb-1">Street Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => updateForm('address', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => updateForm('city', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">State *</label>
                  <select
                    value={formData.state}
                    onChange={e => updateForm('state', e.target.value)}
                    className="input-dark w-full"
                  >
                    <option value="">Select...</option>
                    {STATES.map(s => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">ZIP Code *</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={e => updateForm('zip_code', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => updateForm('phone', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Business Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => updateForm('email', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
                <div>
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

              <div className="flex justify-end pt-4">
                <button onClick={() => setStep(2)} className="btn-primary flex items-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Owner Account */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Owner Account</h2>
                <p className="text-dark-400 mt-1">Create the primary administrator account</p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={e => updateForm('owner_name', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.owner_email}
                    onChange={e => updateForm('owner_email', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Password *</label>
                  <input
                    type="password"
                    value={formData.owner_password}
                    onChange={e => updateForm('owner_password', e.target.value)}
                    className="input-dark w-full"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={formData.owner_password_confirm}
                    onChange={e => updateForm('owner_password_confirm', e.target.value)}
                    className="input-dark w-full"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={submitRegistration} disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Account & Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Document Upload */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Upload Documents</h2>
                <p className="text-dark-400 mt-1">Upload required verification documents</p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {REQUIRED_DOCUMENTS.map(doc => {
                  const uploaded = uploadedDocs.find(d => d.type === doc.type);
                  const isUploading = uploading === doc.type;

                  return (
                    <div key={doc.type} className={`p-4 rounded-xl border ${
                      uploaded ? 'bg-green-500/10 border-green-500/30' : 'bg-dark-800 border-dark-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {uploaded ? (
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          ) : (
                            <FileText className="w-6 h-6 text-dark-400" />
                          )}
                          <div>
                            <p className="font-medium text-white">{doc.label}</p>
                            <p className="text-sm text-dark-400">{doc.description}</p>
                            {uploaded && (
                              <p className="text-sm text-green-400 mt-1">{uploaded.name}</p>
                            )}
                          </div>
                        </div>
                        <label className={`px-4 py-2 rounded-lg cursor-pointer transition ${
                          uploaded 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                        }`}>
                          {isUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : uploaded ? (
                            'Replace'
                          ) : (
                            <span className="flex items-center gap-2">
                              <Upload className="w-4 h-4" /> Upload
                            </span>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleFileSelect(doc.type)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
                <p className="text-dark-300 text-sm">
                  Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB each)
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button 
                  onClick={() => setStep(4)} 
                  disabled={!allDocsUploaded}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Registration Complete!</h2>
                <p className="text-dark-400 mt-1">Your application has been submitted for review</p>
              </div>

              <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Application Submitted</h3>
                <p className="text-dark-300">
                  Our team will review your documents and verify your business registration.
                  You will receive an email once your account is approved.
                </p>
              </div>

              <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
                <h4 className="font-medium text-white mb-3">What happens next?</h4>
                <ul className="space-y-2 text-dark-300">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400">1.</span>
                    Our team reviews your documents (1-2 business days)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400">2.</span>
                    We verify your business with state records
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400">3.</span>
                    You receive approval email with login instructions
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-400">4.</span>
                    Start using Homecare AI for your agency
                  </li>
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <button 
                  onClick={() => router.push(`/register/status?id=${businessId}`)}
                  className="btn-secondary flex items-center gap-2"
                >
                  Check Status <ExternalLink className="w-4 h-4" />
                </button>
                <button onClick={() => router.push('/login')} className="btn-primary">
                  Go to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
