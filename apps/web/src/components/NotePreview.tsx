'use client';

import { useState } from 'react';
import { Check, Edit2, X, Download } from 'lucide-react';
import { Note } from '@/lib/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface NotePreviewProps {
  note: Note | null;
  visitId: string;
  onUpdate: () => void;
}

export default function NotePreview({ note, visitId, onUpdate }: NotePreviewProps) {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [narrative, setNarrative] = useState(note?.narrative || '');

  const downloadNote = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/exports/visits/${visitId}/note.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visit_note_${visitId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download note:', err);
    }
  };

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
      <div className="p-8 text-center text-dark-400">
        <p>No visit note available.</p>
        <p className="text-sm mt-2">Run the note generation pipeline to create a note.</p>
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
          <button
            onClick={downloadNote}
            className="flex items-center gap-2 px-3 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition text-sm"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          {note.is_approved ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              <Check className="w-4 h-4" />
              Approved
            </span>
          ) : (
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              Approve Note
            </button>
          )}
        </div>
      </div>

      {/* Visit Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-dark-700/50 rounded-lg">
        <div>
          <p className="text-xs text-dark-400 uppercase">Client</p>
          <p className="font-medium text-white">{visitInfo.client_name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-dark-400 uppercase">Caregiver</p>
          <p className="font-medium text-white">{visitInfo.caregiver_name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-dark-400 uppercase">Date</p>
          <p className="font-medium text-white">{visitInfo.date || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-dark-400 uppercase">Duration</p>
          <p className="font-medium text-white">{visitInfo.duration_minutes || 0} minutes</p>
        </div>
      </div>

      {/* Tasks Performed */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-dark-300 mb-2">Tasks Performed</h4>
        {tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map((task: any, index: number) => (
              <li key={index} className="flex items-center justify-between p-2 bg-dark-700/50 rounded">
                <span className="text-sm text-white">{task.description}</span>
                <span className="text-xs text-dark-400">{task.duration_minutes}m</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-dark-400">No specific tasks recorded.</p>
        )}
      </div>

      {/* Observations */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-dark-300 mb-2">Observations</h4>
        <p className="text-sm text-dark-200 bg-dark-700/50 p-3 rounded">{observations}</p>
      </div>

      {/* Concerns */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-dark-300 mb-2">Risks/Concerns</h4>
        <p className="text-sm text-dark-200 bg-dark-700/50 p-3 rounded">{concerns}</p>
      </div>

      {/* Narrative */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-dark-300">Narrative Note</h4>
          {!isEditing && (
            <button
              onClick={() => {
                setNarrative(note.narrative || '');
                setIsEditing(true);
              }}
              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm text-dark-300 hover:bg-dark-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-dark-700/50 p-4 rounded-lg">
            <p className="text-sm text-dark-200 whitespace-pre-wrap">
              {note.narrative || 'No narrative note available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
