'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Mic, FileAudio, CheckCircle, AlertCircle, X, Loader2, Sparkles, Square, Play, Pause } from 'lucide-react';
import { api } from '@/lib/api';

interface AudioUploaderProps {
  visitId: string;
  token: string;
  onUploadComplete?: (audioAsset: any) => void;
  onClose?: () => void;
  autoProcess?: boolean;
}

type InputMode = 'upload' | 'record';

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
  const pollCountRef = useRef(0);
  const MAX_POLL_COUNT = 200; // 200 * 3s = 10 minutes max
  
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Recording functions
  const startRecording = async () => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          sampleRate: 44100 
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      const capturedStream = stream;
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        capturedStream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err: any) {
      // Clean up stream tracks if we got a stream before the error
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      console.error('Recording error:', err);
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
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };
  
  const uploadRecording = async () => {
    if (!audioBlob) return;
    
    // Convert blob to file
    const file = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
    setSelectedFile(file);
    
    setState('uploading');
    setProgress(0);
    
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 300);
    
    try {
      await api.uploadAudio(token, visitId, file, autoProcess);
      clearInterval(interval);
      setProgress(100);
      
      if (autoProcess) {
        setState('processing');
        setCurrentStep('transcription');
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
  
  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      // Stop active recording and release mic on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [audioUrl]);

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
    pollCountRef.current += 1;
    
    // Safety: stop polling after max attempts (10 minutes)
    if (pollCountRef.current > MAX_POLL_COUNT) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setState('success');
      setTimeout(() => onUploadComplete?.({}), 1500);
      return;
    }
    
    try {
      const status = await api.getPipelineStatus(token, visitId);
      const pipelineState = status.pipeline_state || {};
      
      const completed: string[] = [];
      let processing: string | null = null;
      let hasFailed = false;
      
      for (const step of PIPELINE_STEPS) {
        const stepState = pipelineState[step.key];
        if (stepState?.status === 'completed') {
          completed.push(step.key);
        } else if (stepState?.status === 'failed' || stepState?.status === 'error') {
          hasFailed = true;
          break;
        } else if (stepState?.status === 'processing' || stepState?.status === 'queued') {
          processing = step.key;
          break;
        }
      }
      
      setCompletedSteps(completed);
      setCurrentStep(processing);
      
      // Check if all steps are done or the full pipeline completed
      const allDone = PIPELINE_STEPS.every(s => 
        pipelineState[s.key]?.status === 'completed' || pipelineState[s.key]?.status === 'failed'
      );
      
      // Stop polling if: all done, full pipeline completed, or a step failed
      if (allDone || pipelineState.full_pipeline?.status === 'completed' || hasFailed) {
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
        pollCountRef.current = 0;
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
    clearRecording();
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  return (
    <div className="card p-6">
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

      {/* Recording Interface */}
      {inputMode === 'record' && state !== 'success' && state !== 'processing' && state !== 'uploading' && !selectedFile && (
        <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-dark-700/30 border-dark-600">
          {!audioBlob ? (
            // Recording controls
            <div className="space-y-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all ${
                isRecording 
                  ? 'bg-red-500/20 animate-pulse' 
                  : 'bg-primary-500/20 hover:bg-primary-500/30'
              }`}>
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping bg-red-500/30 rounded-full"></div>
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
                  <button
                    onClick={startRecording}
                    className="btn-primary px-6 py-3 flex items-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    Stop Recording
                  </button>
                )}
              </div>
              
              {!isRecording && (
                <p className="text-dark-400 text-sm">
                  Click to start recording your assessment
                </p>
              )}
            </div>
          ) : (
            // Preview recorded audio
            <div className="space-y-6">
              <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto">
                <FileAudio className="w-8 h-8 text-accent-green" />
              </div>
              
              <div>
                <p className="text-white font-medium">Recording Complete</p>
                <p className="text-dark-400 text-sm">Duration: {formatTime(recordingTime)}</p>
              </div>
              
              {/* Playback controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={isPlaying ? pauseRecording : playRecording}
                  className="btn-secondary px-4 py-2 flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Play
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-dark-700">
                <button
                  onClick={clearRecording}
                  className="btn-secondary px-4 py-2"
                >
                  Record Again
                </button>
                <button
                  onClick={uploadRecording}
                  className="btn-primary px-6 py-2 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Upload & Process
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* File Upload Interface */}
      {inputMode === 'upload' && state !== 'success' && state !== 'processing' && (
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
