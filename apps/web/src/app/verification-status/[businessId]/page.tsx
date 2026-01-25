'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Upload, 
  FileCheck, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Shield,
  RefreshCw
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BusinessStatus {
  business_id: string;
  business_name: string;
  verification_status: string;
  sos_verified: boolean;
  documents_submitted: number;
  documents_verified: number;
  documents_required: string[];
  rejection_reason: string | null;
  estimated_review_time: string | null;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  is_verified: boolean;
  uploaded_at: string;
  expiration_date: string | null;
}

const DOCUMENT_TYPES = [
  { value: 'business_license', label: 'Business License', required: true, icon: FileText },
  { value: 'home_care_license', label: 'Home Care License', required: true, icon: Shield },
  { value: 'liability_insurance', label: 'Liability Insurance', required: true, icon: Shield },
  { value: 'workers_comp', label: 'Workers Compensation', required: false, icon: FileText },
  { value: 'w9', label: 'W-9 Form', required: true, icon: FileText },
  { value: 'articles_of_incorporation', label: 'Articles of Incorporation', required: false, icon: FileText },
  { value: 'certificate_of_good_standing', label: 'Certificate of Good Standing', required: false, icon: FileText },
];

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'text-yellow-400', icon: Clock, label: 'Pending' },
  sos_verified: { color: 'text-blue-400', icon: CheckCircle2, label: 'SOS Verified' },
  documents_submitted: { color: 'text-purple-400', icon: FileCheck, label: 'Documents Submitted' },
  approved: { color: 'text-green-400', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: 'text-red-400', icon: XCircle, label: 'Rejected' },
  suspended: { color: 'text-orange-400', icon: AlertCircle, label: 'Suspended' },
};

export default function VerificationStatusPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  
  const [status, setStatus] = useState<BusinessStatus | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/business/status/${businessId}`);
      if (!response.ok) throw new Error('Failed to load status');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError('Failed to load verification status');
    }
  }, [businessId]);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/business/${businessId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (err) {
      // Documents endpoint may not exist yet
    }
  }, [businessId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadDocuments()]);
      setLoading(false);
    };
    load();
  }, [loadStatus, loadDocuments]);

  const handleUpload = async (documentType: string, file: File) => {
    setUploading(documentType);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      
      const response = await fetch(`${API_BASE}/auth/business/upload-document/${businessId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Upload failed');
      }
      
      // Refresh status and documents
      await Promise.all([loadStatus(), loadDocuments()]);
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (documentType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleUpload(documentType, file);
      }
    };
    input.click();
  };

  const getDocumentForType = (type: string) => {
    return documents.find(d => d.document_type === type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Business Not Found</h2>
          <p className="text-dark-400 mb-4">The business ID is invalid or has been removed.</p>
          <Link href="/register" className="text-primary-400 hover:underline">
            Register a new business
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[status.verification_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">HomeCare AI</span>
          </Link>
          <button
            onClick={() => { loadStatus(); loadDocuments(); }}
            className="flex items-center gap-2 text-dark-300 hover:text-white text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{status.business_name}</h1>
              <p className="text-dark-400">Business ID: {status.business_id}</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-dark-700 ${statusConfig.color}`}>
              <StatusIcon className="w-5 h-5" />
              <span className="font-medium">{statusConfig.label}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark-400">Verification Progress</span>
              <span className="text-sm text-dark-400">
                {status.verification_status === 'approved' ? '100%' : 
                 status.verification_status === 'documents_submitted' ? '75%' :
                 status.verification_status === 'sos_verified' ? '50%' : '25%'}
              </span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  status.verification_status === 'approved' ? 'w-full bg-green-500' :
                  status.verification_status === 'rejected' ? 'w-full bg-red-500' :
                  status.verification_status === 'documents_submitted' ? 'w-3/4 bg-purple-500' :
                  status.verification_status === 'sos_verified' ? 'w-1/2 bg-blue-500' :
                  'w-1/4 bg-yellow-500'
                }`}
              />
            </div>
          </div>

          {/* Status Steps */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            {[
              { key: 'registered', label: 'Registered', complete: true },
              { key: 'sos', label: 'SOS Verified', complete: status.sos_verified },
              { key: 'docs', label: 'Documents', complete: status.documents_required.length === 0 },
              { key: 'approved', label: 'Approved', complete: status.verification_status === 'approved' },
            ].map((step, idx) => (
              <div key={step.key} className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  step.complete ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-500'
                }`}>
                  {step.complete ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  )}
                </div>
                <span className={`text-xs ${step.complete ? 'text-green-400' : 'text-dark-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Rejection Reason */}
          {status.verification_status === 'rejected' && status.rejection_reason && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">Rejection Reason:</h3>
              <p className="text-dark-300">{status.rejection_reason}</p>
            </div>
          )}

          {/* Estimated Review Time */}
          {status.estimated_review_time && status.verification_status !== 'approved' && (
            <div className="mt-6 p-4 bg-dark-700 rounded-lg flex items-center gap-3">
              <Clock className="w-5 h-5 text-dark-400" />
              <span className="text-dark-300">
                Estimated review time: <strong className="text-white">{status.estimated_review_time}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Documents Section */}
        {status.verification_status !== 'approved' && (
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Required Documents</h2>
            <p className="text-dark-400 mb-6">
              Upload the following documents to complete your verification.
            </p>

            <div className="space-y-4">
              {DOCUMENT_TYPES.map((docType) => {
                const uploadedDoc = getDocumentForType(docType.value);
                const isRequired = docType.required;
                const isMissing = isRequired && status.documents_required.includes(docType.value);
                const DocIcon = docType.icon;

                return (
                  <div 
                    key={docType.value}
                    className={`p-4 rounded-lg border ${
                      uploadedDoc 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : isMissing 
                          ? 'bg-dark-700 border-yellow-500/30' 
                          : 'bg-dark-700 border-dark-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          uploadedDoc ? 'bg-green-500/20' : 'bg-dark-600'
                        }`}>
                          <DocIcon className={`w-5 h-5 ${uploadedDoc ? 'text-green-400' : 'text-dark-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {docType.label}
                            {isRequired && !uploadedDoc && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </p>
                          {uploadedDoc ? (
                            <p className="text-sm text-green-400">
                              {uploadedDoc.file_name}
                              {uploadedDoc.is_verified && ' • Verified'}
                            </p>
                          ) : (
                            <p className="text-sm text-dark-500">
                              {isRequired ? 'Required for approval' : 'Optional'}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleFileSelect(docType.value)}
                        disabled={uploading === docType.value}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          uploadedDoc
                            ? 'bg-dark-600 hover:bg-dark-500 text-white'
                            : 'bg-primary-500 hover:bg-primary-600 text-white'
                        }`}
                      >
                        {uploading === docType.value ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </>
                        ) : uploadedDoc ? (
                          <>
                            <Upload className="w-4 h-4" />
                            Replace
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-dark-700 rounded-lg">
              <p className="text-sm text-dark-400">
                <strong className="text-white">Accepted formats:</strong> PDF, JPG, PNG, DOC, DOCX
                <br />
                <strong className="text-white">Max file size:</strong> 10MB per document
              </p>
            </div>
          </div>
        )}

        {/* Approved Message */}
        {status.verification_status === 'approved' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Your Business is Approved!</h2>
            <p className="text-dark-300 mb-6">
              You can now access all features of HomeCare AI.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Sign In to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
