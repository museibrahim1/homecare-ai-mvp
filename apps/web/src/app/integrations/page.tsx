'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, Link2, Database, FileSpreadsheet, Webhook, 
  Check, AlertCircle, RefreshCw, Copy, ExternalLink,
  Plus, Users, ArrowRight
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: any[];
  clients?: any[];
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { token, isReady } = useRequireAuth();
  const [activeTab, setActiveTab] = useState<'import' | 'monday' | 'webhook'>('import');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Monday.com state
  const [mondayApiKey, setMondayApiKey] = useState('');
  const [mondayBoardId, setMondayBoardId] = useState('');
  const [fetchingMonday, setFetchingMonday] = useState(false);
  
  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Webhook URLs
  const webhookUrl = `${API_BASE}/integrations/webhooks/generic`;
  const mondayWebhookUrl = `${API_BASE}/integrations/webhooks/monday`;

  const handleCsvUpload = async () => {
    if (!csvFile || !token) return;
    
    setImporting(true);
    setError(null);
    setImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('skip_duplicates', 'true');
      
      const response = await fetch(`${API_BASE}/integrations/import/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Import failed');
      }
      
      setImportResult(result);
      setCsvFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleMondayFetch = async () => {
    if (!mondayApiKey || !mondayBoardId || !token) return;
    
    setFetchingMonday(true);
    setError(null);
    setImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append('api_key', mondayApiKey);
      formData.append('board_id', mondayBoardId);
      
      const response = await fetch(`${API_BASE}/integrations/fetch/monday`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Fetch failed');
      }
      
      setImportResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetchingMonday(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'import', label: 'CSV Import', icon: FileSpreadsheet },
    { id: 'monday', label: 'Monday.com', icon: Database },
    { id: 'webhook', label: 'Webhooks', icon: Webhook },
  ];

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-dark-400 mt-1">Import clients from external systems or connect via webhooks</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-dark-700 pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setImportResult(null);
                  setError(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results Banner */}
        {importResult && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">Import Complete</p>
                <p className="text-dark-300 text-sm">
                  {importResult.imported} imported, {importResult.skipped} skipped
                  {importResult.errors?.length > 0 && `, ${importResult.errors.length} errors`}
                </p>
              </div>
              <button
                onClick={() => router.push('/clients')}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition"
              >
                <Users className="w-4 h-4" />
                View Clients
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* CSV Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Import from CSV</h2>
              <p className="text-dark-400 text-sm mb-6">
                Upload a CSV file with client information. The file should have columns for name, phone, email, address, etc.
              </p>

              {/* File Upload */}
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-dark-600 rounded-xl cursor-pointer hover:border-primary-500/50 hover:bg-dark-800/50 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {csvFile ? (
                  <div className="text-center">
                    <FileSpreadsheet className="w-10 h-10 text-green-400 mx-auto mb-2" />
                    <p className="text-white font-medium">{csvFile.name}</p>
                    <p className="text-dark-400 text-sm">{(csvFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-dark-400 mb-2" />
                    <p className="text-white font-medium">Drop CSV file here or click to browse</p>
                    <p className="text-dark-400 text-sm mt-1">Supports .csv files</p>
                  </>
                )}
              </label>

              {csvFile && (
                <button
                  onClick={handleCsvUpload}
                  disabled={importing}
                  className="mt-4 w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Clients
                    </>
                  )}
                </button>
              )}
            </div>

            {/* CSV Format Help */}
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-6">
              <h3 className="text-primary-400 font-semibold mb-3">CSV Format</h3>
              <p className="text-dark-300 text-sm mb-4">Your CSV should include these columns (column names are flexible):</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-dark-400">• name / full_name <span className="text-red-400">*required</span></div>
                <div className="text-dark-400">• phone / phone_number</div>
                <div className="text-dark-400">• email / email_address</div>
                <div className="text-dark-400">• address / street_address</div>
                <div className="text-dark-400">• date_of_birth / dob</div>
                <div className="text-dark-400">• emergency_contact_name</div>
                <div className="text-dark-400">• emergency_contact_phone</div>
                <div className="text-dark-400">• notes / comments</div>
              </div>
            </div>
          </div>
        )}

        {/* Monday.com Tab */}
        {activeTab === 'monday' && (
          <div className="space-y-6">
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Connect to Monday.com</h2>
              <p className="text-dark-400 text-sm mb-6">
                Import clients directly from your Monday.com boards. Enter your API key and board ID below.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Monday.com API Key</label>
                  <input
                    type="password"
                    value={mondayApiKey}
                    onChange={(e) => setMondayApiKey(e.target.value)}
                    placeholder="Enter your Monday.com API key"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-dark-500 text-xs mt-1">
                    Find your API key in Monday.com → Profile → Developer → API
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-dark-300 mb-2">Board ID</label>
                  <input
                    type="text"
                    value={mondayBoardId}
                    onChange={(e) => setMondayBoardId(e.target.value)}
                    placeholder="Enter the board ID (e.g., 1234567890)"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-dark-500 text-xs mt-1">
                    Find the board ID in the URL when viewing your board
                  </p>
                </div>

                <button
                  onClick={handleMondayFetch}
                  disabled={fetchingMonday || !mondayApiKey || !mondayBoardId}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {fetchingMonday ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Fetching from Monday.com...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Fetch Clients from Board
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Webhook Setup */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h3 className="text-white font-semibold mb-4">Auto-Sync with Webhooks</h3>
              <p className="text-dark-400 text-sm mb-4">
                Set up a webhook in Monday.com to automatically sync new clients when they're added to your board.
              </p>
              <div className="flex items-center gap-2 p-3 bg-dark-700 rounded-lg">
                <code className="text-primary-400 text-sm flex-1 truncate">{mondayWebhookUrl}</code>
                <button
                  onClick={() => copyToClipboard(mondayWebhookUrl)}
                  className="p-2 hover:bg-dark-600 rounded transition"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4 text-dark-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhook' && (
          <div className="space-y-6">
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Generic Webhook</h2>
              <p className="text-dark-400 text-sm mb-6">
                Use this webhook URL to receive client data from any external system. Send a POST request with JSON data.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-2">Webhook URL</label>
                  <div className="flex items-center gap-2 p-3 bg-dark-700 rounded-lg">
                    <code className="text-primary-400 text-sm flex-1 truncate">{webhookUrl}</code>
                    <button
                      onClick={() => copyToClipboard(webhookUrl)}
                      className="p-2 hover:bg-dark-600 rounded transition"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4 text-dark-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* JSON Format */}
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-6">
              <h3 className="text-primary-400 font-semibold mb-3">Expected JSON Format</h3>
              <pre className="bg-dark-900 p-4 rounded-lg text-sm text-dark-200 overflow-x-auto">
{`{
  "clients": [
    {
      "full_name": "John Smith",
      "phone": "555-1234",
      "email": "john@example.com",
      "address": "123 Main St",
      "date_of_birth": "1950-01-15",
      "emergency_contact_name": "Jane Smith",
      "emergency_contact_phone": "555-5678",
      "notes": "Diabetic, needs morning visits"
    }
  ]
}`}
              </pre>
            </div>

            {/* API Import */}
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-6">
              <h3 className="text-white font-semibold mb-4">Bulk API Import</h3>
              <p className="text-dark-400 text-sm mb-4">
                For authenticated bulk imports, use this endpoint:
              </p>
              <div className="flex items-center gap-2 p-3 bg-dark-700 rounded-lg mb-4">
                <span className="text-green-400 text-sm font-mono">POST</span>
                <code className="text-primary-400 text-sm flex-1 truncate">{API_BASE}/integrations/import/bulk</code>
                <button
                  onClick={() => copyToClipboard(`${API_BASE}/integrations/import/bulk`)}
                  className="p-2 hover:bg-dark-600 rounded transition"
                >
                  <Copy className="w-4 h-4 text-dark-400" />
                </button>
              </div>
              <p className="text-dark-500 text-xs">
                Requires Authorization header with Bearer token
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
