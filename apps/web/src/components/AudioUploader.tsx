'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, CheckCircle, AlertCircle, X, Loader2, Sparkles, Square, Play, Pause, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface AudioUploaderProps {
  visitId: string;
  token: string;
  onUploadComplete?: (audioAsset: any) => void;
  onClose?: () => void;
  autoProcess?: boolean;
}

type InputMode = 'upload' | 'record';
type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

interface PipelineStepState {
  status: StepStatus;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

const PIPELINE_STEPS = [
  { key: 'transcription', label: 'Transcribing Audio', description: 'Converting speech to text', estimatedSeconds: 90, icon: '🎤' },
  { key: 'diarization', label: 'Identifying Speakers', description: 'Detecting who\'s speaking', estimatedSeconds: 45, icon: '👥' },
  { key: 'alignment', label: 'Aligning Transcript', description: 'Matching words to speakers', estimatedSeconds: 10, icon: '🔗' },
  { key: 'billing', label: 'Extracting Billables', description: 'Finding billable services', estimatedSeconds: 15, icon: '💰' },
  { key: 'note', label: 'Generating Visit Note', description: 'Creating SOAP note', estimatedSeconds: 20, icon: '📝' },
  { key: 'contract', label: 'Creating Contract', description: 'Building service agreement', estimatedSeconds: 20, icon: '📄' },
];

function formatEstimate(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `~${mins}min`;
  return `~${mins}m ${secs}s`;
}

function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export default function AudioUploader({ visitId, token, onUploadComplete, onClose, autoProcess = true }: AudioUploaderProps) {
  const [state, setState] = useState<'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_POLL_COUNT = 200;

  const [stepStates, setStepStates] = useState<Record<string, PipelineStepState>>(() => {
    const initial: Record<string, PipelineStepState> = {};
    for (const step of PIPELINE_STEPS) {
      initial[step.key] = { status: 'pending', startedAt: null, completedAt: null, error: null };
    }
    return initial;
  });
  const [now, setNow] = useState(Date.now());

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

  // Live timer for elapsed time display during processing
  useEffect(() => {
    if (state === 'processing') {
      timerRef.current = setInterval(() => setNow(Date.now()), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, [state]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const estimateDuration = (bytes: number): string => {
    // ~1MB per minute at 128kbps, ~10MB per minute for WAV
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
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Max 100MB.');
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
        // Mark first step as running
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

  // --- Pipeline progress calculations ---
  const completedCount = PIPELINE_STEPS.filter(s => stepStates[s.key]?.status === 'completed').length;
  const totalSteps = PIPELINE_STEPS.length;
  const overallPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Add Audio</h3>
            <p className="text-dark-400 text-sm">Record or upload & auto-process with AI</p>
          </div>
        </div>
        {onClose && state !== 'processing' && !isRecording && (
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        )}
      </div>

      {/* Mode Toggle Tabs */}
      {state === 'idle' && !selectedFile && !audioBlob && (
        <div className="flex border-b border-dark-700 mb-6">
          <button
            onClick={() => setInputMode('record')}
            className={`flex-1 py-3 px-4 font-medium transition-all flex items-center justify-center gap-2 border-b-2 ${
              inputMode === 'record'
                ? 'text-primary-400 border-primary-400'
                : 'text-dark-400 border-transparent hover:text-white'
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
                : 'text-dark-400 border-transparent hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      )}

      {/* ==================== PIPELINE PROCESSING UI ==================== */}
      {state === 'processing' && (
        <div className="space-y-5">
          {/* Overall progress header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="w-6 h-6 text-primary-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-400 rounded-full animate-ping" />
              </div>
              <div>
                <p className="text-white font-semibold">AI Processing</p>
                <p className="text-dark-400 text-xs">Step {completedCount + (completedCount < totalSteps ? 1 : 0)} of {totalSteps}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary-400">{overallPercent}%</span>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="relative h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 via-indigo-500 to-accent-cyan rounded-full transition-all duration-700 ease-out"
              style={{ width: `${overallPercent}%` }}
            />
            {overallPercent < 100 && (
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/20 to-transparent rounded-full animate-pulse"
                style={{ width: `${Math.min(overallPercent + 8, 100)}%` }}
              />
            )}
          </div>

          {/* Step-by-step list */}
          <div className="space-y-2">
            {PIPELINE_STEPS.map((step, index) => {
              const ss = stepStates[step.key];
              const isCompleted = ss.status === 'completed';
              const isRunning = ss.status === 'running';
              const isFailed = ss.status === 'failed';
              const isPending = ss.status === 'pending';
              const elapsed = isRunning && ss.startedAt ? now - ss.startedAt : 0;
              const completedElapsed = isCompleted && ss.startedAt && ss.completedAt ? ss.completedAt - ss.startedAt : 0;

              return (
                <div
                  key={step.key}
                  className={`relative rounded-xl border transition-all duration-500 ${
                    isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : isRunning
                      ? 'bg-primary-500/10 border-primary-500/30 shadow-lg shadow-primary-500/5'
                      : isFailed
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-dark-800/50 border-dark-700/50'
                  }`}
                >
                  {/* Running step progress bar background */}
                  {isRunning && (
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                      <div
                        className="h-full bg-primary-500/5 transition-all duration-1000 ease-linear"
                        style={{ width: `${Math.min((elapsed / (step.estimatedSeconds * 1000)) * 100, 95)}%` }}
                      />
                    </div>
                  )}

                  <div className="relative flex items-center gap-3 p-3.5">
                    {/* Step number / status icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isCompleted
                        ? 'bg-emerald-500/20'
                        : isRunning
                        ? 'bg-primary-500/20'
                        : isFailed
                        ? 'bg-red-500/20'
                        : 'bg-dark-700'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400 animate-[scaleIn_0.3s_ease-out]" />
                      ) : isRunning ? (
                        <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <span className="text-xs font-bold text-dark-500">{index + 1}</span>
                      )}
                    </div>

                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm transition-colors duration-300 ${
                          isCompleted ? 'text-emerald-400' : isRunning ? 'text-white' : isFailed ? 'text-red-400' : 'text-dark-500'
                        }`}>
                          {step.label}
                        </span>
                        {isRunning && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 text-[10px] font-medium uppercase tracking-wider">
                            Processing
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                        isCompleted ? 'text-emerald-400/60' : isRunning ? 'text-dark-300' : isFailed ? 'text-red-400/70' : 'text-dark-600'
                      }`}>
                        {isFailed ? (ss.error || 'Step failed') : step.description}
                      </p>
                    </div>

                    {/* Timing info */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCompleted && completedElapsed > 0 && (
                        <span className="text-xs text-emerald-400/70 font-mono">{formatElapsed(completedElapsed)}</span>
                      )}
                      {isRunning && (
                        <div className="text-right">
                          <span className="text-xs text-primary-300 font-mono block">{formatElapsed(elapsed)}</span>
                          <span className="text-[10px] text-dark-500">{formatEstimate(step.estimatedSeconds)}</span>
                        </div>
                      )}
                      {isPending && (
                        <span className="text-[10px] text-dark-600">{formatEstimate(step.estimatedSeconds)}</span>
                      )}
                      {isFailed && (
                        <button
                          onClick={handleRetry}
                          className="flex items-center gap-1 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Running step: animated progress bar at bottom */}
                  {isRunning && (
                    <div className="h-0.5 mx-3.5 mb-1 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-400 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${Math.min((elapsed / (step.estimatedSeconds * 1000)) * 100, 95)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-dark-700 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-dark-500 text-xs flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Processing time varies with audio length
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
                  onUploadComplete?.({});
                }}
                className="btn-primary px-6 py-2 flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Continue to Results
              </button>
            </div>
            <p className="text-dark-500 text-xs text-center">Processing will continue in the background</p>
          </div>
        </div>
      )}

      {/* ==================== RECORDING INTERFACE ==================== */}
      {inputMode === 'record' && state !== 'success' && state !== 'processing' && state !== 'uploading' && !selectedFile && (
        <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-dark-700/30 border-dark-600">
          {!audioBlob ? (
            <div className="space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${
                isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-primary-500/20 hover:bg-primary-500/30'
              }`}>
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping bg-red-500/30 rounded-full" />
                    <Mic className="w-12 h-12 text-red-400 relative z-10" />
                  </div>
                ) : (
                  <Mic className="w-12 h-12 text-primary-400" />
                )}
              </div>
              {isRecording && (
                <div className="space-y-2">
                  <div className="text-3xl font-mono text-white">{formatTime(recordingTime)}</div>
                  <p className="text-red-400 text-sm animate-pulse">● Recording...</p>
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
              {!isRecording && <p className="text-dark-400 text-sm">Click to start recording your assessment</p>}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto">
                <FileAudio className="w-8 h-8 text-accent-green" />
              </div>
              <div>
                <p className="text-white font-medium">Recording Complete</p>
                <p className="text-dark-400 text-sm">Duration: {formatTime(recordingTime)}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={isPlaying ? pauseRecording : playRecording} className="btn-secondary px-4 py-2 flex items-center gap-2">
                  {isPlaying ? (<><Pause className="w-4 h-4" />Pause</>) : (<><Play className="w-4 h-4" />Play</>)}
                </button>
              </div>
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-dark-700">
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
              ? 'border-primary-400 bg-primary-500/10 scale-[1.01] shadow-lg shadow-primary-500/10'
              : state === 'error'
              ? 'border-red-400/50 bg-red-500/5'
              : selectedFile
              ? 'border-dark-600 bg-dark-700/30'
              : 'border-dark-600 hover:border-dark-500 hover:bg-dark-700/20 bg-dark-700/30'
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
            <div className="p-8 space-y-5">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-dark-800 rounded-full flex items-center justify-center border-2 border-dark-700">
                    <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-medium mb-1">Uploading audio...</p>
                <p className="text-dark-400 text-xs">{selectedFile?.name}</p>
              </div>
              <div className="relative">
                <div className="w-full bg-dark-600 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 via-indigo-500 to-accent-cyan rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-dark-400">{formatFileSize(selectedFile?.size || 0)}</span>
                  <span className="text-xs text-primary-400 font-medium">{uploadProgress}%</span>
                </div>
              </div>
            </div>
          ) : selectedFile ? (
            /* File selected - show preview */
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                  <FileAudio className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedFile.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-dark-400 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-dark-500" />
                      {formatFileSize(selectedFile.size)}
                    </span>
                    <span className="text-dark-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Est. {estimateDuration(selectedFile.size)}
                    </span>
                    <span className="text-dark-500 text-xs">
                      {selectedFile.type || selectedFile.name.split('.').pop()?.toUpperCase()}
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
                state === 'dragging' ? 'bg-primary-500/30 scale-110' : 'bg-dark-600'
              }`}>
                <Upload className={`w-8 h-8 transition-all duration-300 ${
                  state === 'dragging' ? 'text-primary-400 -translate-y-1' : 'text-dark-400'
                }`} />
              </div>
              <p className="text-white font-medium mb-1 text-center">
                {state === 'dragging' ? 'Drop your audio file here' : 'Drag and drop audio file'}
              </p>
              <p className="text-dark-400 text-sm mb-5 text-center">or click to browse files</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['MP3', 'WAV', 'M4A', 'OGG', 'WebM'].map(fmt => (
                  <span key={fmt} className="px-2 py-0.5 bg-dark-700 rounded text-[10px] text-dark-400 font-medium">{fmt}</span>
                ))}
                <span className="text-dark-500 text-[10px]">• Max 100MB</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUCCESS STATE ==================== */}
      {state === 'success' && (
        <div className="text-center py-8">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl animate-ping opacity-30" />
            <div className="relative w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <p className="text-white font-medium text-lg">Processing Complete!</p>
          <p className="text-dark-400 text-sm mt-2 mb-6">Transcript, notes, and contract are ready</p>
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
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button onClick={reset} className="text-red-400 text-sm underline hover:text-red-300 flex-shrink-0">Try again</button>
        </div>
      )}

      {/* ==================== AI INFO BANNER ==================== */}
      {state === 'idle' && !selectedFile && !audioBlob && (
        <div className="mt-6 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0" />
          <p className="text-dark-300 text-sm">
            AI will transcribe, identify speakers, and generate notes & contract
          </p>
        </div>
      )}
    </div>
  );
}
