'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { FolderOpen, FileText, Upload, Search, Filter, Download, Trash2, Eye, Grid, List, X, Plus, File, Cloud, Check, Loader2, RefreshCw, Link2, Mic, FileCheck, Play, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  PDF: 'bg-red-500/20 text-red-400',
  DOCX: 'bg-blue-500/20 text-blue-400',
  XLSX: 'bg-green-500/20 text-green-400',
  MP3: 'bg-purple-500/20 text-purple-400',
  WAV: 'bg-purple-500/20 text-purple-400',
  M4A: 'bg-purple-500/20 text-purple-400',
  AUDIO: 'bg-purple-500/20 text-purple-400',
  GDOC: 'bg-blue-500/20 text-blue-400',
  GSHEET: 'bg-green-500/20 text-green-400',
  GSLIDE: 'bg-yellow-500/20 text-yellow-400',
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Google Drive state
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [checkingDrive, setCheckingDrive] = useState(true);

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolder) params.append('folder', selectedFolder);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`${API_URL}/documents?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
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
  }, [token, selectedFolder, searchQuery]);

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

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || file.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (file.client_name && file.client_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = !selectedFolder || file.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const handleFileUpload = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;
    
    Array.from(uploadedFiles).forEach(file => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const newFile: Document = {
        id: String(Date.now() + Math.random()),
        name: file.name,
        type: 'uploaded',
        format: ext,
        size: `${Math.round(file.size / 1024)} KB`,
        created_at: new Date().toISOString(),
        folder: selectedFolder || 'Contracts',
      };
      setFiles(prev => [newFile, ...prev]);
    });
    setShowUploadModal(false);
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
        alert('Failed to download file');
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
      alert('Failed to download file');
    }
  };

  const handleConnectDrive = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      alert('Google Drive is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to environment variables.');
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
      alert('Failed to connect Google Drive: ' + error);
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
            alert('Failed to connect: ' + (data.detail || 'Unknown error'));
          }
        } catch (error) {
          console.error('Failed to connect Drive:', error);
          alert('Failed to connect Google Drive');
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
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Documents</h1>
            <p className="text-dark-400">Contracts, assessments, and recordings from your clients</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload File
            </button>
            <button 
              onClick={() => setShowDriveModal(true)}
              disabled={checkingDrive}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                driveConnected 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-white'
              }`}
            >
              {checkingDrive ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : driveConnected ? (
                <Check className="w-5 h-5" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
              {driveConnected ? 'Drive Connected' : 'Connect Google Drive'}
            </button>
            <button 
              onClick={fetchDocuments}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Google Drive Status Banner */}
        {driveConnected && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Google Drive Connected</p>
                <p className="text-sm text-dark-400">Your files are synced from Google Drive</p>
              </div>
            </div>
            <button 
              onClick={handleSyncDrive}
              disabled={driveLoading}
              className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {driveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {driveLoading ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}

        {/* Search & View Toggle */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents or clients..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div className="flex bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 ${viewMode === 'grid' ? 'bg-dark-700 text-white' : 'text-dark-400'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 ${viewMode === 'list' ? 'bg-dark-700 text-white' : 'text-dark-400'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Folders - Single click to filter */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Folders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder.name)}
                className={`bg-dark-800/50 border rounded-xl p-4 hover:border-primary-500/30 transition-colors text-left ${
                  selectedFolder === folder.name ? 'border-primary-500/50 bg-primary-500/5' : 'border-dark-700/50'
                }`}
              >
                <div className="text-3xl mb-3">{folder.icon}</div>
                <h3 className="font-medium text-white mb-1">{folder.name}</h3>
                <p className="text-sm text-dark-400">{folder.count} files</p>
              </button>
            ))}
          </div>
        </div>

        {/* Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedFolder ? `${selectedFolder}` : 'All Documents'}
            </h2>
            {selectedFolder && (
              <button 
                onClick={() => setSelectedFolder(null)}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Clear filter
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-20 bg-dark-800/50 border border-dark-700/50 rounded-xl">
              <div className="w-16 h-16 bg-dark-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No documents yet</h3>
              <p className="text-dark-400 mb-4">Documents from your assessments will appear here automatically</p>
              <a 
                href="/visits/new" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Start New Assessment
              </a>
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Client</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Type</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Size</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Modified</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map(file => {
                    const FileIcon = getFileIcon(file);
                    return (
                      <tr key={file.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              file.type === 'contract' ? 'bg-purple-500/20' :
                              file.type === 'note' ? 'bg-blue-500/20' :
                              file.type === 'audio' ? 'bg-green-500/20' :
                              'bg-dark-700'
                            }`}>
                              <FileIcon className={`w-4 h-4 ${
                                file.type === 'contract' ? 'text-purple-400' :
                                file.type === 'note' ? 'text-blue-400' :
                                file.type === 'audio' ? 'text-green-400' :
                                'text-dark-400'
                              }`} />
                            </div>
                            <span className="font-medium text-white">{file.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {file.client_name ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-dark-500" />
                              <span className="text-dark-300">{file.client_name}</span>
                            </div>
                          ) : (
                            <span className="text-dark-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[file.format] || 'bg-dark-700 text-dark-300'}`}>
                            {file.format}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-dark-400">{file.size}</td>
                        <td className="px-6 py-4 text-dark-400 text-sm">{formatDate(file.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {file.webViewLink ? (
                              <a 
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                              >
                                <Link2 className="w-4 h-4 text-dark-400" />
                              </a>
                            ) : file.type === 'audio' ? (
                              <button 
                                onClick={() => { setSelectedFile(file); setShowPreviewModal(true); }}
                                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Play className="w-4 h-4 text-dark-400" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => { setSelectedFile(file); setShowPreviewModal(true); }}
                                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4 text-dark-400" />
                              </button>
                            )}
                            {file.download_url && (
                              <button 
                                onClick={() => handleDownload(file)}
                                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4 text-dark-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // Grid view
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredFiles.map(file => {
                const FileIcon = getFileIcon(file);
                return (
                  <div
                    key={file.id}
                    className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4 hover:border-primary-500/30 transition-colors group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      file.type === 'contract' ? 'bg-purple-500/20' :
                      file.type === 'note' ? 'bg-blue-500/20' :
                      file.type === 'audio' ? 'bg-green-500/20' :
                      'bg-dark-700'
                    }`}>
                      <FileIcon className={`w-6 h-6 ${
                        file.type === 'contract' ? 'text-purple-400' :
                        file.type === 'note' ? 'text-blue-400' :
                        file.type === 'audio' ? 'text-green-400' :
                        'text-dark-400'
                      }`} />
                    </div>
                    <h3 className="font-medium text-white text-sm truncate mb-1" title={file.name}>
                      {file.name}
                    </h3>
                    {file.client_name && (
                      <p className="text-xs text-dark-400 truncate mb-2">{file.client_name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[file.format] || 'bg-dark-700 text-dark-300'}`}>
                        {file.format}
                      </span>
                      <span className="text-xs text-dark-500">{file.size}</span>
                    </div>
                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.download_url && (
                        <button 
                          onClick={() => handleDownload(file)}
                          className="flex-1 p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4 text-dark-300 mx-auto" />
                        </button>
                      )}
                      <button 
                        onClick={() => { setSelectedFile(file); setShowPreviewModal(true); }}
                        className="flex-1 p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-dark-300 mx-auto" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreviewModal && selectedFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Document Details</h2>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-6 p-4 bg-dark-900 rounded-lg">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                  selectedFile.type === 'contract' ? 'bg-purple-500/20' :
                  selectedFile.type === 'note' ? 'bg-blue-500/20' :
                  selectedFile.type === 'audio' ? 'bg-green-500/20' :
                  'bg-dark-700'
                }`}>
                  {(() => {
                    const Icon = getFileIcon(selectedFile);
                    return <Icon className={`w-8 h-8 ${
                      selectedFile.type === 'contract' ? 'text-purple-400' :
                      selectedFile.type === 'note' ? 'text-blue-400' :
                      selectedFile.type === 'audio' ? 'text-green-400' :
                      'text-dark-400'
                    }`} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white mb-1 truncate">{selectedFile.name}</h3>
                  <p className="text-sm text-dark-400">{selectedFile.size} • {selectedFile.format}</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {selectedFile.client_name && (
                  <div className="flex justify-between py-2 border-b border-dark-700">
                    <span className="text-dark-400">Client</span>
                    <span className="text-white">{selectedFile.client_name}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-dark-700">
                  <span className="text-dark-400">Folder</span>
                  <span className="text-white">{selectedFile.folder}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-700">
                  <span className="text-dark-400">Created</span>
                  <span className="text-white">{formatDate(selectedFile.created_at)}</span>
                </div>
                {selectedFile.visit_id && (
                  <div className="flex justify-between py-2 border-b border-dark-700">
                    <span className="text-dark-400">Visit</span>
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
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    View Visit
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Google Drive Modal */}
        {showDriveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Google Drive</h2>
                <button onClick={() => setShowDriveModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              
              {driveConnected ? (
                <div>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Check className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Connected</p>
                      <p className="text-sm text-dark-400">Your Drive is synced</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                      <span className="text-dark-300">Files synced</span>
                      <span className="text-green-400 text-sm">{files.filter(f => f.driveId).length} files</span>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectDrive}
                    className="w-full mt-6 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Disconnect Google Drive
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-dark-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Cloud className="w-8 h-8 text-primary-400" />
                    </div>
                    <p className="text-dark-300 mb-2">
                      Connect Google Drive to access your files
                    </p>
                    <ul className="text-sm text-dark-400 space-y-1">
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
                  <p className="text-xs text-dark-500 text-center mt-4">
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
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Upload Document</h2>
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              
              {/* Drag & Drop Area */}
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary-500 bg-primary-500/10' 
                    : 'border-dark-600 hover:border-dark-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-dark-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary-400" />
                </div>
                <p className="text-white font-medium mb-2">
                  {dragActive ? 'Drop files here' : 'Drag and drop files here'}
                </p>
                <p className="text-dark-400 text-sm mb-4">
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
                <p className="text-dark-400 text-sm">
                  Supported formats: PDF, DOCX, XLSX, images, audio files, and more
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
