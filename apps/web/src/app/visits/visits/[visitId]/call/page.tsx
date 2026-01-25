'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, User, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import CallInterface from '@/components/CallInterface';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface Visit {
  id: string;
  client_id: string;
  status: string;
}

interface Client {
  id: string;
  full_name: string;
  phone: string;
  phone_secondary?: string;
}

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = params.visitId as string;
  
  const [loading, setLoading] = useState(true);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [userPhone, setUserPhone] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      
      try {
        // Fetch visit
        const visitRes = await fetch(`${API_BASE}/visits/${visitId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (visitRes.ok) {
          const visitData = await visitRes.json();
          setVisit(visitData);
          
          // Fetch client
          if (visitData.client_id) {
            const clientRes = await fetch(`${API_BASE}/clients/${visitData.client_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (clientRes.ok) {
              setClient(await clientRes.json());
            }
          }
        }
        
        // Get user's phone from profile
        const meRes = await fetch(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const userData = await meRes.json();
          setUserPhone(userData.phone || '');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [visitId]);

  const handleCallComplete = (callId: string, hasRecording: boolean) => {
    // Navigate to the visit results page
    router.push(`/visits/${visitId}?tab=results`);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-dark-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-900/95 backdrop-blur border-b border-dark-700 p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-dark-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-dark-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Phone Assessment</h1>
              <p className="text-sm text-dark-400">
                Conduct a recorded assessment call with {client?.full_name || 'client'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-2xl mx-auto">
          {/* Client Info Card */}
          {client && (
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-400" />
                </div>
                <div className="flex-1">
                  <h2 className="font-medium text-white">{client.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-dark-400" />
                    <span className="text-dark-300">{client.phone || 'No phone on file'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Call Interface */}
          <CallInterface
            visitId={visitId}
            clientId={client?.id}
            clientName={client?.full_name}
            clientPhone={client?.phone || ''}
            caregiverPhone={userPhone}
            onCallComplete={handleCallComplete}
          />

          {/* Instructions */}
          <div className="mt-6 p-4 bg-dark-800 rounded-xl border border-dark-700">
            <h3 className="font-medium text-white mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-dark-300">
              <li>Enter your phone number and the client's phone number</li>
              <li>Click "Start Call" - we'll call your phone first</li>
              <li>When you answer, you'll hear a consent message</li>
              <li>Then we'll connect you to the client</li>
              <li>The call is recorded for care assessment</li>
              <li>When done, click "End Call"</li>
              <li>The recording is automatically transcribed and analyzed</li>
            </ol>
          </div>

          {/* Previous Calls */}
          <div className="mt-6">
            <h3 className="font-medium text-white mb-3">Previous Calls</h3>
            <PreviousCalls visitId={visitId} clientId={client?.id} />
          </div>
        </div>
      </main>
    </div>
  );
}

// Previous calls list component
function PreviousCalls({ visitId, clientId }: { visitId?: string; clientId?: string }) {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCalls = async () => {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/calls/?limit=5`;
      if (visitId) url += `&visit_id=${visitId}`;
      else if (clientId) url += `&client_id=${clientId}`;
      
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCalls(data.calls || []);
        }
      } catch (err) {
        console.error('Failed to fetch calls:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalls();
  }, [visitId, clientId]);

  if (loading) {
    return <div className="text-dark-400 text-sm">Loading...</div>;
  }

  if (calls.length === 0) {
    return (
      <div className="text-dark-400 text-sm p-4 bg-dark-800 rounded-xl border border-dark-700">
        No previous calls for this assessment
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calls.map(call => (
        <div 
          key={call.id} 
          className="p-3 bg-dark-800 rounded-xl border border-dark-700 flex items-center justify-between"
        >
          <div>
            <p className="text-white text-sm">
              {new Date(call.created_at).toLocaleDateString()} at{' '}
              {new Date(call.created_at).toLocaleTimeString()}
            </p>
            <p className="text-dark-400 text-xs">
              Duration: {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : 'N/A'}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-lg text-xs ${
            call.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            call.status === 'failed' ? 'bg-red-500/20 text-red-400' :
            'bg-dark-600 text-dark-300'
          }`}>
            {call.status}
          </span>
        </div>
      ))}
    </div>
  );
}
