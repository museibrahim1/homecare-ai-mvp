'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { CalendarDays, Plus, Clock, MapPin, User } from 'lucide-react';

const mockAppointments = [
  { id: 1, title: 'Initial Assessment', client: 'Margaret Thompson', time: '9:00 AM', duration: '1 hour', location: '123 Oak St', type: 'assessment' },
  { id: 2, title: 'Care Plan Review', client: 'Robert Williams', time: '11:00 AM', duration: '45 min', location: '456 Pine Ave', type: 'review' },
  { id: 3, title: 'Family Meeting', client: 'Eleanor Davis', time: '2:00 PM', duration: '1.5 hours', location: 'Virtual', type: 'meeting' },
  { id: 4, title: 'Home Safety Check', client: 'James Wilson', time: '4:00 PM', duration: '1 hour', location: '789 Elm Blvd', type: 'assessment' },
];

const typeColors: Record<string, string> = {
  assessment: 'border-l-blue-500 bg-blue-500/5',
  review: 'border-l-green-500 bg-green-500/5',
  meeting: 'border-l-purple-500 bg-purple-500/5',
};

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = new Date();

export default function SchedulePage() {
  const [selectedDate] = useState(today);

  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Schedule</h1>
            <p className="text-dark-400">Manage your appointments and visits</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
            New Appointment
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="col-span-1">
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-white">January 2026</h2>
                <div className="flex gap-2">
                  <button className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors text-dark-400">&lt;</button>
                  <button className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors text-dark-400">&gt;</button>
                </div>
              </div>
              
              {/* Days of week */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {days.map(day => (
                  <div key={day} className="text-center text-xs text-dark-500 py-2">{day}</div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 3; // Start from previous month
                  const isToday = day === today.getDate();
                  const isCurrentMonth = day > 0 && day <= 31;
                  return (
                    <button
                      key={i}
                      className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${
                        isToday
                          ? 'bg-primary-500 text-white'
                          : isCurrentMonth
                          ? 'text-white hover:bg-dark-700'
                          : 'text-dark-600'
                      }`}
                    >
                      {isCurrentMonth ? day : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="col-span-2">
            <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-white">Today's Appointments</h2>
                <span className="text-sm text-dark-400">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>

              <div className="space-y-4">
                {mockAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className={`border-l-4 rounded-lg p-4 ${typeColors[apt.type]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-white">{apt.title}</h3>
                      <span className="text-sm text-dark-400">{apt.time}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {apt.client}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {apt.duration}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {apt.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
