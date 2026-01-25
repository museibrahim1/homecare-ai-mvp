'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Calendar,
  User,
  Clock,
  ChevronRight,
  Check,
  Mic
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import AudioUploader from '@/components/AudioUploader';
import { format } from 'date-fns';

interface Client {
  id: string;
  full_name: string;
}

type Step = 'details' | 'audio' | 'complete';

export default function NewVisitPage() {
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState<Step>('details');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [scheduledStart, setScheduledStart] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [scheduledEnd, setScheduledEnd] = useState<string>(
    format(new Date(Date.now() + 2 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
  );
  const [notes, setNotes] = useState<string>('');
  
  // Created visit
  const [createdVisit, setCreatedVisit] = useState<any>(null);

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
      if (data.length > 0) {
        setSelectedClient(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const handleCreateVisit = async () => {
    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const visit = await api.createVisit(token!, {
        client_id: selectedClient,
        caregiver_id: user?.id,
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
        notes: notes || null,
      });
      
      setCreatedVisit(visit);
      setStep('audio');
    } catch (err: any) {
      setError(err.message || 'Failed to create visit');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (audioAsset: any) => {
    setStep('complete');
    
    // Auto-navigate to visit after a short delay
    setTimeout(() => {
      router.push(`/visits/${createdVisit.id}`);
    }, 2000);
  };

  const handleSkipAudio = () => {
    router.push(`/visits/${createdVisit.id}`);
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/visits')}
              className="flex items-center gap-2 text-dark-400 hover:text-white transition mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Visits
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">New Visit</h1>
            <p className="text-dark-300">Create a visit and upload audio recording</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-8">
            {[
              { id: 'details', label: 'Visit Details', icon: Calendar },
              { id: 'audio', label: 'Upload Audio', icon: Mic },
              { id: 'complete', label: 'Complete', icon: Check },
            ].map((s, index) => {
              const isActive = s.id === step;
              const isCompleted = 
                (s.id === 'details' && (step === 'audio' || step === 'complete')) ||
                (s.id === 'audio' && step === 'complete');
              
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition
                    ${isCompleted 
                      ? 'bg-accent-green/20' 
                      : isActive 
                      ? 'bg-primary-500/20' 
                      : 'bg-dark-700'
                    }
                  `}>
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-accent-green" />
                    ) : (
                      <s.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-dark-500'}`} />
                    )}
                  </div>
                  <span className={`font-medium ${isActive ? 'text-white' : 'text-dark-400'}`}>
                    {s.label}
                  </span>
                  {index < 2 && (
                    <ChevronRight className="w-5 h-5 text-dark-600 ml-4" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {step === 'details' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Visit Details</h2>
              
              <div className="space-y-5">
                {/* Client Selection */}
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Client
                  </label>
                  {clients.length > 0 ? (
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="input-dark w-full"
                    >
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-4 bg-dark-700/50 rounded-xl text-center">
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

                {/* Scheduled Start */}
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="input-dark w-full"
                  />
                </div>

                {/* Scheduled End */}
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    className="input-dark w-full"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes about this visit..."
                    rows={3}
                    className="input-dark w-full resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCreateVisit}
                  disabled={loading || !selectedClient}
                  className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Continue to Upload
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'audio' && createdVisit && (
            <div className="space-y-4">
              <AudioUploader
                visitId={createdVisit.id}
                token={token!}
                onUploadComplete={handleUploadComplete}
              />
              
              <button
                onClick={handleSkipAudio}
                className="w-full text-center text-dark-400 hover:text-white py-2 transition"
              >
                Skip for now - upload later
              </button>
            </div>
          )}

          {step === 'complete' && (
            <div className="card p-8 text-center">
              <div className="w-20 h-20 bg-accent-green/20 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                <Check className="w-10 h-10 text-accent-green" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Visit Created!</h2>
              <p className="text-dark-400 mb-6">
                Your audio is uploaded and ready for processing. Redirecting to visit...
              </p>
              <div className="flex items-center justify-center gap-2 text-dark-400">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                Redirecting...
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
