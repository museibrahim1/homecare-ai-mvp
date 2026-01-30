'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { FolderOpen, FileText, Upload, Search, Filter, MoreVertical, Download, Trash2, Eye, Grid, List } from 'lucide-react';

const folders = [
  { id: 1, name: 'Contracts', count: 24, icon: '📄' },
  { id: 2, name: 'Care Plans', count: 18, icon: '📋' },
  { id: 3, name: 'Assessments', count: 32, icon: '📝' },
  { id: 4, name: 'Policies', count: 8, icon: '📜' },
  { id: 5, name: 'Training Materials', count: 12, icon: '📚' },
];

const recentFiles = [
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
};

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            <Upload className="w-5 h-5" />
            Upload File
          </button>
        </div>

        {/* Search & View Toggle */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
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
                className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4 hover:border-primary-500/30 transition-colors text-left"
              >
                <div className="text-3xl mb-3">{folder.icon}</div>
                <h3 className="font-medium text-white mb-1">{folder.name}</h3>
                <p className="text-sm text-dark-400">{folder.count} files</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Files</h2>
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
                {recentFiles.map(file => (
                  <tr key={file.id} className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-dark-400" />
                        <span className="font-medium text-white">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[file.type]}`}>
                        {file.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-400">{file.size}</td>
                    <td className="px-6 py-4 text-dark-400">{file.folder}</td>
                    <td className="px-6 py-4 text-dark-400 text-sm">{file.modified}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-dark-400" />
                        </button>
                        <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                          <Download className="w-4 h-4 text-dark-400" />
                        </button>
                        <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-dark-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
