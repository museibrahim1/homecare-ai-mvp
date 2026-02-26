'use client';

import { getStoredToken } from '@/lib/auth';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  FileCheck,
  Shield,
  RefreshCw,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Business {
  id: string;
  name: string;
  email: string;
  state_of_incorporation: string | null;
  verification_status: string;
  documents_count: number;
  created_at: string;
}

interface Stats {
  total_businesses: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  suspended: number;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  pending: { color: 'text-amber-600', bgColor: 'bg-amber-50', icon: Clock, label: 'Pending' },
  sos_verified: { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: CheckCircle2, label: 'SOS Verified' },
  documents_submitted: { color: 'text-purple-600', bgColor: 'bg-purple-50', icon: FileCheck, label: 'Under Review' },
  approved: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: CheckCircle2, label: 'Approved' },
  rejected: { color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle, label: 'Rejected' },
  suspended: { color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertCircle, label: 'Suspended' },
};

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const loadData = useCallback(async () => {
    const token = getStoredToken();
    
    try {
      // Load stats
      const statsRes = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Load businesses
      let url = `${API_BASE}/admin/businesses`;
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (params.toString()) url += `?${params.toString()}`;

      const bizRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bizRes.ok) {
        const data = await bizRes.json();
        setBusinesses(data);
      } else {
        const errorText = await bizRes.text();
        console.error('[Admin] Failed to load businesses:', bizRes.status, errorText);
      }
    } catch (err) {
      console.error('[Admin] Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const paginatedBusinesses = businesses.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      
      <main className="flex-1 p-8">
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
              <h1 className="text-2xl font-bold text-slate-900">All Businesses</h1>
              <p className="text-slate-500">View and manage all registered businesses</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-red-600 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-300 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.total_businesses}</p>
                  <p className="text-sm text-slate-500">Total</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending_approval}</p>
                  <p className="text-sm text-slate-500">Pending</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                  <p className="text-sm text-slate-500">Approved</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  <p className="text-sm text-slate-500">Rejected</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{stats.suspended}</p>
                  <p className="text-sm text-slate-500">Suspended</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search businesses..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="sos_verified">SOS Verified</option>
                <option value="documents_submitted">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Business List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No businesses found</h3>
              <p className="text-slate-500">
                {statusFilter || search ? 'Try adjusting your filters' : 'No businesses have registered yet'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Business</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">State</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Documents</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Registered</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedBusinesses.map((business) => {
                  const statusConfig = STATUS_CONFIG[business.verification_status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr key={business.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{business.name}</p>
                          <p className="text-sm text-slate-500">{business.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{business.state_of_incorporation || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${statusConfig.bgColor} ${statusConfig.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{business.documents_count} uploaded</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 text-sm">{formatDate(business.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/businesses/${business.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-900 text-sm rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {businesses.length > pageSize && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-slate-500 text-sm">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, businesses.length)} of {businesses.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <span className="text-slate-500 px-3 text-sm">Page {page + 1}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * pageSize >= businesses.length}
                  className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
