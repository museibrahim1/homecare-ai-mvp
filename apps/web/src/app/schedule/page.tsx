'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { CalendarDays, Plus, Clock, MapPin, User, X, Link2, Check, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatLocalDate } from '@/lib/api';

type Appointment = {
  id: number;
  title: string;
  client: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  type: 'assessment' | 'review' | 'meeting' | 'visit';
  notes: string;
  googleEventId?: string;
};

const typeColors: Record<string, string> = {
  assessment: 'border-l-blue-500 bg-blue-500/5',
  review: 'border-l-green-500 bg-green-500/5',
  meeting: 'border-l-purple-500 bg-purple-500/5',
  visit: 'border-l-orange-500 bg-orange-500/5',
};

const typeLabels: Record<string, string> = {
  assessment: 'Assessment',
  review: 'Care Review',
  meeting: 'Meeting',
  visit: 'Home Visit',
};

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// No demo data - users start with an empty schedule
const initialAppointments: Appointment[] = [];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Inner component that handles OAuth callback
function OAuthHandler({ 
  token, 
  onConnected 
}: { 
  token: string | null; 
  onConnected: () => void;
}) {
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      alert('Failed to connect Google Calendar: ' + error);
      window.history.replaceState({}, '', '/schedule');
      return;
    }
    
    if (code && token && !processing) {
      setProcessing(true);
      const connectGoogle = async () => {
        try {
          const response = await fetch(`${API_URL}/calendar/connect`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              redirect_uri: `${window.location.origin}/schedule`,
            }),
          });
          
          if (response.ok) {
            onConnected();
          } else {
            const data = await response.json();
            alert('Failed to connect: ' + (data.detail || 'Unknown error'));
          }
        } catch (error) {
          console.error('Failed to connect Google:', error);
          alert('Failed to connect Google Calendar');
        }
        window.history.replaceState({}, '', '/schedule');
        setProcessing(false);
      };
      
      connectGoogle();
    }
  }, [searchParams, token, onConnected, processing]);

  if (processing) {
    return (
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="text-blue-400">Connecting to Google Calendar...</span>
      </div>
    );
  }

  return null;
}

