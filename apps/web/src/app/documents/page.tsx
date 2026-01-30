'use client';

import { useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { FolderOpen, FileText, Upload, Search, Filter, Download, Trash2, Eye, Grid, List, X, Plus, File } from 'lucide-react';

type Document = {
  id: number;
  name: string;
  type: string;
  size: string;
  modified: string;
  folder: string;
};

type Folder = {
  id: number;
  name: string;
  count: number;
  icon: string;
};

const initialFolders: Folder[] = [
  { id: 1, name: 'Contracts', count: 24, icon: '📄' },
  { id: 2, name: 'Care Plans', count: 18, icon: '📋' },
  { id: 3, name: 'Assessments', count: 32, icon: '📝' },
  { id: 4, name: 'Policies', count: 8, icon: '📜' },
  { id: 5, name: 'Training', count: 12, icon: '📚' },
];

const initialFiles: Document[] = [
  { id: 1, name: 'Thompson_Care_Contract.pdf', type: 'PDF', size: '245 KB', modified: '2 hours ago', folder: 'Contracts' },
  { id: 2, name: 'Williams_Assessment_Jan2026.docx', type: 'DOCX', size: '128 KB', modified: '5 hours ago', folder: 'Assessments' },
  { id: 3, name: 'Care_Plan_Template_v3.pdf', type: 'PDF', size: '89 KB', modified: '1 day ago', folder: 'Care Plans' },
  { id: 4, name: 'Davis_Family_Agreement.pdf', type: 'PDF', size: '312 KB', modified: '2 days ago', folder: 'Contracts' },
  { id: 5, name: 'Monthly_Report_Dec2025.xlsx', type: 'XLSX', size: '456 KB', modified: '3 days ago', folder: 'Reports' },
];

const typeColors: Record<string, string> = {
  PDF: 'bg-red-500/20 text-red-400',
  DOCX: 'bg-blue-500/20 text-blue-400',
  XLSX: 'bg-green-500/20 text-green-400',
  PNG: 'bg-purple-500/20 text-purple-400',
  JPG: 'bg-purple-500/20 text-purple-400',
};

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [folders, setFolders] = useState(initialFolders);
  const [files, setFiles] = useState(initialFiles);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = !selectedFolder || file.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const handleFileUpload = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles) return;
    
    Array.from(uploadedFiles).forEach(file => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const newFile: Document = {
        id: Date.now() + Math.random(),
        name: file.name,
        type: ext,
        size: `${Math.round(file.size / 1024)} KB`,
        modified: 'Just now',
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

  const handleDeleteFile = (fileId: number) => {
    setFiles(files.filter(f => f.id !== fileId));
    setShowPreviewModal(false);
  };

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Documents</h1>
            <p className="text-dark-400">Manage contracts, care plans, and files</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Folder
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5" />
              Upload File
            </button>
          </div>
        </div>

        {/* Search & View Toggle */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-white transition-colors">
            <Filter className="w-5 h-5" />
            Filter
          </button>
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

        {/* Folders */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Folders</h2>
          <div className="grid grid-cols-5 gap-4">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(selectedFolder === folder.name ? null : folder.name)}
                className={`bg-dark-800/50 border rounded-xl p-4 hover:border-primary-500/30 transition-colors text-left ${
                  selectedFolder === folder.name ? 'border-primary-500/50 bg-primary-500/5' : 'border-dark-700/50'
                }`}
              >
                <div className="text-3xl mb-3">{folder.icon}</div>
                <h3 className="font-medium text-white mb-1">{folder.name}</h3>
                <p className="text-sm text-dark-400">{files.filter(f => f.folder === folder.name).length} files</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedFolder ? `${selectedFolder} Files` : 'Recent Files'}
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
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Size</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Folder</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Modified</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map(file => (
                  <tr key={file.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-dark-400" />
                        <span className="font-medium text-white">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[file.type] || 'bg-dark-700 text-dark-300'}`}>
                        {file.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-400">{file.size}</td>
                    <td className="px-6 py-4 text-dark-400">{file.folder}</td>
                    <td className="px-6 py-4 text-dark-400 text-sm">{file.modified}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setSelectedFile(file); setShowPreviewModal(true); }}
                          className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4 text-dark-400" />
                        </button>
                        <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                          <Download className="w-4 h-4 text-dark-400" />
                        </button>
                        <button 
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-dark-400 hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Upload Files</h2>
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive ? 'border-primary-500 bg-primary-500/10' : 'border-dark-600'
                }`}
              >
                <Upload className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                <p className="text-white mb-2">Drag and drop files here</p>
                <p className="text-dark-400 text-sm mb-4">or</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Browse Files
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">Upload to folder</label>
                <select
                  value={selectedFolder || 'Contracts'}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* New Folder Modal */}
        {showNewFolderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">New Folder</h2>
                <button onClick={() => setShowNewFolderModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Insurance Documents"
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">File Details</h2>
                <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-6 p-4 bg-dark-900 rounded-lg">
                <div className="w-16 h-16 bg-dark-700 rounded-lg flex items-center justify-center">
                  <File className="w-8 h-8 text-dark-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">{selectedFile.name}</h3>
                  <p className="text-sm text-dark-400">{selectedFile.size} • {selectedFile.type}</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-dark-700">
                  <span className="text-dark-400">Folder</span>
                  <span className="text-white">{selectedFile.folder}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-dark-700">
                  <span className="text-dark-400">Modified</span>
                  <span className="text-white">{selectedFile.modified}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
                  <Download className="w-5 h-5" />
                  Download
                </button>
                <button 
                  onClick={() => handleDeleteFile(selectedFile.id)}
                  className="px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
