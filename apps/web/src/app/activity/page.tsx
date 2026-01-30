'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Eye, Search, Filter, User, FileText, Calendar, Clock, Activity } from 'lucide-react';

const mockActivities = [
  { id: 1, user: 'Sarah Johnson', action: 'Created new client', target: 'Margaret Thompson', time: '2 minutes ago', type: 'create' },
  { id: 2, user: 'Mike Chen', action: 'Updated care plan', target: 'Robert Williams', time: '15 minutes ago', type: 'update' },
  { id: 3, user: 'Emily Rodriguez', action: 'Completed assessment', target: 'Eleanor Davis', time: '1 hour ago', type: 'complete' },
  { id: 4, user: 'David Kim', action: 'Generated contract', target: 'James Wilson', time: '2 hours ago', type: 'generate' },
  { id: 5, user: 'Sarah Johnson', action: 'Scheduled visit', target: 'Patricia Moore', time: '3 hours ago', type: 'schedule' },
  { id: 6, user: 'Mike Chen', action: 'Added team member', target: 'Jennifer Lee', time: '5 hours ago', type: 'create' },
  { id: 7, user: 'Emily Rodriguez', action: 'Updated billing', target: 'Charles Brown', time: 'Yesterday', type: 'update' },
  { id: 8, user: 'David Kim', action: 'Sent message', target: 'Dorothy Taylor', time: 'Yesterday', type: 'message' },
];

const typeConfig: Record<string, { color: string; bgColor: string }> = {
  create: { color: 'text-green-400', bgColor: 'bg-green-500/20' },
  update: { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  complete: { color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  generate: { color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  schedule: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  message: { color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
};

export default function ActivityPage() {
  const [activities] = useState(mockActivities);

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Activity Monitor</h1>
            <p className="text-dark-400">Track team actions and system activity</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
            Last 24 hours
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-primary-400" />
              <span className="text-dark-400 text-sm">Total Actions</span>
            </div>
            <p className="text-2xl font-bold text-white">156</p>
            <span className="text-xs text-green-400">+12% from yesterday</span>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-blue-400" />
              <span className="text-dark-400 text-sm">Active Users</span>
            </div>
            <p className="text-2xl font-bold text-white">8</p>
            <span className="text-xs text-dark-500">out of 12 team members</span>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="text-dark-400 text-sm">Documents Created</span>
            </div>
            <p className="text-2xl font-bold text-white">23</p>
            <span className="text-xs text-dark-500">contracts & care plans</span>
          </div>
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-dark-400 text-sm">Visits Scheduled</span>
            </div>
            <p className="text-2xl font-bold text-white">45</p>
            <span className="text-xs text-dark-500">for this week</span>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search activity..."
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-white transition-colors">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        {/* Activity Feed */}
        <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-dark-700/50">
            <h2 className="font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="divide-y divide-dark-700/30">
            {activities.map(activity => {
              const config = typeConfig[activity.type];
              return (
                <div key={activity.id} className="p-4 hover:bg-dark-700/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                      <span className={`font-medium text-sm ${config.color}`}>
                        {activity.user.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white">
                        <span className="font-medium">{activity.user}</span>
                        <span className="text-dark-400"> {activity.action} </span>
                        <span className="font-medium text-primary-400">{activity.target}</span>
                      </p>
                      <span className="text-sm text-dark-500">{activity.time}</span>
                    </div>
                    <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                      <Eye className="w-4 h-4 text-dark-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
