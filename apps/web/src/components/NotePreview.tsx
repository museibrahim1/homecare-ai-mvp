'use client';

import { useState } from 'react';
import { Check, Edit2, X, FileText, User, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { Note } from '@/lib/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface NotePreviewProps {
  note: Note | null;
  visitId: string;
  onUpdate: () => void;
}

export default function NotePreview({ note, visitId, onUpdate }: NotePreviewProps) {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [narrative, setNarrative] = useState(note?.narrative || '');

  const handleSave = async () => {
    if (!token) return;
    try {
      await api.updateNote(token, visitId, { narrative });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const handleApprove = async () => {
    if (!token) return;
    try {
      await api.updateNote(token, visitId, { is_approved: true });
      onUpdate();
    } catch (err) {
      console.error('Failed to approve note:', err);
    }
  };

  if (!note) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-dark-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No visit note available</h3>
        <p className="text-dark-400">Run the note generation pipeline to create a note</p>
      </div>
    );
  }

  const structuredData = note.structured_data || {};
  const visitInfo = structuredData.visit_info || {};
  const tasks = structuredData.tasks_performed || [];
  const observations = structuredData.observations || '';
  const concerns = structuredData.risks_concerns || 'None noted.';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Visit Note</h3>
          <p className="text-sm text-dark-400">Version {note.version}</p>
        </div>
        <div className="flex items-center gap-3">
          {note.is_approved ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-accent-green/20 text-accent-green rounded-xl text-sm font-medium">
              <Check className="w-4 h-4" />
              Approved
            </span>
          ) : (
            <button
              onClick={handleApprove}
              className="btn-primary"
            >
              Approve Note
            </button>
          )}
        </div>
      </div>

      {/* Visit Info Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs uppercase">Client</span>
          </div>
          <p className="font-medium text-white">{visitInfo.client_name || 'N/A'}</p>
        </div>
        <div className="bg-dark-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs uppercase">Caregiver</span>
          </div>
          <p className="font-medium text-white">{visitInfo.caregiver_name || 'N/A'}</p>
        </div>
        <div className="bg-dark-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs uppercase">Date</span>
          </div>
          <p className="font-medium text-white">{visitInfo.date || 'N/A'}</p>
        </div>
        <div className="bg-dark-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-dark-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase">Duration</span>
          </div>
          <p className="font-medium text-white">{visitInfo.duration_minutes || 0} minutes</p>
        </div>
      </div>

      {/* Tasks Performed */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-dark-300 mb-3 uppercase tracking-wide">Tasks Performed</h4>
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl">
                <span className="text-dark-200">{task.description}</span>
                <span className="text-sm text-dark-400 font-mono">{task.duration_minutes}m</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-400 bg-dark-700/50 p-4 rounded-xl">No specific tasks recorded.</p>
        )}
      </div>

      {/* Observations */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-dark-300 mb-3 uppercase tracking-wide">Observations</h4>
        <div className="bg-dark-700/50 p-4 rounded-xl">
          <p className="text-dark-200 leading-relaxed">{observations}</p>
        </div>
      </div>

      {/* Concerns */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-dark-300 mb-3 uppercase tracking-wide">Risks/Concerns</h4>
        <div className={`p-4 rounded-xl ${
          concerns !== 'None noted.' 
            ? 'bg-accent-orange/10 border border-accent-orange/30' 
            : 'bg-dark-700/50'
        }`}>
          {concerns !== 'None noted.' && (
            <AlertTriangle className="w-5 h-5 text-accent-orange mb-2" />
          )}
          <p className={concerns !== 'None noted.' ? 'text-accent-orange' : 'text-dark-200'}>
            {concerns}
          </p>
        </div>
      </div>

      {/* Narrative */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-dark-300 uppercase tracking-wide">Narrative Note</h4>
          {!isEditing && (
            <button
              onClick={() => {
                setNarrative(note.narrative || '');
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={8}
              className="input-dark w-full resize-none"
              placeholder="Enter narrative note..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-dark-700/50 p-5 rounded-xl">
            <p className="text-dark-200 whitespace-pre-wrap leading-relaxed">
              {note.narrative || 'No narrative note available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
