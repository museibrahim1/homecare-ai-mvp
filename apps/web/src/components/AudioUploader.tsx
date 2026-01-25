'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Mic, 
  FileAudio, 
  CheckCircle, 
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

interface AudioUploaderProps {
  visitId: string;
  token: string;
  onUploadComplete?: (audioAsset: any) => void;
  onClose?: () => void;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

export default function AudioUploader({ 
  visitId, 
  token, 
  onUploadComplete,
  onClose 
}: AudioUploaderProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'audio/mpeg',
    'audio/wav', 
    'audio/mp4',
    'audio/ogg',
    'audio/webm',
    'audio/x-m4a',
    'audio/mp3',
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateFile = (file: File): string | null => {
    // Check type
    const isValidType = allowedTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith('.mp3') || 
      file.name.toLowerCase().endsWith('.wav') || file.name.toLowerCase().endsWith('.m4a')
    );
    
    if (!isValidType) {
      return 'Invalid file type. Please upload MP3, WAV, M4A, OGG, or WebM files.';
    }

    // Check size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      return 'File too large. Maximum size is 100MB.';
    }

    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('dragging');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setState('error');
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setState('uploading');
    setProgress(0);

    // Simulate progress for better UX (actual upload doesn't give progress)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const result = await api.uploadAudio(token, visitId, selectedFile);
      
      clearInterval(progressInterval);
      setProgress(100);
      setState('success');

      // Auto-close after success
      setTimeout(() => {
        onUploadComplete?.(result);
      }, 1500);

    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'Upload failed');
      setState('error');
    }
  };

  const resetUploader = () => {
    setState('idle');
    setSelectedFile(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Upload Audio</h3>
            <p className="text-dark-400 text-sm">Upload a recording for this visit</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        )}
      </div>

      {/* Upload Area */}
      {state !== 'success' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${state === 'dragging' 
              ? 'border-primary-400 bg-primary-500/10' 
              : state === 'error'
              ? 'border-red-400/50 bg-red-500/5'
              : 'border-dark-600 hover:border-dark-500 bg-dark-700/30'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            onChange={handleFileInput}
            className="hidden"
          />

          {state === 'uploading' ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-primary-400 mx-auto animate-spin" />
              <div>
                <p className="text-white font-medium mb-2">Uploading...</p>
                <div className="w-full bg-dark-600 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-dark-400 text-sm mt-2">{progress}%</p>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto">
                <FileAudio className="w-8 h-8 text-accent-green" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-dark-400 text-sm">{formatFileSize(selectedFile.size)}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetUploader();
                  }}
                  className="btn-secondary px-4 py-2"
                >
                  Change
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  className="btn-primary px-6 py-2"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                ${state === 'dragging' ? 'bg-primary-500/30' : 'bg-dark-600'}
              `}>
                <Upload className={`w-8 h-8 ${state === 'dragging' ? 'text-primary-400' : 'text-dark-400'}`} />
              </div>
              <p className="text-white font-medium mb-1">
                {state === 'dragging' ? 'Drop your file here' : 'Drag and drop audio file'}
              </p>
              <p className="text-dark-400 text-sm mb-4">
                or click to browse
              </p>
              <p className="text-dark-500 text-xs">
                MP3, WAV, M4A, OGG, WebM • Max 100MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Success State */}
      {state === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <CheckCircle className="w-8 h-8 text-accent-green" />
          </div>
          <p className="text-white font-medium mb-1">Upload Complete!</p>
          <p className="text-dark-400 text-sm">
            Your audio file is ready for processing
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Upload Error</p>
            <p className="text-red-400/70 text-sm">{error}</p>
          </div>
          <button
            onClick={resetUploader}
            className="text-red-400 hover:text-red-300 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-dark-700/30 rounded-xl">
        <h4 className="text-dark-300 font-medium text-sm mb-2">What happens next?</h4>
        <ul className="space-y-1.5 text-dark-400 text-sm">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
            Audio is transcribed using Whisper AI
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent-cyan rounded-full" />
            Speakers are identified and separated
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent-green rounded-full" />
            Billable items are extracted automatically
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent-purple rounded-full" />
            Visit notes are generated
          </li>
        </ul>
      </div>
    </div>
  );
}
