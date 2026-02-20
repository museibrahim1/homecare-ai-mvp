'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  User,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  care_level?: string;
}

interface ServiceLine {
  name: string;
  rate: number;
  unit: string;
}

const COMMON_SERVICES = [
  'Personal Care',
  'Companion Care',
  'Homemaker Services',
  'Skilled Nursing',
  'Medication Management',
  'Meal Preparation',
  'Light Housekeeping',
  'Transportation',
  'Bathing Assistance',
  'Dressing Assistance',
  'Mobility Assistance',
  'Wound Care',
  'Physical Therapy',
  'Respite Care',
];

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

export default function NewContractPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [title, setTitle] = useState('');
  const [services, setServices] = useState<ServiceLine[]>([
    { name: '', rate: 0, unit: 'hour' },
  ]);
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(0);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState(
    'Either party may terminate this agreement with 30 days written notice.'
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    'Services will be provided in accordance with the agreed-upon care plan. Rates are subject to review annually. The agency maintains appropriate insurance and bonding. All caregivers are background-checked and trained per state requirements.'
  );

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
      const data = await api.getClients(token!);
      setClients(data);
    } catch {
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const addServiceLine = () => {
    setServices([...services, { name: '', rate: 0, unit: 'hour' }]);
  };

  const removeServiceLine = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateServiceLine = (index: number, field: keyof ServiceLine, value: string | number) => {
    const updated = [...services];
    (updated[index] as any)[field] = value;
    setServices(updated);
  };

  const toggleDay = (day: string) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addCommonService = (serviceName: string) => {
    const emptyIndex = services.findIndex((s) => !s.name);
    if (emptyIndex >= 0) {
      updateServiceLine(emptyIndex, 'name', serviceName);
    } else {
      setServices([...services, { name: serviceName, rate: hourlyRate || 25, unit: 'hour' }]);
    }
  };

  const autoGenerateTitle = () => {
    const client = clients.find((c) => c.id === selectedClient);
    if (client) {
      const serviceNames = services.filter((s) => s.name).map((s) => s.name);
      const svcText = serviceNames.length > 0 ? serviceNames.slice(0, 2).join(' & ') : 'Home Care';
      setTitle(`${svcText} Service Agreement — ${client.full_name}`);
    }
  };

  const calculateWeeklyTotal = () => {
    const rate = hourlyRate || 0;
    const hours = weeklyHours || 0;
    return rate * hours;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedClient) {
      setError('Please select a client');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a contract title');
      return;
    }

    const validServices = services.filter((s) => s.name.trim());
    if (validServices.length === 0) {
      setError('Please add at least one service');
      return;
    }

    setSubmitting(true);

    try {
      await api.createContract(token!, {
        client_id: selectedClient,
        title: title.trim(),
        services: validServices,
        schedule: {
          days: scheduleDays,
          hours_per_week: hoursPerWeek || weeklyHours || undefined,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
        },
        hourly_rate: hourlyRate || undefined,
        weekly_hours: weeklyHours || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        cancellation_policy: cancellationPolicy || undefined,
        terms_and_conditions: termsAndConditions || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/proposals');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  const hasStoredToken =
    typeof window !== 'undefined' && localStorage.getItem('palmcare-auth');

  if (authLoading && !hasStoredToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!token && !hasStoredToken) return null;

  if (success) {
    return (
      <div className="flex min-h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Contract Created!</h2>
            <p className="text-dark-400 mb-4">
              Your contract has been saved as a draft. Redirecting to proposals...
            </p>
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin mx-auto" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/proposals')}
              className="flex items-center gap-2 text-dark-400 hover:text-white transition mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Proposals
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Create Contract</h1>
                <p className="text-dark-400 text-sm">
                  Build a service agreement manually — no pipeline needed
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* Section 1: Client & Title */}
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-400" />
                Client & Title
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    Client *
                  </label>
                  {loadingClients ? (
                    <div className="flex items-center gap-2 p-3 bg-dark-700/50 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin text-dark-400" />
                      <span className="text-dark-400">Loading clients...</span>
                    </div>
                  ) : clients.length > 0 ? (
                    <select
                      value={selectedClient}
                      onChange={(e) => {
                        setSelectedClient(e.target.value);
                        if (!title && e.target.value) {
                          setTimeout(autoGenerateTitle, 0);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                    >
                      <option value="">Select a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.full_name}
                          {client.care_level ? ` (${client.care_level})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-dark-700/50 rounded-lg text-center">
                      <p className="text-dark-400 text-sm mb-2">No clients yet</p>
                      <button
                        onClick={() => router.push('/clients')}
                        className="text-primary-400 text-sm hover:underline"
                      >
                        Add a client first
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    Contract Title *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Personal Care Service Agreement — Jane Doe"
                      className="flex-1 px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                    {selectedClient && (
                      <button
                        onClick={autoGenerateTitle}
                        className="px-3 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-400 hover:text-white hover:border-dark-500 transition text-sm whitespace-nowrap"
                        title="Auto-generate title from services and client"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Services */}
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Services
              </h2>

              {/* Quick-add chips */}
              <div className="mb-4">
                <p className="text-dark-400 text-xs mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SERVICES.filter(
                    (s) => !services.some((svc) => svc.name === s)
                  )
                    .slice(0, 8)
                    .map((svc) => (
                      <button
                        key={svc}
                        onClick={() => addCommonService(svc)}
                        className="px-3 py-1 bg-dark-700 border border-dark-600 rounded-full text-xs text-dark-300 hover:text-white hover:border-primary-500/50 transition"
                      >
                        + {svc}
                      </button>
                    ))}
                </div>
              </div>

              {/* Service lines */}
              <div className="space-y-3">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-dark-700/30 border border-dark-600/50 rounded-lg p-3"
                  >
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => updateServiceLine(index, 'name', e.target.value)}
                      placeholder="Service name"
                      className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-dark-500 text-sm">$</span>
                      <input
                        type="number"
                        value={service.rate || ''}
                        onChange={(e) =>
                          updateServiceLine(index, 'rate', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none text-sm"
                      />
                    </div>
                    <select
                      value={service.unit}
                      onChange={(e) => updateServiceLine(index, 'unit', e.target.value)}
                      className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                    >
                      <option value="hour">/hr</option>
                      <option value="visit">/visit</option>
                      <option value="day">/day</option>
                      <option value="week">/week</option>
                      <option value="month">/month</option>
                    </select>
                    {services.length > 1 && (
                      <button
                        onClick={() => removeServiceLine(index)}
                        className="p-2 text-dark-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addServiceLine}
                className="mt-3 flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Add another service
              </button>
            </div>

            {/* Section 3: Schedule */}
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Schedule
              </h2>

              <div className="space-y-4">
                {/* Days of week */}
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    Service Days
                  </label>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          scheduleDays.includes(day.id)
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-700 text-dark-400 hover:text-white border border-dark-600'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Rates & Dates */}
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Rates & Duration
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    value={hourlyRate || ''}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    placeholder="25.00"
                    step="0.01"
                    className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    Weekly Hours
                  </label>
                  <input
                    type="number"
                    value={weeklyHours || ''}
                    onChange={(e) => setWeeklyHours(parseFloat(e.target.value) || 0)}
                    placeholder="20"
                    className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Weekly summary */}
              {hourlyRate > 0 && weeklyHours > 0 && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-300">Estimated Weekly Total</span>
                    <span className="text-xl font-bold text-green-400">
                      ${calculateWeeklyTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-dark-500 text-xs mt-1">
                    ${hourlyRate}/hr x {weeklyHours} hrs/week
                  </p>
                </div>
              )}
            </div>

            {/* Section 5: Terms (Collapsible) */}
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-400" />
                  Terms & Policies
                </h2>
                {showTerms ? (
                  <ChevronUp className="w-5 h-5 text-dark-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-dark-400" />
                )}
              </button>

              {showTerms && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      Cancellation Policy
                    </label>
                    <textarea
                      value={cancellationPolicy}
                      onChange={(e) => setCancellationPolicy(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2 pb-8">
              <button
                onClick={() => router.push('/proposals')}
                className="px-6 py-3 text-dark-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedClient || !title.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Create Contract
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
