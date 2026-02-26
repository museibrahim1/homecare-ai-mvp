'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  Plus, X, Search, FileText, Check, Loader2, Sparkles, Pin, PinOff,
  Clock, AlertCircle, CheckCircle2, Circle, Trash2, Bell, BellOff, Tag,
  ChevronRight, Calendar, Flag, MoreHorizontal, ListTodo
} from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { api } from '@/lib/api';

/* ─── Types ─── */
interface SmartNote {
  id: string;
  title: string;
  content: string;
  ai_summary: string | null;
  tags: string[];
  is_pinned: boolean;
  color: string;
  related_client_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  tasks?: TaskItem[];
  reminders?: ReminderItem[];
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  smart_note_id: string | null;
  created_at: string;
}

interface ReminderItem {
  id: string;
  title: string;
  description: string | null;
  remind_at: string;
  is_dismissed: boolean;
  reminder_type: string;
  notification_sent: boolean;
  smart_note_id: string | null;
}

/* ─── Config ─── */
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50' },
  high:   { label: 'High',   color: 'text-orange-600', bg: 'bg-orange-50' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50' },
  low:    { label: 'Low',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const TAG_OPTIONS = ['meeting', 'call', 'idea', 'follow-up', 'important', 'personal'];

const NOTE_COLORS: Record<string, string> = {
  default: 'border-l-dark-600',
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  purple: 'border-l-purple-500',
  orange: 'border-l-orange-500',
  red: 'border-l-red-500',
};

/* ─── Helpers ─── */
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function isDueOrOverdue(dateStr: string | null): 'overdue' | 'today' | 'upcoming' | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  const diff = due.getTime() - today.getTime();
  if (diff < 0) return 'overdue';
  if (diff < 86400000) return 'today';
  if (diff < 86400000 * 3) return 'upcoming';
  return null;
}

/* ─── Main Page ─── */
export default function NotesPage() {
  const { token, isReady } = useRequireAuth();
  const [notes, setNotes] = useState<SmartNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<SmartNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderAt, setNewReminderAt] = useState('');
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const INPUT = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

  // ─── Data Loading ───

  const loadNotes = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getNotes(token, { search: searchQuery || undefined, tag: tagFilter || undefined });
      setNotes(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, searchQuery, tagFilter]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const loadNoteDetail = useCallback(async (noteId: string) => {
    if (!token) return;
    try {
      const detail = await api.getSmartNote(token, noteId);
      setSelectedNote(detail);
      setEditTitle(detail.title);
      setEditContent(detail.content);
      setEditTags(detail.tags || []);
      setTasks(detail.tasks || []);
      setReminders(detail.reminders || []);
    } catch { /* ignore */ }
  }, [token]);

  // ─── Auto-save on content change (debounced) ───

  const handleContentChange = useCallback((content: string) => {
    setEditContent(content);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!token || !selectedNote) return;
      setSaving(true);
      try {
        await api.updateSmartNote(token, selectedNote.id, { content, title: editTitle, tags: editTags });
        loadNotes();
      } catch { /* ignore */ }
      setSaving(false);
    }, 1000);
  }, [token, selectedNote, editTitle, editTags, loadNotes]);

  const handleTitleChange = useCallback((title: string) => {
    setEditTitle(title);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!token || !selectedNote) return;
      setSaving(true);
      try {
        await api.updateSmartNote(token, selectedNote.id, { title, content: editContent, tags: editTags });
        loadNotes();
      } catch { /* ignore */ }
      setSaving(false);
    }, 1000);
  }, [token, selectedNote, editContent, editTags, loadNotes]);

  // ─── CRUD ───

  const handleCreateNote = async () => {
    if (!token || !newTitle.trim()) return;
    try {
      const note = await api.createNote(token, { title: newTitle.trim(), content: '' }, false);
      setShowNewNote(false);
      setNewTitle('');
      await loadNotes();
      loadNoteDetail(note.id);
    } catch { /* ignore */ }
  };

  const handleDeleteNote = async () => {
    if (!token || !selectedNote) return;
    try {
      await api.deleteNote(token, selectedNote.id);
      setSelectedNote(null);
      setTasks([]);
      setReminders([]);
      loadNotes();
    } catch { /* ignore */ }
  };

  const handleTogglePin = async () => {
    if (!token || !selectedNote) return;
    try {
      await api.updateSmartNote(token, selectedNote.id, { is_pinned: !selectedNote.is_pinned });
      setSelectedNote({ ...selectedNote, is_pinned: !selectedNote.is_pinned });
      loadNotes();
    } catch { /* ignore */ }
  };

  const handleExtractTasks = async () => {
    if (!token || !selectedNote) return;
    setExtracting(true);
    try {
      // Save current content first
      await api.updateSmartNote(token, selectedNote.id, { title: editTitle, content: editContent, tags: editTags });
      const result = await api.extractTasksFromNote(token, selectedNote.id);
      await loadNoteDetail(selectedNote.id);
      loadNotes();
    } catch { /* ignore */ }
    setExtracting(false);
  };

  const handleToggleTag = async (tag: string) => {
    if (!token || !selectedNote) return;
    const newTags = editTags.includes(tag) ? editTags.filter(t => t !== tag) : [...editTags, tag];
    setEditTags(newTags);
    try {
      await api.updateSmartNote(token, selectedNote.id, { tags: newTags });
      loadNotes();
    } catch { /* ignore */ }
  };

  // ─── Task actions ───

  const handleAddTask = async () => {
    if (!token || !selectedNote || !newTaskTitle.trim()) return;
    try {
      await api.createTask(token, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        due_date: newTaskDue || null,
        smart_note_id: selectedNote.id,
      });
      setNewTaskTitle('');
      setNewTaskDue('');
      setNewTaskPriority('medium');
      setShowAddTask(false);
      loadNoteDetail(selectedNote.id);
    } catch { /* ignore */ }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!token) return;
    try {
      await api.completeTask(token, taskId);
      if (selectedNote) loadNoteDetail(selectedNote.id);
    } catch { /* ignore */ }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!token) return;
    try {
      await api.deleteTask(token, taskId);
      if (selectedNote) loadNoteDetail(selectedNote.id);
    } catch { /* ignore */ }
  };

  // ─── Reminder actions ───

  const handleAddReminder = async () => {
    if (!token || !selectedNote || !newReminderTitle.trim() || !newReminderAt) return;
    try {
      await api.createReminder(token, {
        title: newReminderTitle.trim(),
        remind_at: new Date(newReminderAt).toISOString(),
        smart_note_id: selectedNote.id,
      });
      setNewReminderTitle('');
      setNewReminderAt('');
      setShowAddReminder(false);
      loadNoteDetail(selectedNote.id);
    } catch { /* ignore */ }
  };

  const handleDismissReminder = async (reminderId: string) => {
    if (!token) return;
    try {
      await api.dismissReminder(token, reminderId);
      if (selectedNote) loadNoteDetail(selectedNote.id);
    } catch { /* ignore */ }
  };

  // ─── Filtered Notes ───

  const filteredNotes = useMemo(() => {
    return notes;
  }, [notes]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 flex overflow-hidden">

          {/* ─── Left Panel: Note List ─── */}
          <div className="w-80 xl:w-96 border-r border-slate-200 flex flex-col bg-dark-850 shrink-0">
            {/* List header */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-400" />
                  Notes & Tasks
                </h2>
                <button
                  onClick={() => setShowNewNote(true)}
                  className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                  title="New Note"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Tag filter chips */}
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      tagFilter === tag
                        ? 'bg-primary-50 text-primary-400 border border-primary-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Note list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No notes yet</p>
                  <button
                    onClick={() => setShowNewNote(true)}
                    className="mt-3 text-primary-400 text-sm hover:text-primary-300"
                  >
                    Create your first note
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/30">
                  {filteredNotes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => loadNoteDetail(note.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50/30 transition-colors border-l-[3px] ${
                        selectedNote?.id === note.id
                          ? `bg-slate-50/40 ${NOTE_COLORS[note.color] || NOTE_COLORS.default}`
                          : `${NOTE_COLORS[note.color] || NOTE_COLORS.default}`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {note.is_pinned && <Pin className="w-3 h-3 text-amber-600 shrink-0" />}
                            <p className="text-sm font-medium text-slate-900 truncate">{note.title}</p>
                          </div>
                          {note.ai_summary && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{note.ai_summary}</p>
                          )}
                          {!note.ai_summary && note.content && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{note.content.slice(0, 100)}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                          {timeAgo(note.updated_at)}
                        </span>
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {note.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Right Panel: Editor + Tasks ─── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {!selectedNote ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">Select a note or create a new one</p>
                </div>
              </div>
            ) : (
              <>
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {saving ? (
                        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
                      ) : (
                        'Saved'
                      )}
                    </span>
                    {selectedNote.source !== 'manual' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{selectedNote.source}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleExtractTasks}
                      disabled={extracting}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-500/25 text-purple-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      title="AI Extract Tasks"
                    >
                      {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      AI Extract
                    </button>
                    <button onClick={handleTogglePin} className="p-1.5 text-slate-500 hover:text-amber-600 transition-colors rounded-lg hover:bg-slate-100" title={selectedNote.is_pinned ? 'Unpin' : 'Pin'}>
                      {selectedNote.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <div className="relative">
                      <button onClick={() => setShowTagPicker(!showTagPicker)} className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100" title="Tags">
                        <Tag className="w-4 h-4" />
                      </button>
                      {showTagPicker && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-20 min-w-[140px]">
                          {TAG_OPTIONS.map(tag => (
                            <button
                              key={tag}
                              onClick={() => handleToggleTag(tag)}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center gap-2 ${
                                editTags.includes(tag) ? 'text-primary-400 bg-primary-50' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {editTags.includes(tag) && <Check className="w-3 h-3" />}
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={handleDeleteNote} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Delete note">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Editor area */}
                <div className="flex-1 overflow-y-auto">
                  <div className="max-w-3xl mx-auto p-6 space-y-4">
                    {/* Title */}
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => handleTitleChange(e.target.value)}
                      className="w-full text-2xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder-dark-500"
                      placeholder="Note title..."
                    />

                    {/* AI Summary */}
                    {selectedNote.ai_summary && (
                      <div className="flex items-start gap-2 px-3 py-2.5 bg-purple-50 border border-purple-500/20 rounded-lg">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-300">{selectedNote.ai_summary}</p>
                      </div>
                    )}

                    {/* Tags display */}
                    {editTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {editTags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-400 border border-primary-500/20 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <textarea
                      value={editContent}
                      onChange={e => handleContentChange(e.target.value)}
                      className="w-full min-h-[200px] text-sm text-slate-700 bg-transparent border-none outline-none resize-none placeholder-dark-500 leading-relaxed"
                      placeholder="Start writing your note..."
                    />

                    {/* ─── Tasks Section ─── */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <ListTodo className="w-4 h-4 text-blue-600" />
                          Tasks
                          {tasks.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded-full">
                              {tasks.filter(t => t.status !== 'done').length} open
                            </span>
                          )}
                        </h3>
                        <button
                          onClick={() => setShowAddTask(!showAddTask)}
                          className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Task
                        </button>
                      </div>

                      {/* Add task form */}
                      {showAddTask && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 space-y-2">
                          <input
                            type="text"
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            placeholder="Task description..."
                            className={INPUT}
                            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                          />
                          <div className="flex items-center gap-2">
                            <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                            <input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500" />
                            <div className="flex-1" />
                            <button onClick={() => setShowAddTask(false)} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900">Cancel</button>
                            <button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="px-3 py-1 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded disabled:opacity-50">Add</button>
                          </div>
                        </div>
                      )}

                      {/* Task list */}
                      <div className="space-y-1">
                        {tasks.map(task => {
                          const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                          const dueStatus = isDueOrOverdue(task.due_date);
                          const isDone = task.status === 'done';

                          return (
                            <div key={task.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50/20 transition-colors group ${isDone ? 'opacity-50' : ''}`}>
                              <button onClick={() => !isDone && handleCompleteTask(task.id)} className="shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-400 hover:text-primary-400 transition-colors" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>{task.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[9px] px-1 py-0.5 rounded ${pCfg.bg} ${pCfg.color}`}>{pCfg.label}</span>
                                  {task.due_date && (
                                    <span className={`text-[9px] flex items-center gap-0.5 ${
                                      dueStatus === 'overdue' ? 'text-red-600' :
                                      dueStatus === 'today' ? 'text-amber-600' : 'text-slate-400'
                                    }`}>
                                      <Calendar className="w-2.5 h-2.5" />
                                      {task.due_date}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        {tasks.length === 0 && !showAddTask && (
                          <p className="text-xs text-slate-400 py-2 px-3">No tasks linked to this note</p>
                        )}
                      </div>
                    </div>

                    {/* ─── Reminders Section ─── */}
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-600" />
                          Reminders
                        </h3>
                        <button
                          onClick={() => setShowAddReminder(!showAddReminder)}
                          className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Reminder
                        </button>
                      </div>

                      {/* Add reminder form */}
                      {showAddReminder && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 mb-3 space-y-2">
                          <input
                            type="text"
                            value={newReminderTitle}
                            onChange={e => setNewReminderTitle(e.target.value)}
                            placeholder="Reminder title..."
                            className={INPUT}
                          />
                          <div className="flex items-center gap-2">
                            <input type="datetime-local" value={newReminderAt} onChange={e => setNewReminderAt(e.target.value)} className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-white flex-1" />
                            <button onClick={() => setShowAddReminder(false)} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900">Cancel</button>
                            <button onClick={handleAddReminder} disabled={!newReminderTitle.trim() || !newReminderAt} className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded disabled:opacity-50">Set</button>
                          </div>
                        </div>
                      )}

                      {/* Reminder list */}
                      <div className="space-y-1">
                        {reminders.map(rem => {
                          const isPast = new Date(rem.remind_at) <= new Date();
                          return (
                            <div key={rem.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50/20 transition-colors group ${rem.is_dismissed ? 'opacity-40' : ''}`}>
                              <Bell className={`w-4 h-4 shrink-0 ${isPast && !rem.is_dismissed ? 'text-amber-600' : 'text-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500">{rem.title}</p>
                                <p className={`text-[10px] ${isPast && !rem.is_dismissed ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {new Date(rem.remind_at).toLocaleString()}
                                </p>
                              </div>
                              {!rem.is_dismissed && (
                                <button onClick={() => handleDismissReminder(rem.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-600 transition-all" title="Dismiss">
                                  <BellOff className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {reminders.length === 0 && !showAddReminder && (
                          <p className="text-xs text-slate-400 py-2 px-3">No reminders for this note</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ─── New Note Modal ─── */}
      {showNewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewNote(false)} />
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">New Note</h2>
              <button onClick={() => setShowNewNote(false)} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Note title..."
                className={INPUT}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateNote()}
              />
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200">
              <button onClick={() => setShowNewNote(false)} className="flex-1 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateNote} disabled={!newTitle.trim()} className="flex-1 px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 disabled:bg-slate-100 disabled:text-slate-500 text-white rounded-lg transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
