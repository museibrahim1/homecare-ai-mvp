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
  Filter
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Visit } from '@/lib/types';
import Sidebar from '@/components/Sidebar';

export default function VisitsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadVisits();
    }
  }, [token, statusFilter]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'exported':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Visits</h1>
              <p className="text-gray-600">Review and manage caregiver visits</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
              <Plus className="w-4 h-4" />
              New Visit
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No visits found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm divide-y">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => router.push(`/visits/${visit.id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(visit.status)}`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {visit.client?.full_name || 'Unknown Client'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {visit.scheduled_start 
                          ? format(new Date(visit.scheduled_start), 'MMM d, yyyy')
                          : 'Not scheduled'
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {visit.scheduled_start 
                          ? format(new Date(visit.scheduled_start), 'h:mm a')
                          : '-'
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {visit.caregiver?.full_name || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
