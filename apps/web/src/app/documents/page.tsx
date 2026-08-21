'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import GlassShell from '@/components/GlassShell';
import { FolderOpen, FileText, Upload, Search, Filter, Download, Trash2, Eye, Grid, List, X, Plus, File, Cloud, Check, Loader2, RefreshCw, Link2, Mic, FileCheck, Play, User, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_URL = '/api';

type Document = {
  id: string;
  name: string;
  type: string; // contract, note, audio
  format: string; // PDF, MP3, WAV
  size: string;
  folder: string;
  client_id?: string;
  client_name?: string;
  visit_id?: string;
  created_at: string;
  download_url?: string;
  driveId?: string;
  webViewLink?: string;
};

type Folder = {
  id: number;
  name: string;
  count: number;
  icon: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
};

const typeColors: Record<string, string> = {
  PDF: 'bg-red-50 text-red-600',
  DOCX: 'bg-blue-50 text-blue-600',
  XLSX: 'bg-emerald-50 text-emerald-600',
  MP3: 'bg-purple-50 text-purple-600',
  WAV: 'bg-purple-50 text-purple-600',
  M4A: 'bg-purple-50 text-purple-600',
  AUDIO: 'bg-purple-50 text-purple-600',
  GDOC: 'bg-blue-50 text-blue-600',
  GSHEET: 'bg-emerald-50 text-emerald-600',
  GSLIDE: 'bg-amber-50 text-amber-600',
};

const typeIcons: Record<string, any> = {
  contract: FileCheck,
  note: FileText,
  audio: Mic,
};

const getMimeTypeLabel = (mimeType: string): string => {
  if (mimeType.includes('document')) return 'GDOC';
  if (mimeType.includes('spreadsheet')) return 'GSHEET';
  if (mimeType.includes('presentation')) return 'GSLIDE';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word')) return 'DOCX';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLSX';
  return 'FILE';
};

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
};

