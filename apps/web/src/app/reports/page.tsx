'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  Download,
  FileText,
  Loader2,
  Users,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Types
interface ServiceSummary {
  category: string;
  label: string;
  total_mentions: number;
  clients_count: number;
  description: string;
}

interface WeeklyReport {
  period_start: string;
  period_end: string;
  total_assessments: number;
  total_clients: number;
  total_services: number;
  services_by_category: ServiceSummary[];
  assessments: any[];
  generated_at: string;
}

interface MonthlyReport {
  month: string;
  year: number;
  total_assessments: number;
  completed_assessments: number;
  pending_assessments: number;
  total_contracts_generated: number;
  total_clients_served: number;
  new_clients: number;
  services_breakdown: any[];
  weekly_trend: any[];
  summary: string;
  generated_at: string;
}

interface BillingReport {
  period: string;
  total_assessments: number;
  total_services_identified: number;
  services_by_type: any[];
  client_billing: any[];
  summary: string;
  generated_at: string;
}

interface ClientActivityReport {
  total_clients: number;
  active_clients: number;
  clients_with_contracts: number;
  clients_pending: number;
  clients: any[];
  summary: string;
  generated_at: string;
}

type ReportType = 'timesheet' | 'monthly' | 'billing' | 'activity';

export default function ReportsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>('timesheet');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Report data
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [billingReport, setBillingReport] = useState<BillingReport | null>(null);
  const [activityReport, setActivityReport] = useState<ClientActivityReport | null>(null);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  useEffect(() => {
    if (token) {
      loadReport(activeReport);
    }
  }, [token, activeReport]);

  const loadReport = async (type: ReportType) => {
    if (!token) return;
    setLoading(true);
    
    try {
      const endpoints: Record<ReportType, string> = {
        timesheet: '/reports/timesheet',
        monthly: '/reports/monthly-summary',
        billing: '/reports/billing',
        activity: '/reports/client-activity',
      };
      
      const response = await fetch(`${API_BASE}${endpoints[type]}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        switch (type) {
          case 'timesheet':
            setWeeklyReport(data);
            break;
          case 'monthly':
            setMonthlyReport(data);
            break;
          case 'billing':
            setBillingReport(data);
            break;
          case 'activity':
            setActivityReport(data);
            break;
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: ReportType) => {
    if (!token) return;
    setDownloading(true);
    
    try {
      const endpoints: Record<string, string> = {
        timesheet: '/reports/timesheet/csv',
        billing: '/reports/billing/csv',
      };
      
      const endpoint = endpoints[type];
      if (!endpoint) {
        alert('CSV export coming soon for this report type');
        setDownloading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-300">Loading...</span>
        </div>
      </div>
    );
  }

  const reportTabs = [
    { id: 'timesheet' as ReportType, label: 'Weekly Timesheet', icon: Clock, color: 'primary' },
    { id: 'monthly' as ReportType, label: 'Monthly Summary', icon: Calendar, color: 'green' },
    { id: 'billing' as ReportType, label: 'Billing Report', icon: DollarSign, color: 'orange' },
    { id: 'activity' as ReportType, label: 'Client Activity', icon: Users, color: 'cyan' },
  ];

  const getServiceColor = (type: string) => {
    const colors: Record<string, string> = {
      'Personal Care': 'bg-blue-500/20 text-blue-400',
      'Medication': 'bg-orange-500/20 text-orange-400',
      'Health Monitoring': 'bg-red-500/20 text-red-400',
      'Nutrition': 'bg-green-500/20 text-green-400',
      'Mobility': 'bg-cyan-500/20 text-cyan-400',
      'Homemaking': 'bg-purple-500/20 text-purple-400',
      'Companionship': 'bg-pink-500/20 text-pink-400',
      'Safety': 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[type] || 'bg-dark-600 text-dark-300';
  };

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
              <p className="text-dark-300">Analytics and insights from your assessments</p>
            </div>
            <button
              onClick={() => loadReport(activeReport)}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Report Type Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {reportTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeReport === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all whitespace-nowrap ${
                    isActive 
                      ? `bg-accent-${tab.color}/20 text-accent-${tab.color} border border-accent-${tab.color}/30` 
                      : 'bg-dark-800 text-dark-300 hover:bg-dark-700 border border-dark-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="card p-12 text-center">
              <Loader2 className="w-10 h-10 text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-dark-300">Loading report data...</p>
            </div>
          )}

          {/* Weekly Timesheet Report */}
          {!loading && activeReport === 'timesheet' && weeklyReport && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Period</p>
                  <p className="text-lg font-bold text-white">
                    {new Date(weeklyReport.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weeklyReport.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Assessments</p>
                  <p className="text-3xl font-bold text-primary-400">{weeklyReport.total_assessments}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Clients</p>
                  <p className="text-3xl font-bold text-accent-green">{weeklyReport.total_clients}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Services Identified</p>
                  <p className="text-3xl font-bold text-accent-cyan">{weeklyReport.total_services}</p>
                </div>
              </div>

              {/* Services Breakdown */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Services Breakdown</h3>
                  <button
                    onClick={() => handleDownload('timesheet')}
                    disabled={downloading}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export CSV
                  </button>
                </div>
                {weeklyReport.services_by_category.length === 0 ? (
                  <p className="text-dark-400 text-center py-8">No services identified this week</p>
                ) : (
                  <div className="space-y-3">
                    {weeklyReport.services_by_category.map((service, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-dark-700/30 rounded-xl">
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getServiceColor(service.description)}`}>
                          {service.description}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{service.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{service.total_mentions}</p>
                          <p className="text-dark-400 text-xs">{service.clients_count} client{service.clients_count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Assessments */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">This Week's Assessments</h3>
                {weeklyReport.assessments.length === 0 ? (
                  <p className="text-dark-400 text-center py-8">No assessments this week</p>
                ) : (
                  <div className="space-y-2">
                    {weeklyReport.assessments.map((assessment, i) => (
                      <div 
                        key={i} 
                        onClick={() => router.push(`/visits/${assessment.id}`)}
                        className="flex items-center gap-4 p-4 bg-dark-700/30 rounded-xl cursor-pointer hover:bg-dark-700/50 transition"
                      >
                        <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{assessment.client_name}</p>
                          <p className="text-dark-400 text-sm">{assessment.date}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end max-w-xs">
                          {assessment.services.slice(0, 3).map((s: string, j: number) => (
                            <span key={j} className="px-2 py-1 bg-dark-600 rounded text-xs text-dark-300">{s}</span>
                          ))}
                          {assessment.services.length > 3 && (
                            <span className="text-dark-500 text-xs">+{assessment.services.length - 3} more</span>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-dark-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monthly Summary Report */}
          {!loading && activeReport === 'monthly' && monthlyReport && (
            <div className="space-y-6">
              {/* Month Header */}
              <div className="card p-6 bg-gradient-to-r from-accent-green/10 to-primary-500/10 border-accent-green/30">
                <h2 className="text-2xl font-bold text-white mb-2">{monthlyReport.month} {monthlyReport.year}</h2>
                <p className="text-dark-300">{monthlyReport.summary}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Total Assessments</p>
                  <p className="text-3xl font-bold text-white">{monthlyReport.total_assessments}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-accent-green text-xs">{monthlyReport.completed_assessments} completed</span>
                    <span className="text-dark-500 text-xs">•</span>
                    <span className="text-yellow-400 text-xs">{monthlyReport.pending_assessments} pending</span>
                  </div>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Clients Served</p>
                  <p className="text-3xl font-bold text-accent-cyan">{monthlyReport.total_clients_served}</p>
                  <p className="text-accent-green text-xs mt-2">+{monthlyReport.new_clients} new this month</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Contracts Generated</p>
                  <p className="text-3xl font-bold text-accent-purple">{monthlyReport.total_contracts_generated}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Weekly Average</p>
                  <p className="text-3xl font-bold text-primary-400">
                    {monthlyReport.weekly_trend.length > 0 
                      ? Math.round(monthlyReport.weekly_trend.reduce((a, w) => a + w.assessments, 0) / monthlyReport.weekly_trend.length)
                      : 0
                    }
                  </p>
                  <p className="text-dark-500 text-xs mt-2">assessments/week</p>
                </div>
              </div>

              {/* Services Breakdown */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Services Breakdown</h3>
                {monthlyReport.services_breakdown.length === 0 ? (
                  <p className="text-dark-400 text-center py-8">No services data available</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {monthlyReport.services_breakdown.map((svc, i) => (
                      <div key={i} className="p-4 bg-dark-700/30 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getServiceColor(svc.type)}`}>
                            {svc.type}
                          </span>
                          <span className="text-white font-bold">{svc.count}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {svc.services.slice(0, 4).map((s: string, j: number) => (
                            <span key={j} className="text-xs text-dark-400">{s}{j < Math.min(svc.services.length, 4) - 1 ? ',' : ''}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly Trend */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Weekly Trend</h3>
                <div className="grid grid-cols-4 gap-4">
                  {monthlyReport.weekly_trend.map((week, i) => (
                    <div key={i} className="p-4 bg-dark-700/30 rounded-xl text-center">
                      <p className="text-dark-400 text-sm">{week.week}</p>
                      <p className="text-2xl font-bold text-white mt-1">{week.assessments}</p>
                      <p className="text-dark-500 text-xs">{week.start_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Billing Report */}
          {!loading && activeReport === 'billing' && billingReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="card p-6 bg-gradient-to-r from-accent-orange/10 to-yellow-500/10 border-accent-orange/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Billing Summary</h2>
                    <p className="text-dark-300">{billingReport.summary}</p>
                  </div>
                  <button
                    onClick={() => handleDownload('billing')}
                    disabled={downloading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Period</p>
                  <p className="text-xl font-bold text-white">{billingReport.period}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Total Assessments</p>
                  <p className="text-3xl font-bold text-primary-400">{billingReport.total_assessments}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Services Identified</p>
                  <p className="text-3xl font-bold text-accent-orange">{billingReport.total_services_identified}</p>
                </div>
              </div>

              {/* Services by Type */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Services by Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  {billingReport.services_by_type.map((svc, i) => (
                    <div key={i} className="p-4 bg-dark-700/30 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getServiceColor(svc.type)}`}>
                          {svc.type}
                        </span>
                        <span className="text-white font-bold">{svc.total} total</span>
                      </div>
                      <div className="space-y-1">
                        {svc.services.slice(0, 3).map((s: any, j: number) => (
                          <div key={j} className="flex justify-between text-sm">
                            <span className="text-dark-300">{s.name}</span>
                            <span className="text-dark-400">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client Billing */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Client Billing Details</h3>
                <div className="space-y-3">
                  {billingReport.client_billing.map((client, i) => (
                    <div key={i} className="p-4 bg-dark-700/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent-orange/20 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-accent-orange" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{client.client_name}</p>
                            <p className="text-dark-400 text-sm">{client.assessment_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            client.contract_status === 'Generated' 
                              ? 'bg-accent-green/20 text-accent-green' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {client.contract_status}
                          </span>
                          {client.estimated_weekly && (
                            <div className="text-right">
                              <p className="text-white font-bold">${client.estimated_weekly.toFixed(0)}/wk</p>
                              <p className="text-dark-400 text-xs">${client.estimated_monthly?.toFixed(0)}/mo</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {client.services.slice(0, 5).map((s: any, j: number) => (
                          <span key={j} className={`px-2 py-1 rounded text-xs ${getServiceColor(s.type)}`}>
                            {s.category}
                          </span>
                        ))}
                        {client.services.length > 5 && (
                          <span className="text-dark-500 text-xs">+{client.services.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Client Activity Report */}
          {!loading && activeReport === 'activity' && activityReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="card p-6 bg-gradient-to-r from-accent-cyan/10 to-primary-500/10 border-accent-cyan/30">
                <h2 className="text-xl font-bold text-white mb-2">Client Activity Overview</h2>
                <p className="text-dark-300">{activityReport.summary}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Total Clients</p>
                  <p className="text-3xl font-bold text-white">{activityReport.total_clients}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Active</p>
                  <p className="text-3xl font-bold text-accent-green">{activityReport.active_clients}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">With Contracts</p>
                  <p className="text-3xl font-bold text-accent-cyan">{activityReport.clients_with_contracts}</p>
                </div>
                <div className="card p-5">
                  <p className="text-dark-400 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-400">{activityReport.clients_pending}</p>
                </div>
              </div>

              {/* Client List */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">All Clients</h3>
                <div className="space-y-3">
                  {activityReport.clients.map((client, i) => (
                    <div 
                      key={i} 
                      onClick={() => router.push('/clients')}
                      className="p-4 bg-dark-700/30 rounded-xl cursor-pointer hover:bg-dark-700/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {client.client_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{client.client_name}</p>
                            <div className="flex items-center gap-2 text-sm text-dark-400">
                              <span>{client.total_assessments} assessment{client.total_assessments !== 1 ? 's' : ''}</span>
                              {client.last_assessment_date && (
                                <>
                                  <span>•</span>
                                  <span>Last: {client.last_assessment_date}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {client.care_level && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              client.care_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                              client.care_level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {client.care_level}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs ${
                            client.contract_status === 'Active' 
                              ? 'bg-accent-green/20 text-accent-green' 
                              : 'bg-dark-600 text-dark-400'
                          }`}>
                            {client.contract_status}
                          </span>
                          <ChevronRight className="w-5 h-5 text-dark-500" />
                        </div>
                      </div>
                      {client.services_identified.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-3 ml-16">
                          {client.services_identified.map((s: string, j: number) => (
                            <span key={j} className="px-2 py-1 bg-dark-600 rounded text-xs text-dark-300">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && (
            (activeReport === 'timesheet' && !weeklyReport) ||
            (activeReport === 'monthly' && !monthlyReport) ||
            (activeReport === 'billing' && !billingReport) ||
            (activeReport === 'activity' && !activityReport)
          ) && (
            <div className="card p-12 text-center">
              <BarChart3 className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Data Available</h3>
              <p className="text-dark-400">Complete some assessments to generate report data</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
