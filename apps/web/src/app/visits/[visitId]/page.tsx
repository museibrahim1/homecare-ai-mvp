'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Download,
  AlertCircle,
  FileText,
  DollarSign,
  Mic,
  FileCheck,
  X,
  FileSpreadsheet,
  File,
  ChevronDown,
  Loader2,
  ClipboardList,
  RotateCcw,
  Maximize2,
  Send,
  Check,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Visit, TranscriptSegment, BillableItem, Contract, Note } from '@/lib/types';
import GlassShell from '@/components/GlassShell';
import AudioPlayer from '@/components/AudioPlayer';
import AudioUploader from '@/components/AudioUploader';
import TranscriptTimeline from '@/components/TranscriptTimeline';
import BillablesEditor from '@/components/BillablesEditor';
import ContractPreview from '@/components/ContractPreview';
import PipelineProcessingCard, { PipelineDocStatus, PipelineDocStep } from '@/components/PipelineProcessingCard';
import { stripSeparators } from '@/lib/formatText';

const API_BASE = '/api';

// Paper Visit workspace tabs → drive the inline Doc Panel content.
type VisitTab = 'careplan' | 'billables' | 'notes' | 'contract' | 'send';
// Secondary full-view (pop-out) document keys.
type PanelKey = 'transcript' | 'billables' | 'notes' | 'contract';

const visitTabs: { key: VisitTab; label: string }[] = [
  { key: 'careplan', label: 'Care plan' },
  { key: 'billables', label: 'Billables' },
  { key: 'notes', label: 'Notes' },
  { key: 'contract', label: 'Contract' },
  { key: 'send', label: 'Send' },
];

