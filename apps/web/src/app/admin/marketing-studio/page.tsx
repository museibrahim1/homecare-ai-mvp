'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  Zap, Mail, MessageSquare, FileText, Phone, Trash2,
  Loader2, Copy, Sparkles, Check, Edit3, X, Send,
  ChevronDown, RotateCcw, ArrowRight, Save, Image, Download,
  Paintbrush, Monitor, Printer
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface MarketingAsset {
  id: string; asset_type: string; title: string; content: string;
  target_audience?: string; tags: string[]; created_by: string;
  created_at: string; updated_at: string;
}

const FORMATS = [
  { id: 'email_template', label: 'Email', icon: Mail, desc: 'Cold outreach, follow-ups, nurture sequences' },
  { id: 'call_script', label: 'Call Script', icon: Phone, desc: 'Cold calls, discovery calls, objection handling' },
  { id: 'social_post', label: 'Social Post', icon: MessageSquare, desc: 'LinkedIn, Facebook, thought leadership' },
  { id: 'flyer', label: 'Flyer / Ad', icon: FileText, desc: 'Print copy, landing pages, ad headlines' },
];

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'bold', label: 'Bold & Direct' },
  { id: 'empathetic', label: 'Empathetic' },
];

const LENGTHS = [
  { id: 'short', label: 'Short', desc: '50-100 words' },
  { id: 'medium', label: 'Medium', desc: '100-200 words' },
  { id: 'long', label: 'Detailed', desc: '200-400 words' },
];

const VISUAL_STYLES = [
  { id: 'modern', label: 'Modern & Clean' },
  { id: 'bold', label: 'Bold & High-Contrast' },
  { id: 'medical', label: 'Healthcare Pro' },
  { id: 'premium', label: 'Premium / Executive' },
];

const ASPECT_RATIOS = [
  { id: '4:3', label: '4:3 Flyer' },
  { id: '1:1', label: '1:1 Square' },
  { id: '16:9', label: '16:9 Banner' },
  { id: '9:16', label: '9:16 Story' },
  { id: '3:2', label: '3:2 Print' },
];

const VISUAL_EXAMPLES = [
  'Flyer promoting AI-powered documentation for home care agencies',
  'Ad showing before/after: paper assessments vs PalmCare AI voice-to-contract',
  'Social media graphic: "15 hours saved per week" stat highlight',
  'Trade show banner for home health conference',
  'Instagram ad targeting agency owners tired of paperwork',
];

const EMAIL_EXAMPLES = [
  'Intro email to a home health company support team with our brochure attached',
  'Follow up with an agency owner who asked for pricing last week',
  'Thank you email after a demo, recap the three things they liked',
  'Re-engage an agency that went quiet after the free trial ended',
];

const PROMPT_EXAMPLES = [
  'Write a cold email to agency owners in Florida who are still doing paper assessments',
  'Call script for when an agency says they already have software',
  'LinkedIn post about how voice-to-contract saves 15 hours per week',
  'Follow-up email for agencies that opened but didn\'t reply',
  'Email targeting agencies with low CMS star ratings about improving compliance',
  'Cold call opener for agencies with 50+ caregivers',
];

