'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

const API_URL = '/api';

export type LocalDocument = {
  id: string;
  name: string;
  format: string;
  size: string;
  content_type: string;
  uploaded_by?: string | null;
  created_at: string;
  download_url: string;
  preview_url?: string | null;
};

type LocalDocumentsResponse = {
  documents: LocalDocument[];
  total: number;
  total_bytes: number;
};

type FileTypeFilter = 'all' | 'PDF' | 'DOCX';

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const shortDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatBadgeClass = (format: string) =>
  format === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600';

type LocalDriveSectionProps = {
  token: string | null;
  searchQuery: string;
  onError: (message: string | null) => void;
};

export default function LocalDriveSection({ token, searchQuery, onError }: LocalDriveSectionProps) {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [dragActive, setDragActive] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LocalDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (typeFilter !== 'all') params.set('file_type', typeFilter);
      const qs = params.toString();
      const response = await fetch(`${API_URL}/documents/local${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        onError('Could not load Local Drive files.');
        return;
      }
      const data: LocalDocumentsResponse = await response.json();
      setDocuments(data.documents || []);
      setTotalBytes(data.total_bytes || 0);
    } catch {
      onError('Could not load Local Drive files. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, typeFilter, onError]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredCount = documents.length;

  const usageLabel = useMemo(() => {
    return `${filteredCount} file${filteredCount === 1 ? '' : 's'} · ${formatBytes(totalBytes)} used`;
  }, [filteredCount, totalBytes]);

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || !token) return;
    setUploading(true);
    onError(null);

    const failures: string[] = [];
    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'docx') {
        failures.push(`${file.name}: only PDF and DOCX are allowed`);
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        failures.push(`${file.name}: exceeds 25 MB limit`);
        continue;
      }

      const form = new FormData();
      form.append('file', file);
      try {
        const response = await fetch(`${API_URL}/documents/local`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          body: form,
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          failures.push(`${file.name}: ${data.detail || 'upload failed'}`);
        }
      } catch {
        failures.push(`${file.name}: upload failed`);
      }
    }

    await fetchDocuments();
    setUploading(false);
    if (failures.length) {
      onError(failures.join('. '));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const handleDownload = async (doc: LocalDocument) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}${doc.download_url}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        onError('Download failed.');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name + (doc.format === 'PDF' ? '.pdf' : '.docx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      onError('Download failed.');
    }
  };

  const openPreview = async (doc: LocalDocument) => {
    if (!token || !doc.preview_url) {
      onError('Preview is only available for PDF files. Download DOCX to open it.');
      return;
    }
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const response = await fetch(`${API_URL}${doc.preview_url}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        onError('Could not load preview.');
        setPreviewDoc(null);
        return;
      }
      const blob = await response.blob();
      setPreviewUrl(window.URL.createObjectURL(blob));
    } catch {
      onError('Could not load preview.');
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  const handleDelete = async (doc: LocalDocument) => {
    if (!token || !confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${API_URL}/documents/local/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        onError('Could not delete file.');
        return;
      }
      if (previewDoc?.id === doc.id) closePreview();
      await fetchDocuments();
    } catch {
      onError('Could not delete file.');
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="glass-filter-row">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'PDF', 'DOCX'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFilter(key)}
                className={`glass-pill ${typeFilter === key ? 'glass-pill-active' : ''}`}
              >
                {key === 'all' ? 'All files' : key}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[13px] font-medium text-[#7A8C88]">{usageLabel}</span>
        </div>

        <div
          className={`rounded-[20px] border-2 border-dashed p-7 sm:p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50/80'
              : 'border-primary-500/40 bg-[#0D94880D]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="w-[52px] h-[52px] rounded-[14px] bg-[#0D94881A] flex items-center justify-center mx-auto mb-3">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-primary-600" />
            )}
          </div>
          <p className="text-[16px] font-semibold text-[#10211F] mb-1">
            {uploading ? 'Uploading…' : 'Drop files here to upload'}
          </p>
          <p className="text-[14px] font-medium text-[#64748B] mb-4">
            PDF and DOCX up to 25 MB each
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                uploadFiles(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="glass-btn-primary disabled:opacity-60"
            >
              Browse files
            </button>
            <span className="text-[13px] font-medium text-[#7A8C88]">or drag from your computer</span>
          </div>
        </div>

        <div className="glass-card overflow-hidden !p-0">
          <div className="hidden sm:flex items-center px-6 py-3.5 border-b border-[#10211F0F] bg-white/50 text-[11px] font-bold tracking-[0.08em] text-[#7A8C88]">
            <div className="w-[min(320px,35%)] shrink-0">FILE</div>
            <div className="w-28 shrink-0">TYPE</div>
            <div className="w-24 shrink-0">SIZE</div>
            <div className="w-24 shrink-0">UPLOADED</div>
            <div className="flex-1 text-right">ACTIONS</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-primary-500" />
              </div>
              <p className="text-[#10211F] font-medium mb-1">No local files yet</p>
              <p className="text-sm text-[#64748B]">
                Upload PDFs and DOCX from your computer. They are saved to your agency workspace.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 px-5 sm:px-6 border-b border-[#10211F0F] last:border-b-0 hover:bg-white/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => (doc.preview_url ? openPreview(doc) : handleDownload(doc))}
                  className="flex items-center gap-3 min-w-0 sm:w-[min(320px,35%)] text-left"
                >
                  <div
                    className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg ${
                      doc.format === 'PDF' ? 'bg-red-50' : 'bg-blue-50'
                    }`}
                  >
                    <FileText
                      className={`w-[18px] h-[18px] ${
                        doc.format === 'PDF' ? 'text-red-600' : 'text-blue-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#10211F] truncate">{doc.name}</p>
                    {doc.uploaded_by && (
                      <p className="text-[13px] font-medium text-[#7A8C88] truncate">
                        Uploaded by {doc.uploaded_by}
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-3 sm:contents">
                  <span
                    className={`inline-flex items-center h-[26px] px-2.5 rounded-full text-xs font-semibold ${formatBadgeClass(doc.format)}`}
                  >
                    {doc.format}
                  </span>
                  <span className="text-[14px] font-medium text-[#4B6B66] sm:w-24">{doc.size}</span>
                  <span className="text-[14px] font-medium text-[#7A8C88] sm:w-24">
                    {shortDate(doc.created_at)}
                  </span>
                  <div className="flex items-center gap-1 sm:flex-1 sm:justify-end ml-auto sm:ml-0">
                    <button
                      type="button"
                      aria-label="Preview"
                      onClick={() => openPreview(doc)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#4B6B66] hover:bg-white hover:text-primary-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Download"
                      onClick={() => handleDownload(doc)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#4B6B66] hover:bg-white hover:text-primary-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => handleDelete(doc)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#4B6B66] hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-[#10211F]/60 flex items-center justify-center z-50 p-4 sm:p-8">
          <div className="bg-white rounded-[24px] border border-[#FFFFFFE0] shadow-[0_24px_64px_#10211F33] w-full max-w-[960px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-5 border-b border-[#10211F0F]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#10211F] truncate">{previewDoc.name}</h2>
                  <p className="text-[13px] font-medium text-[#64748B] truncate">
                    {previewDoc.format} · {previewDoc.size}
                    {previewDoc.uploaded_by ? ` · Uploaded by ${previewDoc.uploaded_by}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-[#64748B] hover:bg-slate-50"
                  aria-label="Download"
                >
                  <Download className="w-[18px] h-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-slate-100 text-[#64748B] hover:bg-slate-200"
                  aria-label="Close preview"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-[#F8FAFC] p-4 sm:p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full min-h-[320px]">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              ) : previewUrl ? (
                <iframe
                  title={previewDoc.name}
                  src={previewUrl}
                  className="w-full h-full min-h-[420px] rounded-xl border border-[#E2E8F0] bg-white"
                />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[320px] text-[#64748B]">
                  Preview unavailable
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-t border-[#10211F0F]">
              <p className="text-[13px] font-medium text-[#64748B]">
                Stored in Local Drive · Saved to your agency database
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(previewDoc)}
                  className="h-10 px-4 rounded-[10px] border border-[#E2E8F0] text-[#4B6B66] text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  className="glass-btn-primary h-10"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
