'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Scan,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Link2,
  Unlink,
  ArrowLeftRight,
  Database,
  Layers,
  Plus,
  Copy,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

interface DetectedField {
  field_id: string;
  label: string;
  type: string;
  required: boolean;
  section: string;
  mapped_to: string | null;
  is_filled: boolean;
}

interface Template {
  id: string;
  name: string;
  version: number;
  description?: string;
  is_active: boolean;
  file_type: string;
  detected_fields: DetectedField[];
  field_mapping: Record<string, string>;
  unmapped_fields: { field_id: string; label: string; type: string; section: string }[];
  field_count?: number;
  unmapped_count?: number;
  created_at: string;
  updated_at?: string;
}

interface GalleryItem {
  slug: string;
  name: string;
  description: string;
  file_type: string;
  field_count: number;
  mapped_count: number;
  unmapped_count: number;
  sections: string[];
}

interface RegistryField {
  field_id: string;
  path: string;
  type: string;
  category: string;
}

const SECTION_COLORS: Record<string, string> = {
  client_info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  agency_info: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  services: 'text-green-400 bg-green-500/10 border-green-500/20',
  schedule: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rates: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  terms: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  signatures: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  assessment: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  contract: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  unknown: 'text-dark-400 bg-dark-700/50 border-dark-600/50',
};

type TabId = 'my-templates' | 'gallery';