export default function DocumentsPage() {
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Google Drive state
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [checkingDrive, setCheckingDrive] = useState(true);

  // Fetch ALL documents from API (filtering is done client-side to keep folder counts accurate)
  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.documents || []);
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load documents on mount and when filters change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Check Google Drive connection status
  useEffect(() => {
    const checkDriveStatus = async () => {
      if (!token) {
        setCheckingDrive(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/drive/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          setDriveConnected(data.connected);
        }
      } catch (error) {
        console.error('Failed to check Drive status:', error);
      }
      setCheckingDrive(false);
    };

    checkDriveStatus();
  }, [token]);

  const [typeFilter, setTypeFilter] = useState<'all' | 'care' | 'billables' | 'notes' | 'contracts'>('all');

  const docKind = (file: Document): 'care' | 'billables' | 'notes' | 'contracts' | 'other' => {
    const blob = `${file.name} ${file.type} ${file.folder || ''}`.toLowerCase();
    if (blob.includes('billable') || blob.includes('billing')) return 'billables';
    if (blob.includes('care plan') || blob.includes('care_plan') || blob.includes('careplan')) return 'care';
    if (blob.includes('note') || blob.includes('soap') || file.type === 'note') return 'notes';
    if (blob.includes('contract') || blob.includes('agreement') || file.type === 'contract') return 'contracts';
    if (file.folder?.toLowerCase().includes('contract')) return 'contracts';
    if (file.folder?.toLowerCase().includes('assessment')) return 'care';
    return 'other';
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (file.client_name && file.client_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = !selectedFolder || file.folder === selectedFolder;
    const kind = docKind(file);
    const matchesType = typeFilter === 'all' || kind === typeFilter;
    return matchesSearch && matchesFolder && matchesType;
  });

  const UNASSIGNED = 'Unassigned';

  // Group the filtered documents by client, sorted alphabetically with Unassigned last.
  const clientGroups = useMemo(() => {
    const map = new Map<string, Document[]>();
    for (const file of filteredFiles) {
      const key = file.client_name && file.client_name.trim() ? file.client_name.trim() : UNASSIGNED;
      const bucket = map.get(key);
      if (bucket) bucket.push(file);
      else map.set(key, [file]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === UNASSIGNED) return 1;
      if (b === UNASSIGNED) return -1;
      return a.localeCompare(b);
    });
  }, [filteredFiles]);

  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const toggleClient = (name: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  // An active search auto-expands every matching group so results stay visible.
  const searching = searchQuery.trim().length > 0;
  const isClientExpanded = (name: string) => searching || expandedClients.has(name);

  const clientInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const shortDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const detailFor = (file: Document) => {
    if (file.size) return file.size;
    if (file.format) return file.format;
    return file.type || 'Document';
  };

  const statusFor = (file: Document) => {
    if (file.type === 'audio') return { label: 'Recording', tone: 'muted' as const };
    if (file.name.toLowerCase().includes('draft')) return { label: 'Draft', tone: 'warn' as const };
    return { label: 'Ready', tone: 'ready' as const };
  };

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || !token) return;

    const incoming = Array.from(uploadedFiles);
    const optimistic: Document[] = incoming.map((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      return {
        id: String(Date.now() + Math.random()),
        name: file.name,
        type: 'uploaded',
        format: ext,
        size: `${Math.round(file.size / 1024)} KB`,
        created_at: new Date().toISOString(),
        folder: selectedFolder || 'Contracts',
      };
    });
    setFiles(prev => [...optimistic, ...prev]);
    setShowUploadModal(false);

    try {
      const agencyRes = await fetch(`${API_URL}/agency`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const agency = agencyRes.ok ? await agencyRes.json() : { documents: [] };
      const existing = Array.isArray(agency.documents) ? agency.documents : [];
      const stored = incoming.map((file, i) => ({
        id: optimistic[i].id,
        name: file.name,
        type: file.type || 'application/octet-stream',
        category: 'uploaded',
        content: '',
        uploaded_at: optimistic[i].created_at,
      }));
      const put = await fetch(`${API_URL}/agency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ documents: [...existing, ...stored] }),
      });
      if (!put.ok) {
        setError('Could not save the upload. Try again from Settings.');
      }
    } catch {
      setError('Could not save the upload. Check your connection.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = {
      id: Date.now(),
      name: newFolderName,
      count: 0,
      icon: '📁',
    };
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleDeleteFile = (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    setFiles(files.filter(f => f.id !== fileId));
    setShowPreviewModal(false);
  };

  const handleDownload = async (file: Document) => {
    if (!token || !file.download_url) return;
    
    try {
      const response = await fetch(`${API_URL}${file.download_url}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        setError('Failed to download file');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download file');
    }
  };

  const handleConnectDrive = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      setError('Google Drive is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to environment variables.');
      return;
    }

    const redirectUri = `${window.location.origin}/documents`;
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleDisconnectDrive = async () => {
    if (!token) return;
    
    try {
      await fetch(`${API_URL}/drive/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setDriveConnected(false);
      setDriveFiles([]);
    } catch (error) {
      console.error('Failed to disconnect Drive:', error);
    }
    setShowDriveModal(false);
  };

  const handleSyncDrive = async () => {
    if (!token) return;
    
    setDriveLoading(true);
    try {
      const response = await fetch(`${API_URL}/drive/files`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDriveFiles(data.files || []);
        
        // Add Drive files to local files list
        const newFiles: Document[] = (data.files || []).map((df: DriveFile) => ({
          id: df.id,
          name: df.name,
          type: 'drive',
          format: getMimeTypeLabel(df.mimeType),
          size: df.size ? `${Math.round(parseInt(df.size) / 1024)} KB` : '-',
          created_at: df.modifiedTime || new Date().toISOString(),
          folder: 'Google Drive',
          driveId: df.id,
          webViewLink: df.webViewLink,
        }));
        
        // Add Google Drive folder if not exists
        if (!folders.find(f => f.name === 'Google Drive')) {
          setFolders(prev => [...prev, { id: Date.now(), name: 'Google Drive', count: newFiles.length, icon: '☁️' }]);
        }
        
        // Merge with existing files (avoid duplicates)
        setFiles(prev => {
          const existingIds = new Set(prev.map(f => f.driveId).filter(Boolean));
          const uniqueNewFiles = newFiles.filter((f: Document) => !existingIds.has(f.driveId));
          return [...prev, ...uniqueNewFiles];
        });
      }
    } catch (error) {
      console.error('Failed to sync Drive:', error);
    }
    setDriveLoading(false);
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      setError('Failed to connect Google Drive: ' + error);
      window.history.replaceState({}, '', '/documents');
      return;
    }

    // Session expired mid-OAuth: scrub the one-time code from the URL anyway.
    if (code && !token) {
      window.history.replaceState({}, '', '/documents');
      return;
    }

    if (code && token) {
      const connectDrive = async () => {
        setDriveLoading(true);
        try {
          const response = await fetch(`${API_URL}/drive/connect`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              redirect_uri: `${window.location.origin}/documents`,
            }),
          });
          
          if (response.ok) {
            setDriveConnected(true);
            handleSyncDrive();
          } else {
            const data = await response.json();
            setError('Failed to connect: ' + (data.detail || 'Unknown error'));
          }
        } catch (error) {
          console.error('Failed to connect Drive:', error);
          setError('Failed to connect Google Drive');
        }
        window.history.replaceState({}, '', '/documents');
        setDriveLoading(false);
      };
      
      connectDrive();
    }
  }, [token]);

  // Select folder handler (single click)
  const handleFolderClick = (folderName: string) => {
    setSelectedFolder(selectedFolder === folderName ? null : folderName);
  };

  const getFileIcon = (file: Document) => {
    if (file.driveId) return Cloud;
    const Icon = typeIcons[file.type] || FileText;
    return Icon;
  };

  return (
    <GlassShell>
        {/* Paper Documents header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[11px] tracking-[0.12em] font-semibold text-primary-500">LIBRARY</p>
            <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight text-[#10211F]">
              Documents
            </h1>
            <p className="text-[15px] font-medium leading-6 text-[#64748B] max-w-xl">
              Everything Palm generated from your visits, ready to send.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#FFFFFFB8] border border-[#FFFFFFE0] text-[14px] text-[#10211F] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-primary-500/30 shadow-[0_8px_20px_#0D948812]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="glass-btn-primary"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setShowDriveModal(true)}
              disabled={checkingDrive}
              className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                driveConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-[#FFFFFFB8] text-[#4B6B66] border-[#FFFFFFE0] hover:bg-white'
              }`}
            >
              {checkingDrive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : driveConnected ? (
                <Check className="w-4 h-4" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              {driveConnected ? 'Drive' : 'Drive'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-600">{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-600 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {driveConnected && (
          <div className="p-4 glass-card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[#10211F] font-medium">Google Drive connected</p>
                <p className="text-sm text-[#64748B]">Files sync from Drive when you refresh</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSyncDrive}
              disabled={driveLoading}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-semibold shrink-0"
            >
              {driveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {driveLoading ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        )}

        {/* Paper type chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          {(
            [
              { key: 'all' as const, label: 'All' },
              { key: 'care' as const, label: 'Care plans' },
              { key: 'billables' as const, label: 'Billables' },
              { key: 'notes' as const, label: 'Notes' },
              { key: 'contracts' as const, label: 'Contracts' },
            ]
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setTypeFilter(chip.key)}
              className={`glass-pill ${typeFilter === chip.key ? 'glass-pill-active' : ''}`}
            >
              {chip.label}
            </button>
          ))}
          <span className="ml-auto text-[13px] font-medium text-[#7A8C88]">
            {filteredFiles.length} document{filteredFiles.length === 1 ? '' : 's'} across {clientGroups.length} client{clientGroups.length === 1 ? '' : 's'}
          </span>
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FFFFFFB3] border border-[#FFFFFFE0]">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white text-primary-600 shadow-[0_2px_8px_#0D948814]' : 'text-[#7A8C88] hover:text-[#10211F]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-primary-600 shadow-[0_2px_8px_#0D948814]' : 'text-[#7A8C88] hover:text-[#10211F]'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper doc table */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-lg font-medium text-[#10211F] mb-2">No documents yet</h3>
              <p className="text-[#64748B] mb-4">Documents from your assessments will appear here automatically</p>
              <a
                href="/visits/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Start New Assessment
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {clientGroups.map(([clientName, docs]) => {
                const open = isClientExpanded(clientName);
                const unassigned = clientName === UNASSIGNED;
                return (
                  <div key={clientName} className="glass-card overflow-hidden !p-0">
                    {/* Client accordion header */}
                    <button
                      type="button"
                      onClick={() => toggleClient(clientName)}
                      aria-expanded={open}
                      className="w-full flex items-center gap-4 py-4 px-5 sm:px-6 text-left hover:bg-white/40 transition-colors"
                    >
                      <div
                        className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-sm font-bold ${
                          unassigned ? 'bg-slate-100 text-slate-500' : 'bg-[#0D94881A] text-primary-700'
                        }`}
                      >
                        {clientInitials(clientName)}
                      </div>
                      <div className="grow min-w-0 flex flex-col gap-0.5">
                        <span className="text-[16px] leading-tight font-semibold text-[#10211F] truncate">
                          {clientName}
                        </span>
                        <span className="text-[13px] font-medium text-[#7A8C88]">
                          {docs.length} document{docs.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <span className="inline-flex items-center h-[26px] px-3 rounded-full text-xs font-semibold bg-[#0D94881A] text-[#0F766E] shrink-0">
                        {docs.length}
                      </span>
                      {open ? (
                        <ChevronDown className="w-5 h-5 shrink-0 text-[#7A8C88]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 shrink-0 text-[#7A8C88]" />
                      )}
                    </button>

                    {/* Expanded documents */}
                    {open && (
                      <div className="border-t border-[#10211F0F]">
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4 sm:p-5">
                            {docs.map((file) => {
                              const FileIcon = getFileIcon(file);
                              const status = statusFor(file);
                              return (
                                <button
                                  key={file.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFile(file);
                                    setShowPreviewModal(true);
                                  }}
                                  className="flex flex-col gap-3 p-4 rounded-2xl bg-[#FFFFFFB8] border border-[#FFFFFFE0] shadow-[0_8px_20px_#0D948814] text-left hover:bg-white transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-[#0D94881A]">
                                      <FileIcon className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <span
                                      className={`inline-flex items-center h-[24px] px-[10px] rounded-full gap-1.5 text-[11px] font-semibold ${
                                        status.tone === 'ready'
                                          ? 'bg-[#0D94881A] text-[#0F766E]'
                                          : status.tone === 'warn'
                                            ? 'bg-amber-50 text-amber-700'
                                            : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {status.label}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex flex-col gap-0.5">
                                    <span className="text-[14px] leading-[18px] font-semibold text-[#10211F] truncate">
                                      {file.name.replace(/_/g, ' ').replace(/\.[^.]+$/, '')}
                                    </span>
                                    <span className="text-[12px] font-medium text-[#7A8C88]">
                                      {detailFor(file)} · {shortDate(file.created_at)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            {docs.map((file) => {
                              const FileIcon = getFileIcon(file);
                              const status = statusFor(file);
                              return (
                                <div
                                  key={file.id}
                                  className="w-full flex items-center py-3.5 px-5 sm:px-6 gap-3 sm:gap-4 border-b border-[#10211F0F] last:border-b-0 hover:bg-white/40 transition-colors group"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedFile(file);
                                      setShowPreviewModal(true);
                                    }}
                                    className="grow flex items-center gap-3 sm:gap-4 min-w-0 text-left"
                                  >
                                    <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-[#0D94881A]">
                                      <FileIcon className="w-[18px] h-[18px] text-primary-600" />
                                    </div>
                                    <div className="grow min-w-0 flex flex-col gap-0.5">
                                      <span className="text-[15px] leading-[19px] font-semibold text-[#10211F] truncate">
                                        {file.name.replace(/_/g, ' ').replace(/\.[^.]+$/, '')}
                                      </span>
                                      <span className="text-[13px] font-medium text-[#4B6B66] truncate">
                                        {detailFor(file)}
                                      </span>
                                    </div>
                                    <div className="hidden sm:flex w-[110px] shrink-0">
                                      <span
                                        className={`inline-flex items-center h-[26px] px-[11px] rounded-full gap-1.5 text-xs font-semibold ${
                                          status.tone === 'ready'
                                            ? 'bg-[#0D94881A] text-[#0F766E]'
                                            : status.tone === 'warn'
                                              ? 'bg-amber-50 text-amber-700'
                                              : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            status.tone === 'ready'
                                              ? 'bg-primary-500'
                                              : status.tone === 'warn'
                                                ? 'bg-amber-500'
                                                : 'bg-slate-400'
                                          }`}
                                        />
                                        {status.label}
                                      </span>
                                    </div>
                                    <div className="hidden sm:block w-16 shrink-0 text-[13px] font-medium text-[#7A8C88]">
                                      {shortDate(file.created_at)}
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {file.download_url && (
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(file)}
                                        aria-label="Download"
                                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#4B6B66] hover:bg-white hover:text-primary-600 transition-colors"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFile(file);
                                        setShowPreviewModal(true);
                                      }}
                                      aria-label="Preview"
                                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#4B6B66] hover:bg-white hover:text-primary-600 transition-colors"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFile(file.id)}
                                      aria-label="Delete"
                                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#4B6B66] hover:bg-red-50 hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreviewModal && selectedFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Document Details</h2>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                  selectedFile.type === 'contract' ? 'bg-purple-50' :
                  selectedFile.type === 'note' ? 'bg-blue-50' :
                  selectedFile.type === 'audio' ? 'bg-emerald-50' :
                  'bg-slate-50'
                }`}>
                  {(() => {
                    const Icon = getFileIcon(selectedFile);
                    return <Icon className={`w-8 h-8 ${
                      selectedFile.type === 'contract' ? 'text-purple-600' :
                      selectedFile.type === 'note' ? 'text-blue-600' :
                      selectedFile.type === 'audio' ? 'text-emerald-600' :
                      'text-slate-500'
                    }`} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 mb-1 truncate">{selectedFile.name}</h3>
                  <p className="text-sm text-slate-500">{selectedFile.size} • {selectedFile.format}</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {selectedFile.client_name && (
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-500">Client</span>
                    <span className="text-slate-800">{selectedFile.client_name}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Folder</span>
                  <span className="text-slate-800">{selectedFile.folder}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-800">{formatDate(selectedFile.created_at)}</span>
                </div>
                {selectedFile.visit_id && (
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-500">Visit</span>
                    <a 
                      href={`/visits/${selectedFile.visit_id}`}
                      className="text-primary-400 hover:text-primary-300"
                    >
                      View Assessment →
                    </a>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {selectedFile.download_url && (
                  <button 
                    onClick={() => handleDownload(selectedFile)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                )}
                {selectedFile.visit_id && (
                  <a 
                    href={`/visits/${selectedFile.visit_id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    View Visit
                  </a>
                )}
                <button 
                  onClick={() => handleDeleteFile(selectedFile.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-500/30 text-red-600 border border-red-200 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Drive Modal */}
        {showDriveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Google Drive</h2>
                <button onClick={() => setShowDriveModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              {driveConnected ? (
                <div>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-emerald-50 border border-green-500/20 rounded-lg">
                    <Check className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="text-slate-900 font-medium">Connected</p>
                      <p className="text-sm text-slate-500">Your Drive is synced</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Files synced</span>
                      <span className="text-emerald-600 text-sm">{files.filter(f => f.driveId).length} files</span>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectDrive}
                    className="w-full mt-6 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Disconnect Google Drive
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Cloud className="w-8 h-8 text-primary-400" />
                    </div>
                    <p className="text-slate-600 mb-2">
                      Connect Google Drive to access your files
                    </p>
                    <ul className="text-sm text-slate-500 space-y-1">
                      <li>• Browse and search Drive files</li>
                      <li>• Open files directly in Google</li>
                      <li>• Sync files automatically</li>
                    </ul>
                  </div>
                  <button
                    onClick={handleConnectDrive}
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect with Google
                  </button>
                  <p className="text-xs text-slate-400 text-center mt-4">
                    We only access your Drive files. Your data stays secure.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Upload Document</h2>
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-50 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              {/* Drag & Drop Area */}
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary-400" />
                </div>
                <p className="text-slate-900 font-medium mb-2">
                  {dragActive ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="text-slate-500 text-sm mb-4">
                  or click to browse your computer
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => {
                    handleFileUpload(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Browse Files
                </button>
              </div>

              <div className="mt-6">
                <p className="text-slate-500 text-sm">
                  Supported formats: PDF, DOCX, XLSX, images, audio files, and more
                </p>
              </div>
            </div>
          </div>
        )}
    </GlassShell>
  );
}
