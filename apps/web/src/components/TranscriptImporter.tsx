'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  FileText, Upload, CheckCircle, AlertCircle, X, Loader2, 
  FileUp, ClipboardPaste, Sparkles, Wand2
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface TranscriptImporterProps {
  visitId: string;
  token: string;
  onImportComplete?: () => void;
  onClose?: () => void;
}

export default function TranscriptImporter({ 
  visitId, 
  token, 
  onImportComplete, 
  onClose 
}: TranscriptImporterProps) {
  const [state, setState] = useState<'idle' | 'importing' | 'processing' | 'success' | 'error'>('idle');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ segments: number; words: number; format: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent(text);
    } catch (err) {
      setError('Failed to read clipboard');
    }
  }, []);

  const importTranscript = async () => {
    if (!content.trim()) {
      setError('Please enter or upload transcript content');
      return;
    }

    setState('importing');
    setError(null);

    try {
      // Use auto-detect endpoint - backend will figure out the format
      const response = await fetch(
        `${API_BASE}/visits/${visitId}/transcript/import/auto`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            content: content,
            replace_existing: true 
          })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Import failed');
      }

      const data = await response.json();
      setResult({ 
        segments: data.segments_imported, 
        words: data.word_count,
        format: data.detected_format 
      });
      setState('success');
      
    } catch (err: any) {
      setError(err.message || 'Failed to import transcript');
      setState('error');
    }
  };

  const processTranscript = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `${API_BASE}/pipeline/visits/${visitId}/process-transcript?generate_note=true&generate_billing=true&generate_contract=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Processing failed');
      }

      onImportComplete?.();
    } catch (err: any) {
      setError(err.message || 'Failed to start processing');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Import Transcript</h3>
            <p className="text-sm text-slate-400">Paste or upload - we'll detect the format automatically</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {state === 'idle' && (
        <>
          {/* Drag & Drop / Content Input */}
          <div 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative mb-4 transition-all ${
              dragActive ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-800' : ''
            }`}
          >
            {/* Action buttons */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>Auto-detects: SRT, VTT, JSON, or plain text</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePaste}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                >
                  <ClipboardPaste className="w-4 h-4" /> Paste
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 cursor-pointer transition-colors">
                  <FileUp className="w-4 h-4" /> Upload
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.srt,.vtt,.json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Paste your transcript here or drag & drop a file...

Examples of supported formats:

• Dialogue format:
  Caregiver: Hello, how are you feeling today?
  Client: I'm doing much better, thank you.

• Timestamped:
  [00:00] Hello, how are you feeling?
  [00:05] Much better, thank you.

• SRT/VTT subtitle files

• JSON with segments array`}
              className="w-full h-56 p-4 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
            />
            
            {dragActive && (
              <div className="absolute inset-0 bg-purple-500/10 border-2 border-dashed border-purple-500 rounded-lg flex items-center justify-center">
                <div className="text-purple-400 font-medium">Drop file here</div>
              </div>
            )}
            
            <div className="absolute bottom-3 right-3 text-xs text-slate-500">
              {content.length > 0 ? `${content.length.toLocaleString()} characters` : ''}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={importTranscript}
            disabled={!content.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Transcript
          </button>
        </>
      )}

      {state === 'importing' && (
        <div className="py-8 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Analyzing and importing transcript...</p>
          <p className="text-sm text-slate-500 mt-1">Auto-detecting format</p>
        </div>
      )}

      {state === 'success' && (
        <div className="py-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h4 className="text-xl font-semibold text-white mb-2">Import Successful!</h4>
          <p className="text-slate-400 mb-1">
            Imported {result?.segments} segments ({result?.words} words)
          </p>
          {result?.format && (
            <p className="text-sm text-slate-500 mb-6">
              Detected format: <span className="text-purple-400">{result.format}</span>
            </p>
          )}
          
          <div className="space-y-3">
            <button
              onClick={processTranscript}
              disabled={processing}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {processing ? 'Starting...' : 'Generate Billing & Notes'}
            </button>
            
            <button
              onClick={() => onImportComplete?.()}
              className="w-full py-2 text-slate-400 hover:text-white text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="py-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h4 className="text-xl font-semibold text-white mb-2">Import Failed</h4>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => { setState('idle'); setError(null); }}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
