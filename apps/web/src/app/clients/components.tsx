'use client';

import { useState } from 'react';
import { ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Client } from './types';
import { STATUS_CONFIG, CARE_SPECIALTY_OPTIONS, PRIORITY_OPTIONS } from './constants';

export function QuickAddModal({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSave: (data: Partial<Client>) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    care_level: '',
    status: 'intake',
    primary_diagnosis: '',
    notes: '',
    insurance_type: '' as '' | 'medicaid' | 'medicare' | 'private',
    insurance_provider: '',
    medicaid_id: '',
    medicare_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;
    
    setLoading(true);
    try {
      // Build the client data with insurance fields
      const clientData: Partial<Client> = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        care_level: formData.care_level,
        status: formData.status,
        primary_diagnosis: formData.primary_diagnosis,
        notes: formData.notes,
      };
      
      // Add insurance fields based on type
      if (formData.insurance_type === 'medicaid') {
        clientData.medicaid_id = formData.medicaid_id || 'PENDING';
      } else if (formData.insurance_type === 'medicare') {
        clientData.medicare_id = formData.medicare_id || 'PENDING';
      } else if (formData.insurance_type === 'private') {
        clientData.insurance_provider = formData.insurance_provider || 'Private Insurance';
      }
      
      await onSave(clientData);
      setFormData({ 
        full_name: '', email: '', phone: '', address: '', care_level: '', status: 'intake', 
        primary_diagnosis: '', notes: '', insurance_type: '', insurance_provider: '', 
        medicaid_id: '', medicare_id: '' 
      });
      onClose();
    } catch {
      // Error is handled by onSave caller
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-lg border border-slate-200 mt-0 sm:mt-20 mr-0 sm:mr-4 h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto"
        data-testid="quick-add-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-slate-900">Add New Client</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close add client modal"
            data-testid="quick-add-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="input-dark"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="input-dark"
              placeholder="john@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="input-dark"
              placeholder="+1 555 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input-dark"
              placeholder="123 Main St, City, State"
            />
          </div>

          {/* Priority / Care Level */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Priority</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, care_level: opt.value.toUpperCase() }))}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                    formData.care_level === opt.value.toUpperCase()
                      ? `${opt.color} bg-slate-50 border border-current`
                      : 'text-slate-500 bg-white border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-1 h-3 rounded-full ${
                    opt.value === 'urgent' ? 'bg-red-500' : opt.value === 'high' ? 'bg-orange-500' : opt.value === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Insurance Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Insurance Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'medicaid' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'medicaid'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                Medicaid
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'medicare' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'medicare'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                Medicare
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, insurance_type: 'private' }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  formData.insurance_type === 'private'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                Private
              </button>
            </div>
          </div>

          {/* Insurance ID field based on type */}
          {formData.insurance_type === 'medicaid' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Medicaid ID</label>
              <input
                type="text"
                value={formData.medicaid_id}
                onChange={(e) => setFormData(prev => ({ ...prev, medicaid_id: e.target.value }))}
                className="input-dark"
                placeholder="MCD123456789"
              />
            </div>
          )}
          {formData.insurance_type === 'medicare' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Medicare ID</label>
              <input
                type="text"
                value={formData.medicare_id}
                onChange={(e) => setFormData(prev => ({ ...prev, medicare_id: e.target.value }))}
                className="input-dark"
                placeholder="MCR123456789"
              />
            </div>
          )}
          {formData.insurance_type === 'private' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Insurance Provider</label>
              <input
                type="text"
                value={formData.insurance_provider}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance_provider: e.target.value }))}
                className="input-dark"
                placeholder="Blue Cross Blue Shield"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Care Specialty</label>
            <select
              value={formData.primary_diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_diagnosis: e.target.value }))}
              className="input-dark"
            >
              <option value="">Select specialty...</option>
              {CARE_SPECIALTY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Referral Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input-dark resize-none"
              rows={2}
              placeholder="Referral source, special requirements..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !formData.full_name.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2"
              data-testid="quick-add-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Client
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Avatar component with initials or image
export function ClientAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full ${colors[colorIndex]} flex items-center justify-center font-semibold text-slate-900`}>
      {initials}
    </div>
  );
}

// Status Badge Component
export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

// Insurance type badge component - shows all applicable insurance types
export function InsuranceBadge({ client }: { client: Client }) {
  const badges = [];
  
  if (client.medicaid_id) {
    badges.push(
      <span key="medicaid" className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
        Medicaid
      </span>
    );
  }
  if (client.medicare_id) {
    badges.push(
      <span key="medicare" className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
        Medicare
      </span>
    );
  }
  if (client.insurance_provider && !client.medicaid_id && !client.medicare_id) {
    badges.push(
      <span key="private" className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
        Private
      </span>
    );
  }
  
  if (badges.length === 0) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
        No Insurance
      </span>
    );
  }
  
  return <div className="flex gap-1">{badges}</div>;
}

// Grouped Client Row Component
export function ClientRow({ 
  client, 
  onClick,
  onDelete,
  isConfirmingDelete = false
}: { 
  client: Client; 
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isConfirmingDelete?: boolean;
}) {
  const status = client.status || 'active';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 bg-white hover:bg-slate-50 cursor-pointer transition-all border-l-4 ${config.borderColor} group ${isConfirmingDelete ? 'bg-red-50' : ''}`}
    >
      <ClientAvatar name={client.full_name} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 truncate">{client.full_name}</p>
          <InsuranceBadge client={client} />
        </div>
      </div>
      
      <StatusBadge status={status} />
      
      <div className="w-32 text-sm text-slate-500">
        {client.phone || '-'}
      </div>
      
      <div className="w-36 text-sm text-slate-500 truncate">
        {client.primary_diagnosis || 'General Care'}
      </div>
      
      {isConfirmingDelete ? (
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all animate-pulse"
        >
          Confirm?
        </button>
      ) : (
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Delete client"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
    </div>
  );
}

