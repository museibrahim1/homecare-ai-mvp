'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Search,
  Phone,
  MapPin,
  AlertCircle,
  ChevronRight,
  Heart,
  Activity
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ClientModal from '@/components/ClientModal';

interface Client {
  id: string;
  full_name: string;
  preferred_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  emergency_contact_2_name?: string;
  emergency_contact_2_phone?: string;
  emergency_contact_2_relationship?: string;
  primary_diagnosis?: string;
  secondary_diagnoses?: string;
  allergies?: string;
  medications?: string;
  physician_name?: string;
  physician_phone?: string;
  medical_notes?: string;
  mobility_status?: string;
  cognitive_status?: string;
  living_situation?: string;
  care_level?: string;
  care_plan?: string;
  special_requirements?: string;
  insurance_provider?: string;
  insurance_id?: string;
  medicaid_id?: string;
  medicare_id?: string;
  preferred_days?: string;
  preferred_times?: string;
  status?: string;
  notes?: string;
  created_at: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadClients();
    }
  }, [token]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients(token!);
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    const url = clientData.id 
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/clients/${clientData.id}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/clients`;
    
    const response = await fetch(url, {
      method: clientData.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(clientData),
    });

    if (!response.ok) {
      throw new Error('Failed to save client');
    }

    await loadClients();
  };

  const handleDeleteClient = async (clientId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/clients/${clientId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete client');
    }

    await loadClients();
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.includes(searchQuery)
  );

  const activeClients = clients.filter(c => c.status === 'active' || !c.status);
  const highCareClients = clients.filter(c => c.care_level === 'HIGH');

  const getCareLevel = (level?: string) => {
    switch (level) {
      case 'HIGH': return { label: 'High Care', color: 'bg-red-500/20 text-red-400' };
      case 'MODERATE': return { label: 'Moderate', color: 'bg-yellow-500/20 text-yellow-400' };
      case 'LOW': return { label: 'Low Care', color: 'bg-green-500/20 text-green-400' };
      default: return null;
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
              <h1 className="text-3xl font-bold text-white mb-2">Clients</h1>
              <p className="text-dark-300">Manage your client database</p>
            </div>
            <button 
              onClick={handleAddClient}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Client
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-white">{clients.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Active</p>
              <p className="text-3xl font-bold text-accent-green">{activeClients.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">High Care</p>
              <p className="text-3xl font-bold text-red-400">{highCareClients.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">
                {clients.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark w-full pl-12"
              />
            </div>
          </div>

          {/* Clients List */}
          {loading ? (
            <div className="card p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-dark-400">Loading clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery ? 'No clients found' : 'No clients yet'}
              </h3>
              <p className="text-dark-400 mb-4">
                {searchQuery ? 'Try a different search term' : 'Add your first client to get started'}
              </p>
              {!searchQuery && (
                <button onClick={handleAddClient} className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => {
                const careLevel = getCareLevel(client.care_level);
                return (
                  <div
                    key={client.id}
                    onClick={() => handleEditClient(client)}
                    className="card card-hover p-5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {client.full_name.charAt(0)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-white">
                            {client.full_name}
                          </h3>
                          {careLevel && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${careLevel.color}`}>
                              {careLevel.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-dark-400">
                          {client.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-4 h-4" />
                              {client.phone}
                            </div>
                          )}
                          {(client.city || client.address) && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {client.city || client.address?.split(',')[0]}
                            </div>
                          )}
                          {client.primary_diagnosis && (
                            <div className="flex items-center gap-1.5">
                              <Heart className="w-4 h-4" />
                              {client.primary_diagnosis}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Emergency Contact */}
                      {client.emergency_contact_name && (
                        <div className="text-right mr-4">
                          <div className="flex items-center gap-1.5 text-dark-400 text-sm">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-dark-500">Emergency:</span> {client.emergency_contact_name}
                          </div>
                        </div>
                      )}

                      <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Client Modal */}
      <ClientModal
        client={selectedClient}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveClient}
        onDelete={handleDeleteClient}
      />
    </div>
  );
}
