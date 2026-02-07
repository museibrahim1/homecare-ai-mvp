'use client';

import { useEffect, useState } from 'react';
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
  Sparkles,
  Play,
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Visit } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import UpgradeModal from '@/components/UpgradeModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Sample transcript for demo - formatted as dialogue text
const SAMPLE_TRANSCRIPT_TEXT = `Caregiver: Hello Mrs. Johnson, how are you feeling today? I'm here to help you with your morning routine and assess your care needs for home care services.

Client: Good morning! I've been having some trouble with my mobility lately. My knees have been bothering me from arthritis and I need help getting around the house safely.

Caregiver: I understand. Let me help you take your medication first. Here are your morning pills - the blood pressure medication, the Metformin for your diabetes, and the pain medication for your arthritis. I'll make sure you take these every morning.

Client: Thank you dear. I sometimes forget to take them on my own. I also need help with bathing and getting dressed in the morning. It's been very difficult since my hip replacement surgery last month.

Caregiver: Of course, personal care assistance is something we specialize in. Let me help you get cleaned up and dressed comfortably. I'll assist you to the bathroom and make sure you're safe during your shower.

Client: I really appreciate that. The bathroom can be slippery and I'm afraid of falling.

Caregiver: We'll take it slow and steady. Now that you're dressed, let me prepare some breakfast for you. Since you mentioned you're diabetic, I'll make sure to prepare something appropriate - perhaps some scrambled eggs with vegetables and whole wheat toast?

Client: That sounds wonderful. My doctor said I need to watch my carbs and sugar intake carefully.

Caregiver: I'll keep that in mind for all your meals. I can also help with meal planning for the week and make sure your groceries include diabetic-friendly options.

Client: I've been feeling a bit lonely lately too. My daughter Susan visits on weekends but during the week it's just me and the cat. Some companionship would be really nice.

Caregiver: Companionship is an important part of what we provide. We can chat, play cards, go for short walks in the garden, or just keep you company while you watch your shows.

Client: Oh that would be lovely! I do miss having someone to talk to.

Caregiver: Now let me check your blood pressure and vitals. Please sit still while I put the cuff on. Your reading is 138 over 88, which is slightly elevated. Your pulse is 78, and your temperature is normal at 98.4 degrees. I'll make a note of this for your care records.

Client: Is the blood pressure concerning? 

Caregiver: It's a bit high but not dangerous. Make sure to take your blood pressure medication consistently and try to reduce salt in your diet. I'll monitor it during each visit.

Client: Thank you for explaining that. What about the housekeeping? I can't keep up with cleaning anymore.

Caregiver: I noticed the kitchen could use some tidying up. I'll do some light housekeeping - dishes, wiping counters, vacuuming the living room, and making sure your space is clean and safe. I'll also take out the trash and do some light laundry if you'd like.

Client: That would be such a relief. I used to keep such a tidy house but now I just can't manage.

Caregiver: Don't worry, that's what we're here for. Based on everything we've discussed today, I'll document your care needs. You'll benefit from assistance with personal care including bathing and dressing, medication reminders, diabetic-friendly meal preparation, light housekeeping, and companionship. Would visits of about 4 hours a day, 5 days a week work well for your schedule?

Client: Yes, that sounds perfect. Probably mornings would be best - around 8 or 9 AM when I need the most help getting started with my day.

Caregiver: I'll make a note of that preference. Is there anything else I should know about - any allergies, emergency contacts, or specific concerns?

Client: I'm allergic to penicillin. My daughter Susan is my emergency contact - her number is 555-0123. And please be careful with my cat Whiskers, he likes to dart out doors.

Caregiver: Got it - penicillin allergy, Susan at 555-0123, and we'll watch out for Whiskers. I have all the information I need. Your care plan will include personal care assistance, medication management, meal preparation with diabetic considerations, light housekeeping, vital signs monitoring, and companionship. We'll make sure you're safe, comfortable, and well cared for.

Client: Thank you so much. This gives me such peace of mind.`;

