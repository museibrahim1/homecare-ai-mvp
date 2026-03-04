'use client';

import { getStoredToken } from '@/lib/auth';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Download,
  User,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Shield,
  Loader2,
  ExternalLink
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BusinessDetail {
  id: string;
  name: string;
  dba_name: string | null;
  entity_type: string;
  state_of_incorporation: string;
  registration_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string;
  website: string | null;
  verification_status: string;
  sos_verification_data: any;
  sos_verified_at: string | null;
  documents: Document[];
  owner: Owner | null;
  created_at: string;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_size: string;
  uploaded_at: string;
  is_verified: boolean;
  verified_at: string | null;
  expiration_date: string | null;
}

interface Owner {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  last_login: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  pending: { color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock, label: 'Pending' },
  sos_verified: { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: CheckCircle2, label: 'SOS Verified' },
  documents_submitted: { color: 'text-purple-600', bgColor: 'bg-purple-50', icon: FileText, label: 'Under Review' },
  approved: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle, label: 'Rejected' },
  suspended: { color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertCircle, label: 'Suspended' },
};

const DOCUMENT_LABELS: Record<string, string> = {
  business_license: 'Business License',
  home_care_license: 'Home Care License',
  liability_insurance: 'Liability Insurance',
  workers_comp: 'Workers Compensation',
  w9: 'W-9 Form',
  articles_of_incorporation: 'Articles of Incorporation',
  certificate_of_good_standing: 'Certificate of Good Standing',
  other: 'Other Document',
};

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadBusiness = useCallback(async () => {
    const token = getStoredToken();
    
    try {
      const response = await fetch(`${API_BASE}/admin/businesses/${businessId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to load business');
      
      setBusiness(await response.json());
    } catch (err) {
      console.error('Failed to load business:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this business?')) return;
    
    setActionLoading(true);
    const token = getStoredToken();
    
    try {
      const response = await fetch(`${API_BASE}/admin/businesses/${businessId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });
      
      if (!response.ok) throw new Error('Failed to approve');
      
      await loadBusiness();
      alert('Business approved successfully!');
    } catch (err) {
      alert('Failed to approve business');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    setActionLoading(true);
    const token = getStoredToken();
    
    try {
      const response = await fetch(`${API_BASE}/admin/businesses/${businessId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: false, rejection_reason: rejectionReason }),
      });
      
      if (!response.ok) throw new Error('Failed to reject');
      
      setShowRejectModal(false);
      await loadBusiness();
      alert('Business rejected');
    } catch (err) {
      alert('Failed to reject business');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    const token = getStoredToken();
    
    try {
      const response = await fetch(`${API_BASE}/admin/documents/${documentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to get download URL');
      
      const data = await response.json();
      window.open(data.download_url, '_blank');
    } catch (err) {
      alert('Failed to download document');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </main>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Business Not Found</h2>
            <Link href="/admin/businesses" className="text-primary-400 hover:underline">
              Back to list
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[business.verification_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const canApprove = ['pending', 'sos_verified', 'documents_submitted'].includes(business.verification_status);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/businesses"
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
              {business.dba_name && (
                <p className="text-slate-500">DBA: {business.dba_name}</p>
              )}
            </div>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
            <StatusIcon className="w-5 h-5" />
            <span className="font-medium">{statusConfig.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="col-span-2 space-y-6">
            {/* Business Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-400" />
                Business Information
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Entity Type</p>
                  <p className="text-slate-900 capitalize">{business.entity_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">State of Incorporation</p>
                  <p className="text-slate-900">{business.state_of_incorporation}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Registration Number</p>
                  <p className="text-slate-900 font-mono">{business.registration_number || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Registered</p>
                  <p className="text-slate-900">{formatDate(business.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-400" />
                Contact Information
              </h2>
              
              <div className="space-y-3">
                {business.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-slate-900">{business.address}</p>
                      <p className="text-slate-500">
                        {business.city}, {business.state} {business.zip_code}
                      </p>
                    </div>
                  </div>
                )}
                
                {business.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-500" />
                    <p className="text-slate-900">{business.phone}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-500" />
                  <a href={`mailto:${business.email}`} className="text-primary-400 hover:underline">
                    {business.email}
                  </a>
                </div>
                
                {business.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-slate-500" />
                    <a 
                      href={business.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:underline flex items-center gap-1"
                    >
                      {business.website}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-400" />
                Uploaded Documents ({business.documents.length})
              </h2>
              
              {business.documents.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No documents uploaded yet</p>
              ) : (
                <div className="space-y-3">
                  {business.documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          doc.is_verified ? 'bg-emerald-50' : 'bg-slate-100'
                        }`}>
                          <FileText className={`w-5 h-5 ${doc.is_verified ? 'text-emerald-600' : 'text-slate-500'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {DOCUMENT_LABELS[doc.document_type] || doc.document_type}
                          </p>
                          <p className="text-sm text-slate-500">
                            {doc.file_name} • {doc.file_size}
                            {doc.expiration_date && ` • Expires: ${formatDate(doc.expiration_date)}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {doc.is_verified && (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs rounded">
                            Verified
                          </span>
                        )}
                        <button
                          onClick={() => handleDownloadDocument(doc.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SOS Verification Data */}
            {business.sos_verification_data && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-400" />
                  SOS Verification Data
                </h2>
                
                <pre className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 overflow-auto">
                  {JSON.stringify(business.sos_verification_data, null, 2)}
                </pre>
                
                {business.sos_verified_at && (
                  <p className="text-sm text-slate-500 mt-2">
                    Verified on {formatDate(business.sos_verified_at)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Owner Info */}
            {business.owner && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-400" />
                  Business Owner
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="text-slate-900">{business.owner.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="text-slate-900">{business.owner.email}</p>
                    {business.owner.email_verified && (
                      <span className="text-xs text-emerald-600">Verified</span>
                    )}
                  </div>
                  {business.owner.phone && (
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="text-slate-900">{business.owner.phone}</p>
                    </div>
                  )}
                  {business.owner.last_login && (
                    <div>
                      <p className="text-sm text-slate-500">Last Login</p>
                      <p className="text-slate-900">{formatDate(business.owner.last_login)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {canApprove && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Approve Business
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Application
                  </button>
                </div>
                
                <p className="text-xs text-slate-400 mt-4">
                  Approving will send a confirmation email to the business owner.
                </p>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-400" />
                Timeline
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm text-slate-500">Registered</p>
                    <p className="text-xs text-slate-500">{formatDate(business.created_at)}</p>
                  </div>
                </div>
                
                {business.sos_verified_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm text-slate-500">SOS Verified</p>
                      <p className="text-xs text-slate-500">{formatDate(business.sos_verified_at)}</p>
                    </div>
                  </div>
                )}
                
                {business.documents.length > 0 && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-500" />
                    <div>
                      <p className="text-sm text-slate-500">Documents Uploaded</p>
                      <p className="text-xs text-slate-500">{business.documents.length} documents</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Reject Application</h2>
            
            <p className="text-slate-500 mb-4">
              Please provide a reason for rejection. This will be shared with the business owner.
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-red-500 resize-none"
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
