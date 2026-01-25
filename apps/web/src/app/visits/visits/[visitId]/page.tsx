'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Download, CheckCircle, AlertCircle, Clock, FileText, DollarSign, RefreshCw, Mic, Wand2, Users, FileSignature, X, ChevronRight, Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import AudioPlayer from '@/components/AudioPlayer';
import AudioUploader from '@/components/AudioUploader';
import TranscriptTimeline from '@/components/TranscriptTimeline';
import BillablesEditor from '@/components/BillablesEditor';
import ContractPreview from '@/components/ContractPreview';

const pipelineSteps = [
  { id: 'transcribe', key: 'transcription', label: 'Transcribe', icon: Mic },
  { id: 'diarize', key: 'diarization', label: 'Diarize', icon: Users },
  { id: 'align', key: 'alignment', label: 'Align', icon: Wand2 },
  { id: 'bill', key: 'billing', label: 'Bill', icon: DollarSign },
  { id: 'contract', key: 'contract', label: 'Contract', icon: FileSignature },
];

const contentTabs = [
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'billables', label: 'Billables', icon: DollarSign },
  { id: 'contract', label: 'Contract', icon: FileSignature },
];

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.visitId as string;
  const { token, isLoading: authLoading } = useAuth();
  const [visit, setVisit] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [billables, setBillables] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'transcript' | 'billables' | 'contract' | null>(null);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) router.push('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token && visitId) loadVisitData();
  }, [token, visitId]);

  const loadVisitData = async () => {
    try {
      setLoading(true);
      const visitData = await api.getVisit(token!, visitId);
      setVisit(visitData);
      setHasAudio(visitData.audio_assets?.length > 0);
      try { const t = await api.getTranscript(token!, visitId); setTranscript(t.segments); } catch {}
      try { const b = await api.getBillables(token!, visitId); setBillables(b.items); } catch {}
      try { const c = await api.getContract(token!, visitId); setContract(c); } catch {}
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const runPipelineStep = async (step: string) => {
    try {
      setProcessingStep(step);
      await api.runPipelineStep(token!, visitId, step);
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const status = await api.getPipelineStatus(token!, visitId);
        const key = step === 'transcribe' ? 'transcription' : step;
        if (status.pipeline_state[key]?.status === 'completed' || status.pipeline_state[key]?.status === 'failed') break;
      }
      await loadVisitData();
    } catch (err) { console.error(err); }
    finally { setProcessingStep(null); }
  };

  const getStepStatus = (step: any) => {
    if (processingStep === step.id) return 'processing';
    const state = visit?.pipeline_state?.[step.key];
    if (state?.status === 'completed') return 'completed';
    if (state?.status === 'failed') return 'failed';
    return 'pending';
  };

  const getTabCount = (tabId: string) => {
    switch (tabId) {
      case 'transcript': return transcript.length;
      case 'billables': return billables.length;
      case 'contract': return contract ? 1 : 0;
      default: return 0;
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-dark-900"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!visit) return <div className="min-h-screen flex items-center justify-center bg-dark-900"><p className="text-dark-400">Visit not found</p></div>;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 flex">
        {/* Main Content Area */}
        <div className={`flex-1 p-8 transition-all duration-300 ${activePanel ? 'mr-[500px]' : ''}`}>
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => router.push('/visits')} className="p-2.5 hover:bg-dark-700 rounded-xl">
                <ArrowLeft className="w-5 h-5 text-dark-300" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{visit.client?.full_name || 'Unknown'}</h1>
                <p className="text-dark-400">{visit.scheduled_start ? format(new Date(visit.scheduled_start), 'EEEE, MMMM d, yyyy • h:mm a') : 'Not scheduled'}</p>
              </div>
              <button 
                onClick={() => router.push(`/visits/${visitId}/call`)}
                className="btn-primary flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />Phone Call
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <Download className="w-5 h-5" />Export
              </button>
            </div>

            {/* Pipeline Steps */}
            <div className="card p-6 mb-6">
              <h3 className="text-sm font-medium text-dark-300 mb-4">Processing Pipeline</h3>
              <div className="flex gap-2">
                {pipelineSteps.map(step => {
                  const status = getStepStatus(step);
                  return (
                    <button key={step.id} onClick={() => runPipelineStep(step.id)} disabled={!!processingStep} className={`flex-1 p-3 rounded-xl border transition-all disabled:opacity-50 ${
                      status === 'completed' ? 'bg-accent-green/10 border-accent-green/30' : status === 'processing' ? 'bg-primary-500/10 border-primary-500/30' : status === 'failed' ? 'bg-red-500/10 border-red-500/30' : 'bg-dark-700/50 border-dark-600 hover:bg-dark-700'
                    }`}>
                      <div className="flex flex-col items-center gap-1.5">
                        {status === 'processing' ? <RefreshCw className="w-5 h-5 text-primary-400 animate-spin" /> : status === 'completed' ? <CheckCircle className="w-5 h-5 text-accent-green" /> : status === 'failed' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <step.icon className="w-5 h-5 text-dark-400" />}
                        <span className={`text-xs font-medium ${status === 'completed' ? 'text-accent-green' : status === 'processing' ? 'text-primary-400' : status === 'failed' ? 'text-red-400' : 'text-dark-300'}`}>{step.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Section */}
            <div className="mb-6">
              {hasAudio && !showUploader ? (
                <div className="card p-6"><AudioPlayer visitId={visitId} /></div>
              ) : (
                <AudioUploader visitId={visitId} token={token!} onUploadComplete={() => { setShowUploader(false); setHasAudio(true); loadVisitData(); }} onClose={hasAudio ? () => setShowUploader(false) : undefined} />
              )}
              {hasAudio && !showUploader && <button onClick={() => setShowUploader(true)} className="mt-3 text-sm text-dark-400 hover:text-primary-400">Upload additional audio</button>}
            </div>

            {/* Content Tabs - Click to Open Side Panel */}
            <div className="grid grid-cols-3 gap-3">
              {contentTabs.map(tab => {
                const count = getTabCount(tab.id);
                const isActive = activePanel === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePanel(isActive ? null : tab.id as any)}
                    className={`p-4 rounded-xl border transition-all group ${
                      isActive 
                        ? 'bg-primary-500/20 border-primary-500/50 shadow-glow' 
                        : 'bg-dark-800/50 border-dark-700 hover:bg-dark-700/70 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <tab.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-dark-400'}`} />
                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-primary-400 rotate-180' : 'text-dark-500 group-hover:text-dark-400'}`} />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${isActive ? 'text-primary-300' : 'text-white'}`}>{tab.label}</p>
                      <p className={`text-sm ${isActive ? 'text-primary-400/70' : 'text-dark-400'}`}>
                        {count > 0 ? `${count} item${count !== 1 ? 's' : ''}` : 'No data'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {activePanel && (
          <div className="fixed right-0 top-0 h-screen w-[500px] bg-dark-850 border-l border-dark-700 shadow-2xl flex flex-col z-50">
            {/* Panel Header with Tabs */}
            <div className="flex items-center border-b border-dark-700 bg-dark-800/50">
              <div className="flex-1 flex">
                {contentTabs.map(tab => {
                  const count = getTabCount(tab.id);
                  const isActive = activePanel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActivePanel(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                        isActive 
                          ? 'border-primary-500 text-primary-400 bg-dark-800/50' 
                          : 'border-transparent text-dark-400 hover:text-dark-200 hover:bg-dark-700/30'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                      {count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          isActive ? 'bg-primary-500/20 text-primary-300' : 'bg-dark-600 text-dark-300'
                        }`}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setActivePanel(null)} className="p-3 hover:bg-dark-700 transition-colors">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {activePanel === 'transcript' && <TranscriptTimeline segments={transcript} />}
              {activePanel === 'billables' && <BillablesEditor items={billables} visitId={visitId} onUpdate={loadVisitData} />}
              {activePanel === 'contract' && (
                <ContractPreview contract={contract} client={visit.client} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
