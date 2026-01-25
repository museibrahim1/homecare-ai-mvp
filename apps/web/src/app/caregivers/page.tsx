'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Plus, Search, Phone, ChevronRight, X, 
  User, Star, Shield, Calendar, FileText, Save, Trash2,
  Mail, MapPin, Award, Clock, Heart, Check, Upload
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

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

const emptyCaregiver: Caregiver = {
  full_name: '',
  status: 'active',
  can_handle_low_care: true,
  can_handle_moderate_care: true,
  can_handle_high_care: false,
  max_clients: 5,
  current_client_count: 0,
  years_experience: 0,
  rating: 5.0,
  languages: ['English'],
  specializations: [],
};

export default function CaregiversPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCaregiver, setEditingCaregiver] = useState<Caregiver | null>(null);
  const [formData, setFormData] = useState<Caregiver>(emptyCaregiver);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

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
    setEditingCaregiver(null);
    setFormData(emptyCaregiver);
    setShowForm(true);
  };

  const handleEdit = (caregiver: Caregiver) => {
    setEditingCaregiver(caregiver);
    setFormData({ ...emptyCaregiver, ...caregiver });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingCaregiver?.id 
        ? `${API_BASE}/caregivers/${editingCaregiver.id}`
        : `${API_BASE}/caregivers`;
      
      const response = await fetch(url, {
        method: editingCaregiver?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadCaregivers();
        setShowForm(false);
      } else {
        const err = await response.json();
        setError(err.detail || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save caregiver');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCaregiver?.id || !confirm('Delete this caregiver?')) return;

    try {
      await fetch(`${API_BASE}/caregivers/${editingCaregiver.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await loadCaregivers();
      setShowForm(false);
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      setFormData({
        ...formData,
        specializations: [...(formData.specializations || []), newSpecialization.trim()]
      });
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData({
      ...formData,
      specializations: (formData.specializations || []).filter(s => s !== spec)
    });
  };

  const addLanguage = () => {
    if (newLanguage.trim()) {
      setFormData({
        ...formData,
        languages: [...(formData.languages || []), newLanguage.trim()]
      });
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData({
      ...formData,
      languages: (formData.languages || []).filter(l => l !== lang)
    });
  };

  const filteredCaregivers = caregivers.filter(cg =>
    cg.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cg.phone?.includes(searchQuery) ||
    cg.certification_level?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  onClick={() => handleEdit(caregiver)}
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
                            <Star className="w-4 h-4 text-yellow-400" />{caregiver.rating.toFixed(1)}
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

        {/* Edit/Add Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-dark-700">
                <h2 className="text-xl font-bold text-white">
                  {editingCaregiver ? 'Edit Caregiver' : 'Add Caregiver'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Basic Info */}
                <div>
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> Basic Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm text-dark-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state || ''}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        className="input-dark w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Info */}
                <div>
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Professional Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">Certification Level</label>
                      <select
                        value={formData.certification_level || ''}
                        onChange={e => setFormData({ ...formData, certification_level: e.target.value })}
                        className="input-dark w-full"
                      >
                        <option value="">Select...</option>
                        <option value="CNA">CNA - Certified Nursing Assistant</option>
                        <option value="HHA">HHA - Home Health Aide</option>
                        <option value="LPN">LPN - Licensed Practical Nurse</option>
                        <option value="RN">RN - Registered Nurse</option>
                        <option value="PCA">PCA - Personal Care Assistant</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">Years Experience</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.years_experience || 0}
                        onChange={e => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">Max Clients</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_clients || 5}
                        onChange={e => setFormData({ ...formData, max_clients: parseInt(e.target.value) || 5 })}
                        className="input-dark w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1">Status</label>
                      <select
                        value={formData.status || 'active'}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="input-dark w-full"
                      >
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Care Levels */}
                <div>
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Care Level Capabilities
                  </h3>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.can_handle_low_care}
                        onChange={e => setFormData({ ...formData, can_handle_low_care: e.target.checked })}
                        className="w-4 h-4 rounded border-dark-500"
                      />
                      <span className="text-dark-300">Low Care</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.can_handle_moderate_care}
                        onChange={e => setFormData({ ...formData, can_handle_moderate_care: e.target.checked })}
                        className="w-4 h-4 rounded border-dark-500"
                      />
                      <span className="text-dark-300">Moderate Care</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.can_handle_high_care}
                        onChange={e => setFormData({ ...formData, can_handle_high_care: e.target.checked })}
                        className="w-4 h-4 rounded border-dark-500"
                      />
                      <span className="text-red-400 font-medium">High Care</span>
                    </label>
                  </div>
                </div>

                {/* Specializations */}
                <div>
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Specializations
                  </h3>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add specialization..."
                      value={newSpecialization}
                      onChange={e => setNewSpecialization(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addSpecialization()}
                      className="input-dark flex-1"
                    />
                    <button onClick={addSpecialization} className="btn-secondary px-4">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(formData.specializations || []).map((spec, i) => (
                      <span key={i} className="px-3 py-1 bg-dark-700 rounded-lg text-sm text-dark-200 flex items-center gap-2">
                        {spec}
                        <button onClick={() => removeSpecialization(spec)} className="text-dark-400 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <h3 className="text-white font-medium mb-4">Languages</h3>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add language..."
                      value={newLanguage}
                      onChange={e => setNewLanguage(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addLanguage()}
                      className="input-dark flex-1"
                    />
                    <button onClick={addLanguage} className="btn-secondary px-4">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(formData.languages || []).map((lang, i) => (
                      <span key={i} className="px-3 py-1 bg-primary-500/20 rounded-lg text-sm text-primary-400 flex items-center gap-2">
                        {lang}
                        <button onClick={() => removeLanguage(lang)} className="text-primary-300 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="input-dark w-full h-24 resize-none"
                    placeholder="Additional notes about this caregiver..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-6 border-t border-dark-700">
                {editingCaregiver?.id && (
                  <button onClick={handleDelete} className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
