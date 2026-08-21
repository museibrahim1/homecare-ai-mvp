'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, CheckCircle, AlertCircle, X, Loader2, Sparkles, Square, Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { AUDIO_UPLOAD_MAX_BYTES, AUDIO_UPLOAD_MAX_LABEL } from '@/lib/uploadLimits';
import PipelineProcessingCard, { type PipelineDocStatus, type PipelineDocStep } from '@/components/PipelineProcessingCard';

interface AudioUploaderProps {
  visitId: string;
  token: string;
  onUploadComplete?: (audioAsset: any) => void;
  onClose?: () => void;
  autoProcess?: boolean;
  /** Fires when the uploader enters or leaves the processing state */
  onProcessingChange?: (processing: boolean) => void;
}

type InputMode = 'upload' | 'record';
type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

interface PipelineStepState {
  status: StepStatus;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

/** Quiet product labels. Matches Paper Processing tone, not fake SaaS progress theater. */
const PIPELINE_STEPS = [
  { key: 'transcription', label: 'Transcript' },
  { key: 'diarization', label: 'Speakers' },
  { key: 'alignment', label: 'Alignment' },
  { key: 'billing', label: 'Billables' },
  { key: 'note', label: 'Visit note' },
  { key: 'contract', label: 'Contract' },
];

function toDocStatus(status: StepStatus): PipelineDocStatus {
  if (status === 'completed') return 'ready';
  if (status === 'running') return 'writing';
  if (status === 'failed') return 'failed';
  return 'next';
}

export default function AudioUploader({
  visitId,
  token,
  onUploadComplete,
  onClose,
  autoProcess = true,
  onProcessingChange,
}: AudioUploaderProps) {
  const [state, setState] = useState<'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const uploadStartRef = useRef<number>(0);
  const MAX_POLL_COUNT = 200;

  const [stepStates, setStepStates] = useState<Record<string, PipelineStepState>>(() => {
    const initial: Record<string, PipelineStepState> = {};
    for (const step of PIPELINE_STEPS) {
      initial[step.key] = { status: 'pending', startedAt: null, completedAt: null, error: null };
    }
    return initial;
  });

  // Recording states
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onProcessingChange?.(state === 'processing');
  }, [state, onProcessingChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const estimateDuration = (bytes: number): string => {
    const mbSize = bytes / (1024 * 1024);
    const estimatedMinutes = Math.max(1, Math.round(mbSize / 1.5));
    if (estimatedMinutes <= 1) return '~1 min';
    return `~${estimatedMinutes} min`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Recording functions ---
  const startRecording = async () => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      const capturedStream = stream;
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        capturedStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Failed to start recording: ' + err.message);
      }
      setState('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio(audioUrl);
        audioElementRef.current.onended = () => setIsPlaying(false);
      }
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseRecording = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  const clearRecording = () => {
    if (audioElementRef.current) { audioElementRef.current.pause(); audioElementRef.current = null; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;
    const file = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
    setSelectedFile(file);
    await performUpload(file);
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioElementRef.current) audioElementRef.current.pause();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [audioUrl]);

  // --- Drag & Drop ---
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setState('dragging'); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setState('idle'); }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.size > AUDIO_UPLOAD_MAX_BYTES) {
      setError(`File too large. Max ${AUDIO_UPLOAD_MAX_LABEL}.`);
      setState('error');
      return;
    }
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i)) {
      setError('Please select an audio file (MP3, WAV, M4A, etc.)');
      setState('error');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  // --- Pipeline polling ---
  const resetStepStates = () => {
    const initial: Record<string, PipelineStepState> = {};
    for (const step of PIPELINE_STEPS) {
      initial[step.key] = { status: 'pending', startedAt: null, completedAt: null, error: null };
    }
    setStepStates(initial);
    setFailedStep(null);
  };

  const pollPipelineStatus = useCallback(async () => {
    pollCountRef.current += 1;

    if (pollCountRef.current > MAX_POLL_COUNT) {
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      setState('success');
      setTimeout(() => onUploadComplete?.({}), 1500);
      return;
    }

    try {
      const status = await api.getPipelineStatus(token, visitId);
      const pipelineState = status.pipeline_state || {};

      let hasFailed = false;
      let failedKey: string | null = null;

      setStepStates(prev => {
        const next = { ...prev };
        let foundProcessing = false;

        for (const step of PIPELINE_STEPS) {
          const serverState = pipelineState[step.key];
          const prevStep = prev[step.key];

          if (serverState?.status === 'completed') {
            next[step.key] = {
              status: 'completed',
              startedAt: prevStep.startedAt || Date.now() - 1000,
              completedAt: prevStep.completedAt || Date.now(),
              error: null,
            };
          } else if (serverState?.status === 'failed' || serverState?.status === 'error') {
            hasFailed = true;
            failedKey = step.key;
            next[step.key] = {
              status: 'failed',
              startedAt: prevStep.startedAt || Date.now(),
              completedAt: null,
              error: serverState?.error || 'Step failed',
            };
          } else if ((serverState?.status === 'processing' || serverState?.status === 'queued') && !foundProcessing) {
            foundProcessing = true;
            next[step.key] = {
              status: 'running',
              startedAt: prevStep.startedAt || (prevStep.status === 'running' ? prevStep.startedAt : Date.now()),
              completedAt: null,
              error: null,
            };
          } else if (prevStep.status === 'completed') {
            // keep completed
          } else if (!foundProcessing && prevStep.status !== 'failed') {
            next[step.key] = { status: 'pending', startedAt: null, completedAt: null, error: null };
          }
        }
        return next;
      });

      if (hasFailed) setFailedStep(failedKey);

      const allDone = PIPELINE_STEPS.every(s =>
        pipelineState[s.key]?.status === 'completed' || pipelineState[s.key]?.status === 'failed'
      );

      if (allDone || pipelineState.full_pipeline?.status === 'completed') {
        if (!hasFailed) setState('success');
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        if (!hasFailed) setTimeout(() => onUploadComplete?.({}), 1500);
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  }, [token, visitId, onUploadComplete]);

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  // --- Upload ---
  const performUpload = async (file: File) => {
    setState('uploading');
    setUploadProgress(0);
    uploadStartRef.current = Date.now();

    const steps = [10, 25, 40, 55, 65, 75, 82, 88, 92, 95];
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setUploadProgress(steps[stepIndex]);
        stepIndex++;
      }
    }, 350);

    try {
      await api.uploadAudio(token, visitId, file, autoProcess);
      clearInterval(interval);
      setUploadProgress(100);

      if (autoProcess) {
        resetStepStates();
        setStepStates(prev => ({
          ...prev,
          transcription: { status: 'running', startedAt: Date.now(), completedAt: null, error: null },
        }));
        setState('processing');
        pollCountRef.current = 0;
        pollIntervalRef.current = setInterval(pollPipelineStatus, 3000);
        pollPipelineStatus();
      } else {
        setState('success');
        setTimeout(() => onUploadComplete?.({}), 1500);
      }
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || 'Upload failed');
      setState('error');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await performUpload(selectedFile);
  };

  const handleRetry = async () => {
    setError(null);
    setFailedStep(null);
    if (selectedFile) {
      await performUpload(selectedFile);
    } else if (audioBlob) {
      await uploadRecording();
    }
  };

  const reset = () => {
    setState('idle');
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    setFailedStep(null);
    resetStepStates();
    clearRecording();
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
  };

  // --- Pipeline progress ---
  const completedCount = PIPELINE_STEPS.filter((s) => stepStates[s.key]?.status === 'completed').length;
  const runningStepId =
    PIPELINE_STEPS.find((s) => stepStates[s.key]?.status === 'running')?.key ?? null;
  const processingSteps: PipelineDocStep[] = PIPELINE_STEPS.map((step) => ({
    id: step.key,
    title: step.label,
    status: toDocStatus(stepStates[step.key]?.status || 'pending'),
  }));

  return (
    <div className={state === 'processing' ? '' : 'card p-6'}>
      {/* Header (hidden while Palm is building the visit) */}
      {state !== 'processing' && (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Add Audio</h3>
            <p className="text-slate-500 text-sm">Record or upload and Palm writes the packet</p>
          </div>
        </div>
        {onClose && !isRecording && (
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>
      )}

      {/* Mode Toggle Tabs */}
      {state === 'idle' && !selectedFile && !audioBlob && (
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setInputMode('record')}
            className={`flex-1 py-3 px-4 font-medium transition-all flex items-center justify-center gap-2 border-b-2 ${
              inputMode === 'record'
                ? 'text-primary-400 border-primary-400'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            <Mic className="w-4 h-4" />
            Record
          </button>
          <button
            onClick={() => setInputMode('upload')}
            className={`flex-1 py-3 px-4 font-medium transition-all flex items-center justify-center gap-2 border-b-2 ${
              inputMode === 'upload'
                ? 'text-primary-400 border-primary-400'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      )}

      {/* Paper Pipeline Glass processing view */}
      {state === 'processing' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <PipelineProcessingCard
            readyCount={completedCount}
            totalCount={PIPELINE_STEPS.length}
            clientFirstName=""
            subtitle="Transcript, billables, visit note, and the contract."
            steps={processingSteps}
            processingStepId={runningStepId}
            footer="Stay on this screen. Longer recordings take a few minutes."
            onStepClick={failedStep ? () => handleRetry() : undefined}
          />
          {failedStep && (
            <button
              type="button"
              onClick={handleRetry}
              className="mx-auto inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold hover:bg-red-100"
            >
              <RotateCcw className="w-4 h-4" />
              Retry processing
            </button>
          )}
          <div className="flex flex-col items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                onUploadComplete?.({});
              }}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Continue in background
            </button>
            <p className="text-xs font-medium text-[#64748B]">You can leave. Palm keeps working.</p>
          </div>
        </div>
      )}
      {/* ==================== RECORDING INTERFACE ==================== */}
      {inputMode === 'record' && state !== 'success' && state !== 'processing' && state !== 'uploading' && !selectedFile && (
        <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-slate-50/30 border-slate-200">
          {!audioBlob ? (
            <div className="space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${
                isRecording ? 'bg-red-50 animate-pulse' : 'bg-primary-50 hover:bg-primary-500/30'
              }`}>
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping bg-red-500/30 rounded-full" />
                    <Mic className="w-12 h-12 text-red-600 relative z-10" />
                  </div>
                ) : (
                  <Mic className="w-12 h-12 text-primary-400" />
                )}
              </div>
              {isRecording && (
                <div className="space-y-2">
                  <div className="text-3xl font-mono text-slate-800">{formatTime(recordingTime)}</div>
                  <p className="text-red-600 text-sm animate-pulse">● Recording...</p>
                </div>
              )}
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <button onClick={startRecording} className="btn-primary px-6 py-3 flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </button>
                ) : (
                  <button onClick={stopRecording} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors">
                    <Square className="w-5 h-5" />
                    Stop Recording
                  </button>
                )}
              </div>
              {!isRecording && <p className="text-slate-500 text-sm">Click to start recording your assessment</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto">
                <FileAudio className="w-8 h-8 text-accent-green" />
              </div>
              <div>
                <p className="text-slate-900 font-medium">Recording Complete</p>
                <p className="text-slate-500 text-sm">Duration: {formatTime(recordingTime)}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={isPlaying ? pauseRecording : playRecording} className="btn-secondary px-4 py-2 flex items-center gap-2">
                  {isPlaying ? (<><Pause className="w-4 h-4" />Pause</>) : (<><Play className="w-4 h-4" />Play</>)}
                </button>
              </div>
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-200">
                <button onClick={clearRecording} className="btn-secondary px-4 py-2">Record Again</button>
                <button onClick={uploadRecording} className="btn-primary px-6 py-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />Upload & Process
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== FILE UPLOAD / DRAG-DROP INTERFACE ==================== */}
      {inputMode === 'upload' && state !== 'success' && state !== 'processing' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && state !== 'uploading' && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 ${
            selectedFile || state === 'uploading' ? 'cursor-default' : 'cursor-pointer'
          } ${
            state === 'dragging'
              ? 'border-primary-400 bg-primary-50 scale-[1.02] shadow-xl shadow-primary-500/10 ring-2 ring-primary-400/20'
              : state === 'error'
              ? 'border-red-400/50 bg-red-500/5'
              : selectedFile
              ? 'border-slate-200 bg-slate-50/30'
              : 'border-slate-200 hover:border-primary-500/40 hover:bg-slate-50/20 bg-slate-50/30 group'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {/* Uploading state */}
          {state === 'uploading' ? (
            <div className="p-8 space-y-5 animate-fade-in">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-slate-200">
                    <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-slate-900 font-medium mb-1">Uploading audio...</p>
                <p className="text-slate-500 text-xs truncate max-w-[280px] mx-auto">{selectedFile?.name}</p>
              </div>
              <div className="relative">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 via-indigo-500 to-accent-cyan rounded-full transition-all duration-500 ease-out progress-stripe"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">{formatFileSize(selectedFile?.size || 0)}</span>
                  <span className="text-xs text-primary-400 font-bold">{uploadProgress}%</span>
                </div>
              </div>
              {uploadProgress < 100 && (
                <p className="text-slate-400 text-xs text-center">
                  {uploadProgress < 50 ? 'Preparing file...' : uploadProgress < 90 ? 'Transferring...' : 'Almost done...'}
                </p>
              )}
            </div>
          ) : selectedFile ? (
            /* File selected - show preview */
            <div className="p-8 space-y-4 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <FileAudio className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium truncate">{selectedFile.name}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-slate-500 text-xs flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {formatFileSize(selectedFile.size)}
                    </span>
                    <span className="text-slate-500 text-xs flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3" />
                      Est. {estimateDuration(selectedFile.size)}
                    </span>
                    <span className="text-slate-400 text-xs bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                      {selectedFile.type?.split('/')[1] || selectedFile.name.split('.').pop()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Change File
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  className="btn-primary px-6 py-2 flex items-center gap-2 text-sm shadow-lg shadow-primary-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Upload & Process
                </button>
              </div>
            </div>
          ) : (
            /* Empty state - drag drop zone */
            <div className="p-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all duration-300 ${
                state === 'dragging' ? 'bg-primary-500/30 scale-110 shadow-lg shadow-primary-500/20' : 'bg-slate-100 group-hover:bg-primary-50'
              }`}>
                <Upload className={`w-8 h-8 transition-all duration-300 ${
                  state === 'dragging' ? 'text-primary-400 -translate-y-1' : 'text-slate-500 group-hover:text-primary-400'
                }`} />
              </div>
              <p className="text-slate-900 font-medium mb-1 text-center">
                {state === 'dragging' ? 'Drop your audio file here' : 'Drag and drop audio file'}
              </p>
              <p className="text-slate-500 text-sm mb-5 text-center">or click to browse files</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['MP3', 'WAV', 'M4A', 'OGG', 'WebM'].map(fmt => (
                  <span key={fmt} className="px-2.5 py-0.5 bg-slate-50 rounded-md text-[10px] text-slate-500 font-medium border border-slate-200">{fmt}</span>
                ))}
                <span className="text-slate-400 text-[10px]">· Max 100MB</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUCCESS STATE ==================== */}
      {state === 'success' && (
        <div className="text-center py-8 animate-fade-in">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-emerald-50 rounded-2xl animate-ping opacity-30" />
            <div className="relative w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 animate-check-bounce" />
            </div>
          </div>
          <p className="text-slate-900 font-medium text-lg">Processing Complete!</p>
          <p className="text-slate-500 text-sm mt-2 mb-6">Transcript, notes, and contract are ready</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => { reset(); onClose?.(); }} className="btn-secondary px-4 py-2">Upload Another</button>
            <button onClick={() => onUploadComplete?.({})} className="btn-primary px-6 py-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />View Results
            </button>
          </div>
        </div>
      )}

      {/* ==================== ERROR DISPLAY ==================== */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={reset} className="text-red-600 text-sm underline hover:text-red-300 flex-shrink-0">Try again</button>
        </div>
      )}

      {/* ==================== AI INFO BANNER ==================== */}
      {state === 'idle' && !selectedFile && !audioBlob && (
        <div className="mt-6 p-3 bg-primary-50 border border-primary-500/20 rounded-xl flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0" />
          <p className="text-slate-600 text-sm">
            AI will transcribe, identify speakers, and generate notes & contract
          </p>
        </div>
      )}
    </div>
  );
}
