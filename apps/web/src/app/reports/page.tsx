'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  TrendingUp,
  Clock,
  DollarSign,
  Calendar,
  Download,
  FileText
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export default function ReportsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

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

  const reportTypes = [
    {
      title: 'Weekly Timesheet',
      description: 'Export billable hours for the past week',
      icon: Clock,
      color: 'primary',
    },
    {
      title: 'Monthly Summary',
      description: 'Overview of visits and services by month',
      icon: Calendar,
      color: 'green',
    },
    {
      title: 'Billing Report',
      description: 'Detailed breakdown of billable items',
      icon: DollarSign,
      color: 'orange',
    },
    {
      title: 'Client Activity',
      description: 'Visit history per client',
      icon: FileText,
      color: 'cyan',
    },
  ];

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
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                </div>
                <span className="text-dark-400 text-sm">This Week</span>
              </div>
              <p className="text-2xl font-bold text-white">24 hrs</p>
              <p className="text-sm text-accent-green">+12% from last week</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-green/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent-green" />
                </div>
                <span className="text-dark-400 text-sm">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-white">$1,240</p>
              <p className="text-sm text-dark-400">This month</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-cyan/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent-cyan" />
                </div>
                <span className="text-dark-400 text-sm">Visits</span>
              </div>
              <p className="text-2xl font-bold text-white">18</p>
              <p className="text-sm text-dark-400">This month</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-accent-purple" />
                </div>
                <span className="text-dark-400 text-sm">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold text-white">1.5 hrs</p>
              <p className="text-sm text-dark-400">Per visit</p>
            </div>
          </div>

          {/* Report Types */}
          <h2 className="text-xl font-semibold text-white mb-4">Generate Reports</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {reportTypes.map((report, index) => (
              <div key={index} className="card card-hover p-6 cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-accent-${report.color}/20 rounded-xl flex items-center justify-center`}>
                    <report.icon className={`w-6 h-6 text-accent-${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{report.title}</h3>
                    <p className="text-dark-400 text-sm">{report.description}</p>
                  </div>
                  <button className="btn-secondary py-2 px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Chart Placeholder */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Weekly Activity</h3>
            <div className="h-64 flex items-center justify-center bg-dark-700/30 rounded-xl">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400">Charts coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