export default function VisitsPage() {
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usage, setUsage] = useState<{
    total_assessments: number;
    max_allowed: number;
    can_create: boolean;
    plan_name: string;
    has_paid_plan: boolean;
    upgrade_required: boolean;
  } | null>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

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
      console.error('Failed to load usage:', err);
    }
  };

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await api.getVisits(token!, { status: statusFilter || undefined });
      setVisits(response.items);
    } catch (err) {
      console.error('Failed to load visits:', err);
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
      });
      
      if (response.ok || response.status === 204 || response.status === 404) {
        // Successfully deleted or already gone
        setVisits(visits.filter(v => v.id !== visitId));
      } else {
        // Show the actual error
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Delete failed: ${response.status} - ${errorText}`);
        alert(`Failed to delete: ${response.status}. The backend API may need to redeploy.`);
      }
    } catch (err) {
      console.error('Failed to delete visit:', err);
      alert('Network error when deleting. Please try again.');
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
        console.error(`Bulk delete failed: ${response.status} - ${errorText}`);
        alert(`Failed to clear assessments: ${response.status}`);
        await loadVisits();
      }
    } catch (err) {
      console.error('Failed to clear all visits:', err);
      alert('Failed to clear assessments. Please try again.');
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
        alert(`Cleaned up ${result.deleted_visits} visits from the system.`);
        setVisits([]);
        await loadVisits();
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`Admin cleanup failed: ${response.status} - ${errorText}`);
        alert(`Admin cleanup failed: ${response.status}`);
      }
    } catch (err) {
      console.error('Admin cleanup failed:', err);
      alert('Admin cleanup failed. Please try again.');
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
        console.error('Failed to get/create client:', err);
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
          visit_date: new Date().toISOString().split('T')[0],
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
        console.error('Import failed:', errorData);
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
      console.error('Failed to create sample assessment:', err);
      alert('Failed to create sample assessment. Please try again.');
      setCreatingDemo(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { 
          bg: 'bg-dark-600', 
          text: 'text-dark-200', 
          icon: Timer,
          label: 'Scheduled' 
        };
      case 'in_progress':
        return { 
          bg: 'bg-primary-500/20', 
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
          bg: 'bg-dark-600', 
          text: 'text-dark-300', 
          icon: Timer,
          label: status 
        };
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-300">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Assessments</h1>
              <p className="text-dark-300">Review and manage care assessments</p>
            </div>
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-red-500/20 text-dark-300 hover:text-red-400 rounded-xl font-medium transition-colors"
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
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Assessment
              </button>
            </div>
          </div>

          {/* Free Tier Usage Banner */}
          {usage && !usage.has_paid_plan && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
              usage.upgrade_required 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-dark-700 border-dark-600'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${usage.upgrade_required ? 'bg-amber-500/20' : 'bg-primary-500/20'}`}>
                  <Sparkles className={`w-5 h-5 ${usage.upgrade_required ? 'text-amber-400' : 'text-primary-400'}`} />
                </div>
                <div>
                  <p className={`font-medium ${usage.upgrade_required ? 'text-amber-400' : 'text-white'}`}>
                    {usage.upgrade_required 
                      ? 'Free Plan Limit Reached' 
                      : `Free Plan — ${usage.total_assessments}/${usage.max_allowed} assessments used`
                    }
                  </p>
                  <p className="text-dark-400 text-sm">
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
                          : 'bg-dark-600'
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
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Visits', value: visits.length, color: 'primary' },
              { label: 'Pending Review', value: visits.filter(v => v.status === 'pending_review').length, color: 'orange' },
              { label: 'Approved', value: visits.filter(v => v.status === 'approved').length, color: 'green' },
              { label: 'Today', value: visits.filter(v => v.scheduled_start && new Date(v.scheduled_start).toDateString() === new Date().toDateString()).length, color: 'cyan' },
            ].map((stat, i) => (
              <div key={i} className="card p-5">
                <p className="text-dark-400 text-sm mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold text-accent-${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search visits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark w-full pl-12"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-dark-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-dark min-w-[180px]"
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
            <div className="card p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-400">Loading assessments...</p>
            </div>
          ) : visits.length === 0 ? (
            <div className="space-y-6">
              {/* Demo CTA Card */}
              <div className="card p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shrink-0">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Try a Sample Assessment</h3>
                    <p className="text-dark-300 mb-4">
                      See how Homecare AI transforms a care assessment conversation into a proposal-ready contract in seconds.
                    </p>
                    <button 
                      onClick={createSampleAssessment}
                      disabled={creatingDemo}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingDemo ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Sample Assessment...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Create Sample Assessment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Empty State */}
              <div className="card p-12 text-center">
                <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-dark-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No assessments yet</h3>
                <p className="text-dark-400 mb-4">Create a new assessment or try the demo above</p>
                <button 
                  onClick={() => router.push('/visits/new')}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => {
                const statusConfig = getStatusConfig(visit.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={visit.id}
                    onClick={() => router.push(`/visits/${visit.id}`)}
                    className="card card-hover p-5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                        <StatusIcon className={`w-6 h-6 ${statusConfig.text}`} />
                      </div>

                      {/* Visit info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-white">
                            {visit.client?.full_name || 'Unknown Client'}
                          </h3>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-5 text-sm text-dark-400">
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
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete assessment"
                      >
                        {deletingId === visit.id ? (
                          <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5 text-dark-400 hover:text-red-400" />
                        )}
                      </button>
                      
                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        usedCount={usage?.total_assessments || 0}
        maxCount={usage?.max_allowed || 2}
      />
    </div>
  );
}
