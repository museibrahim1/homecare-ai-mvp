'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  HeartPulse, Clock, Users, Search, Filter, Plus, Check, X,
  ChevronDown, ChevronRight, Droplets, Shirt, Pill, UtensilsCrossed,
  Footprints, BedDouble, Stethoscope, Brain, Eye, MessageSquare,
  CalendarDays, User, MapPin, MoreHorizontal, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';

type ADLCategory = 'bathing' | 'dressing' | 'medication' | 'meals' | 'mobility' | 'toileting' | 'cognition' | 'vitals';
type LogStatus = 'completed' | 'refused' | 'assisted' | 'independent' | 'not_applicable';

interface ADLEntry {
  id: string;
  category: ADLCategory;
  status: LogStatus;
  notes: string;
  time: string;
}

interface VisitLog {
  id: string;
  clientName: string;
  clientId: string;
  caregiverName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  location: string;
  entries: ADLEntry[];
}

const ADL_CATEGORIES: Record<ADLCategory, { label: string; icon: typeof HeartPulse; color: string; bg: string; items: string[] }> = {
  bathing:    { label: 'Bathing & Hygiene', icon: Droplets,          color: 'text-blue-400',   bg: 'bg-blue-500/15',   items: ['Shower assist', 'Sponge bath', 'Hair washing', 'Oral care', 'Skin care'] },
  dressing:   { label: 'Dressing',          icon: Shirt,             color: 'text-purple-400', bg: 'bg-purple-500/15', items: ['Upper body', 'Lower body', 'Footwear', 'Outerwear'] },
  medication: { label: 'Medication',        icon: Pill,              color: 'text-red-400',    bg: 'bg-red-500/15',    items: ['Morning meds', 'Afternoon meds', 'Evening meds', 'PRN medication', 'Refill check'] },
  meals:      { label: 'Meals & Nutrition', icon: UtensilsCrossed,   color: 'text-amber-400',  bg: 'bg-amber-500/15',  items: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Fluid intake', 'Meal prep'] },
  mobility:   { label: 'Mobility',          icon: Footprints,        color: 'text-green-400',  bg: 'bg-green-500/15',  items: ['Transfer assist', 'Walking assist', 'Wheelchair', 'Range of motion', 'Fall prevention'] },
  toileting:  { label: 'Toileting',         icon: BedDouble,         color: 'text-teal-400',   bg: 'bg-teal-500/15',   items: ['Toilet assist', 'Incontinence care', 'Catheter care', 'Bowel program'] },
  cognition:  { label: 'Cognitive Support', icon: Brain,             color: 'text-indigo-400', bg: 'bg-indigo-500/15', items: ['Orientation', 'Memory exercises', 'Engagement', 'Supervision', 'Redirection'] },
  vitals:     { label: 'Vitals & Monitoring', icon: Stethoscope,     color: 'text-pink-400',   bg: 'bg-pink-500/15',   items: ['Blood pressure', 'Temperature', 'Pulse', 'Blood sugar', 'Weight', 'O2 saturation'] },
};

const STATUS_CONFIG: Record<LogStatus, { label: string; color: string; bg: string; icon: typeof Check }> = {
  completed:      { label: 'Completed',      color: 'text-green-400',  bg: 'bg-green-500/15',  icon: CheckCircle2 },
  assisted:       { label: 'Assisted',        color: 'text-blue-400',   bg: 'bg-blue-500/15',   icon: Users },
  independent:    { label: 'Independent',     color: 'text-teal-400',   bg: 'bg-teal-500/15',   icon: Check },
  refused:        { label: 'Refused',         color: 'text-red-400',    bg: 'bg-red-500/15',    icon: X },
  not_applicable: { label: 'N/A',             color: 'text-gray-400',   bg: 'bg-gray-500/15',   icon: MoreHorizontal },
};

const STORAGE_KEY = 'palmcare-adl-logs';

const DEMO_VISITS: VisitLog[] = [
  {
    id: 'v1', clientName: 'Margaret Johnson', clientId: 'c1', caregiverName: 'Sarah Miller',
    date: '2026-01-29', clockIn: '08:00 AM', clockOut: '12:00 PM', location: '123 Oak St, Miami FL',
    entries: [
      { id: 'e1', category: 'bathing', status: 'assisted', notes: 'Shower assist, client tolerated well', time: '08:15 AM' },
      { id: 'e2', category: 'medication', status: 'completed', notes: 'Morning meds administered on schedule', time: '08:45 AM' },
      { id: 'e3', category: 'meals', status: 'completed', notes: 'Breakfast: oatmeal, juice, toast. Good appetite', time: '09:00 AM' },
      { id: 'e4', category: 'mobility', status: 'assisted', notes: 'Walk in hallway with walker, 10 minutes', time: '10:00 AM' },
      { id: 'e5', category: 'vitals', status: 'completed', notes: 'BP: 128/82, Pulse: 72, Temp: 98.4°F', time: '10:30 AM' },
      { id: 'e6', category: 'dressing', status: 'assisted', notes: 'Help with buttons, chose own outfit', time: '08:30 AM' },
      { id: 'e7', category: 'cognition', status: 'completed', notes: 'Oriented x3, engaged in conversation', time: '11:00 AM' },
    ],
  },
  {
    id: 'v2', clientName: 'Robert Williams', clientId: 'c2', caregiverName: 'Maria Garcia',
    date: '2026-01-29', clockIn: '01:00 PM', clockOut: '05:00 PM', location: '456 Palm Ave, Miami FL',
    entries: [
      { id: 'e8', category: 'medication', status: 'completed', notes: 'Afternoon medications given, insulin administered', time: '01:30 PM' },
      { id: 'e9', category: 'meals', status: 'completed', notes: 'Lunch: chicken soup, crackers, water. Ate 75%', time: '02:00 PM' },
      { id: 'e10', category: 'vitals', status: 'completed', notes: 'BP: 135/88, Blood sugar: 142 mg/dL', time: '02:30 PM' },
      { id: 'e11', category: 'mobility', status: 'independent', notes: 'Client ambulated independently in home', time: '03:00 PM' },
      { id: 'e12', category: 'toileting', status: 'assisted', notes: 'Catheter care performed, no issues', time: '03:30 PM' },
    ],
  },
  {
    id: 'v3', clientName: 'Dorothy Chen', clientId: 'c3', caregiverName: 'Sarah Miller',
    date: '2026-01-28', clockIn: '09:00 AM', clockOut: '01:00 PM', location: '789 Maple Dr, Miami FL',
    entries: [
      { id: 'e13', category: 'bathing', status: 'assisted', notes: 'Sponge bath, skin intact, no redness', time: '09:15 AM' },
      { id: 'e14', category: 'dressing', status: 'assisted', notes: 'Full assist needed with upper/lower body', time: '09:45 AM' },
      { id: 'e15', category: 'medication', status: 'refused', notes: 'Client refused evening pain medication. MD notified', time: '10:00 AM' },
      { id: 'e16', category: 'meals', status: 'completed', notes: 'Breakfast: pureed food per diet order. Ate 100%', time: '10:30 AM' },
      { id: 'e17', category: 'cognition', status: 'completed', notes: 'Moderate confusion, reoriented x2', time: '11:00 AM' },
    ],
  },
];

export default function ADLLoggingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitLog | null>(null);
  const [filterDate, setFilterDate] = useState('2026-01-29');
  const [filterCaregiver, setFilterCaregiver] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newCategory, setNewCategory] = useState<ADLCategory>('bathing');
  const [newStatus, setNewStatus] = useState<LogStatus>('completed');
  const [newNotes, setNewNotes] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<ADLCategory>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setVisits(JSON.parse(saved));
    } else {
      setVisits(DEMO_VISITS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_VISITS));
    }
  }, []);

  useEffect(() => {
    if (visits.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  }, [visits]);

  const toggleCategory = useCallback((cat: ADLCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const filteredVisits = visits.filter(v => {
    if (filterDate && v.date !== filterDate) return false;
    if (filterCaregiver && !v.caregiverName.toLowerCase().includes(filterCaregiver.toLowerCase())) return false;
    if (searchTerm && !v.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const addEntry = () => {
    if (!selectedVisit) return;
    const entry: ADLEntry = {
      id: `e${Date.now()}`,
      category: newCategory,
      status: newStatus,
      notes: newNotes,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = visits.map(v =>
      v.id === selectedVisit.id ? { ...v, entries: [...v.entries, entry] } : v
    );
    setVisits(updated);
    setSelectedVisit({ ...selectedVisit, entries: [...selectedVisit.entries, entry] });
    setShowNewEntry(false);
    setNewNotes('');
  };

  const categorySummary = (entries: ADLEntry[]) => {
    const cats = Object.keys(ADL_CATEGORIES) as ADLCategory[];
    return cats.map(cat => {
      const catEntries = entries.filter(e => e.category === cat);
      return { category: cat, count: catEntries.length, entries: catEntries };
    }).filter(c => c.count > 0);
  };

  const totalStats = {
    totalVisits: filteredVisits.length,
    totalEntries: filteredVisits.reduce((s, v) => s + v.entries.length, 0),
    completedRate: filteredVisits.length > 0
      ? Math.round(filteredVisits.reduce((s, v) => s + v.entries.filter(e => e.status === 'completed' || e.status === 'independent').length, 0)
        / Math.max(1, filteredVisits.reduce((s, v) => s + v.entries.length, 0)) * 100)
      : 0,
    refusedCount: filteredVisits.reduce((s, v) => s + v.entries.filter(e => e.status === 'refused').length, 0),
  };

  if (authLoading) return <div className="flex items-center justify-center h-screen bg-dark-900"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <HeartPulse className="w-7 h-7 text-primary-400" />
                ADL & Care Logging
              </h1>
              <p className="text-dark-400 mt-1">Track Activities of Daily Living per caregiver visit</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Visits Today', value: totalStats.totalVisits, icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/15' },
              { label: 'ADL Entries', value: totalStats.totalEntries, icon: HeartPulse, color: 'text-green-400', bg: 'bg-green-500/15' },
              { label: 'Completion Rate', value: `${totalStats.completedRate}%`, icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-500/15' },
              { label: 'Refusals', value: totalStats.refusedCount, icon: AlertCircle, color: totalStats.refusedCount > 0 ? 'text-red-400' : 'text-gray-400', bg: totalStats.refusedCount > 0 ? 'bg-red-500/15' : 'bg-gray-500/15' },
            ].map((stat, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <span className="text-dark-400 text-sm">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-primary-500"
              />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Visit List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-dark-400 uppercase tracking-wider">Visit Logs</h2>
              {filteredVisits.length === 0 ? (
                <div className="card p-8 text-center">
                  <CalendarDays className="w-10 h-10 text-dark-500 mx-auto mb-3" />
                  <p className="text-dark-400">No visits found for this date</p>
                </div>
              ) : filteredVisits.map(visit => (
                <button
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit)}
                  className={`w-full text-left card p-4 transition hover:border-primary-500/50 ${selectedVisit?.id === visit.id ? 'border-primary-500 bg-primary-500/5' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{visit.clientName}</span>
                    <span className="text-xs text-dark-400">{visit.entries.length} ADLs</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-dark-400 mb-2">
                    <User className="w-3 h-3" /> {visit.caregiverName}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-dark-400 mb-3">
                    <Clock className="w-3 h-3" /> {visit.clockIn} — {visit.clockOut || 'Active'}
                    <MapPin className="w-3 h-3 ml-2" /> {visit.location.split(',')[0]}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categorySummary(visit.entries).map(cs => {
                      const cfg = ADL_CATEGORIES[cs.category];
                      const Icon = cfg.icon;
                      return (
                        <span key={cs.category} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cs.count}
                        </span>
                      );
                    })}
                  </div>
                </button>
              ))}
            </div>

            {/* Detail View */}
            <div className="lg:col-span-2">
              {!selectedVisit ? (
                <div className="card p-12 text-center">
                  <HeartPulse className="w-12 h-12 text-dark-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Select a Visit</h3>
                  <p className="text-dark-400">Click on a visit log to view and manage ADL entries</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Visit Header */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-white">{selectedVisit.clientName}</h2>
                        <div className="flex items-center gap-4 text-sm text-dark-400 mt-1">
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {selectedVisit.caregiverName}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedVisit.clockIn} — {selectedVisit.clockOut || 'Active'}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedVisit.location}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowNewEntry(!showNewEntry)}
                        className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Log ADL
                      </button>
                    </div>

                    {/* ADL Completion Bar */}
                    <div className="flex gap-1 mt-2">
                      {(Object.keys(ADL_CATEGORIES) as ADLCategory[]).map(cat => {
                        const has = selectedVisit.entries.some(e => e.category === cat);
                        const cfg = ADL_CATEGORIES[cat];
                        return (
                          <div
                            key={cat}
                            className={`flex-1 h-2 rounded-full ${has ? cfg.bg.replace('/15', '/60') : 'bg-dark-700'}`}
                            title={`${cfg.label}: ${has ? 'Logged' : 'Not logged'}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-dark-500">
                      {(Object.keys(ADL_CATEGORIES) as ADLCategory[]).map(cat => (
                        <span key={cat}>{ADL_CATEGORIES[cat].label.split(' ')[0]}</span>
                      ))}
                    </div>
                  </div>

                  {/* New Entry Form */}
                  {showNewEntry && (
                    <div className="card p-4 border-primary-500/50">
                      <h3 className="text-sm font-semibold text-white mb-3">New ADL Entry</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-dark-400 mb-1 block">Category</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(Object.keys(ADL_CATEGORIES) as ADLCategory[]).map(cat => {
                              const cfg = ADL_CATEGORIES[cat];
                              const Icon = cfg.icon;
                              return (
                                <button
                                  key={cat}
                                  onClick={() => setNewCategory(cat)}
                                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition ${
                                    newCategory === cat ? `${cfg.bg} ${cfg.color} border-current` : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span className="truncate w-full text-center">{cfg.label.split(' ')[0]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-dark-400 mb-1 block">Status</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(Object.keys(STATUS_CONFIG) as LogStatus[]).map(s => {
                              const cfg = STATUS_CONFIG[s];
                              return (
                                <button
                                  key={s}
                                  onClick={() => setNewStatus(s)}
                                  className={`flex items-center gap-1 p-2 rounded-lg border text-xs transition ${
                                    newStatus === s ? `${cfg.bg} ${cfg.color} border-current` : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                  }`}
                                >
                                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Quick-tap items */}
                      <div className="mb-3">
                        <label className="text-xs text-dark-400 mb-1 block">Quick Select</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ADL_CATEGORIES[newCategory].items.map(item => (
                            <button
                              key={item}
                              onClick={() => setNewNotes(prev => prev ? `${prev}, ${item}` : item)}
                              className="px-2.5 py-1 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-full text-xs text-dark-300 transition"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="text-xs text-dark-400 mb-1 block">Notes</label>
                        <textarea
                          value={newNotes}
                          onChange={e => setNewNotes(e.target.value)}
                          placeholder="Add details..."
                          rows={2}
                          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm placeholder:text-dark-500 focus:outline-none focus:border-primary-500 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addEntry} className="btn-primary py-2 px-4 text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Save Entry</button>
                        <button onClick={() => setShowNewEntry(false)} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* ADL Entries by Category */}
                  <div className="space-y-3">
                    {categorySummary(selectedVisit.entries).map(({ category, entries }) => {
                      const cfg = ADL_CATEGORIES[category];
                      const Icon = cfg.icon;
                      const expanded = expandedCategories.has(category);
                      return (
                        <div key={category} className="card overflow-hidden">
                          <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between p-4 hover:bg-dark-750 transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${cfg.color}`} />
                              </div>
                              <div className="text-left">
                                <span className="text-white font-medium">{cfg.label}</span>
                                <span className="text-dark-400 text-xs ml-2">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {entries.map(e => {
                                const sc = STATUS_CONFIG[e.status];
                                return <span key={e.id} className={`w-2 h-2 rounded-full ${sc.bg.replace('/15', '')}`} title={sc.label} />;
                              })}
                              {expanded ? <ChevronDown className="w-4 h-4 text-dark-400" /> : <ChevronRight className="w-4 h-4 text-dark-400" />}
                            </div>
                          </button>
                          {expanded && (
                            <div className="border-t border-dark-700">
                              {entries.map(entry => {
                                const sc = STATUS_CONFIG[entry.status];
                                return (
                                  <div key={entry.id} className="flex items-start gap-3 p-4 border-b border-dark-700/50 last:border-0">
                                    <div className={`mt-0.5 w-6 h-6 rounded-full ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                                      <sc.icon className={`w-3.5 h-3.5 ${sc.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                                        <span className="text-xs text-dark-500">{entry.time}</span>
                                      </div>
                                      <p className="text-sm text-dark-300">{entry.notes}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
