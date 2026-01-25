'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, CheckCircle, AlertCircle, X, Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface AudioUploaderProps {
  visitId: string;
  token: string;
  onUploadComplete?: (audioAsset: any) => void;
  onClose?: () => void;
  autoProcess?: boolean;
}

const PIPELINE_STEPS = [
  { key: 'transcription', label: 'Transcribing audio...', icon: '🎤' },
  { key: 'diarization', label: 'Identifying speakers...', icon: '👥' },
  { key: 'alignment', label: 'Aligning transcript...', icon: '🔗' },
  { key: 'billing', label: 'Extracting billables...', icon: '💰' },
  { key: 'note', label: 'Generating visit note...', icon: '📝' },
  { key: 'contract', label: 'Creating contract...', icon: '📄' },
];

export default function AudioUploader({ visitId, token, onUploadComplete, onClose, autoProcess = true }: AudioUploaderProps) {
  const [state, setState] = useState<'idle' | 'dragging' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setState('dragging'); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setState('idle'); }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('idle');
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Max 100MB.');
      setState('error');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const pollPipelineStatus = useCallback(async () => {
    try {
      const status = await api.getPipelineStatus(token, visitId);
      const pipelineState = status.pipeline_state || {};
      
      const completed: string[] = [];
      let processing: string | null = null;
      
      for (const step of PIPELINE_STEPS) {
        const stepState = pipelineState[step.key];
        if (stepState?.status === 'completed') {
          completed.push(step.key);
        } else if (stepState?.status === 'processing' || stepState?.status === 'queued') {
          processing = step.key;
          break;
        }
      }
      
      setCompletedSteps(completed);
      setCurrentStep(processing);
      
      // Check if all steps are done
      const allDone = PIPELINE_STEPS.every(s => 
        pipelineState[s.key]?.status === 'completed' || pipelineState[s.key]?.status === 'failed'
      );
      
      if (allDone || pipelineState.full_pipeline?.status === 'completed') {
        setState('success');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setTimeout(() => onUploadComplete?.({}), 1500);
      }
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  }, [token, visitId, onUploadComplete]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setState('uploading');
    setProgress(0);
    
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 300);
    
    try {
      await api.uploadAudio(token, visitId, selectedFile, autoProcess);
      clearInterval(interval);
      setProgress(100);
      
      if (autoProcess) {
        setState('processing');
        setCurrentStep('transcription');
        // Start polling for pipeline status
        pollIntervalRef.current = setInterval(pollPipelineStatus, 3000);
        pollPipelineStatus(); // Initial poll
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

  const reset = () => { 
    setState('idle'); 
    setSelectedFile(null); 
    setError(null); 
    setProgress(0);
    setCurrentStep(null);
    setCompletedSteps([]);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Upload Audio</h3>
            <p className="text-dark-400 text-sm">
              {autoProcess ? 'Upload & auto-process with AI' : 'Upload a recording for this visit'}
            </p>
          </div>
        </div>
        {onClose && state !== 'processing' && (
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        )}
      </div>

      {state === 'processing' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-primary-400 animate-pulse" />
            <p className="text-white font-medium">AI Processing in Progress...</p>
          </div>
          
          <div className="space-y-3">
            {PIPELINE_STEPS.map((step) => {
              const isCompleted = completedSteps.includes(step.key);
              const isCurrent = currentStep === step.key;
              
              return (
                <div 
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCompleted ? 'bg-accent-green/10' : isCurrent ? 'bg-primary-500/10' : 'bg-dark-700/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isCompleted ? 'bg-accent-green/20' : isCurrent ? 'bg-primary-500/20' : 'bg-dark-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-accent-green" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                    ) : (
                      <span className="text-sm">{step.icon}</span>
                    )}
                  </div>
                  <span className={`font-medium ${
                    isCompleted ? 'text-accent-green' : isCurrent ? 'text-primary-400' : 'text-dark-400'
                  }`}>
                    {isCurrent ? step.label : step.label.replace('...', '')}
                  </span>
                </div>
              );
            })}
          </div>
          
          <p className="text-dark-400 text-sm text-center mt-4">
            This may take a few minutes depending on audio length
          </p>
          
          {/* Continue button - always visible during processing */}
          <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-dark-700">
            <button 
              onClick={() => {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                onUploadComplete?.({});
              }}
              className="btn-primary px-6 py-2 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Continue to Results
            </button>
          </div>
          <p className="text-dark-500 text-xs text-center">
            Processing will continue in the background
          </p>
        </div>
      )}

      {state !== 'success' && state !== 'processing' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            state === 'dragging' ? 'border-primary-400 bg-primary-500/10' : state === 'error' ? 'border-red-400/50' : 'border-dark-600 hover:border-dark-500 bg-dark-700/30'
          }`}
        >
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
          
          {state === 'uploading' ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-primary-400 mx-auto animate-spin" />
              <div>
                <p className="text-white font-medium mb-2">Uploading...</p>
                <div className="w-full bg-dark-600 rounded-full h-2"><div className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto"><FileAudio className="w-8 h-8 text-accent-green" /></div>
              <div><p className="text-white font-medium">{selectedFile.name}</p><p className="text-dark-400 text-sm">{formatFileSize(selectedFile.size)}</p></div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="btn-secondary px-4 py-2">Change</button>
                <button onClick={(e) => { e.stopPropagation(); handleUpload(); }} className="btn-primary px-6 py-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />Upload & Process
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${state === 'dragging' ? 'bg-primary-500/30' : 'bg-dark-600'}`}>
                <Upload className={`w-8 h-8 ${state === 'dragging' ? 'text-primary-400' : 'text-dark-400'}`} />
              </div>
              <p className="text-white font-medium mb-1">{state === 'dragging' ? 'Drop your file here' : 'Drag and drop audio file'}</p>
              <p className="text-dark-400 text-sm mb-4">or click to browse</p>
              <p className="text-dark-500 text-xs">MP3, WAV, M4A • Max 100MB</p>
            </>
          )}
        </div>
      )}

      {state === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow"><CheckCircle className="w-8 h-8 text-accent-green" /></div>
          <p className="text-white font-medium text-lg">Processing Complete!</p>
          <p className="text-dark-400 text-sm mt-2 mb-6">Transcript, notes, and contract are ready</p>
          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={() => { reset(); onClose?.(); }}
              className="btn-secondary px-4 py-2"
            >
              Upload Another
            </button>
            <button 
              onClick={() => onUploadComplete?.({})}
              className="btn-primary px-6 py-2 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              View Results
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <div className="flex-1"><p className="text-red-400">{error}</p></div>
          <button onClick={reset} className="text-red-400 text-sm underline">Try again</button>
        </div>
      )}

      {state === 'idle' && !selectedFile && (
        <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
          <h4 className="text-primary-400 font-medium text-sm mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Auto-Processing Enabled
          </h4>
          <p className="text-dark-300 text-sm">
            Upload will automatically: transcribe audio → identify speakers → extract billables → generate notes → create contract
          </p>
        </div>
      )}
    </div>
  );
}
