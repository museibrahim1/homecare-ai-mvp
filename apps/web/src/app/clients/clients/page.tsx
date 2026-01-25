'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Search, Phone, MapPin, ChevronRight, X, 
  User, Heart, Shield, Calendar, FileText, Save, Trash2,
  Mail, Home, AlertCircle, Stethoscope, Clock, CreditCard, Mic
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Client {
  id?: string;
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
  billing_address?: string;
  preferred_days?: string;
  preferred_times?: string;
  status?: string;
  intake_date?: string;
  discharge_date?: string;
  notes?: string;
}

const emptyClient: Client = {
  full_name: '',
  status: 'active',
};

export default function ClientsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Client>(emptyClient);
  const [activeSection, setActiveSection] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.push('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) loadClients();
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

  const handleAddNew = () => {
    setEditingClient(null);
    setFormData(emptyClient);
    setActiveSection('basic');
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setFormData(client);
    setActiveSection('basic');
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      setError('Full name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingClient 
        ? `${API_BASE}/clients/${editingClient.id}`
        : `${API_BASE}/clients`;
      
      const response = await fetch(url, {
        method: editingClient ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to save client');
      }

      await loadClients();
      setShowForm(false);
      setFormData(emptyClient);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingClient || !confirm('Are you sure you want to delete this client?')) return;

    try {
      const response = await fetch(`${API_BASE}/clients/${editingClient.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete');

      await loadClients();
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const updateField = (field: keyof Client, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'emergency', label: 'Emergency', icon: AlertCircle },
    { id: 'medical', label: 'Medical', icon: Stethoscope },
    { id: 'care', label: 'Care Info', icon: Heart },
    { id: 'insurance', label: 'Insurance', icon: CreditCard },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-dark-900"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
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
            <button onClick={handleAddNew} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />Add Client
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
              <p className="text-3xl font-bold text-accent-green">
                {clients.filter(c => c.status === 'active' || !c.status).length}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">High Care</p>
              <p className="text-3xl font-bold text-red-400">
                {clients.filter(c => c.care_level === 'HIGH').length}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-dark-400 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">
                {clients.filter(c => c.status === 'pending').length}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full pl-12"
            />
          </div>

          {/* Client List */}
          {loading ? (
            <div className="card p-12 text-center">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
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
                {searchQuery ? 'Try a different search term' : 'Add your first client or import from Integrations'}
              </p>
              {!searchQuery && (
                <div className="flex gap-3 justify-center">
                  <button onClick={handleAddNew} className="btn-primary">Add Client</button>
                  <button onClick={() => router.push('/integrations')} className="btn-secondary">Import Clients</button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleEdit(client)}
                  className="card card-hover p-5 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{client.full_name.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white">{client.full_name}</h3>
                        {client.care_level && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            client.care_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                            client.care_level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {client.care_level}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          client.status === 'active' || !client.status ? 'bg-green-500/20 text-green-400' :
                          client.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-dark-600 text-dark-400'
                        }`}>
                          {client.status || 'active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4" />{client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />{client.email}
                          </div>
                        )}
                        {client.primary_diagnosis && (
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4" />{client.primary_diagnosis}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/visits/new?client=${client.id}`);
                      }}
                      className="px-3 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition flex items-center gap-2 text-sm font-medium mr-2"
                    >
                      <Mic className="w-4 h-4" />
                      Assessment
                    </button>
                    <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Client Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-bold text-white">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-1 p-4 border-b border-dark-700 overflow-x-auto">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition ${
                      activeSection === section.id
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-dark-400 hover:bg-dark-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{section.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Basic Info */}
              {activeSection === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => updateField('full_name', e.target.value)}
                        className="input-dark w-full"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Preferred Name</label>
                      <input
                        type="text"
                        value={formData.preferred_name || ''}
                        onChange={(e) => updateField('preferred_name', e.target.value)}
                        className="input-dark w-full"
                        placeholder="Johnny"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth || ''}
                        onChange={(e) => updateField('date_of_birth', e.target.value)}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Gender</label>
                      <select
                        value={formData.gender || ''}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="input-dark w-full"
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Status</label>
                      <select
                        value={formData.status || 'active'}
                        onChange={(e) => updateField('status', e.target.value)}
                        className="input-dark w-full"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                        <option value="discharged">Discharged</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Intake Date</label>
                      <input
                        type="date"
                        value={formData.intake_date || ''}
                        onChange={(e) => updateField('intake_date', e.target.value)}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Discharge Date</label>
                      <input
                        type="date"
                        value={formData.discharge_date || ''}
                        onChange={(e) => updateField('discharge_date', e.target.value)}
                        className="input-dark w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {activeSection === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Primary Phone</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="input-dark w-full"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Secondary Phone</label>
                      <input
                        type="tel"
                        value={formData.phone_secondary || ''}
                        onChange={(e) => updateField('phone_secondary', e.target.value)}
                        className="input-dark w-full"
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="input-dark w-full"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Street Address</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => updateField('address', e.target.value)}
                      className="input-dark w-full"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => updateField('city', e.target.value)}
                        className="input-dark w-full"
                        placeholder="Springfield"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">State</label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={(e) => updateField('state', e.target.value)}
                        className="input-dark w-full"
                        placeholder="NE"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zip_code || ''}
                        onChange={(e) => updateField('zip_code', e.target.value)}
                        className="input-dark w-full"
                        placeholder="68000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Contacts */}
              {activeSection === 'emergency' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-medium mb-4">Primary Emergency Contact</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Name</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_name || ''}
                          onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                          className="input-dark w-full"
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={formData.emergency_contact_phone || ''}
                          onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                          className="input-dark w-full"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Relationship</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_relationship || ''}
                          onChange={(e) => updateField('emergency_contact_relationship', e.target.value)}
                          className="input-dark w-full"
                          placeholder="Daughter"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-4">Secondary Emergency Contact</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Name</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_2_name || ''}
                          onChange={(e) => updateField('emergency_contact_2_name', e.target.value)}
                          className="input-dark w-full"
                          placeholder="Bob Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={formData.emergency_contact_2_phone || ''}
                          onChange={(e) => updateField('emergency_contact_2_phone', e.target.value)}
                          className="input-dark w-full"
                          placeholder="(555) 987-6543"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-2">Relationship</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_2_relationship || ''}
                          onChange={(e) => updateField('emergency_contact_2_relationship', e.target.value)}
                          className="input-dark w-full"
                          placeholder="Son"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Info */}
              {activeSection === 'medical' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Primary Diagnosis</label>
                      <input
                        type="text"
                        value={formData.primary_diagnosis || ''}
                        onChange={(e) => updateField('primary_diagnosis', e.target.value)}
                        className="input-dark w-full"
                        placeholder="e.g., Diabetes Type 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Secondary Diagnoses</label>
                      <input
                        type="text"
                        value={formData.secondary_diagnoses || ''}
                        onChange={(e) => updateField('secondary_diagnoses', e.target.value)}
                        className="input-dark w-full"
                        placeholder="e.g., Hypertension, Arthritis"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Allergies</label>
                      <textarea
                        value={formData.allergies || ''}
                        onChange={(e) => updateField('allergies', e.target.value)}
                        className="input-dark w-full h-24"
                        placeholder="List any allergies..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Current Medications</label>
                      <textarea
                        value={formData.medications || ''}
                        onChange={(e) => updateField('medications', e.target.value)}
                        className="input-dark w-full h-24"
                        placeholder="List current medications..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Physician Name</label>
                      <input
                        type="text"
                        value={formData.physician_name || ''}
                        onChange={(e) => updateField('physician_name', e.target.value)}
                        className="input-dark w-full"
                        placeholder="Dr. Johnson"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Physician Phone</label>
                      <input
                        type="tel"
                        value={formData.physician_phone || ''}
                        onChange={(e) => updateField('physician_phone', e.target.value)}
                        className="input-dark w-full"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Medical Notes</label>
                    <textarea
                      value={formData.medical_notes || ''}
                      onChange={(e) => updateField('medical_notes', e.target.value)}
                      className="input-dark w-full h-24"
                      placeholder="Additional medical information..."
                    />
                  </div>
                </div>
              )}

              {/* Care Info */}
              {activeSection === 'care' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Mobility Status</label>
                      <select
                        value={formData.mobility_status || ''}
                        onChange={(e) => updateField('mobility_status', e.target.value)}
                        className="input-dark w-full"
                      >
                        <option value="">Select...</option>
                        <option value="Independent">Independent</option>
                        <option value="Uses cane">Uses cane</option>
                        <option value="Uses walker">Uses walker</option>
                        <option value="Wheelchair">Wheelchair</option>
                        <option value="Bedbound">Bedbound</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Cognitive Status</label>
                      <select
                        value={formData.cognitive_status || ''}
                        onChange={(e) => updateField('cognitive_status', e.target.value)}
                        className="input-dark w-full"
                      >
                        <option value="">Select...</option>
                        <option value="Intact">Intact</option>
                        <option value="Mild impairment">Mild impairment</option>
                        <option value="Moderate impairment">Moderate impairment</option>
                        <option value="Severe impairment">Severe impairment</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Living Situation</label>
                      <select
                        value={formData.living_situation || ''}
                        onChange={(e) => updateField('living_situation', e.target.value)}
                        className="input-dark w-full"
                      >
                        <option value="">Select...</option>
                        <option value="Lives alone">Lives alone</option>
                        <option value="Lives with spouse">Lives with spouse</option>
                        <option value="Lives with family">Lives with family</option>
                        <option value="Assisted living">Assisted living</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Care Level</label>
                      <select
                        value={formData.care_level || ''}
                        onChange={(e) => updateField('care_level', e.target.value)}
                        className="input-dark w-full"
                      >
                        <option value="">Select...</option>
                        <option value="LOW">Low</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Special Requirements</label>
                    <textarea
                      value={formData.special_requirements || ''}
                      onChange={(e) => updateField('special_requirements', e.target.value)}
                      className="input-dark w-full h-24"
                      placeholder="Dietary restrictions, equipment needs, language preferences..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Care Plan</label>
                    <textarea
                      value={formData.care_plan || ''}
                      onChange={(e) => updateField('care_plan', e.target.value)}
                      className="input-dark w-full h-24"
                      placeholder="Care plan details..."
                    />
                  </div>
                </div>
              )}

              {/* Insurance */}
              {activeSection === 'insurance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Insurance Provider</label>
                      <input
                        type="text"
                        value={formData.insurance_provider || ''}
                        onChange={(e) => updateField('insurance_provider', e.target.value)}
                        className="input-dark w-full"
                        placeholder="Blue Cross Blue Shield"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Insurance ID</label>
                      <input
                        type="text"
                        value={formData.insurance_id || ''}
                        onChange={(e) => updateField('insurance_id', e.target.value)}
                        className="input-dark w-full"
                        placeholder="ABC123456"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Medicaid ID</label>
                      <input
                        type="text"
                        value={formData.medicaid_id || ''}
                        onChange={(e) => updateField('medicaid_id', e.target.value)}
                        className="input-dark w-full"
                        placeholder="Medicaid ID if applicable"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-2">Medicare ID</label>
                      <input
                        type="text"
                        value={formData.medicare_id || ''}
                        onChange={(e) => updateField('medicare_id', e.target.value)}
                        className="input-dark w-full"
                        placeholder="Medicare ID if applicable"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Billing Address (if different)</label>
                    <textarea
                      value={formData.billing_address || ''}
                      onChange={(e) => updateField('billing_address', e.target.value)}
                      className="input-dark w-full h-20"
                      placeholder="Leave blank if same as home address"
                    />
                  </div>
                </div>
              )}

              {/* Schedule */}
              {activeSection === 'schedule' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Preferred Days</label>
                    <input
                      type="text"
                      value={formData.preferred_days || ''}
                      onChange={(e) => updateField('preferred_days', e.target.value)}
                      className="input-dark w-full"
                      placeholder="e.g., Monday, Wednesday, Friday"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">Preferred Times</label>
                    <input
                      type="text"
                      value={formData.preferred_times || ''}
                      onChange={(e) => updateField('preferred_times', e.target.value)}
                      className="input-dark w-full"
                      placeholder="e.g., Morning (9am-12pm)"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              {activeSection === 'notes' && (
                <div>
                  <label className="block text-sm text-dark-300 mb-2">General Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="input-dark w-full h-48"
                    placeholder="Any additional notes about this client..."
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-dark-700">
              <div>
                {editingClient && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Client
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-dark-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingClient ? 'Save Changes' : 'Create Client'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
