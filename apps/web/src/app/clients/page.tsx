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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

interface Client {
  id: string;
  full_name: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Client
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-white">{clients.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Active This Month</p>
              <p className="text-3xl font-bold text-accent-green">{clients.length}</p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">New This Week</p>
              <p className="text-3xl font-bold text-accent-cyan">0</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search clients..."
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
              <p className="text-dark-400">
                {searchQuery ? 'Try a different search term' : 'Add your first client to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
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
                      <h3 className="font-semibold text-white mb-1">
                        {client.full_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />
                            {client.phone}
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {client.address.split(',')[0]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    {client.emergency_contact_name && (
                      <div className="text-right mr-4">
                        <div className="flex items-center gap-1.5 text-dark-400 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          Emergency: {client.emergency_contact_name}
                        </div>
                      </div>
                    )}

                    <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
