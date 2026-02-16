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
  ChevronDown,
  X,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type ReportType = 'timesheet' | 'monthly' | 'billing' | 'activity' | null;

export default function ReportsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [expandedReport, setExpandedReport] = useState<ReportType>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Report data
  const [reportData, setReportData] = useState<any>(null);
  
  // Overview stats
  const [overviewStats, setOverviewStats] = useState<{
    assessments_this_week: number;
    services_identified: number;
    contracts_generated: number;
    active_clients: number;
  } | null>(null);

  // Auth check and load stats
  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);
  
  // Load overview stats when authenticated
  useEffect(() => {
    if (token) {
      loadOverviewStats();
    }
  }, [token]);
  
  const loadOverviewStats = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/reports/overview`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOverviewStats(data);
      }
    } catch (err) {
    }
  };

  const loadReport = async (type: ReportType) => {
    if (!token || !type) return;
    setLoading(true);
    setReportData(null);
    
    try {
      const endpoints: Record<string, string> = {
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
        setReportData(data);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (type: ReportType) => {
    if (expandedReport === type) {
      setExpandedReport(null);
      setReportData(null);
    } else {
      setExpandedReport(type);
      loadReport(type);
    }
  };

  const handleDownload = async (type: string) => {
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
    } finally {
      setDownloading(false);
    }
  };

  const hasStoredToken = typeof window !== 'undefined' && localStorage.getItem('homecare-auth');

  if (authLoading && !hasStoredToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (!token && !hasStoredToken) return null;

  const reportTypes = [
    {
      id: 'timesheet' as ReportType,
      title: 'Weekly Timesheet',
      description: 'Export billable hours for the past week',
      icon: Clock,
      bgClass: 'bg-accent-primary/20',
      textClass: 'text-accent-primary',
    },
    {
      id: 'monthly' as ReportType,
      title: 'Monthly Summary',
      description: 'Overview of visits and services by month',
      icon: Calendar,
      bgClass: 'bg-accent-green/20',
      textClass: 'text-accent-green',
    },
    {
      id: 'billing' as ReportType,
      title: 'Billing Report',
      description: 'Detailed breakdown of billable items',
      icon: DollarSign,
      bgClass: 'bg-accent-orange/20',
      textClass: 'text-accent-orange',
    },
    {
      id: 'activity' as ReportType,
      title: 'Client Activity',
      description: 'Visit history per client',
      icon: Users,
      bgClass: 'bg-accent-cyan/20',
      textClass: 'text-accent-cyan',
    },
  ];

  const getServiceColor = (type: string) => {
    const colors: Record<string, string> = {
      'Personal Care': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Medication': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Health Monitoring': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Nutrition': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Mobility': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'Homemaking': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Companionship': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Safety': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return colors[type] || 'bg-dark-600 text-dark-300 border-dark-500';
  };

  // Render expanded content based on report type
  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-dark-400">Loading report data...</p>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="p-8 text-center">
          <p className="text-dark-400">No data available</p>
        </div>
      );
    }

    switch (expandedReport) {
      case 'timesheet':
        return (
          <div className="p-6 space-y-6">
            {/* Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Period</p>
                <p className="text-white font-medium text-sm">
                  {new Date(reportData.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(reportData.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Assessments</p>
                <p className="text-2xl font-bold text-primary-400">{reportData.total_assessments}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Clients</p>
                <p className="text-2xl font-bold text-accent-green">{reportData.total_clients}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Services</p>
                <p className="text-2xl font-bold text-accent-cyan">{reportData.total_services}</p>
              </div>
            </div>

            {/* Services by Category */}
            <div>
              <h4 className="text-white font-medium mb-3">Services Breakdown</h4>
              <div className="grid grid-cols-2 gap-3">
                {reportData.services_by_category?.map((service: any, i: number) => (
                  <div key={i} className={`rounded-xl p-4 border ${getServiceColor(service.description)}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{service.label}</p>
                        <p className="text-xs opacity-70">{service.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{service.total_mentions}</p>
                        <p className="text-xs opacity-70">{service.clients_count} clients</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessments List */}
            {reportData.assessments?.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">Recent Assessments</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reportData.assessments.map((a: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => router.push(`/visits/${a.id}`)}
                      className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg cursor-pointer hover:bg-dark-700/50 transition"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">{a.client_name}</p>
                        <p className="text-dark-400 text-xs">{a.date} • {a.services_count} services</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-dark-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'monthly':
        return (
          <div className="p-6 space-y-6">
            {/* Month Header */}
            <div className="bg-gradient-to-r from-accent-green/10 to-primary-500/10 rounded-xl p-4 border border-accent-green/20">
              <h4 className="text-white font-bold text-lg">{reportData.month} {reportData.year}</h4>
              <p className="text-dark-300 text-sm mt-1">{reportData.summary}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Assessments</p>
                <p className="text-xl font-bold text-white">{reportData.total_assessments}</p>
                <p className="text-xs text-accent-green">{reportData.completed_assessments} done</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Clients</p>
                <p className="text-xl font-bold text-accent-cyan">{reportData.total_clients_served}</p>
                <p className="text-xs text-accent-green">+{reportData.new_clients} new</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Contracts</p>
                <p className="text-xl font-bold text-accent-purple">{reportData.total_contracts_generated}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Pending</p>
                <p className="text-xl font-bold text-yellow-400">{reportData.pending_assessments}</p>
              </div>
            </div>

            {/* Services Breakdown */}
            {reportData.services_breakdown?.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">Services by Type</h4>
                <div className="grid grid-cols-2 gap-3">
                  {reportData.services_breakdown.map((svc: any, i: number) => (
                    <div key={i} className={`rounded-xl p-4 border ${getServiceColor(svc.type)}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{svc.type}</span>
                        <span className="text-lg font-bold">{svc.count}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {svc.services?.slice(0, 3).map((s: string, j: number) => (
                          <span key={j} className="text-xs opacity-70">{s}{j < 2 ? ',' : ''}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Trend */}
            {reportData.weekly_trend?.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">Weekly Trend</h4>
                <div className="grid grid-cols-4 gap-3">
                  {reportData.weekly_trend.map((week: any, i: number) => (
                    <div key={i} className="bg-dark-700/50 rounded-xl p-3 text-center">
                      <p className="text-dark-400 text-xs">{week.week}</p>
                      <p className="text-xl font-bold text-white">{week.assessments}</p>
                      <p className="text-dark-500 text-xs">{week.start_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'billing':
        return (
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-accent-orange/10 to-yellow-500/10 rounded-xl p-4 border border-accent-orange/20">
              <h4 className="text-white font-bold">{reportData.period}</h4>
              <p className="text-dark-300 text-sm mt-1">{reportData.summary}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Assessments</p>
                <p className="text-2xl font-bold text-primary-400">{reportData.total_assessments}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Services Found</p>
                <p className="text-2xl font-bold text-accent-orange">{reportData.total_services_identified}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Categories</p>
                <p className="text-2xl font-bold text-accent-cyan">{reportData.services_by_type?.length || 0}</p>
              </div>
            </div>

            {/* Services by Type */}
            {reportData.services_by_type?.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">Services by Type</h4>
                <div className="grid grid-cols-2 gap-3">
                  {reportData.services_by_type.map((svc: any, i: number) => (
                    <div key={i} className={`rounded-xl p-4 border ${getServiceColor(svc.type)}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{svc.type}</span>
                        <span className="font-bold">{svc.total}</span>
                      </div>
                      <div className="space-y-1">
                        {svc.services?.slice(0, 3).map((s: any, j: number) => (
                          <div key={j} className="flex justify-between text-xs opacity-70">
                            <span>{s.name}</span>
                            <span>{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client Billing */}
            {reportData.client_billing?.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">Client Billing</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reportData.client_billing.map((client: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                      <div>
                        <p className="text-white text-sm font-medium">{client.client_name}</p>
                        <p className="text-dark-400 text-xs">{client.assessment_date} • {client.total_services} services</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          client.contract_status === 'Generated' 
                            ? 'bg-accent-green/20 text-accent-green' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {client.contract_status}
                        </span>
                        {client.estimated_weekly && (
                          <p className="text-white text-sm font-medium mt-1">${client.estimated_weekly.toFixed(0)}/wk</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'activity':
        return (
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-accent-cyan/10 to-primary-500/10 rounded-xl p-4 border border-accent-cyan/20">
              <h4 className="text-white font-bold">Client Overview</h4>
              <p className="text-dark-300 text-sm mt-1">{reportData.summary}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Total</p>
                <p className="text-xl font-bold text-white">{reportData.total_clients}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Active</p>
                <p className="text-xl font-bold text-accent-green">{reportData.active_clients}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">With Contracts</p>
                <p className="text-xl font-bold text-accent-cyan">{reportData.clients_with_contracts}</p>
              </div>
              <div className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-dark-400 text-xs mb-1">Pending</p>
                <p className="text-xl font-bold text-yellow-400">{reportData.clients_pending}</p>
              </div>
            </div>

            {/* Client List */}
            {reportData.clients?.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">All Clients</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {reportData.clients.map((client: any, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => router.push('/clients')}
                      className="p-3 bg-dark-700/30 rounded-lg cursor-pointer hover:bg-dark-700/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-primary-400 font-bold text-sm">{client.client_name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{client.client_name}</p>
                            <p className="text-dark-400 text-xs">
                              {client.total_assessments} assessments
                              {client.last_assessment_date && ` • Last: ${client.last_assessment_date}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {client.care_level && (
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              client.care_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                              client.care_level === 'MODERATE' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {client.care_level}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            client.contract_status === 'Active' 
                              ? 'bg-accent-green/20 text-accent-green' 
                              : 'bg-dark-600 text-dark-400'
                          }`}>
                            {client.contract_status}
                          </span>
                        </div>
                      </div>
                      {client.services_identified?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2 ml-11">
                          {client.services_identified.slice(0, 4).map((s: string, j: number) => (
                            <span key={j} className="px-2 py-0.5 bg-dark-600 rounded text-xs text-dark-300">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
              <p className="text-dark-300">Generate and export reports</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                </div>
                <span className="text-dark-400 text-sm">This Week</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewStats?.assessments_this_week ?? '--'}
              </p>
              <p className="text-sm text-dark-400">assessments</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent-green" />
                </div>
                <span className="text-dark-400 text-sm">Services</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewStats?.services_identified ?? '--'}
              </p>
              <p className="text-sm text-dark-400">identified</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-cyan/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent-cyan" />
                </div>
                <span className="text-dark-400 text-sm">Contracts</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewStats?.contracts_generated ?? '--'}
              </p>
              <p className="text-sm text-dark-400">generated</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-accent-purple" />
                </div>
                <span className="text-dark-400 text-sm">Clients</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewStats?.active_clients ?? '--'}
              </p>
              <p className="text-sm text-dark-400">active</p>
            </div>
          </div>

          {/* Report Types - Clickable Cards */}
          <h2 className="text-xl font-semibold text-white mb-4">Generate Reports</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {reportTypes.map((report) => {
              const isExpanded = expandedReport === report.id;
              return (
                <div 
                  key={report.id} 
                  className={`card overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'col-span-2' : ''
                  }`}
                >
                  {/* Card Header - Always visible */}
                  <div 
                    onClick={() => handleCardClick(report.id)}
                    className="p-6 cursor-pointer group hover:bg-dark-700/30 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${report.bgClass} rounded-xl flex items-center justify-center`}>
                        <report.icon className={`w-6 h-6 ${report.textClass}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{report.title}</h3>
                        <p className="text-dark-400 text-sm">{report.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded && (report.id === 'timesheet' || report.id === 'billing') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(report.id!);
                            }}
                            disabled={downloading}
                            className="btn-secondary py-2 px-3 text-sm flex items-center gap-2"
                          >
                            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            CSV
                          </button>
                        )}
                        <div className={`p-2 rounded-lg transition ${isExpanded ? 'bg-primary-500/20' : 'group-hover:bg-dark-700'}`}>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-primary-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-dark-400 group-hover:text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-dark-700">
                      {renderReportContent()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Weekly Activity Chart */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Weekly Activity</h3>
            </div>
            {(overviewStats?.assessments_this_week || 0) > 0 ? (
              <>
                <div className="h-64 flex items-end justify-between gap-2 px-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    // Show minimal placeholder bars - real chart data requires analytics endpoint
                    const barHeight = 20;
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full relative">
                          <div 
                            className="w-full bg-gradient-to-t from-primary-500/80 to-primary-400/40 rounded-t-lg transition-all duration-500 hover:from-primary-400/90 hover:to-primary-300/50"
                            style={{ height: `${barHeight}px` }}
                          />
                        </div>
                        <span className="text-dark-400 text-xs">{day}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-dark-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary-500 rounded" />
                    <span className="text-dark-400 text-sm">Assessments Completed</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center">
                <BarChart3 className="w-12 h-12 text-dark-600 mb-3" />
                <p className="text-dark-400">No activity data yet</p>
                <p className="text-dark-500 text-sm mt-1">Complete assessments to see your weekly activity</p>
              </div>
            )}
          </div>

          {/* Recent Activity Feed */}
          <div className="card p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            {(overviewStats?.assessments_this_week || 0) === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400">No recent activity</p>
                <p className="text-dark-500 text-sm mt-1">Complete an assessment to see activity here</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center py-4 text-dark-400 text-sm">
                  Activity feed based on your assessments will appear here
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
