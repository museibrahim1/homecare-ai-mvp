'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  FileText, Upload, CheckCircle, AlertCircle, X, Loader2, 
  FileUp, ClipboardPaste, Sparkles 
} from 'lucide-react';
import { api } from '@/lib/api';

interface TranscriptImporterProps {
  visitId: string;
  token: string;
  onImportComplete?: () => void;
  onClose?: () => void;
}

type ImportFormat = 'text' | 'srt' | 'vtt' | 'json';
type TextFormat = 'dialogue' | 'timestamped' | 'paragraph';

export default function TranscriptImporter({ 
  visitId, 
  token, 
  onImportComplete, 
  onClose 
}: TranscriptImporterProps) {
  const [state, setState] = useState<'idle' | 'importing' | 'processing' | 'success' | 'error'>('idle');
  const [format, setFormat] = useState<ImportFormat>('text');
  const [textFormat, setTextFormat] = useState<TextFormat>('dialogue');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ segments: number; words: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      
      // Auto-detect format from file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'srt') setFormat('srt');
      else if (ext === 'vtt') setFormat('vtt');
      else if (ext === 'json') setFormat('json');
      else setFormat('text');
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
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
      let endpoint = '';
      let body: any = {};

      switch (format) {
        case 'srt':
          endpoint = `/visits/${visitId}/transcript/import/srt`;
          body = { srt_content: content, replace_existing: true };
          break;
        case 'vtt':
          endpoint = `/visits/${visitId}/transcript/import/vtt`;
          body = { vtt_content: content, replace_existing: true };
          break;
        case 'json':
          endpoint = `/visits/${visitId}/transcript/import`;
          // Try to parse JSON to get segments array
          try {
            const parsed = JSON.parse(content);
            body = { 
              segments: Array.isArray(parsed) ? parsed : parsed.segments || [parsed],
              source: 'import_json',
              replace_existing: true 
            };
          } catch {
            throw new Error('Invalid JSON format. Expected array of segments or {segments: [...]}');
          }
          break;
        case 'text':
        default:
          endpoint = `/visits/${visitId}/transcript/import/text`;
          body = { 
            text_content: content, 
            format_hint: textFormat,
            replace_existing: true 
          };
          break;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Import failed');
      }

      const data = await response.json();
      setResult({ segments: data.segments_imported, words: data.word_count });
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/pipeline/visits/${visitId}/process-transcript?generate_note=true&generate_billing=true&generate_contract=true`,
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
            <p className="text-sm text-slate-400">From another service or file</p>
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
          {/* Format Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Import Format</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'text', label: 'Plain Text', desc: 'Dialogue or timestamped' },
                { id: 'srt', label: 'SRT', desc: 'Subtitle format' },
                { id: 'vtt', label: 'WebVTT', desc: 'Web subtitle format' },
                { id: 'json', label: 'JSON', desc: 'Structured data' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as ImportFormat)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    format === f.id
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium text-sm">{f.label}</div>
                  <div className="text-xs text-slate-400">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Format Sub-option */}
          {format === 'text' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Text Format</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTextFormat('dialogue')}
                  className={`p-2 rounded-lg border text-sm ${
                    textFormat === 'dialogue' 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium">Dialogue</div>
                  <div className="text-xs text-slate-400">Speaker: text</div>
                </button>
                <button
                  onClick={() => setTextFormat('timestamped')}
                  className={`p-2 rounded-lg border text-sm ${
                    textFormat === 'timestamped' 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium">Timestamped</div>
                  <div className="text-xs text-slate-400">[00:00] text</div>
                </button>
                <button
                  onClick={() => setTextFormat('paragraph')}
                  className={`p-2 rounded-lg border text-sm ${
                    textFormat === 'paragraph' 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium">Paragraph</div>
                  <div className="text-xs text-slate-400">Continuous text</div>
                </button>
              </div>
            </div>
          )}

          {/* Content Input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Transcript Content</label>
              <div className="flex gap-2">
                <button
                  onClick={handlePaste}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                >
                  <ClipboardPaste className="w-3 h-3" /> Paste
                </button>
                <label className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 cursor-pointer">
                  <FileUp className="w-3 h-3" /> Upload File
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
            
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative"
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  format === 'text' && textFormat === 'dialogue'
                    ? "Caregiver: Hello, how are you feeling today?\nClient: I'm doing much better, thank you."
                    : format === 'srt'
                    ? "1\n00:00:00,000 --> 00:00:05,000\nHello, how are you?"
                    : format === 'json'
                    ? '[{"start_ms": 0, "end_ms": 5000, "text": "Hello", "speaker_label": "Caregiver"}]'
                    : "Enter transcript content..."
                }
                className="w-full h-48 p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <div className="absolute bottom-2 right-2 text-xs text-slate-500">
                {content.length} characters
              </div>
            </div>
          </div>

          {/* Example Formats */}
          <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
            <div className="text-xs text-slate-400 mb-1">Example {format.toUpperCase()} format:</div>
            <code className="text-xs text-slate-300 whitespace-pre-wrap">
              {format === 'text' && textFormat === 'dialogue' && 
                'Caregiver: Hello, how are you feeling today?\nClient: Much better, thank you for asking.'}
              {format === 'text' && textFormat === 'timestamped' && 
                '[00:00] Hello, how are you feeling today?\n[00:05] Much better, thank you.'}
              {format === 'srt' && 
                '1\n00:00:00,000 --> 00:00:05,000\nHello, how are you?'}
              {format === 'vtt' && 
                'WEBVTT\n\n00:00.000 --> 00:05.000\nHello, how are you?'}
              {format === 'json' && 
                '[{"start_ms": 0, "end_ms": 5000, "text": "Hello", "speaker_label": "Caregiver"}]'}
            </code>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
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
          <p className="text-slate-300">Importing transcript...</p>
        </div>
      )}

      {state === 'success' && (
        <div className="py-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h4 className="text-xl font-semibold text-white mb-2">Import Successful!</h4>
          <p className="text-slate-400 mb-6">
            Imported {result?.segments} segments ({result?.words} words)
          </p>
          
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
