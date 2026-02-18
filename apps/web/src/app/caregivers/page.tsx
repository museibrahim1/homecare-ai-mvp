'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Search, Phone, ChevronRight, ChevronLeft,
  MapPin, Star, Clock, Upload, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import CaregiverModal from '@/components/CaregiverModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Caregiver {
  id?: string;
  full_name: string;
  preferred_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  certification_level?: string;
  specializations?: string[];
  languages?: string[];
  can_handle_high_care?: boolean;
  can_handle_moderate_care?: boolean;
  can_handle_low_care?: boolean;
  years_experience?: number;
  rating?: number;
  current_client_count?: number;
  max_clients?: number;
  available_days?: string;
  available_hours?: string;
  status?: string;
  notes?: string;
  background_check_status?: string;
}

export default function CaregiversPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    if (!authLoading && !token) router.push('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) loadCaregivers();
  }, [token]);

  const loadCaregivers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/caregivers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCaregivers(data);
      }
    } catch (err: any) {
      console.error('Failed to load caregivers:', err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedCaregiver(null);
    setModalOpen(true);
  };

  const handleEditCaregiver = (caregiver: Caregiver) => {
    setSelectedCaregiver(caregiver);
    setModalOpen(true);
  };

  const handleSaveCaregiver = async (caregiverData: Caregiver) => {
    const url = caregiverData.id 
      ? `${API_BASE}/caregivers/${caregiverData.id}`
      : `${API_BASE}/caregivers`;
    
    const response = await fetch(url, {
      method: caregiverData.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(caregiverData),
    });

    if (!response.ok) {
      throw new Error('Failed to save caregiver');
    }

    await loadCaregivers();
  };

  const handleDeleteCaregiver = async (caregiverId: string) => {
    if (!confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) return;
    const response = await fetch(`${API_BASE}/caregivers/${caregiverId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to delete caregiver');
    }

    await loadCaregivers();
  };

  const filteredCaregivers = caregivers.filter(cg =>
    cg.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cg.phone?.includes(searchQuery) ||
    cg.certification_level?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedCaregivers = filteredCaregivers.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('palmcare-auth');

  if (authLoading && !hasStoredToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token && !hasStoredToken) return null;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Caregivers</h1>
              <p className="text-dark-300">Manage your caregiver team for client assignments</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push('/integrations')} className="btn-secondary flex items-center gap-2">
                <Upload className="w-5 h-5" />Import
              </button>
              <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
                <Plus className="w-5 h-5" />Add Caregiver
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm underline">Dismiss</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Total Caregivers</p>
              <p className="text-3xl font-bold text-white">{caregivers.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Active</p>
              <p className="text-3xl font-bold text-accent-green">
                {caregivers.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">High Care Qualified</p>
              <p className="text-3xl font-bold text-primary-400">
                {caregivers.filter(c => c.can_handle_high_care).length}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Available</p>
              <p className="text-3xl font-bold text-accent-cyan">
                {caregivers.filter(c => (c.current_client_count || 0) < (c.max_clients || 5)).length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or certification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full pl-12"
            />
          </div>

          {/* Caregiver List */}
          {loading ? (
            <div className="card p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredCaregivers.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No caregivers found' : 'No caregivers yet'}
              </h3>
              <p className="text-dark-400 mb-4">Add caregivers to assign them to clients</p>
              {!searchQuery && (
                <button onClick={handleAddNew} className="btn-primary">Add Caregiver</button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedCaregivers.map((caregiver) => (
                <div
                  key={caregiver.id}
                  onClick={() => handleEditCaregiver(caregiver)}
                  className="card card-hover p-5 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      caregiver.can_handle_high_care ? 'bg-primary-500/20' : 'bg-dark-700'
                    }`}>
                      <span className={`font-bold text-lg ${
                        caregiver.can_handle_high_care ? 'text-primary-400' : 'text-dark-300'
                      }`}>{caregiver.full_name.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white">{caregiver.full_name}</h3>
                        {caregiver.certification_level && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-500/20 text-primary-400">
                            {caregiver.certification_level}
                          </span>
                        )}
                        {caregiver.can_handle_high_care && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                            High Care
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          caregiver.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          caregiver.status === 'on_leave' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-dark-600 text-dark-400'
                        }`}>
                          {caregiver.status || 'active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        {caregiver.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />{caregiver.phone}
                          </div>
                        )}
                        {caregiver.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />{caregiver.city}, {caregiver.state}
                          </div>
                        )}
                        {caregiver.years_experience !== undefined && caregiver.years_experience > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />{caregiver.years_experience} yrs exp
                          </div>
                        )}
                        {caregiver.rating !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-yellow-400" />{Number(caregiver.rating).toFixed(1)}
                          </div>
                        )}
                      </div>
                      {caregiver.specializations && caregiver.specializations.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {caregiver.specializations.slice(0, 4).map((spec, i) => (
                            <span key={i} className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-300">
                              {spec}
                            </span>
                          ))}
                          {caregiver.specializations.length > 4 && (
                            <span className="text-xs text-dark-500">+{caregiver.specializations.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-sm text-dark-400">Clients</p>
                      <p className="text-lg font-semibold text-white">
                        {caregiver.current_client_count || 0}/{caregiver.max_clients || 5}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {filteredCaregivers.length > pageSize && (
            <div className="p-4 border-t border-dark-700 flex items-center justify-between mt-4">
              <p className="text-dark-400 text-sm">
                Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredCaregivers.length)} of {filteredCaregivers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-dark-400" />
                </button>
                <span className="text-dark-400 px-3 text-sm">Page {page + 1}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * pageSize >= filteredCaregivers.length}
                  className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-dark-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Caregiver Modal */}
      <CaregiverModal
        caregiver={selectedCaregiver}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCaregiver}
        onDelete={handleDeleteCaregiver}
      />
    </div>
  );
}
