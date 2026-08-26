'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Users,
  ChevronRight,
  Plus,
  Filter,
  Search,
  Mic,
  CheckCircle,
  AlertCircle,
  Timer,
  Play,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api, formatLocalDate } from '@/lib/api';
import { Visit } from '@/lib/types';
import GlassShell from '@/components/GlassShell';
import UpgradeModal from '@/components/UpgradeModal';
import PalmAgent from '@/components/PalmAgent';
import { API_BASE, SAMPLE_TRANSCRIPT_TEXT } from './constants';

export default function VisitsPage() {
  const router = useRouter();
  const { token, user, isReady } = useRequireAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    total_assessments: number;
    max_allowed: number;
    can_create: boolean;
    plan_name: string;
    has_paid_plan: boolean;
    upgrade_required: boolean;
  } | null>(null);
  const isAdmin = user?.role === 'admin';

  // Filter visits by search query
  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const q = searchQuery.toLowerCase();
    return visits.filter(v =>
      (v.client?.full_name || '').toLowerCase().includes(q) ||
      (v.caregiver?.full_name || '').toLowerCase().includes(q) ||
      (v.status || '').toLowerCase().includes(q)
    );
  }, [visits, searchQuery]);

  useEffect(() => {
    if (token) {
      loadVisits();
      loadUsage();
    }
  }, [token, statusFilter]);

  const loadUsage = async () => {
    try {
      const data = await api.getUsage(token!);
      setUsage(data);
    } catch (err) {
    }
  };

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await api.getVisits(token!, { status: statusFilter || undefined });
      setVisits(response.items);
    } catch (err) {
      setError('Failed to load assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async (e: React.MouseEvent, visitId: string) => {
    e.stopPropagation(); // Prevent navigation to visit detail
    
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    
    setDeletingId(visitId);
    try {
      const response = await fetch(`${API_BASE}/visits/${visitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      
      if (response.ok || response.status === 204 || response.status === 404) {
        // Successfully deleted or already gone
        setVisits(prev => prev.filter(v => v.id !== visitId));
      } else {
        // Show the actual error
        const errorText = await response.text().catch(() => 'Unknown error');
        setError(`Failed to delete: ${response.status}. The backend API may need to redeploy.`);
      }
    } catch (err) {
      setError('Network error when deleting. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Are you sure you want to delete all ${visits.length} assessments? This cannot be undone.`)) return;
    
    setLoading(true);
    
    try {
      // Use bulk delete endpoint
      const response = await fetch(`${API_BASE}/visits`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok || response.status === 204) {
        setVisits([]);
        // Reload to confirm deletion
        await loadVisits();
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        setError(`Failed to clear assessments: ${response.status}`);
        await loadVisits();
      }
    } catch (err) {
      setError('Failed to clear assessments. Please try again.');
      await loadVisits();
    } finally {
      setLoading(false);
    }
  };

  // Admin-only function to clean up ALL orphaned visits in the system
  const handleAdminCleanup = async () => {
    if (!confirm('ADMIN: This will delete ALL visits in the entire system. Are you absolutely sure?')) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/admin/cleanup/visits`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const result = await response.json();
        setVisits([]);
        await loadVisits();
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        setError(`Admin cleanup failed: ${response.status}`);
      }
    } catch (err) {
      setError('Admin cleanup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create sample assessment demo flow
  const createSampleAssessment = async () => {
    if (!token) return;
    
    setCreatingDemo(true);
    
    try {
      // Step 1: Get or create a test client
      let clientId: string;
      
      try {
        const clientsResponse = await fetch(`${API_BASE}/clients`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const clients = await clientsResponse.json();
        
        if (clients.length > 0) {
          clientId = clients[0].id;
        } else {
          // Create a demo client
          const newClientResponse = await fetch(`${API_BASE}/clients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              full_name: 'Margaret Johnson',
              phone: '(555) 123-4567',
              address: '456 Oak Street',
              city: 'Lincoln',
              state: 'NE',
              zip_code: '68510',
              primary_diagnosis: 'Arthritis, Post-hip surgery recovery',
              status: 'active',
            }),
          });
          const newClient = await newClientResponse.json();
          clientId = newClient.id;
        }
      } catch (err) {
        throw new Error('Failed to create demo client');
      }
      
      // Step 2: Create a new visit
      const visitResponse = await fetch(`${API_BASE}/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          visit_date: formatLocalDate(new Date()),
          duration_minutes: 60,
        }),
      });
      
      if (!visitResponse.ok) {
        throw new Error('Failed to create visit');
      }
      
      const visit = await visitResponse.json();
      const visitId = visit.id;
      
      // Step 3: Import the sample transcript using text format
      const importResponse = await fetch(`${API_BASE}/visits/${visitId}/transcript/import/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text_content: SAMPLE_TRANSCRIPT_TEXT,
          format_hint: 'dialogue',
          estimated_duration_ms: 3600000, // 1 hour
          replace_existing: true,
        }),
      });
      
      if (!importResponse.ok) {
        const errorData = await importResponse.json().catch(() => ({}));
        throw new Error('Failed to import transcript');
      }
      
      // Step 4: Run billing extraction (fast - usually < 1 second)
      await fetch(`${API_BASE}/pipeline/visits/${visitId}/bill`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      // Brief wait for billing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 5: Start contract generation (takes 30-60 seconds)
      await fetch(`${API_BASE}/pipeline/visits/${visitId}/contract`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      // Navigate immediately - user can watch progress on the detail page
      router.push(`/visits/${visitId}`);
      
    } catch (err) {
      setError('Failed to create sample assessment. Please try again.');
      setCreatingDemo(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { 
          bg: 'bg-slate-100', 
          text: 'text-slate-700', 
          icon: Timer,
          label: 'Scheduled' 
        };
      case 'in_progress':
        return { 
          bg: 'bg-primary-50', 
          text: 'text-primary-400', 
          icon: Mic,
          label: 'In Progress' 
        };
      case 'pending_review':
        return { 
          bg: 'bg-accent-orange/20', 
          text: 'text-accent-orange', 
          icon: AlertCircle,
          label: 'Pending Review' 
        };
      case 'approved':
        return { 
          bg: 'bg-accent-green/20', 
          text: 'text-accent-green', 
          icon: CheckCircle,
          label: 'Approved' 
        };
      case 'exported':
        return { 
          bg: 'bg-accent-purple/20', 
          text: 'text-accent-purple', 
          icon: CheckCircle,
          label: 'Exported' 
        };
      default:
        return { 
          bg: 'bg-slate-100', 
          text: 'text-slate-600', 
          icon: Timer,
          label: status 
        };
    }
  };

  if (!isReady) {
    return (
      <GlassShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </GlassShell>
    );
  }

  return (
    <>
    <GlassShell
      title="Visits"
      subtitle="Recordings and assessments for your clients."
      action={
        <div className="flex gap-3">
              {/* Admin Cleanup Button - only for platform admins */}
              {isAdmin && (
                <button 
                  onClick={handleAdminCleanup}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Admin Cleanup
                </button>
              )}
              
              {/* Clear All Button - only show when there are visits (for regular users) */}
              {!isAdmin && visits.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#FFFFFFB8] hover:bg-red-50 text-[#4B6B66] hover:text-red-600 rounded-xl font-medium transition-colors border border-[#FFFFFFE0]"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear All
                </button>
              )}
              
              {/* Demo Flow Button */}
              <button 
                onClick={() => {
                  if (usage && usage.upgrade_required) {
                    setShowUpgradeModal(true);
                  } else {
                    createSampleAssessment();
                  }
                }}
                disabled={creatingDemo}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FFFFFFB8] text-[#10211F] rounded-xl font-semibold border border-[#FFFFFFE0] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingDemo ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Demo...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Try Demo
                  </>
                )}
              </button>
              
              <button 
                onClick={() => {
                  if (usage && usage.upgrade_required) {
                    setShowUpgradeModal(true);
                  } else {
                    router.push('/visits/new');
                  }
                }}
                className="glass-btn-primary"
              >
                <Plus className="w-5 h-5" />
                New visit
              </button>
        </div>
      }
    >
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Free Tier Usage Banner */}
          {usage && !usage.has_paid_plan && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
              usage.upgrade_required 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div>
                  <p className={`font-medium ${usage.upgrade_required ? 'text-amber-600' : 'text-slate-800'}`}>
                    {usage.upgrade_required 
                      ? 'Free Plan Limit Reached' 
                      : `Free Plan · ${usage.total_assessments}/${usage.max_allowed} assessments used`
                    }
                  </p>
                  <p className="text-slate-500 text-sm">
                    {usage.upgrade_required 
                      ? 'Upgrade to a paid plan to create more assessments and unlock all features.'
                      : `You have ${usage.max_allowed - usage.total_assessments} free assessment${usage.max_allowed - usage.total_assessments === 1 ? '' : 's'} remaining.`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {Array.from({ length: usage.max_allowed }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < usage.total_assessments 
                          ? usage.upgrade_required ? 'bg-amber-400' : 'bg-primary-400' 
                          : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
                {usage.upgrade_required && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition whitespace-nowrap"
                  >
                    Upgrade Now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Visits', value: visits.length, textClass: 'text-accent-primary' },
              { label: 'Pending Review', value: visits.filter(v => v.status === 'pending_review').length, textClass: 'text-accent-orange' },
              { label: 'Approved', value: visits.filter(v => v.status === 'approved').length, textClass: 'text-accent-green' },
              { label: 'Today', value: visits.filter(v => v.scheduled_start && formatLocalDate(new Date(v.scheduled_start)) === formatLocalDate(new Date())).length, textClass: 'text-accent-cyan' },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-3.5 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <p className="text-slate-500 text-xs mb-0.5">{stat.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${stat.textClass}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search visits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark w-full pl-10 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-dark min-w-[160px] h-9 text-sm"
              >
                <option value="">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="exported">Exported</option>
              </select>
            </div>
          </div>

          {/* Visits List */}
          {loading ? (
            <div className="glass-card p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading assessments...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
              <div className="glass-card p-8 text-center border border-primary-200/60 bg-primary-50/30">
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">No assessments yet</h3>
                <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                  Create a new assessment or try a sample to see how PalmCare turns a visit into a contract.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={createSampleAssessment}
                    disabled={creatingDemo}
                    className="glass-btn-primary h-9 text-sm disabled:opacity-50"
                  >
                    {creatingDemo ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                    ) : (
                      <><Play className="w-4 h-4" /> Try sample</>
                    )}
                  </button>
                  <button
                    onClick={() => router.push('/visits/new')}
                    className="h-9 px-4 rounded-xl text-sm font-semibold text-primary-700 bg-white border border-primary-200 hover:bg-primary-50 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    New Assessment
                  </button>
                </div>
              </div>
          ) : (
            <div className="space-y-2">
              {filteredVisits.map((visit) => {
                const statusConfig = getStatusConfig(visit.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={visit.id}
                    onClick={() => router.push(`/visits/${visit.id}`)}
                    className="glass-card p-3.5 cursor-pointer group hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                        <StatusIcon className={`w-6 h-6 ${statusConfig.text}`} />
                      </div>

                      {/* Visit info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-slate-900">
                            {visit.client?.full_name || 'Unknown Client'}
                          </h3>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-5 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {visit.scheduled_start 
                              ? format(new Date(visit.scheduled_start), 'MMM d, yyyy')
                              : 'Not scheduled'
                            }
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {visit.scheduled_start 
                              ? format(new Date(visit.scheduled_start), 'h:mm a')
                              : '-'
                            }
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            {visit.caregiver?.full_name || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteVisit(e, visit.id)}
                        disabled={deletingId === visit.id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete assessment"
                      >
                        {deletingId === visit.id ? (
                          <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5 text-slate-500 hover:text-red-600" />
                        )}
                      </button>
                      
                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </GlassShell>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        usedCount={usage?.total_assessments || 0}
        maxCount={usage?.max_allowed || 2}
      />

      <PalmAgent />
    </>
  );
}
