'use client';

import { getStoredToken, useAuth } from '@/lib/auth';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, Clock, CheckCircle, XCircle, FileText, 
  ChevronRight, Search, Filter, RefreshCw, Loader2,
  Eye, Download, Shield, AlertTriangle, User, ExternalLink
} from 'lucide-react';

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
  pending: 'bg-yellow-500/20 text-yellow-400',
  sos_verified: 'bg-blue-500/20 text-blue-400',
  documents_submitted: 'bg-purple-500/20 text-purple-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  suspended: 'bg-orange-500/20 text-orange-400',
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
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check if user is platform admin
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          // Only platform admins (email ending in @homecare.ai) can access
          if (user.role === 'admin' && user.email.endsWith('@homecare.ai')) {
            setIsAuthorized(true);
          } else {
            router.push('/visits');
          }
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

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
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/admin/businesses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedBusiness(data);
      }
    } catch (err) {
      console.error('Failed to fetch business detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBusiness) return;
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Platform Admin Access</p>
            <p className="text-blue-300/70 text-sm mt-1">
              This dashboard shows business registration data only. Client/patient data is not accessible 
              from this view in compliance with HIPAA regulations. Each business manages their own client data.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Business Approvals</h1>
            <p className="text-dark-400 mt-1">Review and approve business registrations</p>
          </div>
          <button
            onClick={() => { fetchStats(); fetchBusinesses(); }}
            className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition"
          >
            <RefreshCw className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
              <p className="text-dark-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total_businesses}</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
              <p className="text-yellow-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending_approval}</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
              <p className="text-green-400 text-sm">Approved</p>
              <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
              <p className="text-red-400 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <p className="text-orange-400 text-sm">Suspended</p>
              <p className="text-2xl font-bold text-orange-400">{stats.suspended}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-dark-800 rounded-lg p-1">
            {['pending', 'approved', 'rejected', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchBusinesses()}
              placeholder="Search businesses..."
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Business List */}
          <div className="col-span-2 bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-medium text-white">Applications ({businesses.length})</h2>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">No businesses found</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-700">
                {businesses.map(business => (
                  <div
                    key={business.id}
                    onClick={() => fetchBusinessDetail(business.id)}
                    className={`p-4 hover:bg-dark-700/50 cursor-pointer transition ${
                      selectedBusiness?.id === business.id ? 'bg-dark-700/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{business.name}</p>
                        <p className="text-sm text-dark-400">{business.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[business.verification_status]}`}>
                          {STATUS_LABELS[business.verification_status]}
                        </span>
                        <ChevronRight className="w-5 h-5 text-dark-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
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
          <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            {detailLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : selectedBusiness ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-dark-700">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium text-white">{selectedBusiness.name}</h2>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[selectedBusiness.verification_status]}`}>
                      {STATUS_LABELS[selectedBusiness.verification_status]}
                    </span>
                  </div>
                  {selectedBusiness.dba_name && (
                    <p className="text-sm text-dark-400">DBA: {selectedBusiness.dba_name}</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Business Info */}
                  <div>
                    <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wide mb-2">Business Info</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-400">Type</span>
                        <span className="text-white">{selectedBusiness.entity_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">State</span>
                        <span className="text-white">{selectedBusiness.state_of_incorporation}</span>
                      </div>
                      {selectedBusiness.registration_number && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Reg #</span>
                          <span className="text-white">{selectedBusiness.registration_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-dark-400">Email</span>
                        <span className="text-white">{selectedBusiness.email}</span>
                      </div>
                      {selectedBusiness.phone && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Phone</span>
                          <span className="text-white">{selectedBusiness.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SOS Verification */}
                  {selectedBusiness.sos_verification_data && (
                    <div>
                      <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wide mb-2">SOS Verification</h3>
                      <div className={`p-3 rounded-lg ${selectedBusiness.sos_verification_data.found ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                        {selectedBusiness.sos_verification_data.found ? (
                          <div className="text-sm">
                            <p className="text-green-400 font-medium flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" /> Verified
                            </p>
                            <p className="text-dark-300 mt-1">Status: {selectedBusiness.sos_verification_data.status}</p>
                          </div>
                        ) : (
                          <p className="text-yellow-400 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Not found in state records
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div>
                    <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wide mb-2">Documents ({selectedBusiness.documents.length})</h3>
                    <div className="space-y-2">
                      {selectedBusiness.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-dark-700 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-dark-400" />
                            <div>
                              <p className="text-sm text-white">{doc.document_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-dark-400">{doc.file_name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadDocument(doc.id)}
                            className="p-1.5 hover:bg-dark-600 rounded transition"
                          >
                            <Download className="w-4 h-4 text-dark-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Owner */}
                  {selectedBusiness.owner && (
                    <div>
                      <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wide mb-2">Owner</h3>
                      <div className="flex items-center gap-3 p-2 bg-dark-700 rounded-lg">
                        <User className="w-8 h-8 text-dark-400 p-1.5 bg-dark-600 rounded-full" />
                        <div>
                          <p className="text-sm text-white">{selectedBusiness.owner.full_name}</p>
                          <p className="text-xs text-dark-400">{selectedBusiness.owner.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedBusiness.verification_status !== 'approved' && 
                 selectedBusiness.verification_status !== 'rejected' && (
                  <div className="p-4 border-t border-dark-700 flex gap-3">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
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
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-dark-400">
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
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Reject Application</h3>
            <p className="text-dark-400 mb-4">
              Please provide a reason for rejecting this business application.
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-32 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                className="flex-1 px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"
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
    </div>
  );
}