export default function TemplatesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('my-templates');

  // My templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [registry, setRegistry] = useState<RegistryField[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [rescanning, setRescanning] = useState<string | null>(null);
  const [mappingField, setMappingField] = useState<string | null>(null);
  const [mappingTarget, setMappingTarget] = useState('');

  // Gallery state
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !token) router.push('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadTemplates();
      loadRegistry();
      loadGallery();
    }
  }, [token]);

  const loadTemplates = async () => {
    try {
      const data = await api.listContractTemplates(token!);
      setTemplates(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const loadRegistry = async () => {
    try {
      const data = await api.getFieldRegistry(token!);
      setRegistry(data.fields || []);
    } catch {
      /* optional */
    }
  };

  const loadGallery = async () => {
    try {
      const data = await api.listGalleryTemplates();
      setGallery(data);
    } catch {
      /* gallery is optional */
    } finally {
      setGalleryLoading(false);
    }
  };

  const loadTemplateDetail = async (id: string) => {
    try {
      const data = await api.getContractTemplate(token!, id);
      setSelectedTemplate(data);
      setExpandedId(id);
    } catch {
      setError('Failed to load template details');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    setUploadProgress('Running OCR scan...');
    setError(null);

    try {
      await api.uploadContractTemplate(token!, uploadFile, uploadName.trim(), uploadDesc.trim() || undefined);
      setUploadProgress('');
      setShowUpload(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDesc('');
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleRescan = async (templateId: string) => {
    setRescanning(templateId);
    try {
      const updated = await api.rescanTemplate(token!, templateId);
      setSelectedTemplate(updated);
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Rescan failed');
    } finally {
      setRescanning(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await api.deleteContractTemplate(token!, templateId);
      if (expandedId === templateId) {
        setExpandedId(null);
        setSelectedTemplate(null);
      }
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleMapField = async (templateId: string, fieldId: string, target: string) => {
    try {
      const updated = await api.updateTemplateMapping(token!, templateId, [
        { field_id: fieldId, mapped_to: target },
      ]);
      setSelectedTemplate(updated);
      setMappingField(null);
      setMappingTarget('');
      await loadTemplates();
    } catch (err: any) {
      setError(err.message || 'Mapping failed');
    }
  };

  const handleCloneGallery = async (slug: string) => {
    setCloning(slug);
    setError(null);
    try {
      await api.cloneGalleryTemplate(token!, slug);
      await loadTemplates();
      setActiveTab('my-templates');
    } catch (err: any) {
      setError(err.message || 'Failed to add template');
    } finally {
      setCloning(null);
    }
  };

  const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('palmcare-auth');
  if (authLoading && !hasStoredToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }
  if (!token && !hasStoredToken) return null;

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center">
                <Layers className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Contract Templates</h1>
                <p className="text-dark-400 text-sm">
                  Upload your own templates or use a starter — OCR maps fields to your database
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Template
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-red-400 flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-dark-800/50 border border-dark-700/50 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('my-templates')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'my-templates'
                  ? 'bg-primary-500/15 text-white border border-primary-500/30'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              My Templates
              {templates.length > 0 && (
                <span className="px-1.5 py-0.5 bg-dark-700 text-dark-300 text-xs rounded-full">{templates.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'gallery'
                  ? 'bg-primary-500/15 text-white border border-primary-500/30'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Template Gallery
              {gallery.length > 0 && (
                <span className="px-1.5 py-0.5 bg-dark-700 text-dark-300 text-xs rounded-full">{gallery.length}</span>
              )}
            </button>
          </div>

          {/* Upload Modal */}
          {showUpload && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Scan className="w-5 h-5 text-primary-400" />
                    Upload & Scan Template
                  </h2>
                  <button onClick={() => setShowUpload(false)} className="text-dark-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">Template Name *</label>
                    <input
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="e.g. My Agency Service Agreement"
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">Description</label>
                    <input
                      type="text"
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                      placeholder="Optional description..."
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">Contract File *</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-6 border-2 border-dashed border-dark-600 rounded-xl hover:border-primary-500/50 transition text-center"
                    >
                      {uploadFile ? (
                        <div className="flex items-center gap-3 justify-center">
                          <FileText className="w-6 h-6 text-primary-400" />
                          <div className="text-left">
                            <p className="text-white font-medium">{uploadFile.name}</p>
                            <p className="text-dark-400 text-xs">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                          <p className="text-dark-400">Click to select your agency&apos;s contract PDF or DOCX</p>
                          <p className="text-dark-500 text-xs mt-1">Max 20MB — OCR will extract all fields</p>
                        </div>
                      )}
                    </button>
                  </div>

                  {uploadProgress && (
                    <div className="flex items-center gap-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                      <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                      <span className="text-primary-400 text-sm">{uploadProgress}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowUpload(false)}
                      className="flex-1 px-4 py-2.5 border border-dark-600 text-dark-300 rounded-lg hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !uploadFile || !uploadName.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg transition font-medium"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4" />
                          Upload & Scan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: My Templates ==================== */}
          {activeTab === 'my-templates' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-16 bg-dark-800/50 border border-dark-700/50 rounded-2xl">
                  <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Templates Yet</h3>
                  <p className="text-dark-400 mb-6 max-w-md mx-auto">
                    Upload your agency&apos;s contract PDF or DOCX, or pick a starter from the gallery.
                    OCR will detect all form fields and map them to your database.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowUpload(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Your Own
                    </button>
                    <button
                      onClick={() => setActiveTab('gallery')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-dark-600 text-dark-300 hover:text-white hover:border-dark-500 rounded-lg transition font-medium"
                    >
                      <BookOpen className="w-4 h-4" />
                      Browse Gallery
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((tmpl) => {
                    const isExpanded = expandedId === tmpl.id;
                    const detail = isExpanded ? selectedTemplate : null;
                    const fieldCount = tmpl.field_count ?? (detail?.detected_fields?.length || 0);
                    const unmappedCount = tmpl.unmapped_count ?? (detail?.unmapped_fields?.length || 0);

                    return (
                      <div key={tmpl.id} className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden">
                        {/* Template Header */}
                        <button
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedId(null);
                              setSelectedTemplate(null);
                            } else {
                              loadTemplateDetail(tmpl.id);
                            }
                          }}
                          className="w-full p-5 flex items-center gap-4 text-left hover:bg-dark-700/20 transition"
                        >
                          <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold truncate">{tmpl.name}</h3>
                              <span className="px-2 py-0.5 bg-dark-700 text-dark-400 text-xs rounded-full shrink-0">
                                v{tmpl.version}
                              </span>
                              {tmpl.is_active && (
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20 shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-dark-400 text-xs uppercase">{tmpl.file_type}</span>
                              <span className="text-dark-500 text-xs">{fieldCount} fields</span>
                              {unmappedCount > 0 && (
                                <span className="text-amber-400 text-xs flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {unmappedCount} unmapped
                                </span>
                              )}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-dark-400" /> : <ChevronDown className="w-5 h-5 text-dark-400" />}
                        </button>

                        {/* Expanded Detail */}
                        {isExpanded && detail && (
                          <div className="border-t border-dark-700/50">
                            {/* Actions */}
                            <div className="p-4 flex items-center gap-2 border-b border-dark-700/50 bg-dark-800/30">
                              <button
                                onClick={() => handleRescan(tmpl.id)}
                                disabled={rescanning === tmpl.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-lg text-sm transition"
                              >
                                {rescanning === tmpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                Re-scan OCR
                              </button>
                              <button
                                onClick={() => handleDelete(tmpl.id)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-red-500/10 text-dark-300 hover:text-red-400 rounded-lg text-sm transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>

                            {/* Unmapped Fields */}
                            {detail.unmapped_fields.length > 0 && (
                              <div className="m-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                  <Unlink className="w-4 h-4 text-amber-400" />
                                  <span className="text-amber-400 font-medium text-sm">
                                    {detail.unmapped_fields.length} Unmapped Fields
                                  </span>
                                </div>
                                <p className="text-dark-400 text-xs mb-3">
                                  These fields don&apos;t match a database column. Map them or they&apos;ll stay empty in generated contracts.
                                </p>
                                <div className="space-y-2">
                                  {detail.unmapped_fields.map((field) => (
                                    <div key={field.field_id} className="flex items-center gap-3 bg-dark-800/50 rounded-lg p-3">
                                      <div className="flex-1">
                                        <span className="text-white text-sm font-medium">{field.label || field.field_id}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className={`px-1.5 py-0.5 text-xs rounded border ${SECTION_COLORS[field.section] || SECTION_COLORS.unknown}`}>{field.section}</span>
                                          <span className="text-dark-500 text-xs">{field.type}</span>
                                        </div>
                                      </div>
                                      {mappingField === field.field_id ? (
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={mappingTarget}
                                            onChange={(e) => setMappingTarget(e.target.value)}
                                            className="px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-xs focus:border-primary-500 focus:outline-none"
                                          >
                                            <option value="">Select DB field...</option>
                                            {registry.map((rf) => (
                                              <option key={rf.field_id} value={rf.path}>{rf.field_id} ({rf.category})</option>
                                            ))}
                                          </select>
                                          <button onClick={() => mappingTarget && handleMapField(tmpl.id, field.field_id, mappingTarget)} disabled={!mappingTarget} className="p-1 text-green-400 hover:text-green-300 disabled:opacity-40">
                                            <Check className="w-4 h-4" />
                                          </button>
                                          <button onClick={() => { setMappingField(null); setMappingTarget(''); }} className="p-1 text-dark-400 hover:text-white">
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button onClick={() => setMappingField(field.field_id)} className="flex items-center gap-1 px-2 py-1 bg-primary-500/10 text-primary-400 rounded text-xs hover:bg-primary-500/20 transition">
                                          <Link2 className="w-3 h-3" />
                                          Map
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Detected Fields */}
                            <div className="p-4">
                              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                <Database className="w-4 h-4 text-primary-400" />
                                Detected Fields ({detail.detected_fields.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {detail.detected_fields.map((field, idx) => {
                                  const isMapped = !!detail.field_mapping[field.field_id];
                                  return (
                                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${isMapped ? 'bg-green-500/5 border-green-500/20' : 'bg-dark-700/30 border-dark-600/30'}`}>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isMapped ? 'bg-green-500/20' : 'bg-dark-600/50'}`}>
                                        {isMapped ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Unlink className="w-3.5 h-3.5 text-dark-400" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-white text-sm truncate">{field.label || field.field_id}</span>
                                          {field.required && <span className="text-red-400 text-xs">*</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className={`px-1.5 py-0.5 text-[10px] rounded border ${SECTION_COLORS[field.section] || SECTION_COLORS.unknown}`}>{field.section}</span>
                                          {isMapped && (
                                            <span className="text-green-400 text-[10px] flex items-center gap-0.5">
                                              <ArrowLeftRight className="w-2.5 h-2.5" />
                                              {detail.field_mapping[field.field_id]}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-dark-500 text-xs shrink-0">{field.type}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Summary */}
                            <div className="p-4 border-t border-dark-700/50 bg-dark-800/30">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-white">{detail.detected_fields.length}</p>
                                  <p className="text-dark-400 text-xs">Total Fields</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-400">{Object.keys(detail.field_mapping).length}</p>
                                  <p className="text-dark-400 text-xs">Mapped to DB</p>
                                </div>
                                <div className="text-center">
                                  <p className={`text-2xl font-bold ${detail.unmapped_fields.length > 0 ? 'text-amber-400' : 'text-dark-500'}`}>{detail.unmapped_fields.length}</p>
                                  <p className="text-dark-400 text-xs">Unmapped</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ==================== TAB: Gallery ==================== */}
          {activeTab === 'gallery' && (
            <>
              <div className="mb-6">
                <p className="text-dark-400 text-sm">
                  Pre-made contract templates with fields already mapped. Add one to your account to start using it — or upload your own.
                </p>
              </div>

              {galleryLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
              ) : gallery.length === 0 ? (
                <div className="text-center py-16 bg-dark-800/50 border border-dark-700/50 rounded-2xl">
                  <BookOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Gallery Templates</h3>
                  <p className="text-dark-400 mb-6">No starter templates available yet. Upload your own instead.</p>
                  <button
                    onClick={() => { setActiveTab('my-templates'); setShowUpload(true); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gallery.map((item) => {
                    const alreadyAdded = templates.some((t) => t.name === item.name);

                    return (
                      <div key={item.slug} className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-5 flex flex-col">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold">{item.name}</h3>
                            <p className="text-dark-400 text-sm mt-0.5">{item.description}</p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-dark-500" />
                            <span className="text-dark-300 text-xs">{item.field_count} fields</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400 text-xs">{item.mapped_count} mapped</span>
                          </div>
                          {item.unmapped_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-400 text-xs">{item.unmapped_count} unmapped</span>
                            </div>
                          )}
                        </div>

                        {/* Sections */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {item.sections.map((section) => (
                            <span key={section} className={`px-2 py-0.5 text-[10px] rounded border ${SECTION_COLORS[section] || SECTION_COLORS.unknown}`}>
                              {section.replace('_', ' ')}
                            </span>
                          ))}
                        </div>

                        {/* Action */}
                        <div className="mt-auto pt-2">
                          {alreadyAdded ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-medium">
                              <Check className="w-4 h-4" />
                              Already in My Templates
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCloneGallery(item.slug)}
                              disabled={cloning === item.slug}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg transition font-medium text-sm"
                            >
                              {cloning === item.slug ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Add to My Templates
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
