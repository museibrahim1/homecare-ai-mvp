'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  RefreshCw,
  Mic,
  FileCheck,
  X,
  ChevronRight,
  PanelRightOpen,
  Upload
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Visit, TranscriptSegment, BillableItem } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import AudioPlayer from '@/components/AudioPlayer';
import AudioUploader from '@/components/AudioUploader';
import TranscriptTimeline from '@/components/TranscriptTimeline';
import BillablesEditor from '@/components/BillablesEditor';
import ContractPreview from '@/components/ContractPreview';
import TranscriptImporter from '@/components/TranscriptImporter';

// Pipeline steps - diarize and align disabled for now
const pipelineSteps = [
  { id: 'transcribe', key: 'transcription', label: 'Transcribe', icon: Mic, enabled: true },
  { id: 'bill', key: 'billing', label: 'Bill', icon: DollarSign, enabled: true },
  { id: 'contract', key: 'contract', label: 'Contract', icon: FileCheck, enabled: true },
];

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.visitId as string;
  const { token, isLoading: authLoading } = useAuth();
  
  const [visit, setVisit] = useState<Visit | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [billables, setBillables] = useState<BillableItem[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'transcript' | 'billables' | 'contract'>('transcript');
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [uploadMode, setUploadMode] = useState<'audio' | 'transcript'>('audio');

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
      
      const audioExists = visitData.audio_assets && visitData.audio_assets.length > 0;
      setHasAudio(audioExists);

      try {
        const transcriptData = await api.getTranscript(token!, visitId);
        setTranscript(transcriptData.segments);
      } catch (e) {}

      try {
        const billablesData = await api.getBillables(token!, visitId);
        setBillables(billablesData.items);
      } catch (e) {}

      try {
        const contractData = await api.getContract(token!, visitId);
        setContract(contractData);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load visit:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUploadComplete = () => {
    setShowUploader(false);
    setHasAudio(true);
    loadVisitData();
  };

  const handleImportComplete = () => {
    setShowUploader(false);
    loadVisitData();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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

  const panelTabs = [
    { id: 'transcript', label: 'Transcript', icon: FileText, count: transcript.length, color: 'blue' },
    { id: 'billables', label: 'Billables', icon: DollarSign, count: billables.length, color: 'green' },
    { id: 'contract', label: 'Contract', icon: FileCheck, count: contract ? 1 : 0, color: 'purple' },
  ];

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      {/* Main Content */}
      <main className={`flex-1 p-8 transition-all duration-300 ${sidebarOpen ? 'mr-[420px]' : ''}`}>
        <div className="max-w-5xl mx-auto">
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
            <button 
              onClick={toggleSidebar}
              className={`p-2.5 rounded-xl transition-colors ${sidebarOpen ? 'bg-primary-500 text-white' : 'hover:bg-dark-700 text-dark-300'}`}
              title="Toggle Preview Panel"
            >
              <PanelRightOpen className="w-5 h-5" />
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>

          {/* Pipeline Steps */}
          <div className="card p-5 mb-6">
            <h3 className="text-sm font-medium text-dark-300 mb-3">Processing Pipeline</h3>
            <div className="flex gap-2">
              {pipelineSteps.filter(s => s.enabled).map((step) => {
                const status = getStepStatus(step);
                const StepIcon = step.icon;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => runPipelineStep(step.id)}
                    disabled={processingStep !== null}
                    className={`flex-1 p-3 rounded-lg border transition-all duration-300 disabled:opacity-50 ${
                      status === 'completed'
                        ? 'bg-accent-green/10 border-accent-green/30 hover:bg-accent-green/20'
                        : status === 'processing'
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : status === 'failed'
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-dark-700/50 border-dark-600 hover:bg-dark-700 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      {status === 'processing' ? (
                        <RefreshCw className="w-5 h-5 text-primary-400 animate-spin" />
                      ) : status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-accent-green" />
                      ) : status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <StepIcon className="w-5 h-5 text-dark-400" />
                      )}
                      <span className={`text-xs font-medium ${
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

          {/* Upload Section - Audio or Transcript */}
          <div className="mb-6">
            {showUploader ? (
              <div className="space-y-4">
                {/* Upload Mode Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setUploadMode('audio')}
                    className={`flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      uploadMode === 'audio' 
                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-400' 
                        : 'bg-dark-700/50 border-dark-600 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    Upload Audio
                  </button>
                  <button
                    onClick={() => setUploadMode('transcript')}
                    className={`flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      uploadMode === 'transcript' 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' 
                        : 'bg-dark-700/50 border-dark-600 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Import Transcript
                  </button>
                </div>
                
                {uploadMode === 'audio' ? (
                  <AudioUploader
                    visitId={visitId}
                    token={token!}
                    onUploadComplete={handleUploadComplete}
                    onClose={() => setShowUploader(false)}
                  />
                ) : (
                  <TranscriptImporter
                    visitId={visitId}
                    token={token!}
                    onImportComplete={handleImportComplete}
                  />
                )}
                
                <button
                  onClick={() => setShowUploader(false)}
                  className="w-full text-center text-dark-400 hover:text-white py-2 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : hasAudio || transcript.length > 0 ? (
              <div className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {hasAudio && <AudioPlayer visitId={visitId} />}
                    {!hasAudio && transcript.length > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Transcript Imported</p>
                          <p className="text-dark-400 text-sm">{transcript.length} segments</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Always visible upload buttons */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setUploadMode('audio'); setShowUploader(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 hover:border-primary-500/50 rounded-lg transition-all text-primary-400 text-sm font-medium"
                    >
                      <Mic className="w-4 h-4" />
                      Upload Audio
                    </button>
                    <button
                      onClick={() => { setUploadMode('transcript'); setShowUploader(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all text-purple-400 text-sm font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Import Transcript
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">Add Recording or Transcript</h3>
                  <p className="text-dark-400 text-sm">Upload audio or import a transcript to get started</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { setUploadMode('audio'); setShowUploader(true); }}
                    className="p-5 bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-primary-500 rounded-xl transition-all group"
                  >
                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:bg-primary-500/30 transition">
                      <Mic className="w-6 h-6 text-primary-400" />
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1">Upload Audio</h4>
                    <p className="text-dark-400 text-xs">MP3, WAV, M4A</p>
                  </button>
                  
                  <button
                    onClick={() => { setUploadMode('transcript'); setShowUploader(true); }}
                    className="p-5 bg-dark-700/50 hover:bg-dark-700 border border-dark-600 hover:border-purple-500 rounded-xl transition-all group"
                  >
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:bg-purple-500/30 transition">
                      <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1">Import Transcript</h4>
                    <p className="text-dark-400 text-xs">SRT, VTT, TXT</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            {panelTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActivePanel(tab.id as any);
                    setSidebarOpen(true);
                  }}
                  className={`card p-4 text-left hover:bg-dark-700/50 transition-all duration-200 group ${
                    activePanel === tab.id && sidebarOpen ? 'ring-2 ring-primary-500/50 bg-dark-700/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      tab.color === 'blue' ? 'bg-blue-500/20' :
                      tab.color === 'green' ? 'bg-green-500/20' :
                      'bg-purple-500/20'
                    }`}>
                      <TabIcon className={`w-4 h-4 ${
                        tab.color === 'blue' ? 'text-blue-400' :
                        tab.color === 'green' ? 'text-green-400' :
                        'text-purple-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white">{tab.label}</h3>
                      <p className="text-xs text-dark-400">
                        {tab.id === 'contract' 
                          ? (contract ? 'Generated' : 'Pending')
                          : `${tab.count} ${tab.id === 'transcript' ? 'segments' : 'items'}`
                        }
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Slide-out Preview Panel - Compact */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] bg-dark-800 border-l border-dark-700 shadow-xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-800/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Preview</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-dark-400" />
          </button>
        </div>

        {/* Panel Tabs */}
        <div className="flex border-b border-dark-700 px-2 pt-2 gap-1 bg-dark-800/50">
          {panelTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activePanel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all ${
                  isActive
                    ? 'bg-dark-700 text-white border-b-2 border-primary-500'
                    : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-primary-500/30 text-primary-300' : 'bg-dark-600 text-dark-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {activePanel === 'transcript' && (
            <TranscriptTimeline segments={transcript} />
          )}
          {activePanel === 'billables' && (
            <BillablesEditor
              items={billables}
              visitId={visitId}
              onUpdate={loadVisitData}
            />
          )}
          {activePanel === 'contract' && (
            <ContractPreview contract={contract} client={visit?.client} />
          )}
        </div>
      </div>
    </div>
  );
}
