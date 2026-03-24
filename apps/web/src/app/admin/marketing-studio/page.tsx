'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  Zap, Mail, MessageSquare, FileText, Phone, Plus, X, Trash2,
  Loader2, Copy, Download, Sparkles, Check, ChevronDown, Tag, Edit3
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface MarketingAsset {
  id: string; asset_type: string; title: string; content: string;
  target_audience?: string; tags: string[]; created_by: string;
  created_at: string; updated_at: string;
}

const ASSET_TYPES = [
  { id: 'email_template', label: 'Email Template', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'social_post', label: 'Social Post', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'call_script', label: 'Call Script', icon: Phone, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'flyer', label: 'Flyer Copy', icon: FileText, color: 'text-green-500', bg: 'bg-green-50' },
];

export default function MarketingStudioPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    asset_type: 'email_template', title: '', content: '',
    target_audience: 'home care agency owners', tags: [] as string[],
  });
  const [aiTopic, setAiTopic] = useState('');

  const fetchAssets = useCallback(async () => {
    if (!token) return;
    try {
      const url = activeType
        ? `${API}/admin/scheduler/marketing-assets?asset_type=${activeType}`
        : `${API}/admin/scheduler/marketing-assets`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setAssets((await res.json()).assets || []); }
    } catch { /* */ }
    setLoading(false);
  }, [token, activeType]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { if (!isLoading && !token) router.push('/login'); }, [isLoading, token, router]);

  const handleAiGenerate = async () => {
    if (!aiTopic) return;
    setGenerating(true);
    try {
      const res = await fetch(
        `${API}/admin/scheduler/marketing-assets/ai-generate?asset_type=${form.asset_type}&topic=${encodeURIComponent(aiTopic)}&audience=${encodeURIComponent(form.target_audience)}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, content: data.content || '' }));
      }
    } catch { /* */ }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API}/admin/scheduler/marketing-assets/${editingId}` : `${API}/admin/scheduler/marketing-assets`;
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setShowCreate(false);
    setEditingId(null);
    setForm({ asset_type: 'email_template', title: '', content: '', target_audience: 'home care agency owners', tags: [] });
    fetchAssets();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API}/admin/scheduler/marketing-assets/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    fetchAssets();
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (a: MarketingAsset) => {
    setForm({ asset_type: a.asset_type, title: a.title, content: a.content, target_audience: a.target_audience || '', tags: a.tags });
    setEditingId(a.id);
    setShowCreate(true);
  };

  if (isLoading || loading) {
    return <div className="flex h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div></div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Marketing Studio</h1>
                <p className="text-sm text-slate-500 mt-1">Create email templates, call scripts, social posts, and flyers with AI</p>
              </div>
              <button onClick={() => { setEditingId(null); setForm({ asset_type: 'email_template', title: '', content: '', target_audience: 'home care agency owners', tags: [] }); setShowCreate(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm">
                <Plus className="w-4 h-4" /> Create New
              </button>
            </div>

            {/* Type Filters */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button onClick={() => setActiveType(null)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!activeType ? 'bg-teal-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>All</button>
              {ASSET_TYPES.map(t => (
                <button key={t.id} onClick={() => setActiveType(t.id === activeType ? null : t.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${t.id === activeType ? 'bg-teal-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                  <t.icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
            </div>

            {/* Assets Grid */}
            {assets.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Zap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 mb-4">No marketing assets yet. Create your first one!</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">
                  <Plus className="w-4 h-4 inline mr-1" /> Create Asset
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assets.map(a => {
                  const typeInfo = ASSET_TYPES.find(t => t.id === a.asset_type);
                  const TypeIcon = typeInfo?.icon || FileText;
                  return (
                    <div key={a.id} className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors group">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeInfo?.bg || 'bg-slate-50'}`}>
                            <TypeIcon className={`w-4 h-4 ${typeInfo?.color || 'text-slate-400'}`} />
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(a)} className="p-1 text-slate-400 hover:text-teal-500"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleCopy(a.id, a.content)} className="p-1 text-slate-400 hover:text-teal-500">
                              {copied === a.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => handleDelete(a.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm mb-1">{a.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-wrap">{a.content.slice(0, 150)}...</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className="text-[10px] text-slate-400">{a.created_by}</span>
                          {a.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create/Edit Modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900">{editingId ? 'Edit Asset' : 'Create Marketing Asset'}</h3>
                  <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  {/* Type selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {ASSET_TYPES.map(t => (
                        <button key={t.id} onClick={() => setForm(f => ({ ...f, asset_type: t.id }))} className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${form.asset_type === t.id ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="e.g. Cold Outreach - Agency Intro" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Target Audience</label>
                    <input value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>

                  {/* AI Generation */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="font-semibold text-sm text-purple-700">AI Generate</span>
                    </div>
                    <div className="flex gap-2">
                      <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Describe what you want (e.g. 'intro email for Michigan agencies')" className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white" />
                      <button onClick={handleAiGenerate} disabled={generating || !aiTopic} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50 flex items-center gap-1.5">
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Content *</label>
                    <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={12} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none font-mono" placeholder="Write or generate your content here..." />
                  </div>

                  <button onClick={handleSave} disabled={!form.title || !form.content} className="w-full py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50">
                    {editingId ? 'Update Asset' : 'Save Asset'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
