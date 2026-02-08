'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, PhoneCall, Loader2, CheckCircle, 
  AlertCircle, Clock, User, MicOff, Volume2, 
  PhoneIncoming, PhoneOutgoing
} from 'lucide-react';
import { getStoredToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface CallInterfaceProps {
  visitId?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  caregiverPhone?: string;
  onCallComplete?: (callId: string, hasRecording: boolean) => void;
  onClose?: () => void;
}

type CallStatus = 
  | 'idle' 
  | 'initiated' 
  | 'caregiver_ringing' 
  | 'caregiver_connected' 
  | 'client_ringing' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'no_answer' 
  | 'busy' 
  | 'cancelled';

const STATUS_MESSAGES: Record<CallStatus, string> = {
  idle: 'Ready to start call',
  initiated: 'Initiating call...',
  caregiver_ringing: 'Calling you...',
  caregiver_connected: 'You answered, calling client...',
  client_ringing: 'Calling client...',
  in_progress: 'Call in progress - Recording',
  completed: 'Call completed',
  failed: 'Call failed',
  no_answer: 'No answer',
  busy: 'Line busy',
  cancelled: 'Call cancelled',
};

const STATUS_ICONS: Record<CallStatus, React.ReactNode> = {
  idle: <Phone className="w-8 h-8" />,
  initiated: <Loader2 className="w-8 h-8 animate-spin" />,
  caregiver_ringing: <PhoneIncoming className="w-8 h-8 animate-pulse" />,
  caregiver_connected: <PhoneOutgoing className="w-8 h-8 animate-pulse" />,
  client_ringing: <PhoneOutgoing className="w-8 h-8 animate-pulse" />,
  in_progress: <PhoneCall className="w-8 h-8 text-green-400" />,
  completed: <CheckCircle className="w-8 h-8 text-green-400" />,
  failed: <AlertCircle className="w-8 h-8 text-red-400" />,
  no_answer: <PhoneOff className="w-8 h-8 text-yellow-400" />,
  busy: <PhoneOff className="w-8 h-8 text-yellow-400" />,
  cancelled: <PhoneOff className="w-8 h-8 text-dark-400" />,
};

export default function CallInterface({
  visitId,
  clientId,
  clientName = 'Client',
  clientPhone: initialClientPhone = '',
  caregiverPhone: initialCaregiverPhone = '',
  onCallComplete,
  onClose,
}: CallInterfaceProps) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [callId, setCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [clientPhone, setClientPhone] = useState(initialClientPhone);
  const [caregiverPhone, setCaregiverPhone] = useState(initialCaregiverPhone);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Poll for call status
  const pollStatus = async () => {
    if (!callId) return;
    
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/calls/${callId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status as CallStatus);
        
        if (data.duration_seconds) {
          setDuration(data.duration_seconds);
        }
        
        if (data.error_message) {
          setError(data.error_message);
        }
        
        // Stop polling if call ended
        if (['completed', 'failed', 'no_answer', 'busy', 'cancelled'].includes(data.status)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          
          // Notify parent
          if (data.status === 'completed' && onCallComplete) {
            onCallComplete(callId, data.recording_available);
          }
        }
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  };

  // Start the call
  const startCall = async () => {
    if (!clientPhone || !caregiverPhone) {
      setError('Please enter both phone numbers');
      return;
    }
    
    setStatus('initiated');
    setError(null);
    
    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/calls/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caregiver_phone: caregiverPhone,
          client_phone: clientPhone,
          visit_id: visitId || null,
          client_id: clientId || null,
          client_name: clientName,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCallId(data.call_id);
        setStatus('caregiver_ringing');
        
        // Start polling
        pollIntervalRef.current = setInterval(pollStatus, 2000);
      } else {
        const err = await response.json();
        setError(err.detail || 'Failed to start call');
        setStatus('failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
      setStatus('failed');
    }
  };

  // End the call
  const endCall = async () => {
    if (!callId) return;
    
    try {
      const token = getStoredToken();
      await fetch(`${API_BASE}/calls/${callId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      setStatus('completed');
    } catch (err) {
      console.error('Failed to end call:', err);
    }
  };

  // Start duration timer when call is in progress
  useEffect(() => {
    if (status === 'in_progress' && !durationIntervalRef.current) {
      durationIntervalRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  // Update polling when callId changes
  useEffect(() => {
    if (callId && !pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(pollStatus, 2000);
    }
  }, [callId]);

  const isActive = ['initiated', 'caregiver_ringing', 'caregiver_connected', 'client_ringing', 'in_progress'].includes(status);
  const isEnded = ['completed', 'failed', 'no_answer', 'busy', 'cancelled'].includes(status);

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <h3 className="font-medium text-white">Assessment Call</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-700 rounded-lg transition"
          >
            <PhoneOff className="w-5 h-5 text-dark-400" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Status Display */}
        <div className="text-center mb-6">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            status === 'in_progress' ? 'bg-green-500/20 text-green-400' :
            isEnded && status !== 'completed' ? 'bg-red-500/20 text-red-400' :
            status === 'completed' ? 'bg-green-500/20 text-green-400' :
            'bg-primary-500/20 text-primary-400'
          }`}>
            {STATUS_ICONS[status]}
          </div>
          
          <p className="text-lg font-medium text-white mb-1">
            {STATUS_MESSAGES[status]}
          </p>
          
          {status === 'in_progress' && (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm">Recording</span>
              <span className="text-2xl font-mono ml-2">{formatDuration(duration)}</span>
            </div>
          )}
          
          {isEnded && duration > 0 && (
            <p className="text-dark-400 text-sm">Duration: {formatDuration(duration)}</p>
          )}
          
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Phone Number Inputs (only when idle) */}
        {status === 'idle' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Your Phone Number</label>
              <input
                type="tel"
                value={caregiverPhone}
                onChange={e => setCaregiverPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="input-dark w-full"
              />
              <p className="text-xs text-dark-500 mt-1">We'll call you first</p>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Client Phone Number</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+1 (555) 987-6543"
                className="input-dark w-full"
              />
              <p className="text-xs text-dark-500 mt-1">Then we'll connect you to {clientName}</p>
            </div>
          </div>
        )}

        {/* Call Info (when active) */}
        {isActive && (
          <div className="bg-dark-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-dark-400" />
                  <span className="text-sm text-dark-400">Caregiver</span>
                  {['caregiver_connected', 'client_ringing', 'in_progress', 'completed'].includes(status) && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <p className="text-white">{caregiverPhone}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-dark-400" />
                  <span className="text-sm text-dark-400">{clientName}</span>
                  {status === 'in_progress' && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <p className="text-white">{clientPhone}</p>
              </div>
            </div>
          </div>
        )}

        {/* Consent Notice */}
        {status === 'idle' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Volume2 className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium text-sm">Recording Consent</p>
                <p className="text-dark-300 text-sm mt-1">
                  Both parties will hear a consent message before the call is recorded.
                  The recording will be processed for care assessment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {status === 'idle' && (
            <button
              onClick={startCall}
              disabled={!clientPhone || !caregiverPhone}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
            >
              <Phone className="w-5 h-5" />
              Start Call
            </button>
          )}
          
          {isActive && (
            <button
              onClick={endCall}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          )}
          
          {isEnded && (
            <>
              {status === 'completed' && (
                <button
                  onClick={() => {
                    if (callId && onCallComplete) {
                      onCallComplete(callId, true);
                    }
                  }}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <CheckCircle className="w-5 h-5" />
                  View Results
                </button>
              )}
              <button
                onClick={() => {
                  setStatus('idle');
                  setCallId(null);
                  setError(null);
                  setDuration(0);
                }}
                className="flex-1 bg-dark-700 hover:bg-dark-600 text-white py-3 rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                New Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
