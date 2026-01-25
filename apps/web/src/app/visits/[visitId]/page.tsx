'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  DollarSign,
  RefreshCw,
  Mic,
  Wand2,
  Users,
  FileCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Visit, TranscriptSegment, BillableItem } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import AudioPlayer from '@/components/AudioPlayer';
import TranscriptTimeline from '@/components/TranscriptTimeline';
import BillablesEditor from '@/components/BillablesEditor';
import NotePreview from '@/components/NotePreview';

const pipelineSteps = [
  { id: 'transcribe', key: 'transcription', label: 'Transcribe', icon: Mic },
  { id: 'diarize', key: 'diarization', label: 'Diarize', icon: Users },
  { id: 'align', key: 'alignment', label: 'Align', icon: Wand2 },
  { id: 'bill', key: 'billing', label: 'Bill', icon: DollarSign },
  { id: 'note', key: 'note', label: 'Note', icon: FileCheck },
];

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

      try {
        const transcriptData = await api.getTranscript(token!, visitId);
        setTranscript(transcriptData.segments);
      } catch (e) {}

      try {
        const billablesData = await api.getBillables(token!, visitId);
        setBillables(billablesData.items);
      } catch (e) {}

      try {
        const noteData = await api.getNote(token!, visitId);
        setNote(noteData);
      } catch (e) {}
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
      
      let attempts = 0;
      while (attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await api.getPipelineStatus(token, visitId);
        const stepKey = step === 'transcribe' ? 'transcription' : step;
        const stepState = status.pipeline_state[stepKey];
        
        if (stepState?.status === 'completed' || stepState?.status === 'failed') {
          break;
        }
        attempts++;
      }
      
      await loadVisitData();
    } catch (err) {
      console.error(`Pipeline step ${step} failed:`, err);
    } finally {
      setProcessingStep(null);
    }
  };

  const getPipelineStatus = (key: string) => {
    if (!visit?.pipeline_state) return null;
    return visit.pipeline_state[key];
  };

  const getStepStatus = (step: typeof pipelineSteps[0]) => {
    const status = getPipelineStatus(step.key);
    if (processingStep === step.id) return 'processing';
    if (status?.status === 'completed') return 'completed';
    if (status?.status === 'failed') return 'failed';
    return 'pending';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-dark-400" />
          </div>
          <p className="text-dark-300">Visit not found</p>
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
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/visits')}
              className="p-2.5 hover:bg-dark-700 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-dark-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {visit.client?.full_name || 'Unknown Client'}
              </h1>
              <p className="text-dark-400">
                {visit.scheduled_start 
                  ? format(new Date(visit.scheduled_start), 'EEEE, MMMM d, yyyy • h:mm a')
                  : 'Not scheduled'
                }
              </p>
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>

          {/* Pipeline Steps */}
          <div className="card p-6 mb-6">
            <h3 className="text-sm font-medium text-dark-300 mb-4">Processing Pipeline</h3>
            <div className="flex gap-3">
              {pipelineSteps.map((step, index) => {
                const status = getStepStatus(step);
                const StepIcon = step.icon;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => runPipelineStep(step.id)}
                    disabled={processingStep !== null}
                    className={`flex-1 p-4 rounded-xl border transition-all duration-300 disabled:opacity-50 ${
                      status === 'completed'
                        ? 'bg-accent-green/10 border-accent-green/30 hover:bg-accent-green/20'
                        : status === 'processing'
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-dark-700/50 border-dark-600 hover:bg-dark-700 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {status === 'processing' ? (
                        <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />
                      ) : status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-accent-green" />
                      ) : status === 'failed' ? (
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      ) : (
                        <StepIcon className="w-6 h-6 text-dark-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        status === 'completed' ? 'text-accent-green' :
                        status === 'processing' ? 'text-primary-400' :
                        status === 'failed' ? 'text-red-400' :
                        'text-dark-300'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio Player */}
          <div className="card p-6 mb-6">
            <AudioPlayer visitId={visitId} />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {[
              { id: 'transcript', label: 'Transcript', icon: FileText, count: transcript.length },
              { id: 'billables', label: 'Billable Items', icon: DollarSign, count: billables.length },
              { id: 'note', label: 'Visit Note', icon: FileCheck, count: note ? 1 : 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-glow'
                    : 'bg-dark-700/50 text-dark-300 hover:bg-dark-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-dark-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="card">
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
