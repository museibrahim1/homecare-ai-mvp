'use client';

import { getStoredToken, useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Clock, CheckCircle, XCircle, FileText, 
  ChevronRight, Search, Filter, RefreshCw, Loader2,
  Eye, Download, Shield, AlertTriangle, User, ExternalLink, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Business {
  id: string;
  name: string;
  email: string;
  state_of_incorporation: string;
  verification_status: string;
  documents_count: number;
  created_at: string;
}

interface BusinessDetail {
  id: string;
  name: string;
  dba_name?: string;
  entity_type: string;
  state_of_incorporation: string;
  registration_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email: string;
  website?: string;
  verification_status: string;
  sos_verification_data?: any;
  sos_verified_at?: string;
  documents: Document[];
  owner?: Owner;
  created_at: string;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_size?: string;
  uploaded_at: string;
  is_verified: boolean;
  expiration_date?: string;
}

interface Owner {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Stats {
  total_businesses: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  suspended: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  sos_verified: 'bg-blue-50 text-blue-600',
  documents_submitted: 'bg-purple-50 text-purple-600',
  approved: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-red-50 text-red-600',
  suspended: 'bg-orange-50 text-orange-600',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  sos_verified: 'SOS Verified',
  documents_submitted: 'Docs Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export default function AdminApprovalsPage() {
  const router = useRouter();
  const { token, user, isLoading: authLoading, hydrated } = useAuth();
  const [loading, setLoading] = useState(true);

  // Check if user is admin (@palmtai.com)
  const isAdmin = user?.role === 'admin' && 
    (user?.email?.endsWith('@palmtai.com'));

  // Check authorization on mount
  useEffect(() => {
    if (!hydrated || authLoading) return;
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [token, user, hydrated, authLoading, router, isAdmin]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      let url = `${API_BASE}/admin/businesses`;
      if (filter === 'pending') {
        url = `${API_BASE}/admin/businesses/pending`;
      } else if (filter !== 'all') {
        url = `${API_BASE}/admin/businesses?status=${filter}`;
      }
      if (search) {
        url += url.includes('?') ? `&search=${search}` : `?search=${search}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data);
      }
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/admin/businesses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedBusiness(data);
        setDetailError(null);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to fetch business detail:', response.status, errorData);
        setDetailError(`Error ${response.status}: ${errorData.detail || 'Failed to load business details'}`);
        setSelectedBusiness(null);
      }
    } catch (err) {
      console.error('Failed to fetch business detail:', err);
      setDetailError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSelectedBusiness(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBusiness) return;
    if (!confirm(`Are you sure you want to approve "${selectedBusiness.name}"? This will grant them full platform access.`)) return;
    setActionLoading(true);
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/admin/businesses/${selectedBusiness.id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });
      if (response.ok) {
        setSelectedBusiness(null);
        fetchBusinesses();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBusiness || !rejectionReason) return;
    setActionLoading(true);
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/admin/businesses/${selectedBusiness.id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: false, rejection_reason: rejectionReason }),
      });
      if (response.ok) {
        setSelectedBusiness(null);
        setShowRejectModal(false);
        setRejectionReason('');
        fetchBusinesses();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const downloadDocument = async (docId: string) => {
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/admin/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        window.open(data.download_url, '_blank');
      }
    } catch (err) {
      console.error('Failed to get download URL:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBusinesses();
  }, [filter]);

  // Only show loading during initial hydration
  if (!hydrated || authLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </main>
      </div>
    );
  }

  // If not admin, don't render (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-600 font-medium">Platform Admin Access</p>
            <p className="text-blue-500 text-sm mt-1">
              This dashboard shows business registration data only. Client/patient data is not accessible 
              from this view in compliance with HIPAA regulations. Each business manages their own client data.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Business Approvals</h1>
              <p className="text-slate-500 mt-1">Review and approve business registrations</p>
            </div>
          </div>
          <button
            onClick={() => { fetchStats(); fetchBusinesses(); }}
            className="p-2 bg-white rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_businesses}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-amber-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending_approval}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-emerald-600 text-sm">Approved</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-red-600 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-orange-600 text-sm">Suspended</p>
              <p className="text-2xl font-bold text-orange-600">{stats.suspended}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-white rounded-lg p-1">
            {['pending', 'approved', 'rejected', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchBusinesses()}
              placeholder="Search businesses..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Business List */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-medium text-slate-900">Applications ({businesses.length})</h2>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No businesses found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {businesses.map(business => (
                  <div
                    key={business.id}
                    onClick={() => fetchBusinessDetail(business.id)}
                    className={`p-4 hover:bg-slate-100 cursor-pointer transition ${
                      selectedBusiness?.id === business.id ? 'bg-slate-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{business.name}</p>
                        <p className="text-sm text-slate-500">{business.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[business.verification_status]}`}>
                          {STATUS_LABELS[business.verification_status]}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>{business.state_of_incorporation}</span>
                      <span>{business.documents_count} docs</span>
                      <span>{new Date(business.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {detailLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : selectedBusiness ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium text-slate-900">{selectedBusiness.name}</h2>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[selectedBusiness.verification_status]}`}>
                      {STATUS_LABELS[selectedBusiness.verification_status]}
                    </span>
                  </div>
                  {selectedBusiness.dba_name && (
                    <p className="text-sm text-slate-500">DBA: {selectedBusiness.dba_name}</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Business Info */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Business Info</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Type</span>
                        <span className="text-slate-900">{selectedBusiness.entity_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">State</span>
                        <span className="text-slate-900">{selectedBusiness.state_of_incorporation}</span>
                      </div>
                      {selectedBusiness.registration_number && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Reg #</span>
                          <span className="text-slate-900">{selectedBusiness.registration_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email</span>
                        <span className="text-slate-900">{selectedBusiness.email}</span>
                      </div>
                      {selectedBusiness.phone && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phone</span>
                          <span className="text-slate-900">{selectedBusiness.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SOS Verification */}
                  {selectedBusiness.sos_verification_data && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">SOS Verification</h3>
                      <div className={`p-3 rounded-lg ${selectedBusiness.sos_verification_data.found ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        {selectedBusiness.sos_verification_data.found ? (
                          <div className="text-sm">
                            <p className="text-emerald-600 font-medium flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" /> Verified
                            </p>
                            <p className="text-slate-600 mt-1">Status: {selectedBusiness.sos_verification_data.status}</p>
                          </div>
                        ) : (
                          <p className="text-amber-600 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Not found in state records
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Documents ({selectedBusiness.documents.length})</h3>
                    <div className="space-y-2">
                      {selectedBusiness.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <div>
                              <p className="text-sm text-slate-500">{doc.document_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-500">{doc.file_name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadDocument(doc.id)}
                            className="p-1.5 hover:bg-slate-100 rounded transition"
                          >
                            <Download className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Owner */}
                  {selectedBusiness.owner && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">Owner</h3>
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        <User className="w-8 h-8 text-slate-500 p-1.5 bg-slate-100 rounded-full" />
                        <div>
                          <p className="text-sm text-slate-500">{selectedBusiness.owner.full_name}</p>
                          <p className="text-xs text-slate-500">{selectedBusiness.owner.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedBusiness.verification_status !== 'approved' && 
                 selectedBusiness.verification_status !== 'rejected' && (
                  <div className="p-4 border-t border-slate-200 flex gap-3">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center justify-center h-96 text-red-600 p-4">
                <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-center">{detailError}</p>
                <button 
                  onClick={() => setDetailError(null)}
                  className="mt-4 px-4 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-sm"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Eye className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a business to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reject Application</h3>
            <p className="text-slate-500 mb-4">
              Please provide a reason for rejecting this business application.
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                className="flex-1 px-4 py-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason || actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
