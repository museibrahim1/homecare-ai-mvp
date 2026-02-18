'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FormData {
  business_name: string;
  owner_name: string;
  email: string;
  password: string;
  phone: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    business_name: '',
    owner_name: '',
    email: '',
    password: '',
    phone: '',
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.business_name) {
      setError('Business name is required');
      return;
    }
    if (!formData.owner_name) {
      setError('Your name is required');
      return;
    }
    if (!formData.email) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/auth/business/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.business_name,
          owner_name: formData.owner_name,
          owner_email: formData.email,
          owner_password: formData.password,
          phone: formData.phone || '',
          // Default values for simplified signup
          entity_type: 'llc',
          state_of_incorporation: 'CA',
          registration_number: 'PENDING',
          address: 'TBD',
          city: 'TBD',
          state: 'CA',
          zip_code: '00000',
          email: formData.email,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle different error formats from FastAPI
        let errorMessage = 'Registration failed';
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Validation errors come as array of objects
          errorMessage = data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (data.detail?.msg) {
          errorMessage = data.detail.msg;
        } else if (data.message) {
          errorMessage = data.message;
        }
        throw new Error(errorMessage);
      }
      
      setSuccess(true);
      
      // Auto-redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (err: any) {
      const message = typeof err === 'string' ? err : (err?.message || 'Registration failed. Please try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to PalmCare AI!</h1>
          <p className="text-dark-300 mb-6">Your account has been created. Redirecting to login...</p>
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-dark-800 to-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(6,182,212,0.1),transparent_50%)]" />
        
        <div className="relative z-10 p-12 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">PalmCare AI</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Start managing your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan">
              care business today
            </span>
          </h1>
          
          <p className="text-dark-300 text-lg mb-8">
            Join thousands of home care agencies using AI to streamline assessments, 
            generate contracts, and manage clients efficiently.
          </p>
          
          <div className="space-y-4">
            {[
              'AI-powered visit assessments',
              'Auto-generate contracts & notes',
              'Client & caregiver management',
              'Billing & scheduling tools',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-dark-200">
                <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">PalmCare AI</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
            <p className="text-dark-400">Get started in less than a minute</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reg-business" className="block text-sm font-medium text-dark-300 mb-2">
                Business Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="reg-business"
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => updateField('business_name', e.target.value)}
                  className="input-dark w-full pl-12"
                  placeholder="ABC Home Care"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-dark-300 mb-2">
                Your Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="reg-name"
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => updateField('owner_name', e.target.value)}
                  className="input-dark w-full pl-12"
                  placeholder="John Smith"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-dark-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="input-dark w-full pl-12"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-dark-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="reg-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="input-dark w-full pl-12"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-dark-500 mt-1.5">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-dark-300 mb-2">
                Phone <span className="text-dark-500">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="input-dark w-full pl-12"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>

          <p className="text-center text-dark-500 text-xs mt-8">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