export default function MarketingStudioPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'copy' | 'visual' | 'email'>('copy');
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState('email_template');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');

  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [composingEmail, setComposingEmail] = useState(false);
  const [hasComposedEmail, setHasComposedEmail] = useState(false);
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<string | null>(null);

  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [visualStyle, setVisualStyle] = useState('modern');
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [hasGeneratedVisual, setHasGeneratedVisual] = useState(false);

  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewingAsset, setViewingAsset] = useState<MarketingAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const promptRef = useRef<HTMLTextAreaElement>(null);

  const fetchAssets = useCallback(async () => {
    if (!token) return;
    try {
      const url = activeFilter
        ? `${API}/admin/scheduler/marketing-assets?asset_type=${activeFilter}`
        : `${API}/admin/scheduler/marketing-assets`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAssets((await res.json()).assets || []);
    } catch { /* */ }
    setLoadingAssets(false);
  }, [token, activeFilter]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { if (!isLoading && !token) router.push('/login'); }, [isLoading, token, router]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setHasGenerated(false);
    try {
      const res = await fetch(`${API}/admin/scheduler/marketing-assets/ai-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim(), asset_type: format, tone, length }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedTitle(data.title || '');
        setGeneratedContent(data.content || '');
        setHasGenerated(true);
      }
    } catch { /* */ }
    setGenerating(false);
  };

  const handleGenerateVisual = async () => {
    if (!prompt.trim()) return;
    setGeneratingVisual(true);
    setHasGeneratedVisual(false);
    setGeneratedImageUrl('');
    try {
      const res = await fetch(`${API}/admin/scheduler/marketing-assets/generate-visual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
          resolution: '1k',
          style: visualStyle,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedImageUrl(data.image_url || '');
        setHasGeneratedVisual(true);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Generation failed' }));
        alert(err.detail || 'Image generation failed');
      }
    } catch { alert('Network error during image generation'); }
    setGeneratingVisual(false);
  };

  const handleComposeEmail = async () => {
    if (!prompt.trim()) return;
    setComposingEmail(true);
    setEmailSendResult(null);
    try {
      const res = await fetch(`${API}/admin/scheduler/marketing-assets/compose-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim(), tone, recipient_context: emailTo ? `Sending to: ${emailTo}` : '' }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailSubject(data.subject || '');
        setEmailBody(data.body || '');
        setHasComposedEmail(true);
      } else {
        const err = await res.json().catch(() => ({ detail: 'Compose failed' }));
        alert(err.detail || 'Email compose failed');
      }
    } catch { alert('Network error while composing email'); }
    setComposingEmail(false);
  };

  const handleSendCustomEmail = async () => {
    const recipients = emailTo.split(',').map(s => s.trim()).filter(Boolean);
    if (recipients.length === 0) { alert('Add at least one recipient email'); return; }
    if (!emailSubject.trim() || !emailBody.trim()) { alert('Subject and body are required'); return; }
    if (!confirm(`Send this email to ${recipients.join(', ')}?`)) return;
    setSendingCustomEmail(true);
    setEmailSendResult(null);
    try {
      const res = await fetch(`${API}/admin/scheduler/marketing-assets/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: recipients, subject: emailSubject, body: emailBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setEmailSendResult(`Sent to ${data.sent} of ${data.total} recipient${data.total > 1 ? 's' : ''}`);
      } else {
        setEmailSendResult(null);
        alert(data.detail || 'Send failed');
      }
    } catch { alert('Network error while sending'); }
    setSendingCustomEmail(false);
  };

  const handleSave = async () => {
    if (!generatedContent) return;
    setSaving(true);
    try {
      await fetch(`${API}/admin/scheduler/marketing-assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          asset_type: format,
          title: generatedTitle || 'Untitled',
          content: generatedContent,
          target_audience: '',
          tags: [tone, length],
        }),
      });
      fetchAssets();
    } catch { /* */ }
    setSaving(false);
  };

  const handleCopyGenerated = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAsset = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API}/admin/scheduler/marketing-assets/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    if (viewingAsset?.id === id) setViewingAsset(null);
    fetchAssets();
  };

  const handleReset = () => {
    setPrompt('');
    setGeneratedTitle('');
    setGeneratedContent('');
    setHasGenerated(false);
    setGeneratedImageUrl('');
    setHasGeneratedVisual(false);
    promptRef.current?.focus();
  };

  const insertExample = (ex: string) => {
    setPrompt(ex);
    promptRef.current?.focus();
  };

  if (isLoading) {
    return <div className="flex h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div></div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                Marketing Studio
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">Describe what you need. AI creates it. You refine and ship.</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 mb-6 w-fit">
              <button onClick={() => setMode('copy')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'copy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <FileText className="w-4 h-4" /> Write Copy
              </button>
              <button onClick={() => setMode('visual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'visual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Image className="w-4 h-4" /> Create Visual
              </button>
              <button onClick={() => setMode('email')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Mail className="w-4 h-4" /> Compose Email
              </button>
            </div>

            {/* ━━━ Prompt Section ━━━ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
              {/* Prompt Input */}
              <div className="p-5 pb-4">
                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate(); }}
                  placeholder="Tell Claude what to write... (e.g. 'Cold email for Texas agencies doing 100+ visits/month who still use paper')"
                  rows={3}
                  className="w-full text-[15px] text-slate-900 placeholder-slate-400 bg-transparent border-none outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Controls Row */}
              <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
                {mode === 'copy' ? (
                  <>
                    <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                      {FORMATS.map(f => (
                        <button key={f.id} onClick={() => setFormat(f.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${format === f.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                          <f.icon className="w-3 h-3" /> {f.label}
                        </button>
                      ))}
                    </div>
                    <select value={tone} onChange={e => setTone(e.target.value)}
                      className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-400">
                      {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <select value={length} onChange={e => setLength(e.target.value)}
                      className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-400">
                      {LENGTHS.map(l => <option key={l.id} value={l.id}>{l.label} ({l.desc})</option>)}
                    </select>
                  </>
                ) : mode === 'visual' ? (
                  <>
                    <select value={visualStyle} onChange={e => setVisualStyle(e.target.value)}
                      className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-400">
                      {VISUAL_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}
                      className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-400">
                      {ASPECT_RATIOS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <input
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      placeholder="To: email@company.com (comma separated for multiple)"
                      className="flex-1 min-w-[240px] text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400"
                    />
                    <select value={tone} onChange={e => setTone(e.target.value)}
                      className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-400">
                      {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </>
                )}

                <div className="flex-1" />

                <button onClick={mode === 'copy' ? handleGenerate : mode === 'visual' ? handleGenerateVisual : handleComposeEmail}
                  disabled={(mode === 'copy' ? generating : mode === 'visual' ? generatingVisual : composingEmail) || !prompt.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {(mode === 'copy' ? generating : mode === 'visual' ? generatingVisual : composingEmail) ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'visual' ? 'Creating...' : mode === 'email' ? 'Drafting...' : 'Generating...'}</>
                  ) : (
                    <>{mode === 'visual' ? <Paintbrush className="w-4 h-4" /> : mode === 'email' ? <Edit3 className="w-4 h-4" /> : <Send className="w-4 h-4" />} {mode === 'visual' ? 'Create Visual' : mode === 'email' ? 'Draft Email' : 'Generate'}</>
                  )}
                </button>
              </div>

              {/* Example Prompts */}
              {!hasGenerated && !generating && !hasGeneratedVisual && !generatingVisual && !hasComposedEmail && !composingEmail && (
                <div className="px-5 pb-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Try a prompt</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(mode === 'copy' ? PROMPT_EXAMPLES : mode === 'visual' ? VISUAL_EXAMPLES : EMAIL_EXAMPLES).map((ex, i) => (
                      <button key={i} onClick={() => insertExample(ex)}
                        className="text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 transition-colors hover:text-slate-700 text-left">
                        {ex.length > 65 ? ex.slice(0, 65) + '...' : ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ━━━ Visual Output ━━━ */}
            {generatingVisual && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 text-center">
                <div className="inline-flex items-center gap-3 text-slate-500">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-teal-200" />
                    <div className="absolute inset-0 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                    <Paintbrush className="absolute inset-0 m-auto w-4 h-4 text-teal-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">Creating your visual...</p>
                    <p className="text-xs text-slate-400">This takes 30-60 seconds. Generating a {ASPECT_RATIOS.find(a => a.id === aspectRatio)?.label || aspectRatio} image.</p>
                  </div>
                </div>
              </div>
            )}

            {hasGeneratedVisual && !generatingVisual && generatedImageUrl && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                      <Image className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Generated Visual</span>
                    <span className="text-xs text-slate-400">{aspectRatio} · {VISUAL_STYLES.find(s => s.id === visualStyle)?.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a href={generatedImageUrl} download target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-md transition-colors">
                      <Download className="w-3 h-3" /> Download
                    </a>
                    <button onClick={handleGenerateVisual} disabled={generatingVisual}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
                      <RotateCcw className="w-3 h-3" /> Redo
                    </button>
                    <button onClick={handleReset}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="Start over">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5 flex justify-center bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedImageUrl} alt="Generated flyer" className="max-w-full max-h-[600px] rounded-lg shadow-md" />
                </div>
                <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
                  Prompt: {prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}
                </div>
              </div>
            )}

            {/* ━━━ Composed Email Output ━━━ */}
            {composingEmail && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 text-center">
                <div className="inline-flex items-center gap-3 text-slate-500">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-teal-200" />
                    <div className="absolute inset-0 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                    <Mail className="absolute inset-0 m-auto w-4 h-4 text-teal-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">Drafting your email...</p>
                    <p className="text-xs text-slate-400">You review and edit it before anything is sent.</p>
                  </div>
                </div>
              </div>
            )}

            {mode === 'email' && hasComposedEmail && !composingEmail && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                      <Mail className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">Review before sending</span>
                    <span className="text-xs text-slate-400">from sales@palmcareai.com</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleComposeEmail} disabled={composingEmail}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
                      <RotateCcw className="w-3 h-3" /> Redraft
                    </button>
                    <button onClick={() => { setHasComposedEmail(false); setEmailSubject(''); setEmailBody(''); setEmailSendResult(null); }}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="Discard draft">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <input
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder="To: email@company.com"
                    className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400"
                  />
                  <input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400"
                  />
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    rows={Math.max(10, emailBody.split('\n').length + 2)}
                    className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {emailSendResult || `${emailBody.split(/\s+/).filter(Boolean).length} words`}
                    </span>
                    <button onClick={handleSendCustomEmail} disabled={sendingCustomEmail}
                      className="flex items-center gap-2 px-5 py-2 bg-teal-500 text-white rounded-lg text-sm font-semibold hover:bg-teal-600 disabled:opacity-40 transition-colors">
                      {sendingCustomEmail ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Email</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ━━━ Generated Copy Output ━━━ */}
            {generating && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 text-center">
                <div className="inline-flex items-center gap-3 text-slate-500">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-200" />
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">Claude is writing...</p>
                    <p className="text-xs text-slate-400">Crafting your {FORMATS.find(f => f.id === format)?.label.toLowerCase() || 'content'}</p>
                  </div>
                </div>
              </div>
            )}

            {hasGenerated && !generating && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
                {/* Output Header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <input
                      value={generatedTitle}
                      onChange={e => setGeneratedTitle(e.target.value)}
                      className="text-sm font-semibold text-slate-900 bg-transparent border-none outline-none min-w-0 flex-1"
                      placeholder="Title..."
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleCopyGenerated}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
                      {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-md transition-colors disabled:opacity-50">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                    <button onClick={handleGenerate} disabled={generating}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors"
                      title="Regenerate">
                      <RotateCcw className="w-3 h-3" /> Redo
                    </button>
                    <button onClick={handleReset}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="Start over">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Output Content */}
                <div className="p-5">
                  <textarea
                    value={generatedContent}
                    onChange={e => setGeneratedContent(e.target.value)}
                    className="w-full text-sm text-slate-800 bg-transparent border-none outline-none resize-none leading-relaxed min-h-[200px]"
                    rows={Math.max(10, generatedContent.split('\n').length + 2)}
                  />
                </div>

                <div className="px-5 pb-4 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{generatedContent.split(/\s+/).filter(Boolean).length} words</span>
                  <span className="flex items-center gap-1.5">
                    {FORMATS.find(f => f.id === format)?.label} · {TONES.find(t => t.id === tone)?.label} · {LENGTHS.find(l => l.id === length)?.label}
                  </span>
                </div>
              </div>
            )}

            {/* ━━━ Saved Library ━━━ */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Saved Library</h2>
                <div className="flex gap-1.5">
                  <button onClick={() => setActiveFilter(null)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${!activeFilter ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>All</button>
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => setActiveFilter(f.id === activeFilter ? null : f.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${f.id === activeFilter ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingAssets ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : assets.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="text-sm text-slate-400">No saved assets yet. Generate something above and hit Save.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assets.map(a => {
                    const fmtInfo = FORMATS.find(f => f.id === a.asset_type);
                    const FmtIcon = fmtInfo?.icon || FileText;
                    const isExpanded = viewingAsset?.id === a.id;
                    return (
                      <div key={a.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm">
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setViewingAsset(isExpanded ? null : a)}>
                          <FmtIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                            {!isExpanded && <p className="text-xs text-slate-400 truncate">{a.content.slice(0, 100)}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={e => { e.stopPropagation(); handleCopyAsset(a.id, a.content); }}
                              className="p-1.5 text-slate-400 hover:text-teal-500 transition-colors">
                              {copiedId === a.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {a.content}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                              <span>{fmtInfo?.label}</span>
                              <span>·</span>
                              <span>{a.created_by}</span>
                              <span>·</span>
                              <span>{new Date(a.created_at).toLocaleDateString()}</span>
                              <span>·</span>
                              <span>{a.content.split(/\s+/).filter(Boolean).length} words</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