// Per-tab Doc Panel header copy (Paper: eyebrow + title + caption).
const panelMeta: Record<VisitTab, { eyebrow: string; title: string; caption: string }> = {
  careplan: { eyebrow: 'PLAN OF CARE', title: 'From the visit', caption: 'AI generated, edited by you' },
  billables: { eyebrow: 'BILLABLES', title: 'Time & services', caption: 'Edit before you send' },
  notes: { eyebrow: 'VISIT NOTE', title: 'SOAP summary', caption: 'AI generated, edited by you' },
  contract: { eyebrow: 'SERVICE AGREEMENT', title: 'Contract draft', caption: 'State-specific' },
  send: { eyebrow: 'SEND', title: 'Share the packet', caption: 'Download or send to the client' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const visitId = params.visitId as string;
  const { token, isReady } = useRequireAuth();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [billables, setBillables] = useState<BillableItem[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<VisitTab>('careplan');
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const [hasAudio, setHasAudio] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  // Secondary full-view modal (Paper's primary view is inline; this is a fallback).
  const [popoutPanel, setPopoutPanel] = useState<PanelKey | null>(null);

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
    isMountedRef.current = true;
    if (token && visitId) {
      loadVisitData();
    }
    return () => { isMountedRef.current = false; };
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
      } catch {
        // Transcript not available yet - this is expected for new visits
      }

      try {
        const billablesData = await api.getBillables(token!, visitId);
        setBillables(billablesData.items);
      } catch {
        // Billables not generated yet
      }

      try {
        const contractData = await api.getContract(token!, visitId);
        setContract(contractData);
      } catch {
        // Contract not generated yet
      }

      try {
        const noteData = await api.getNote(token!, visitId);
        setNote(noteData);
      } catch {
        // Notes not generated yet
      }
    } catch (err) {
      setError('Failed to load visit data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    setHasAudio(true);
    loadVisitData();
  };

  const runPipelineStep = async (step: string) => {
    if (!token || !visitId) return;

    try {
      setProcessingStep(step);
      await api.runPipelineStep(token, visitId, step);

      let attempts = 0;
      while (attempts < 60 && isMountedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!isMountedRef.current) break;
        const status = await api.getPipelineStatus(token, visitId);
        const stepKey = step === 'transcribe' ? 'transcription' : step;
        const stepState = status?.pipeline_state?.[stepKey];

        if (stepState?.status === 'completed' || stepState?.status === 'failed') {
          break;
        }
        attempts++;
      }

      await loadVisitData();
    } catch {
      setError(`Pipeline step "${step}" failed. Please try again.`);
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

      setTranscript([]);
      setBillables([]);
      setContract(null);
      setNote(null);
      setHasAudio(false);
      setActiveTab('careplan');

      await loadVisitData();

      setShowRestartModal(false);
    } catch {
      setError('Failed to restart assessment. Please try again.');
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
        setError(errorData.detail || `Failed to export ${type}`);
        return;
      }

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
    } catch {
      setError(`Failed to export ${type}. Please try again.`);
    }

    setShowExportMenu(false);
  };

  // Generate Proposal - runs all necessary pipeline steps
  const handleGenerateProposal = async () => {
    if (!token || !visitId) return;

    if (transcript.length === 0) {
      setError('Please upload audio first');
      return;
    }

    setGeneratingProposal(true);

    try {
      const billingStatus = getPipelineStatus('billing');
      if (!billingStatus || billingStatus.status !== 'completed') {
        setProcessingStep('bill');
        await api.runPipelineStep(token, visitId, 'bill');

        for (let i = 0; i < 30 && isMountedRef.current; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (!isMountedRef.current) break;
          const status = await api.getPipelineStatus(token, visitId);
          if (status?.pipeline_state?.billing?.status === 'completed' ||
              status?.pipeline_state?.billing?.status === 'failed') {
            break;
          }
        }
      }

      if (!isMountedRef.current) return;

      setProcessingStep('contract');
      await api.runPipelineStep(token, visitId, 'contract');

      for (let i = 0; i < 60 && isMountedRef.current; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!isMountedRef.current) break;
        const status = await api.getPipelineStatus(token, visitId);
        if (status?.pipeline_state?.contract?.status === 'completed' ||
            status?.pipeline_state?.contract?.status === 'failed') {
          break;
        }
      }

      await loadVisitData();
      setActiveTab('contract');

    } catch {
      setError('Failed to generate proposal. Please try again.');
    } finally {
      setGeneratingProposal(false);
      setProcessingStep(null);
    }
  };

  // Map a raw pipeline_state status into the Paper doc-checklist status.
  const rawDocStatus = (key: string): PipelineDocStatus => {
    const st = visit?.pipeline_state?.[key]?.status;
    if (st === 'completed') return 'ready';
    if (st === 'processing') return 'writing';
    if (st === 'failed') return 'failed';
    return 'next';
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center glass-page">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen glass-page">
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            <span className="text-[#64748B]">Loading visit details...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen flex items-center justify-center glass-page">
        <div className="text-center">
          <div className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-[#64748B]">Visit not found</p>
        </div>
      </div>
    );
  }

  // Secondary pop-out (full-view) document tabs.
  const panelTabs: { id: PanelKey; label: string; icon: typeof FileText; count: number; color: string }[] = [
    { id: 'transcript', label: 'Transcript', icon: FileText, count: transcript.length, color: 'blue' },
    { id: 'billables', label: 'Billables', icon: DollarSign, count: billables.length, color: 'green' },
    { id: 'notes', label: 'Notes', icon: ClipboardList, count: note && note.id ? 1 : 0, color: 'amber' },
    { id: 'contract', label: 'Contract', icon: FileCheck, count: contract ? 1 : 0, color: 'purple' },
  ];

  // Paper 4-doc workflow status mapping.
  const contractDone = visit?.pipeline_state?.contract?.status === 'completed';
  const hasCarePlan = Boolean(visit?.client?.care_plan && visit.client.care_plan.trim());
  const carePlanWriting =
    processingStep === 'contract' ||
    processingStep === 'note' ||
    visit?.pipeline_state?.contract?.status === 'processing' ||
    visit?.pipeline_state?.note?.status === 'processing';
  const carePlanStatus: PipelineDocStatus =
    contractDone || hasCarePlan ? 'ready' : carePlanWriting ? 'writing' : 'next';

  const docSteps: PipelineDocStep[] = [
    { id: 'careplan', title: 'Care plan', status: carePlanStatus },
    { id: 'bill', title: 'Billables', status: processingStep === 'bill' ? 'writing' : rawDocStatus('billing') },
    { id: 'note', title: 'Visit note', status: processingStep === 'note' ? 'writing' : rawDocStatus('note') },
    { id: 'contract', title: 'Service agreement', status: processingStep === 'contract' ? 'writing' : rawDocStatus('contract') },
  ];
  const readyCount = docSteps.filter((s) => s.status === 'ready').length;
  const clientName = visit.client?.full_name || 'Unknown Client';
  const clientFirstName = clientName.trim().split(/\s+/)[0] || '';
  const hasSource = hasAudio || transcript.length > 0;
  const allDocsReady = readyCount === docSteps.length && docSteps.length > 0;
  // Processing card only while writing or incomplete. All-ready uses the clean workspace.
  const showProcessingCard =
    Boolean(processingStep) || (hasSource && !allDocsReady);

  // Billables snapshot (Paper sidebar): prefer contract totals, fall back to summed minutes.
  const totalMinutes = billables.reduce((sum, b) => sum + (b.adjusted_minutes ?? b.minutes ?? 0), 0);
  const weeklyHoursRaw = contract?.weekly_hours ?? (totalMinutes > 0 ? Math.round(totalMinutes / 60) : null);
  const hourlyRateRaw = contract?.hourly_rate ?? contract?.services?.find((s) => s.rate)?.rate ?? null;
  const weeklyHours = weeklyHoursRaw != null && Number.isFinite(Number(weeklyHoursRaw)) ? Number(weeklyHoursRaw) : null;
  const hourlyRate = hourlyRateRaw != null && Number.isFinite(Number(hourlyRateRaw)) ? Number(hourlyRateRaw) : null;
  const weeklyTotal = weeklyHours != null && hourlyRate != null ? weeklyHours * hourlyRate : null;

  const handleDocStepClick = (id: string) => {
    if (processingStep) return;
    // Care plan ships with the contract step, so it re-runs contract.
    const apiStep = id === 'careplan' ? 'contract' : id;
    runPipelineStep(apiStep);
  };

  const carePlanText = visit.client?.care_plan?.trim() || '';

  // Sidebar doc-status rows mirror the Paper checklist.
  const statusChip = (status: PipelineDocStatus) => {
    if (status === 'ready') {
      return { label: 'Ready', text: 'text-success', dot: 'bg-[#05966924]', check: true };
    }
    if (status === 'writing') {
      return { label: 'Writing', text: 'text-primary-600', dot: 'bg-primary-500/15', check: false };
    }
    if (status === 'failed') {
      return { label: 'Failed', text: 'text-red-600', dot: 'bg-red-500/15', check: false };
    }
    return { label: 'Draft', text: 'text-warning', dot: 'bg-[#D9770624]', check: false };
  };

  return (
    <>
    <GlassShell>
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        {/* Paper Header: back + avatar + name/subtitle + ready pill + actions */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/visits')}
            className="p-2 sm:p-2.5 rounded-xl transition-colors hover:bg-white/60 text-[#334155] shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 shrink-0 flex items-center justify-center rounded-[28px] bg-[#F59E0B]">
            <span className="text-[17px] font-bold leading-[22px] text-white">
              {getInitials(clientName)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-[30px] font-bold tracking-tight leading-[34px] text-[#10211F] truncate">
              {clientName}
            </h1>
            <p className="text-[13px] sm:text-[15px] font-medium text-[#4B6B66] truncate">
              Assessment visit
              {visit.scheduled_start
                ? ` · ${format(new Date(visit.scheduled_start), 'MMMM d, yyyy')}`
                : ''}
            </p>
          </div>

          {allDocsReady && (
            <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full glass-panel text-[13px] font-semibold text-primary-700">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              Ready to review
            </span>
          )}

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {(transcript.length > 0 || billables.length > 0 || contract || note) && (
              <button
                onClick={() => setShowRestartModal(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-red-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
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
                className="glass-pill h-9 gap-1.5 sm:gap-2 text-sm px-3 sm:px-4"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-card rounded-xl z-50 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => handleExport('contract-template')}
                      disabled={!contract}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/60 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#10211F]">Contract (Your Template)</p>
                        <p className="text-xs text-[#64748B]">Uses your uploaded template</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('contract-docx')}
                      disabled={!contract}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/60 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <File className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#10211F]">Contract DOCX</p>
                        <p className="text-xs text-[#64748B]">Editable Word document</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('contract')}
                      disabled={!contract}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/60 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                        <File className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#10211F]">Contract PDF</p>
                        <p className="text-xs text-[#64748B]">Default format</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('timesheet')}
                      disabled={billables.length === 0}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/60 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#10211F]">Timesheet CSV</p>
                        <p className="text-xs text-[#64748B]">Billable hours</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('note')}
                      disabled={!visit?.pipeline_state?.note?.status}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/60 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#10211F]">Visit Note PDF</p>
                        <p className="text-xs text-[#64748B]">Care documentation</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Recording (only when there is no source yet, or actively uploading) */}
        {(!hasSource || showUploader) && (
          <div>
            {showUploader ? (
              <div className="space-y-4">
                <AudioUploader
                  visitId={visitId}
                  token={token!}
                  onUploadComplete={handleUploadComplete}
                  onClose={() => setShowUploader(false)}
                />
                <button
                  onClick={() => setShowUploader(false)}
                  className="w-full text-center text-[#64748B] hover:text-[#10211F] py-2 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="glass-panel p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-[#10211F] mb-2">Add a recording</h3>
                  <p className="text-[#64748B] text-sm">Upload the visit audio to get started</p>
                </div>
                <button
                  onClick={() => setShowUploader(true)}
                  className="mx-auto flex flex-col items-center gap-2 p-6 w-full sm:w-64 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                    <Mic className="w-6 h-6 text-primary-600" />
                  </div>
                  <span className="text-[#10211F] font-medium text-sm">Upload Audio</span>
                  <span className="text-[#64748B] text-xs">MP3, WAV, M4A</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Paper Pipeline Glass → Processing (4-doc workflow) */}
        {showProcessingCard && (
          <PipelineProcessingCard
            readyCount={readyCount}
            totalCount={docSteps.length}
            clientFirstName={clientFirstName}
            subtitle="Care plan, billables, notes, and the contract."
            steps={docSteps}
            onStepClick={handleDocStepClick}
          />
        )}

        {hasSource && !showUploader && (
          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              {hasAudio ? (
                <AudioPlayer visitId={visitId} />
              ) : (
                <p className="text-[15px] font-medium text-[#10211F]">
                  Transcript ready · {transcript.length} segment{transcript.length === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-primary-600 text-sm font-medium bg-primary-50 hover:bg-primary-100 border border-primary-200 shrink-0"
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Audio</span>
            </button>
          </div>
        )}

        {hasSource && (
          <>
            {/* Paper Visit tabs */}
            <div className="flex flex-wrap items-center gap-2.5">
              {visitTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`h-10 px-[18px] rounded-[20px] text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-primary-500 text-white shadow-[0_10px_24px_#0D948842]'
                        : 'glass-pill font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              {transcript.length > 0 && (
                <button
                  onClick={() => setPopoutPanel('transcript')}
                  className="h-10 px-3 text-sm font-medium text-[#64748B] hover:text-[#10211F] transition-colors whitespace-nowrap"
                >
                  View transcript
                </button>
              )}
            </div>

            {/* Inline two-column workspace (Paper primary view) */}
            <div className="flex flex-col lg:flex-row gap-[22px] items-start">
              {/* Left: Doc Panel */}
              <div className="glass-card flex-1 min-w-0 w-full flex flex-col gap-[18px] px-6 sm:px-8 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] tracking-[0.1em] font-semibold text-primary-600">
                      {panelMeta[activeTab].eyebrow}
                    </span>
                    <h2 className="text-[22px] tracking-tight font-bold leading-tight text-[#10211F]">
                      {panelMeta[activeTab].title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:block text-xs font-medium text-[#94A3B8]">
                      {panelMeta[activeTab].caption}
                    </span>
                    {(activeTab === 'billables' || activeTab === 'notes' || activeTab === 'contract') && (
                      <button
                        onClick={() => setPopoutPanel(activeTab as PanelKey)}
                        className="p-2 rounded-lg hover:bg-white/60 text-[#64748B] hover:text-[#10211F] transition-colors"
                        title="Open in full view"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Care plan */}
                {activeTab === 'careplan' && (
                  carePlanText ? (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-[11px] tracking-[0.1em] font-semibold text-[#64748B]">SUMMARY</span>
                      <p className="text-sm leading-[21px] text-[#10211F] whitespace-pre-wrap">
                        {stripSeparators(carePlanText)}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 text-[#64748B]">
                      <ClipboardList className="w-10 h-10 mb-3 opacity-50" />
                      <p className="font-medium text-[#10211F]">No care plan yet</p>
                      <p className="text-sm">The care plan ships with the contract step.</p>
                    </div>
                  )
                )}

                {/* Billables */}
                {activeTab === 'billables' && (
                  <div className="min-h-0">
                    {billables.length > 0 ? (
                      <BillablesEditor items={billables} visitId={visitId} onUpdate={loadVisitData} />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-12 text-[#64748B]">
                        <DollarSign className="w-10 h-10 mb-3 opacity-50" />
                        <p className="font-medium text-[#10211F]">No billables yet</p>
                        <p className="text-sm">Run the Billables step to generate.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {activeTab === 'notes' && (
                  <NotesPanel note={note} />
                )}

                {/* Contract */}
                {activeTab === 'contract' && (
                  <div className="min-h-0">
                    <ContractPreview
                      contract={contract}
                      client={visit?.client}
                      visitId={visitId}
                      onContractUpdate={setContract}
                    />
                  </div>
                )}

                {/* Send */}
                {activeTab === 'send' && (
                  <SendPanel
                    contract={contract}
                    note={note}
                    billablesCount={billables.length}
                    onExport={handleExport}
                    onOpenContract={() => setActiveTab('contract')}
                  />
                )}
              </div>

              {/* Right: Sidebar */}
              <aside className="w-full lg:w-[340px] shrink-0 flex flex-col gap-[18px]">
                {/* Billables Snapshot */}
                <div className="glass-card p-6 flex flex-col gap-4">
                  <span className="text-[11px] tracking-[0.1em] font-semibold text-[#64748B]">BILLABLES</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[42px] tracking-tight leading-[44px] font-bold text-[#10211F]">
                      {weeklyHours != null ? `${weeklyHours}h` : '—'}
                    </span>
                    <span className="text-sm font-medium text-[#4B6B66]">per week</span>
                  </div>
                  <div className="flex flex-col gap-3 pt-4 border-t border-[#10211F14]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#4B6B66]">Hourly rate</span>
                      <span className="text-[15px] font-semibold text-[#10211F]">
                        {hourlyRate != null ? `$${hourlyRate.toFixed(2)}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#4B6B66]">Weekly total</span>
                      <span className="text-[18px] tracking-tight font-bold leading-[22px] text-primary-600">
                        {weeklyTotal != null ? `$${weeklyTotal.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Doc Status checklist */}
                <div className="glass-panel p-6 flex flex-col gap-3.5">
                  <span className="text-[11px] tracking-[0.1em] font-semibold text-[#64748B]">DOCUMENTS</span>
                  {docSteps.map((step) => {
                    const chip = statusChip(step.status);
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <span className={`w-[22px] h-[22px] shrink-0 flex items-center justify-center rounded-full ${chip.dot}`}>
                          {chip.check ? (
                            <Check className="w-3 h-3 text-success stroke-[3]" />
                          ) : step.status === 'writing' ? (
                            <Loader2 className="w-3 h-3 text-primary-600 animate-spin" />
                          ) : (
                            <span className={`w-[7px] h-[7px] rounded-full ${step.status === 'failed' ? 'bg-red-500' : 'bg-warning'}`} />
                          )}
                        </span>
                        <span className="flex-1 text-sm font-medium text-[#10211F]">{step.title}</span>
                        <span className={`text-[13px] font-medium ${chip.text}`}>{chip.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3">
                  {!contract ? (
                    <button
                      onClick={handleGenerateProposal}
                      disabled={generatingProposal || processingStep !== null || transcript.length === 0}
                      className="flex items-center justify-center h-[52px] rounded-[26px] bg-primary-500 text-white text-base font-semibold shadow-[0_14px_32px_#0D94884D] hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingProposal ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        'Generate proposal'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('careplan')}
                      className="flex items-center justify-center h-[52px] rounded-[26px] bg-primary-500 text-white text-base font-semibold shadow-[0_14px_32px_#0D94884D] hover:bg-primary-600 transition-colors"
                    >
                      Review care plan
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('send')}
                    className="flex items-center justify-center gap-2 h-[52px] rounded-[26px] bg-white/70 border border-[#0D948859] text-primary-600 text-base font-semibold hover:bg-white transition-colors"
                  >
                    <Send className="w-[18px] h-[18px]" />
                    Send agreement
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </GlassShell>

    {/* Pop-out Full View Modal (secondary/fallback) */}
    {popoutPanel && (
      <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#10211F14] flex-shrink-0">
            <div className="flex items-center gap-3">
              {(() => {
                const tab = panelTabs.find(t => t.id === popoutPanel);
                if (!tab) return null;
                const TabIcon = tab.icon;
                const bgColor = tab.color === 'blue' ? 'bg-blue-50' :
                  tab.color === 'green' ? 'bg-emerald-50' :
                  tab.color === 'amber' ? 'bg-amber-50' :
                  'bg-purple-50';
                const txtColor = tab.color === 'blue' ? 'text-blue-600' :
                  tab.color === 'green' ? 'text-emerald-600' :
                  tab.color === 'amber' ? 'text-amber-600' :
                  'text-purple-600';
                return (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
                      <TabIcon className={`w-5 h-5 ${txtColor}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#10211F]">{tab.label}</h3>
                      <p className="text-xs text-[#64748B]">
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
                        ? 'bg-primary-50 text-slate-800 border border-primary-200'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    <TabIcon className={`w-4 h-4 ${isActive ? 'text-primary-500' : ''}`} />
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
              <div className="w-px h-6 bg-[#10211F14] mx-1" />
              <button
                onClick={() => setPopoutPanel(null)}
                className="p-2 hover:bg-white/60 rounded-lg transition-colors group"
              >
                <X className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
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
                <BillablesEditor items={billables} visitId={visitId} onUpdate={loadVisitData} />
              </div>
            )}
            {popoutPanel === 'notes' && (
              <div className="p-6 max-w-4xl mx-auto">
                <NotesPanel note={note} />
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
        <div className="glass-card p-6 w-full max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#10211F]">Restart Assessment</h2>
              <p className="text-[#64748B] text-sm">This action cannot be undone</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">
              This will permanently delete:
            </p>
            <ul className="mt-2 space-y-1 text-red-600 text-sm">
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
              className="flex-1 px-4 py-2.5 bg-white/70 hover:bg-white border border-[#FFFFFFE0] text-[#10211F] rounded-lg transition-colors disabled:opacity-50"
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
    </>
  );
}

// SOAP notes rendered as bordered sections inside the glass Doc Panel.
function NotesPanel({ note }: { note: Note | null }) {
  if (!note || !note.id) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 text-[#64748B]">
        <ClipboardList className="w-10 h-10 mb-3 opacity-50" />
        <p className="font-medium text-[#10211F]">No notes generated yet</p>
        <p className="text-sm">Run the Notes step to generate.</p>
      </div>
    );
  }

  const sd = note.structured_data;
  const sections: { label: string; color: string; text?: string }[] = [
    { label: 'Subjective', color: 'text-amber-600', text: sd?.subjective },
    { label: 'Objective', color: 'text-blue-600', text: sd?.objective },
    { label: 'Assessment', color: 'text-emerald-600', text: sd?.assessment },
    { label: 'Plan', color: 'text-purple-600', text: sd?.plan },
  ].filter((s) => s.text);

  const tasks = Array.isArray(sd?.tasks_performed) ? sd.tasks_performed : [];

  return (
    <div className="flex flex-col gap-4">
      {sections.length > 0 ? (
        sections.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col gap-1.5 ${i > 0 ? 'pt-4 border-t border-[#10211F14]' : ''}`}
          >
            <span className={`text-[11px] tracking-[0.1em] font-semibold ${s.color}`}>
              {s.label.toUpperCase()}
            </span>
            <p className="text-sm leading-[21px] text-[#1E293B] whitespace-pre-wrap">
              {stripSeparators(s.text!)}
            </p>
          </div>
        ))
      ) : (
        <p className="text-[#64748B] text-sm">No SOAP data available</p>
      )}

      {note.narrative && (
        <div className="flex flex-col gap-1.5 pt-4 border-t border-[#10211F14]">
          <span className="text-[11px] tracking-[0.1em] font-semibold text-[#64748B]">NARRATIVE</span>
          <p className="text-sm leading-[21px] text-[#1E293B] whitespace-pre-wrap">
            {stripSeparators(note.narrative)}
          </p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="flex flex-col gap-2 pt-4 border-t border-[#10211F14]">
          <span className="text-[11px] tracking-[0.1em] font-semibold text-[#64748B]">TASKS PERFORMED</span>
          <ul className="flex flex-col gap-2">
            {tasks.map((task, i) => (
              <li key={i} className="rounded-lg bg-white/50 border border-[#FFFFFFE0] p-3">
                {typeof task === 'string' ? (
                  <p className="text-[#1E293B] text-sm">{task}</p>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#10211F] text-sm">{task.task || 'Task'}</span>
                      {task.duration_minutes != null && (
                        <span className="text-xs text-amber-600 bg-amber-400/10 px-2 py-0.5 rounded">
                          {task.duration_minutes} min
                        </span>
                      )}
                    </div>
                    {task.details && <p className="text-[#4B6B66] text-sm mt-1">{task.details}</p>}
                    {task.client_response && (
                      <p className="text-[#94A3B8] text-xs mt-1 italic">Client: {task.client_response}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Send tab: share the finished packet (download or hand off to the contract email flow).
function SendPanel({
  contract,
  note,
  billablesCount,
  onExport,
  onOpenContract,
}: {
  contract: Contract | null;
  note: Note | null;
  billablesCount: number;
  onExport: (type: 'contract' | 'contract-template' | 'contract-docx' | 'timesheet' | 'note') => void;
  onOpenContract: () => void;
}) {
  const items: {
    label: string;
    hint: string;
    ready: boolean;
    type: 'contract' | 'contract-docx' | 'timesheet' | 'note';
    icon: typeof FileCheck;
  }[] = [
    { label: 'Service agreement (PDF)', hint: 'Signable contract', ready: Boolean(contract), type: 'contract', icon: FileCheck },
    { label: 'Contract (DOCX)', hint: 'Editable Word file', ready: Boolean(contract), type: 'contract-docx', icon: File },
    { label: 'Timesheet (CSV)', hint: 'Billable hours', ready: billablesCount > 0, type: 'timesheet', icon: FileSpreadsheet },
    { label: 'Visit note (PDF)', hint: 'Care documentation', ready: Boolean(note && note.id), type: 'note', icon: FileText },
  ];

  return (
    <div className="flex flex-col gap-3 pt-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.type} className="flex items-center gap-3 rounded-[16px] bg-white/50 border border-[#FFFFFFE0] px-4 py-3">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-primary-50 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#10211F] truncate">{item.label}</p>
              <p className="text-xs text-[#64748B]">{item.hint}</p>
            </div>
            <button
              onClick={() => onExport(item.type)}
              disabled={!item.ready}
              className="glass-pill h-9 gap-1.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        );
      })}

      <button
        onClick={onOpenContract}
        disabled={!contract}
        className="mt-1 flex items-center justify-center gap-2 h-[48px] rounded-[24px] bg-primary-500 text-white text-sm font-semibold shadow-[0_12px_28px_#0D94884D] hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        Email agreement to client
      </button>
    </div>
  );
}
