'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  User, 
  MapPin, 
  FileCheck, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type EntityType = 'llc' | 'corporation' | 's_corp' | 'partnership' | 'sole_proprietorship' | 'nonprofit';

interface FormData {
  // Business Info
  name: string;
  dba_name: string;
  entity_type: EntityType;
  state_of_incorporation: string;
  registration_number: string;
  ein: string;
  
  // Contact Info
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  
  // Owner Info
  owner_name: string;
  owner_email: string;
  owner_password: string;
  confirm_password: string;
}

const STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const ENTITY_TYPES = [
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 's_corp', label: 'S-Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'nonprofit', label: 'Non-Profit' },
];

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
    confirm_password: '',
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep1 = () => {
    if (!formData.name) return 'Business name is required';
    if (!formData.state_of_incorporation) return 'State of incorporation is required';
    if (!formData.registration_number) return 'Registration number is required';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.address) return 'Address is required';
    if (!formData.city) return 'City is required';
    if (!formData.state) return 'State is required';
    if (!formData.zip_code) return 'ZIP code is required';
    if (!formData.phone) return 'Phone is required';
    if (!formData.email) return 'Email is required';
    return null;
  };

  const validateStep3 = () => {
    if (!formData.owner_name) return 'Owner name is required';
    if (!formData.owner_email) return 'Owner email is required';
    if (!formData.owner_password) return 'Password is required';
    if (formData.owner_password.length < 8) return 'Password must be at least 8 characters';
    if (formData.owner_password !== formData.confirm_password) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    let validationError = null;
    
    if (step === 1) validationError = validateStep1();
    if (step === 2) validationError = validateStep2();
    if (step === 3) validationError = validateStep3();
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateStep3();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/auth/business/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          dba_name: formData.dba_name || null,
          entity_type: formData.entity_type,
          state_of_incorporation: formData.state_of_incorporation,
          registration_number: formData.registration_number,
          ein: formData.ein || null,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          phone: formData.phone,
          email: formData.email,
          website: formData.website || null,
          owner_name: formData.owner_name,
          owner_email: formData.owner_email,
          owner_password: formData.owner_password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      setBusinessId(data.business_id);
      setStep(4); // Success step
      
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Business Info', icon: Building2 },
    { num: 2, label: 'Contact', icon: MapPin },
    { num: 3, label: 'Account', icon: User },
    { num: 4, label: 'Verify', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">HomeCare AI</span>
          </Link>
          <Link href="/login" className="text-dark-300 hover:text-white text-sm">
            Already registered? Sign in
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-dark-800/30 border-b border-dark-700">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-3 ${
                  step >= s.num ? 'text-white' : 'text-dark-500'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step > s.num 
                      ? 'bg-green-500' 
                      : step === s.num 
                        ? 'bg-primary-500' 
                        : 'bg-dark-700'
                  }`}>
                    {step > s.num ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <s.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="hidden sm:block font-medium">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-4 ${
                    step > s.num ? 'bg-green-500' : 'bg-dark-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Business Information</h2>
              <p className="text-dark-400">Register your agency so you can generate proposal-ready contracts from care assessments.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="ABC Home Care Services LLC"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  DBA / Trade Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.dba_name}
                  onChange={(e) => updateField('dba_name', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="ABC Care"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Entity Type *
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => updateField('entity_type', e.target.value as EntityType)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    {ENTITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    State of Incorporation *
                  </label>
                  <select
                    value={formData.state_of_incorporation}
                    onChange={(e) => updateField('state_of_incorporation', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Select state...</option>
                    {STATES.map(state => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    SOS Registration Number *
                  </label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => updateField('registration_number', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="12345678"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Find this on your state filing documents
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    EIN / Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.ein}
                    onChange={(e) => updateField('ein', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact Info */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Contact Information</h2>
              <p className="text-dark-400">Where is your business located?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="123 Main Street, Suite 100"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="Lincoln"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    State *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Select...</option>
                    {STATES.map(state => (
                      <option key={state.code} value={state.code}>{state.code}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => updateField('zip_code', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="68508"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    placeholder="info@abccare.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="https://www.abccare.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Account Info */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Your Account</h2>
              <p className="text-dark-400">Set up the owner/admin account for your business.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => updateField('owner_name', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Your Email *
                </label>
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => updateField('owner_email', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="john@abccare.com"
                />
                <p className="text-xs text-dark-500 mt-1">
                  You'll use this email to log in
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.owner_password}
                  onChange={(e) => updateField('owner_password', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="••••••••"
                />
                <p className="text-xs text-dark-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <div className="p-4 bg-dark-800 border border-dark-600 rounded-lg">
              <p className="text-sm text-dark-300">
                By registering, you agree to our Terms of Service and Privacy Policy. 
                Your business will be verified with state records before approval.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6 py-10">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
              <p className="text-dark-400">
                Your agency registration is being processed.
              </p>
            </div>
            
            <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 text-left">
              <h3 className="font-semibold text-white mb-4">Next Steps:</h3>
              <ol className="space-y-3 text-dark-300">
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center text-sm shrink-0">1</span>
                  <span>We're verifying your business with state records</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center text-sm shrink-0">2</span>
                  <span>Upload required documents (licenses, insurance)</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center text-sm shrink-0">3</span>
                  <span>Our team will review and approve your account</span>
                </li>
              </ol>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Link
                href={`/verification-status/${businessId}`}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Upload Documents
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-10">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                step === 1
                  ? 'text-dark-500 cursor-not-allowed'
                  : 'text-white bg-dark-700 hover:bg-dark-600'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Registration
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