function ScheduleContent() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    client: '',
    date: formatLocalDate(new Date()),
    time: '09:00',
    duration: '1 hour',
    location: '',
    type: 'assessment' as const,
    notes: '',
  });

  // Check Google Calendar connection status
  useEffect(() => {
    const checkGoogleStatus = async () => {
      if (!token) {
        setCheckingStatus(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/calendar/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setGoogleConnected(data.connected);
        }
      } catch (error) {
        console.error('Failed to check Google status:', error);
      }
      setCheckingStatus(false);
    };

    checkGoogleStatus();
  }, [token]);

  const todayAppointments = appointments.filter(apt => apt.date === formatLocalDate(selectedDate));

  const getDurationMinutes = (duration: string): number => {
    if (duration.includes('1.5')) return 90;
    if (duration.includes('2')) return 120;
    if (duration.includes('45')) return 45;
    if (duration.includes('30')) return 30;
    return 60;
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.title || !newAppointment.client) return;
    
    const appointment: Appointment = {
      id: Date.now(),
      ...newAppointment,
    };

    if (googleConnected && token) {
      setSyncing(true);
      try {
        const startDateTime = `${newAppointment.date}T${newAppointment.time}:00`;
        const durationMinutes = getDurationMinutes(newAppointment.duration);
        const startDate = new Date(startDateTime);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        
        const response = await fetch(`${API_URL}/calendar/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `${newAppointment.title} - ${newAppointment.client}`,
            description: newAppointment.notes,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            location: newAppointment.location,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          appointment.googleEventId = data.event_id;
        }
      } catch (error) {
        console.error('Failed to sync with Google Calendar:', error);
      }
      setSyncing(false);
    }

    setAppointments([...appointments, appointment]);
    setNewAppointment({
      title: '',
      client: '',
      date: formatLocalDate(new Date()),
      time: '09:00',
      duration: '1 hour',
      location: '',
      type: 'assessment',
      notes: '',
    });
    setShowAddModal(false);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setEditingAppointment(apt);
    setShowEditModal(true);
  };

  const handleUpdateAppointment = async () => {
    if (!editingAppointment) return;
    
    setSyncing(true);
    
    // Update in Google Calendar if connected and has googleEventId
    if (googleConnected && token && editingAppointment.googleEventId) {
      try {
        const startDateTime = `${editingAppointment.date}T${editingAppointment.time}:00`;
        const durationMinutes = getDurationMinutes(editingAppointment.duration);
        const startDate = new Date(startDateTime);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        
        await fetch(`${API_URL}/calendar/events`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_id: editingAppointment.googleEventId,
            title: `${editingAppointment.title} - ${editingAppointment.client}`,
            description: editingAppointment.notes,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            location: editingAppointment.location,
          }),
        });
      } catch (error) {
        console.error('Failed to update Google Calendar:', error);
      }
    }
    
    // Update local state
    setAppointments(appointments.map(apt => 
      apt.id === editingAppointment.id ? editingAppointment : apt
    ));
    
    setSyncing(false);
    setShowEditModal(false);
    setEditingAppointment(null);
  };

  const handleDeleteAppointment = async (apt: Appointment) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    setDeleting(apt.id);
    
    // Delete from Google Calendar if connected and has googleEventId
    if (googleConnected && token && apt.googleEventId) {
      try {
        await fetch(`${API_URL}/calendar/events/${apt.googleEventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Failed to delete from Google Calendar:', error);
      }
    }
    
    // Remove from local state
    setAppointments(appointments.filter(a => a.id !== apt.id));
    setDeleting(null);
  };

  const handleConnectGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      alert('Google Calendar is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to environment variables.');
      return;
    }

    const redirectUri = `${window.location.origin}/schedule`;
    // Request all Google scopes so the token works for Calendar, Drive, and Gmail
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleDisconnectGoogle = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/calendar/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setGoogleConnected(false);
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
    setShowConnectModal(false);
  };

  const handleSyncNow = async () => {
    if (!token) return;
    
    setSyncing(true);
    try {
      const response = await fetch(`${API_URL}/calendar/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const googleEvents = data.events || [];
        
        // Convert Google events to our appointment format
        const syncedAppointments: Appointment[] = googleEvents.map((event: any, index: number) => {
          const start = event.start?.dateTime || event.start?.date || '';
          const end = event.end?.dateTime || event.end?.date || '';
          
          // Parse date and time
          let dateStr = '';
          let timeStr = '09:00';
          let duration = '1 hour';
          
          if (start) {
            const startDate = new Date(start);
            dateStr = formatLocalDate(startDate);
            timeStr = startDate.toTimeString().slice(0, 5);
            
            if (end) {
              const endDate = new Date(end);
              const durationMs = endDate.getTime() - startDate.getTime();
              const durationMins = Math.round(durationMs / 60000);
              
              if (durationMins <= 30) duration = '30 min';
              else if (durationMins <= 45) duration = '45 min';
              else if (durationMins <= 60) duration = '1 hour';
              else if (durationMins <= 90) duration = '1.5 hours';
              else duration = '2 hours';
            }
          }
          
          // Parse title to extract client name if in format "Title - Client"
          const titleParts = (event.summary || 'Untitled Event').split(' - ');
          const title = titleParts[0];
          const client = titleParts[1] || 'Unknown Client';
          
          return {
            id: Date.now() + index,
            title,
            client,
            date: dateStr,
            time: timeStr,
            duration,
            location: event.location || '',
            type: event.summary?.toLowerCase().includes('assessment') ? 'assessment' as const :
                  event.summary?.toLowerCase().includes('review') ? 'review' as const :
                  event.summary?.toLowerCase().includes('meeting') ? 'meeting' as const : 'visit' as const,
            notes: event.description || '',
            googleEventId: event.id,
          };
        });
        
        // Merge with existing appointments (keep local ones without google IDs)
        const localOnly = appointments.filter(a => !a.googleEventId);
        setAppointments([...localOnly, ...syncedAppointments]);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
    setSyncing(false);
  };
  
  // Auto-load calendar events when connected
  useEffect(() => {
    if (googleConnected && token && !checkingStatus) {
      handleSyncNow();
    }
  }, [googleConnected, checkingStatus]);

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
    }
    return calendarDays;
  };

  return (
    <>
      {/* OAuth Handler - wrapped in Suspense at page level */}
      <Suspense fallback={null}>
        <OAuthHandler token={token} onConnected={() => setGoogleConnected(true)} />
      </Suspense>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Schedule</h1>
          <p className="text-dark-400">Manage your appointments and visits</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowConnectModal(true)}
            disabled={checkingStatus}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              googleConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-white'
            }`}
          >
            {checkingStatus ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : googleConnected ? (
              <Check className="w-5 h-5" />
            ) : (
              <Link2 className="w-5 h-5" />
            )}
            {googleConnected ? 'Google Connected' : 'Connect Google'}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Google Calendar Sync Status */}
      {googleConnected && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">Google Calendar Connected</p>
              <p className="text-sm text-dark-400">Events sync automatically with your Google Calendar</p>
            </div>
          </div>
          <button 
            onClick={handleSyncNow}
            disabled={syncing}
            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {syncing && <Loader2 className="w-4 h-4 animate-spin" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="col-span-1">
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-white">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                  className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors text-dark-400"
                >
                  &lt;
                </button>
                <button 
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                  className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors text-dark-400"
                >
                  &gt;
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {days.map(day => (
                <div key={day} className="text-center text-xs text-dark-500 py-2">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, i) => {
                const isToday = day === new Date().getDate() && 
                  selectedDate.getMonth() === new Date().getMonth() &&
                  selectedDate.getFullYear() === new Date().getFullYear();
                const isSelected = day === selectedDate.getDate();
                const dateStr = day ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                const hasAppointments = day && appointments.some(a => a.date === dateStr);
                
                return (
                  <button
                    key={i}
                    onClick={() => day && setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                    disabled={!day}
                    className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-colors relative ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : isToday
                        ? 'bg-primary-500/20 text-primary-400'
                        : day
                        ? 'text-white hover:bg-dark-700'
                        : 'text-dark-700'
                    }`}
                  >
                    {day}
                    {hasAppointments && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-400" />
                    )}
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
              <h2 className="font-semibold text-white">Appointments</h2>
              <span className="text-sm text-dark-400">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">No appointments scheduled for this day</p>
                <button 
                  onClick={() => {
                    setNewAppointment({ ...newAppointment, date: formatLocalDate(selectedDate) });
                    setShowAddModal(true);
                  }}
                  className="mt-4 text-primary-400 hover:text-primary-300 text-sm"
                >
                  + Add an appointment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className={`border-l-4 rounded-lg p-4 ${typeColors[apt.type]} group`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-dark-500 uppercase">{typeLabels[apt.type]}</span>
                        <h3 className="font-medium text-white">{apt.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-dark-400">{apt.time}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditAppointment(apt)}
                            className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-dark-400 hover:text-white" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(apt)}
                            disabled={deleting === apt.id}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            {deleting === apt.id ? (
                              <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-dark-400 hover:text-red-400" />
                            )}
                          </button>
                        </div>
                      </div>
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
                        {apt.location || 'No location'}
                      </div>
                    </div>
                    {apt.googleEventId && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
                        <Check className="w-3 h-3" />
                        Synced to Google Calendar
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">New Appointment</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                  placeholder="e.g., Initial Assessment"
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Client *</label>
                <input
                  type="text"
                  value={newAppointment.client}
                  onChange={(e) => setNewAppointment({ ...newAppointment, client: e.target.value })}
                  placeholder="Client name"
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Time</label>
                  <input
                    type="time"
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Duration</label>
                  <select
                    value={newAppointment.duration}
                    onChange={(e) => setNewAppointment({ ...newAppointment, duration: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  >
                    <option value="30 min">30 minutes</option>
                    <option value="45 min">45 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Type</label>
                  <select
                    value={newAppointment.type}
                    onChange={(e) => setNewAppointment({ ...newAppointment, type: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  >
                    <option value="assessment">Assessment</option>
                    <option value="review">Care Review</option>
                    <option value="meeting">Meeting</option>
                    <option value="visit">Home Visit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Location</label>
                <input
                  type="text"
                  value={newAppointment.location}
                  onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
                  placeholder="Address or 'Virtual'"
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Notes</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>
              {googleConnected && (
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
                  <Check className="w-4 h-4" />
                  Will sync to Google Calendar
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAppointment}
                disabled={syncing}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing && <Loader2 className="w-4 h-4 animate-spin" />}
                {syncing ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Appointment</h2>
              <button onClick={() => { setShowEditModal(false); setEditingAppointment(null); }} className="p-2 hover:bg-dark-700 rounded-lg">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={editingAppointment.title}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Client *</label>
                <input
                  type="text"
                  value={editingAppointment.client}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, client: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={editingAppointment.date}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Time</label>
                  <input
                    type="time"
                    value={editingAppointment.time}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, time: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Duration</label>
                  <select
                    value={editingAppointment.duration}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, duration: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  >
                    <option value="30 min">30 minutes</option>
                    <option value="45 min">45 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Type</label>
                  <select
                    value={editingAppointment.type}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, type: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                  >
                    <option value="assessment">Assessment</option>
                    <option value="review">Care Review</option>
                    <option value="meeting">Meeting</option>
                    <option value="visit">Home Visit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Location</label>
                <input
                  type="text"
                  value={editingAppointment.location}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, location: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Notes</label>
                <textarea
                  value={editingAppointment.notes}
                  onChange={(e) => setEditingAppointment({ ...editingAppointment, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>
              {googleConnected && editingAppointment.googleEventId && (
                <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
                  <Check className="w-4 h-4" />
                  Changes will sync to Google Calendar
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowEditModal(false); setEditingAppointment(null); }}
                className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAppointment}
                disabled={syncing}
                className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing && <Loader2 className="w-4 h-4 animate-spin" />}
                {syncing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Google Calendar Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Google Calendar</h2>
              <button onClick={() => setShowConnectModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            
            {googleConnected ? (
              <div>
                <div className="flex items-center gap-3 mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Check className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Connected</p>
                    <p className="text-sm text-dark-400">Your calendar is syncing</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                    <span className="text-dark-300">Auto-sync new appointments</span>
                    <span className="text-green-400 text-sm">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                    <span className="text-dark-300">Import from Google</span>
                    <span className="text-green-400 text-sm">Enabled</span>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectGoogle}
                  className="w-full mt-6 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Disconnect Google Calendar
                </button>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-dark-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="w-8 h-8 text-primary-400" />
                  </div>
                  <p className="text-dark-300 mb-2">
                    Connect your Google Calendar to sync appointments automatically
                  </p>
                  <ul className="text-sm text-dark-400 space-y-1">
                    <li>• New appointments sync to Google Calendar</li>
                    <li>• Changes in Google reflect here</li>
                    <li>• Get reminders on all your devices</li>
                  </ul>
                </div>
                <button
                  onClick={handleConnectGoogle}
                  className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
                <p className="text-xs text-dark-500 text-center mt-4">
                  We only access your calendar data. We never read your emails.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function SchedulePage() {
  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        }>
          <ScheduleContent />
        </Suspense>
      </main>
    </div>
  );
}
