'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Search, Phone, ChevronRight,
  MapPin, Star, Clock, Upload
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import CaregiverModal from '@/components/CaregiverModal';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
    } catch (err) {
      console.error('Failed to load caregivers:', err);
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
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

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
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
              {filteredCaregivers.map((caregiver) => (
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
