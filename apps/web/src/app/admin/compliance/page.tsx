'use client';

import { getStoredToken } from '@/lib/auth';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, FileText, Building2, Calendar, Shield, Loader2,
  RefreshCw, CheckCircle, XCircle, Clock, Filter
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface ComplianceAlert {
  id: string;
  business_id: string;
  business_name: string;
  alert_type: string;
  document_type: string;
  expiration_date: string;
  days_until_expiry: number;
  severity: string;
}

interface ComplianceSummary {
  total_documents: number;
  verified_documents: number;
  expired_documents: number;
  expiring_in_30_days: number;
  compliance_rate: number;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
};

export default function CompliancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          if (user.role === 'admin' && user.email.endsWith('@homecare.ai')) {
            setIsAuthorized(true);
            fetchData();
          } else {
            router.push('/visits');
          }
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    const token = getStoredToken();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [alertsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/platform/compliance/alerts`, { headers }),
        fetch(`${API_BASE}/platform/compliance/summary`, { headers }),
      ]);

      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    return a.severity === filter;
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HIPAA Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Compliance Monitoring</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Track document expirations and compliance status across all businesses.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Compliance Alerts</h1>
            <p className="text-dark-400 mt-1">Monitor expiring documents and licenses</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
              <p className="text-dark-400 text-sm">Total Documents</p>
              <p className="text-2xl font-bold text-white mt-1">{summary.total_documents}</p>
            </div>
            <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
              <p className="text-dark-400 text-sm">Verified</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{summary.verified_documents}</p>
            </div>
            <div className="p-5 bg-red-500/10 rounded-xl border border-red-500/30">
              <p className="text-red-400 text-sm">Expired</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{summary.expired_documents}</p>
            </div>
            <div className="p-5 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
              <p className="text-yellow-400 text-sm">Expiring Soon</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{summary.expiring_in_30_days}</p>
            </div>
            <div className="p-5 bg-dark-800 rounded-xl border border-dark-700">
              <p className="text-dark-400 text-sm">Compliance Rate</p>
              <p className={`text-2xl font-bold mt-1 ${summary.compliance_rate >= 80 ? 'text-green-400' : summary.compliance_rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {summary.compliance_rate}%
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-dark-800 rounded-lg p-1">
            {['all', 'critical', 'high', 'medium', 'low'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === f ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-dark-400 text-sm">
            {filteredAlerts.length} alerts
          </span>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-20 bg-dark-800 rounded-xl border border-dark-700">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-white font-medium">No compliance alerts</p>
              <p className="text-dark-400 text-sm mt-1">All documents are up to date</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const styles = SEVERITY_STYLES[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={`p-5 rounded-xl border ${styles.bg} ${styles.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg}`}>
                        {alert.severity === 'critical' ? (
                          <XCircle className={`w-5 h-5 ${styles.text}`} />
                        ) : (
                          <AlertTriangle className={`w-5 h-5 ${styles.text}`} />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{alert.business_name}</p>
                        <p className="text-dark-400 text-sm mt-1">
                          {alert.document_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${styles.bg} ${styles.text}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <p className={`text-sm mt-2 ${styles.text}`}>
                        {alert.days_until_expiry <= 0 
                          ? 'Expired' 
                          : `${alert.days_until_expiry} days remaining`
                        }
                      </p>
                      {alert.expiration_date && (
                        <p className="text-dark-400 text-xs mt-1">
                          Expires {new Date(alert.expiration_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
