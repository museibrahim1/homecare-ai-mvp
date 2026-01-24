'use client';

import { useState } from 'react';
import { Check, X, AlertTriangle, Clock } from 'lucide-react';
import { BillableItem } from '@/lib/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface BillablesEditorProps {
  items: BillableItem[];
  visitId: string;
  onUpdate: () => void;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

const categoryLabels: Record<string, string> = {
  ADL_HYGIENE: 'Personal Hygiene',
  ADL_DRESSING: 'Dressing',
  ADL_MOBILITY: 'Mobility',
  MEAL_PREP: 'Meal Preparation',
  MEAL_ASSIST: 'Meal Assistance',
  MED_REMINDER: 'Medication Reminder',
  MED_ADMIN: 'Medication Admin',
  MOBILITY_ASSIST: 'Transfer/Mobility',
  COMPANIONSHIP: 'Companionship',
  HOUSEHOLD_LIGHT: 'Housekeeping',
  EXERCISE: 'Exercise',
  VITALS: 'Vital Signs',
};

export default function BillablesEditor({ items, visitId, onUpdate }: BillablesEditorProps) {
  const { token } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustedMinutes, setAdjustedMinutes] = useState<number>(0);

  const totalMinutes = items.reduce((sum, item) => sum + item.minutes, 0);
  const totalAdjusted = items.reduce((sum, item) => sum + (item.adjusted_minutes || item.minutes), 0);

  const handleApprove = async (itemId: string) => {
    if (!token) return;
    try {
      await api.updateBillableItem(token, visitId, itemId, { is_approved: true });
      onUpdate();
    } catch (err) {
      console.error('Failed to approve item:', err);
    }
  };

  const handleAdjust = async (itemId: string) => {
    if (!token) return;
    try {
      await api.updateBillableItem(token, visitId, itemId, { adjusted_minutes: adjustedMinutes });
      setEditingId(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to adjust item:', err);
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No billable items available.</p>
        <p className="text-sm mt-2">Run the billing pipeline to generate billable items.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Summary */}
      <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-500">Total Billable Time</p>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(totalAdjusted)}</p>
          {totalAdjusted !== totalMinutes && (
            <p className="text-xs text-gray-500">
              Original: {formatDuration(totalMinutes)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Items</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500">
            {items.filter(i => i.is_approved).length} approved
          </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Category</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Description</th>
              <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Minutes</th>
              <th className="text-center py-2 px-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-3">
                  <span className="text-sm font-medium text-gray-900">
                    {categoryLabels[item.category] || item.category}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-sm text-gray-600">{item.description}</span>
                  {item.is_flagged && (
                    <div className="flex items-center gap-1 mt-1 text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-xs">{item.flag_reason}</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  {editingId === item.id ? (
                    <input
                      type="number"
                      value={adjustedMinutes}
                      onChange={(e) => setAdjustedMinutes(parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border rounded text-right text-sm"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <span className="text-sm font-medium">
                        {item.adjusted_minutes || item.minutes}
                      </span>
                      {item.adjusted_minutes && item.adjusted_minutes !== item.minutes && (
                        <span className="text-xs text-gray-400 line-through ml-2">
                          {item.minutes}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-center">
                  {item.is_approved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      <Check className="w-3 h-3" />
                      Approved
                    </span>
                  ) : item.is_flagged ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  {editingId === item.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAdjust(item.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setAdjustedMinutes(item.adjusted_minutes || item.minutes);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Adjust
                      </button>
                      {!item.is_approved && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
