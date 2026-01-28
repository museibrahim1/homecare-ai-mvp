'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  CheckCircle, Clock, XCircle, AlertCircle, FileText, 
  RefreshCw, ArrowLeft, Loader2, Shield
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface StatusData {
  business_id: string;
  business_name: string;
  verification_status: string;
  sos_verified: boolean;
  documents_submitted: number;
  documents_verified: number;
  documents_required: string[];
  rejection_reason?: string;
  estimated_review_time?: string;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string; message: string }> = {
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    label: 'Pending',
    message: 'Please complete document upload to proceed with verification.',
  },
  sos_verified: {
    icon: Shield,
    color: 'text-blue-400',
    label: 'State Verified',
    message: 'Your business has been verified with state records. Please upload required documents.',
  },
  documents_submitted: {
    icon: FileText,
    color: 'text-primary-400',
    label: 'Under Review',
    message: 'Your documents are being reviewed. This typically takes 1-2 business days.',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-green-400',
    label: 'Approved',
    message: 'Congratulations! Your business has been approved. You can now log in.',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-400',
    label: 'Rejected',
    message: 'Your registration was not approved. Please see the reason below.',
  },
  suspended: {
    icon: AlertCircle,
    color: 'text-orange-400',
    label: 'Suspended',
    message: 'Your account has been suspended. Please contact support.',
  },
};

function StatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);

  const fetchStatus = async () => {
    if (!businessId) {
      setError('No business ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/business/status/${businessId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError('Could not load registration status. Please check your business ID.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [businessId]);

  const statusConfig = status ? STATUS_CONFIG[status.verification_status] || STATUS_CONFIG.pending : null;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-8">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <button
            onClick={() => router.push('/register')}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Registration
          </button>
        </div>

        <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
          <div className="p-6 border-b border-dark-700">
            <h1 className="text-2xl font-bold text-white">Registration Status</h1>
            <p className="text-dark-400 mt-1">Track your business verification progress</p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-dark-300">{error}</p>
                <button
                  onClick={fetchStatus}
                  className="mt-4 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
                >
                  Try Again
                </button>
              </div>
            ) : status ? (
              <div className="space-y-6">
                {/* Status Badge */}
                <div className={`p-6 rounded-xl ${
                  status.verification_status === 'approved' ? 'bg-green-500/10' :
                  status.verification_status === 'rejected' ? 'bg-red-500/10' :
                  'bg-dark-700'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      status.verification_status === 'approved' ? 'bg-green-500/20' :
                      status.verification_status === 'rejected' ? 'bg-red-500/20' :
                      'bg-dark-600'
                    }`}>
                      <StatusIcon className={`w-8 h-8 ${statusConfig?.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-dark-400">Status</p>
                      <p className={`text-2xl font-bold ${statusConfig?.color}`}>
                        {statusConfig?.label}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-dark-300">{statusConfig?.message}</p>
                </div>

                {/* Business Info */}
                <div className="p-4 bg-dark-700 rounded-xl">
                  <p className="text-sm text-dark-400">Business Name</p>
                  <p className="text-white font-medium">{status.business_name}</p>
                </div>

                {/* Verification Steps */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wide">
                    Verification Progress
                  </h3>
                  
                  <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg">
                    {status.sos_verified ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-dark-400" />
                    )}
                    <span className={status.sos_verified ? 'text-white' : 'text-dark-400'}>
                      State Registration Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg">
                    {status.documents_submitted > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-dark-400" />
                    )}
                    <span className={status.documents_submitted > 0 ? 'text-white' : 'text-dark-400'}>
                      Documents Uploaded ({status.documents_submitted} / 3)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg">
                    {status.verification_status === 'approved' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-dark-400" />
                    )}
                    <span className={status.verification_status === 'approved' ? 'text-white' : 'text-dark-400'}>
                      Admin Review Complete
                    </span>
                  </div>
                </div>

                {/* Missing Documents */}
                {status.documents_required.length > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <p className="text-yellow-400 font-medium mb-2">Missing Documents</p>
                    <ul className="space-y-1">
                      {status.documents_required.map(doc => (
                        <li key={doc} className="text-dark-300 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                          {doc.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rejection Reason */}
                {status.rejection_reason && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-400 font-medium mb-2">Rejection Reason</p>
                    <p className="text-dark-300">{status.rejection_reason}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={fetchStatus}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Status
                  </button>
                  
                  {status.verification_status === 'approved' && (
                    <button
                      onClick={() => router.push('/login')}
                      className="btn-primary flex-1"
                    >
                      Go to Login
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegistrationStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
