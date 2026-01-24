'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Play,
  Pause,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Visit, TranscriptSegment, BillableItem } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import AudioPlayer from '@/components/AudioPlayer';
import TranscriptTimeline from '@/components/TranscriptTimeline';
import BillablesEditor from '@/components/BillablesEditor';
import NotePreview from '@/components/NotePreview';

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.visitId as string;
  const { token, isLoading: authLoading } = useAuth();
  
  const [visit, setVisit] = useState<Visit | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [billables, setBillables] = useState<BillableItem[]>([]);
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'billables' | 'note'>('transcript');
  const [processingStep, setProcessingStep] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token && visitId) {
      loadVisitData();
    }
  }, [token, visitId]);

  const loadVisitData = async () => {
    try {
      setLoading(true);
      const visitData = await api.getVisit(token!, visitId);
      setVisit(visitData);

      // Load transcript if available
      try {
        const transcriptData = await api.getTranscript(token!, visitId);
        setTranscript(transcriptData.segments);
      } catch (e) {
        // Transcript not available yet
      }

      // Load billables if available
      try {
        const billablesData = await api.getBillables(token!, visitId);
        setBillables(billablesData.items);
      } catch (e) {
        // Billables not available yet
      }

      // Load note if available
      try {
        const noteData = await api.getNote(token!, visitId);
        setNote(noteData);
      } catch (e) {
        // Note not available yet
      }
    } catch (err) {
      console.error('Failed to load visit:', err);
    } finally {
      setLoading(false);
    }
  };

  const runPipelineStep = async (step: string) => {
    if (!token || !visitId) return;
    
    try {
      setProcessingStep(step);
      await api.runPipelineStep(token, visitId, step);
      
      // Poll for completion
      let attempts = 0;
      while (attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await api.getPipelineStatus(token, visitId);
        const stepState = status.pipeline_state[step === 'transcribe' ? 'transcription' : step];
        
        if (stepState?.status === 'completed' || stepState?.status === 'failed') {
          break;
        }
        attempts++;
      }
      
      // Reload data
      await loadVisitData();
    } catch (err) {
      console.error(`Pipeline step ${step} failed:`, err);
    } finally {
      setProcessingStep(null);
    }
  };

  const getPipelineStatus = (step: string) => {
    if (!visit?.pipeline_state) return null;
    return visit.pipeline_state[step];
  };

  const getStepIcon = (step: string) => {
    const status = getPipelineStatus(step);
    if (processingStep === step) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (status?.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (status?.status === 'failed') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Visit not found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/visits')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Visit: {visit.client?.full_name || 'Unknown Client'}
              </h1>
              <p className="text-gray-600">
                {visit.scheduled_start 
                  ? format(new Date(visit.scheduled_start), 'MMMM d, yyyy - h:mm a')
                  : 'Not scheduled'
                }
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/api/exports/visits/${visitId}/timesheet.csv`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Pipeline Steps */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Processing Pipeline</h3>
            <div className="flex gap-4">
              {['transcribe', 'diarize', 'align', 'bill', 'note'].map((step) => (
                <button
                  key={step}
                  onClick={() => runPipelineStep(step)}
                  disabled={processingStep !== null}
                  className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {getStepIcon(step === 'transcribe' ? 'transcription' : step)}
                  <span className="text-sm capitalize">{step}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Player */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <AudioPlayer visitId={visitId} />
          </div>

          {/* Tabs */}
          <div className="border-b mb-6">
            <div className="flex gap-8">
              {[
                { id: 'transcript', label: 'Transcript', icon: FileText },
                { id: 'billables', label: 'Billable Items', icon: DollarSign },
                { id: 'note', label: 'Visit Note', icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-1 py-3 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg border">
            {activeTab === 'transcript' && (
              <TranscriptTimeline segments={transcript} />
            )}
            {activeTab === 'billables' && (
              <BillablesEditor
                items={billables}
                visitId={visitId}
                onUpdate={loadVisitData}
              />
            )}
            {activeTab === 'note' && (
              <NotePreview note={note} visitId={visitId} onUpdate={loadVisitData} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
