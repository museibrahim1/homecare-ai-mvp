'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, User, Clock, ChevronRight, Check, Mic } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import AudioUploader from '@/components/AudioUploader';
import { format } from 'date-fns';

export default function NewVisitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<'details' | 'audio' | 'complete'>('details');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [scheduledStart, setScheduledStart] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [scheduledEnd, setScheduledEnd] = useState(format(new Date(Date.now() + 2 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
  const [createdVisit, setCreatedVisit] = useState<any>(null);

  // Get pre-selected client from URL
  const preSelectedClient = searchParams.get('client');

  useEffect(() => {
    if (!authLoading && !token) router.push('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) api.getClients(token).then(data => { 
      setClients(data); 
      // Use pre-selected client from URL, or first client
      if (preSelectedClient && data.find((c: any) => c.id === preSelectedClient)) {
        setSelectedClient(preSelectedClient);
      } else if (data.length) {
        setSelectedClient(data[0].id);
      }
    });
  }, [token, preSelectedClient]);

  const handleCreateVisit = async () => {
    if (!selectedClient) { setError('Please select a client'); return; }
    setLoading(true);
    setError(null);
    try {
      // caregiver_id is optional - API will default to current user
      const visit = await api.createVisit(token!, {
        client_id: selectedClient,
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
      });
      setCreatedVisit(visit);
      setStep('audio');
    } catch (err: any) {
      // Handle different error formats
      if (typeof err === 'string') {
        setError(err);
      } else if (err?.detail) {
        setError(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Failed to create visit. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-dark-900"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <button onClick={() => router.push('/visits')} className="flex items-center gap-2 text-dark-400 hover:text-white mb-4"><ArrowLeft className="w-4 h-4" />Back</button>
            <h1 className="text-3xl font-bold text-white mb-2">New Visit</h1>
          </div>

          <div className="flex items-center gap-4 mb-8">
            {[{ id: 'details', label: 'Details', icon: Calendar }, { id: 'audio', label: 'Upload', icon: Mic }, { id: 'complete', label: 'Complete', icon: Check }].map((s, i) => {
              const isActive = s.id === step;
              const isComplete = (s.id === 'details' && step !== 'details') || (s.id === 'audio' && step === 'complete');
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-accent-green/20' : isActive ? 'bg-primary-500/20' : 'bg-dark-700'}`}>
                    {isComplete ? <Check className="w-5 h-5 text-accent-green" /> : <s.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-dark-500'}`} />}
                  </div>
                  <span className={`font-medium ${isActive ? 'text-white' : 'text-dark-400'}`}>{s.label}</span>
                  {i < 2 && <ChevronRight className="w-5 h-5 text-dark-600 ml-4" />}
                </div>
              );
            })}
          </div>

          {step === 'details' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Visit Details</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2"><User className="w-4 h-4 inline mr-2" />Client</label>
                  {clients.length > 0 ? (
                    <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="input-dark w-full">
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  ) : (
                    <div className="p-4 bg-dark-700/50 rounded-xl text-center">
                      <p className="text-dark-400 text-sm mb-2">No clients yet</p>
                      <button onClick={() => router.push('/clients')} className="text-primary-400 text-sm">Add a client first</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2"><Clock className="w-4 h-4 inline mr-2" />Start</label>
                  <input type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} className="input-dark w-full" />
                </div>
                <div>
                  <label className="block text-dark-300 text-sm font-medium mb-2"><Clock className="w-4 h-4 inline mr-2" />End</label>
                  <input type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} className="input-dark w-full" />
                </div>
                {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
                <button onClick={handleCreateVisit} disabled={loading || !selectedClient} className="btn-primary w-full py-3 disabled:opacity-50">
                  {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span> : <span className="flex items-center justify-center gap-2">Continue<ChevronRight className="w-4 h-4" /></span>}
                </button>
              </div>
            </div>
          )}

          {step === 'audio' && createdVisit && (
            <div className="space-y-4">
              <AudioUploader visitId={createdVisit.id} token={token!} onUploadComplete={() => { setStep('complete'); setTimeout(() => router.push(`/visits/${createdVisit.id}`), 2000); }} />
              <button onClick={() => router.push(`/visits/${createdVisit.id}`)} className="w-full text-center text-dark-400 hover:text-white py-2">Skip - upload later</button>
            </div>
          )}

          {step === 'complete' && (
            <div className="card p-8 text-center">
              <div className="w-20 h-20 bg-accent-green/20 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow"><Check className="w-10 h-10 text-accent-green" /></div>
              <h2 className="text-2xl font-bold text-white mb-2">Visit Created!</h2>
              <p className="text-dark-400">Redirecting...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
