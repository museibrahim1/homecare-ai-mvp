'use client';

import { useEffect, useState, useRef } from 'react';
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
  Upload,
  Sparkles,
  FileSpreadsheet,
  File,
  ChevronDown,
  Loader2,
  Users,
  ClipboardList,
  RotateCcw,
  Maximize2
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Pipeline steps
const pipelineSteps = [
  { id: 'transcribe', key: 'transcription', label: 'Transcribe', icon: Mic, enabled: true },
  { id: 'diarize', key: 'diarization', label: 'Diarize', icon: Users, enabled: true },
  { id: 'bill', key: 'billing', label: 'Bill', icon: DollarSign, enabled: true },
  { id: 'note', key: 'note', label: 'Notes', icon: ClipboardList, enabled: true },
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
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'transcript' | 'billables' | 'notes' | 'contract'>('transcript');
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [uploadMode, setUploadMode] = useState<'audio' | 'transcript'>('audio');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(420);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const [popoutPanel, setPopoutPanel] = useState<string | null>(null);

  // Drag-to-resize panel handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      e.preventDefault();
      const delta = startX.current - e.clientX;
      // Cap at 55% of viewport to prevent content from being crushed
      // (sidebar nav ~288px needs room + main content needs at least ~400px)
      const maxWidth = Math.min(900, window.innerWidth * 0.55);
      const newWidth = Math.max(300, Math.min(maxWidth, startWidth.current + delta));
      setPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Close export menu when clicking outside - only attach when menu is open
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

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

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth || panelRef.current?.offsetWidth || 420;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
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
        const stepState = status?.pipeline_state?.[stepKey];
        
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

  // Restart assessment - clear all data
  const handleRestartAssessment = async () => {
    if (!token || !visitId) return;
    
    setRestarting(true);
    try {
      await api.restartAssessment(token, visitId);
      
      // Clear ALL local state including audio
      setTranscript([]);
      setBillables([]);
      setContract(null);
      setNote(null);
      setHasAudio(false);
      setSidebarOpen(false);
      
      // Reload visit data (will show fresh empty state)
      await loadVisitData();
      
      setShowRestartModal(false);
    } catch (error) {
      console.error('Failed to restart assessment:', error);
      alert('Failed to restart assessment. Please try again.');
    } finally {
      setRestarting(false);
    }
  };

  // Export functions
  const handleExport = async (type: 'contract' | 'contract-template' | 'contract-docx' | 'timesheet' | 'note') => {
    if (!token || !visitId) return;
    
    const endpoints: Record<string, string> = {
      contract: `/exports/visits/${visitId}/contract.pdf`,
      'contract-template': `/exports/visits/${visitId}/contract-template.docx`,
      'contract-docx': `/exports/visits/${visitId}/contract.docx`,
      timesheet: `/exports/visits/${visitId}/timesheet.csv`,
      note: `/exports/visits/${visitId}/note.pdf`,
    };
    
    try {
      const response = await fetch(`${API_BASE}${endpoints[type]}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || `Failed to export ${type}`);
        return;
      }
      
      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const clientName = visit?.client?.full_name?.replace(/ /g, '_') || 'Client';
      
      if (type === 'timesheet') {
        a.download = `timesheet_${visitId}.csv`;
      } else if (type === 'contract-template' || type === 'contract-docx') {
        a.download = `Contract_${clientName}.docx`;
      } else if (type === 'contract') {
        a.download = `contract_${visitId}.pdf`;
      } else {
        a.download = `note_${visitId}.pdf`;
      }
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(`Export ${type} failed:`, err);
      alert(`Failed to export ${type}`);
    }
    
    setShowExportMenu(false);
  };

  // Generate Proposal - runs all necessary pipeline steps
  const handleGenerateProposal = async () => {
    if (!token || !visitId) return;
    
    // Check if we have a transcript
    if (transcript.length === 0) {
      alert('Please upload audio or import a transcript first');
      return;
    }
    
    setGeneratingProposal(true);
    
    try {
      // Run billing step if not completed
      const billingStatus = getPipelineStatus('billing');
      if (!billingStatus || billingStatus.status !== 'completed') {
        setProcessingStep('bill');
        await api.runPipelineStep(token, visitId, 'bill');
        
        // Wait for completion
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const status = await api.getPipelineStatus(token, visitId);
          if (status.pipeline_state.billing?.status === 'completed' || 
              status.pipeline_state.billing?.status === 'failed') {
            break;
          }
        }
      }
      
      // Run contract generation
      setProcessingStep('contract');
      await api.runPipelineStep(token, visitId, 'contract');
      
      // Wait for contract completion
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await api.getPipelineStatus(token, visitId);
        if (status.pipeline_state.contract?.status === 'completed' || 
            status.pipeline_state.contract?.status === 'failed') {
          break;
        }
      }
      
      // Reload data and open contract panel
      await loadVisitData();
      setActivePanel('contract');
      setSidebarOpen(true);
      
    } catch (err) {
      console.error('Generate proposal failed:', err);
      alert('Failed to generate proposal. Please try again.');
    } finally {
      setGeneratingProposal(false);
      setProcessingStep(null);
    }
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
    { id: 'notes', label: 'Notes', icon: ClipboardList, count: note && note.id ? 1 : 0, color: 'amber' },
    { id: 'contract', label: 'Contract', icon: FileCheck, count: contract ? 1 : 0, color: 'purple' },
  ];

  return (
    <div className="flex min-h-screen bg-dark-900 overflow-x-hidden">
      <Sidebar />
      
      {/* Main Content - push content right when panel is open */}
      <main 
        className={`flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-[margin] duration-300 overflow-x-hidden ${sidebarOpen && !panelWidth ? 'lg:mr-[420px] xl:mr-[450px] 2xl:mr-[500px]' : ''}`}
        style={sidebarOpen && panelWidth && typeof window !== 'undefined' && window.innerWidth >= 1024 ? { marginRight: `${panelWidth}px` } : undefined}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
            <button
              onClick={() => router.push('/visits')}
              className="p-2 sm:p-2.5 hover:bg-dark-700 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-dark-300" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                {visit.client?.full_name || 'Unknown Client'}
              </h1>
              <p className="text-dark-400 text-sm sm:text-base truncate">
                {visit.scheduled_start 
                  ? format(new Date(visit.scheduled_start), 'EEEE, MMMM d, yyyy • h:mm a')
                  : 'Not scheduled'
                }
              </p>
            </div>
            
            {/* Action buttons - wrap on small screens */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Generate Proposal CTA */}
              {transcript.length > 0 && !contract && (
                <button
                  onClick={handleGenerateProposal}
                  disabled={generatingProposal || processingStep !== null}
                  className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary-500 to-accent-cyan text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 text-sm sm:text-base"
                >
                  {generatingProposal ? (
                    <>
                      <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
                      <span className="hidden sm:inline">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 sm:w-5 h-4 sm:h-5" />
                      <span className="hidden sm:inline">Generate Proposal</span>
                    </>
                  )}
                </button>
              )}
              
              <button 
                onClick={toggleSidebar}
                className={`p-2 sm:p-2.5 rounded-xl transition-colors ${sidebarOpen ? 'bg-primary-500 text-white' : 'hover:bg-dark-700 text-dark-300'}`}
                title="Toggle Preview Panel"
              >
                <PanelRightOpen className="w-5 h-5" />
              </button>
              
              {/* Restart Button */}
              {(transcript.length > 0 || billables.length > 0 || contract || note) && (
                <button 
                  onClick={() => setShowRestartModal(true)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                  title="Restart Assessment"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Restart</span>
                </button>
              )}
              
              {/* Export Dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn-secondary flex items-center gap-1 sm:gap-2 text-sm sm:text-base px-2 sm:px-4"
                >
                  <Download className="w-4 sm:w-5 h-4 sm:h-5" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-dark-800 border border-dark-600 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => handleExport('contract-template')}
                      disabled={!contract}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                        <FileCheck className="w-4 h-4 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Contract (Your Template)</p>
                        <p className="text-xs text-dark-400">Uses your uploaded template</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleExport('contract-docx')}
                      disabled={!contract}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <File className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Contract DOCX</p>
                        <p className="text-xs text-dark-400">Editable Word document</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleExport('contract')}
                      disabled={!contract}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <File className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Contract PDF</p>
                        <p className="text-xs text-dark-400">Default format</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleExport('timesheet')}
                      disabled={billables.length === 0}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Timesheet CSV</p>
                        <p className="text-xs text-dark-400">Billable hours</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleExport('note')}
                      disabled={!visit?.pipeline_state?.note?.status}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Visit Note PDF</p>
                        <p className="text-xs text-dark-400">Care documentation</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Pipeline Steps */}
          <div className="card p-3 sm:p-5 mb-6">
            <h3 className="text-sm font-medium text-dark-300 mb-3">Processing Pipeline</h3>
            <div className="grid grid-cols-2 sm:flex gap-2">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {panelTabs.map((tab) => {
              const TabIcon = tab.icon;
              const bgColor = tab.color === 'blue' ? 'bg-blue-500/20' :
                tab.color === 'green' ? 'bg-green-500/20' :
                tab.color === 'amber' ? 'bg-amber-500/20' :
                'bg-purple-500/20';
              const textColor = tab.color === 'blue' ? 'text-blue-400' :
                tab.color === 'green' ? 'text-green-400' :
                tab.color === 'amber' ? 'text-amber-400' :
                'text-purple-400';
              return (
                <button
                  key={tab.id}
                  onClick={() => setPopoutPanel(tab.id)}
                  className={`card p-4 text-left hover:bg-dark-700/50 transition-all duration-200 group ${
                    activePanel === tab.id && sidebarOpen ? 'ring-2 ring-primary-500/50 bg-dark-700/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgColor}`}>
                      <TabIcon className={`w-4 h-4 ${textColor}`} />
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
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setActivePanel(tab.id as any); setSidebarOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-dark-600 transition-colors"
                      title={`Open ${tab.label} in sidebar`}
                    >
                      <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Slide-out Preview Panel - Responsive Width */}
      {sidebarOpen && (
      <>
        {/* Overlay backdrop - show on smaller screens where panel overlaps content */}
        <div 
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
        <div
          ref={panelRef}
          className={`fixed top-0 right-0 h-full bg-dark-850 border-l border-dark-700 shadow-2xl z-40 flex flex-col ${
            !panelWidth ? 'w-[92vw] sm:w-[340px] md:w-[380px] lg:w-[420px] xl:w-[450px] 2xl:w-[500px] max-w-[calc(100vw-4rem)]' : ''
          }`}
          style={panelWidth ? { width: `${panelWidth}px`, maxWidth: 'calc(100vw - 4rem)' } : undefined}
        >
          {/* Drag handle for resizing - visible on larger screens */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary-500/30 z-50 group hidden lg:flex items-center"
            onMouseDown={handleResizeStart}
          >
            <div className="w-1 h-12 bg-dark-500 group-hover:bg-primary-400 rounded-full transition-colors mx-auto" />
          </div>
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Document Preview</h3>
              <p className="text-xs text-dark-400">Review generated content</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPopoutPanel(activePanel); setSidebarOpen(false); }}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors group"
              title="Open in full view"
            >
              <Maximize2 className="w-4 h-4 text-dark-400 group-hover:text-white" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors group"
            >
              <X className="w-5 h-5 text-dark-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Panel Tabs - Scrollable on smaller screens */}
        <div className="flex border-b border-dark-700 px-2 sm:px-4 pt-2 sm:pt-3 gap-1 sm:gap-2 bg-dark-800 overflow-x-auto scrollbar-hide">
          {panelTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activePanel === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActivePanel(tab.id as any);
                }}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg cursor-pointer select-none whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-primary-500/20 text-white border border-primary-500/30'
                    : 'text-dark-400 hover:text-white hover:bg-dark-700/50 border border-transparent'
                }`}
              >
                <TabIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${isActive ? 'text-primary-400' : ''}`} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                    isActive 
                      ? 'bg-primary-500/30 text-primary-300' 
                      : 'bg-dark-600 text-dark-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Panel Content - Fill remaining height */}
        <div className="flex-1 min-h-0 bg-dark-850 flex flex-col overflow-hidden">
          {activePanel === 'transcript' && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TranscriptTimeline segments={transcript} />
            </div>
          )}
          {activePanel === 'billables' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <BillablesEditor
                items={billables}
                visitId={visitId}
                onUpdate={loadVisitData}
              />
            </div>
          )}
          {activePanel === 'notes' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {note && note.id ? (
                <div className="space-y-6">
                  {/* SOAP Notes */}
                  <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Visit Notes (SOAP)</h3>
                    
                    {note.structured_data && note.structured_data.subjective && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-amber-400 mb-1">Subjective</h4>
                        <p className="text-dark-200 text-sm">{note.structured_data.subjective}</p>
                      </div>
                    )}
                    
                    {note.structured_data && note.structured_data.objective && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-blue-400 mb-1">Objective</h4>
                        <p className="text-dark-200 text-sm">{note.structured_data.objective}</p>
                      </div>
                    )}
                    
                    {note.structured_data && note.structured_data.assessment && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-green-400 mb-1">Assessment</h4>
                        <p className="text-dark-200 text-sm">{note.structured_data.assessment}</p>
                      </div>
                    )}
                    
                    {note.structured_data && note.structured_data.plan && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-purple-400 mb-1">Plan</h4>
                        <p className="text-dark-200 text-sm">{note.structured_data.plan}</p>
                      </div>
                    )}
                    
                    {(!note.structured_data || (!note.structured_data.subjective && !note.structured_data.objective && !note.structured_data.assessment && !note.structured_data.plan)) && (
                      <p className="text-dark-400 text-sm">No SOAP data available</p>
                    )}
                  </div>
                  
                  {/* Narrative */}
                  {note.narrative && (
                    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                      <h3 className="text-lg font-semibold text-white mb-2">Narrative Summary</h3>
                      <p className="text-dark-200 text-sm whitespace-pre-wrap">{note.narrative}</p>
                    </div>
                  )}
                  
                  {/* Tasks Performed */}
                  {note.structured_data && Array.isArray(note.structured_data.tasks_performed) && note.structured_data.tasks_performed.length > 0 && (
                    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                      <h3 className="text-lg font-semibold text-white mb-2">Tasks Performed</h3>
                      <ul className="space-y-3">
                        {note.structured_data.tasks_performed.map((task: any, i: number) => (
                          <li key={i} className="bg-dark-700/50 rounded-lg p-3">
                            {typeof task === 'string' ? (
                              <p className="text-dark-200 text-sm">{task}</p>
                            ) : (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-white">{task.task || 'Task'}</span>
                                  {task.duration_minutes && (
                                    <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                                      {task.duration_minutes} min
                                    </span>
                                  )}
                                </div>
                                {task.details && (
                                  <p className="text-dark-300 text-sm mt-1">{task.details}</p>
                                )}
                                {task.client_response && (
                                  <p className="text-dark-400 text-xs mt-1 italic">Client: {task.client_response}</p>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-dark-400">
                  <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
                  <p>No notes generated yet</p>
                  <p className="text-sm">Click the "Notes" button in the pipeline to generate</p>
                </div>
              )}
            </div>
          )}
          {activePanel === 'contract' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              <ContractPreview 
                contract={contract} 
                client={visit?.client}
                visitId={visitId}
                onContractUpdate={setContract}
              />
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Pop-out Full View Modal - z-[70] to render above sidebar nav (z-[60]) */}
      {popoutPanel && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                {(() => {
                  const tab = panelTabs.find(t => t.id === popoutPanel);
                  if (!tab) return null;
                  const TabIcon = tab.icon;
                  const bgColor = tab.color === 'blue' ? 'bg-blue-500/20' :
                    tab.color === 'green' ? 'bg-green-500/20' :
                    tab.color === 'amber' ? 'bg-amber-500/20' :
                    'bg-purple-500/20';
                  const txtColor = tab.color === 'blue' ? 'text-blue-400' :
                    tab.color === 'green' ? 'text-green-400' :
                    tab.color === 'amber' ? 'text-amber-400' :
                    'text-purple-400';
                  return (
                    <>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                        <TabIcon className={`w-5 h-5 ${txtColor}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{tab.label}</h3>
                        <p className="text-xs text-dark-400">
                          {tab.id === 'contract' 
                            ? (contract ? 'Generated - Click Edit to modify' : 'Pending')
                            : `${tab.count} ${tab.id === 'transcript' ? 'segments' : 'items'}`
                          }
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              {/* Tab switcher + close */}
              <div className="flex items-center gap-2">
                {panelTabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = popoutPanel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setPopoutPanel(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-500/20 text-white border border-primary-500/30'
                          : 'text-dark-400 hover:text-white hover:bg-dark-700 border border-transparent'
                      }`}
                    >
                      <TabIcon className={`w-4 h-4 ${isActive ? 'text-primary-400' : ''}`} />
                      <span className="hidden md:inline">{tab.label}</span>
                    </button>
                  );
                })}
                <div className="w-px h-6 bg-dark-600 mx-1" />
                <button
                  onClick={() => setPopoutPanel(null)}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors group"
                >
                  <X className="w-5 h-5 text-dark-400 group-hover:text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {popoutPanel === 'transcript' && (
                <TranscriptTimeline segments={transcript} />
              )}
              {popoutPanel === 'billables' && (
                <div className="p-6">
                  <BillablesEditor
                    items={billables}
                    visitId={visitId}
                    onUpdate={loadVisitData}
                  />
                </div>
              )}
              {popoutPanel === 'notes' && (
                <div className="p-6">
                  {note && note.id ? (
                    <div className="space-y-6 max-w-4xl mx-auto">
                      <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                        <h3 className="text-xl font-semibold text-white mb-6">Visit Notes (SOAP)</h3>
                        {note.structured_data && note.structured_data.subjective && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-amber-400 mb-1">Subjective</h4>
                            <p className="text-dark-200 text-sm">{note.structured_data.subjective}</p>
                          </div>
                        )}
                        {note.structured_data && note.structured_data.objective && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-blue-400 mb-1">Objective</h4>
                            <p className="text-dark-200 text-sm">{note.structured_data.objective}</p>
                          </div>
                        )}
                        {note.structured_data && note.structured_data.assessment && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-green-400 mb-1">Assessment</h4>
                            <p className="text-dark-200 text-sm">{note.structured_data.assessment}</p>
                          </div>
                        )}
                        {note.structured_data && note.structured_data.plan && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-purple-400 mb-1">Plan</h4>
                            <p className="text-dark-200 text-sm">{note.structured_data.plan}</p>
                          </div>
                        )}
                        {(!note.structured_data || (!note.structured_data.subjective && !note.structured_data.objective && !note.structured_data.assessment && !note.structured_data.plan)) && (
                          <p className="text-dark-400 text-sm">No SOAP data available</p>
                        )}
                      </div>
                      {note.narrative && (
                        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                          <h3 className="text-xl font-semibold text-white mb-2">Narrative Summary</h3>
                          <p className="text-dark-200 text-sm whitespace-pre-wrap">{note.narrative}</p>
                        </div>
                      )}
                      {note.structured_data && Array.isArray(note.structured_data.tasks_performed) && note.structured_data.tasks_performed.length > 0 && (
                        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
                          <h3 className="text-xl font-semibold text-white mb-2">Tasks Performed</h3>
                          <ul className="space-y-3">
                            {note.structured_data.tasks_performed.map((task: any, i: number) => (
                              <li key={i} className="bg-dark-700/50 rounded-lg p-3">
                                {typeof task === 'string' ? (
                                  <p className="text-dark-200 text-sm">{task}</p>
                                ) : (
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-white">{task.task || 'Task'}</span>
                                      {task.duration_minutes && (
                                        <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                                          {task.duration_minutes} min
                                        </span>
                                      )}
                                    </div>
                                    {task.details && <p className="text-dark-300 text-sm mt-1">{task.details}</p>}
                                    {task.client_response && <p className="text-dark-400 text-xs mt-1 italic">Client: {task.client_response}</p>}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-dark-400">
                      <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
                      <p>No notes generated yet</p>
                    </div>
                  )}
                </div>
              )}
              {popoutPanel === 'contract' && (
                <ContractPreview 
                  contract={contract} 
                  client={visit?.client}
                  visitId={visitId}
                  onContractUpdate={setContract}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restart Assessment Confirmation Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Restart Assessment</h2>
                <p className="text-dark-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">
                This will permanently delete:
              </p>
              <ul className="mt-2 space-y-1 text-red-400 text-sm">
                {hasAudio && <li>• Uploaded audio files</li>}
                {transcript.length > 0 && <li>• {transcript.length} transcript segments</li>}
                {billables.length > 0 && <li>• {billables.length} billable items</li>}
                {note && <li>• Generated visit notes</li>}
                {contract && <li>• Generated contract</li>}
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestartModal(false)}
                disabled={restarting}
                className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartAssessment}
                disabled={restarting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {restarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restarting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
