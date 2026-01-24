'use client';

import { useState } from 'react';
import { Check, Edit2, X } from 'lucide-react';
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
      <div className="p-8 text-center text-gray-500">
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
          <h3 className="text-lg font-semibold text-gray-900">Visit Note</h3>
          <p className="text-sm text-gray-500">Version {note.version}</p>
        </div>
        <div className="flex items-center gap-3">
          {note.is_approved ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
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
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase">Client</p>
          <p className="font-medium">{visitInfo.client_name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Caregiver</p>
          <p className="font-medium">{visitInfo.caregiver_name || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Date</p>
          <p className="font-medium">{visitInfo.date || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Duration</p>
          <p className="font-medium">{visitInfo.duration_minutes || 0} minutes</p>
        </div>
      </div>

      {/* Tasks Performed */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tasks Performed</h4>
        {tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map((task: any, index: number) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{task.description}</span>
                <span className="text-xs text-gray-500">{task.duration_minutes}m</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No specific tasks recorded.</p>
        )}
      </div>

      {/* Observations */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Observations</h4>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{observations}</p>
      </div>

      {/* Concerns */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Risks/Concerns</h4>
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{concerns}</p>
      </div>

      {/* Narrative */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Narrative Note</h4>
          {!isEditing && (
            <button
              onClick={() => {
                setNarrative(note.narrative || '');
                setIsEditing(true);
              }}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
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
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
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
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {note.narrative || 'No narrative note available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
