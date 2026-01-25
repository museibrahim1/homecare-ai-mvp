'use client';

import { useState } from 'react';
import { Check, X, AlertTriangle, Clock, DollarSign, Edit3 } from 'lucide-react';
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

const categoryConfig: Record<string, { label: string; color: string }> = {
  ADL_HYGIENE: { label: 'Personal Hygiene', color: 'primary' },
  ADL_DRESSING: { label: 'Dressing', color: 'purple' },
  ADL_MOBILITY: { label: 'Mobility', color: 'cyan' },
  MEAL_PREP: { label: 'Meal Preparation', color: 'green' },
  MEAL_ASSIST: { label: 'Meal Assistance', color: 'green' },
  MED_REMINDER: { label: 'Medication Reminder', color: 'orange' },
  MED_ADMIN: { label: 'Medication Admin', color: 'orange' },
  MOBILITY_ASSIST: { label: 'Transfer/Mobility', color: 'cyan' },
  COMPANIONSHIP: { label: 'Companionship', color: 'pink' },
  HOUSEHOLD_LIGHT: { label: 'Housekeeping', color: 'purple' },
  EXERCISE: { label: 'Exercise', color: 'cyan' },
  VITALS: { label: 'Vital Signs', color: 'primary' },
};

export default function BillablesEditor({ items, visitId, onUpdate }: BillablesEditorProps) {
  const { token } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustedMinutes, setAdjustedMinutes] = useState<number>(0);

  const totalMinutes = items.reduce((sum, item) => sum + item.minutes, 0);
  const totalAdjusted = items.reduce((sum, item) => sum + (item.adjusted_minutes || item.minutes), 0);
  const approvedCount = items.filter(i => i.is_approved).length;
  const flaggedCount = items.filter(i => i.is_flagged).length;

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
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-dark-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No billable items</h3>
        <p className="text-dark-400">Run the billing pipeline to generate billable items</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-700/50 rounded-xl p-4">
          <p className="text-dark-400 text-sm mb-1">Total Time</p>
          <p className="text-2xl font-bold text-white">{formatDuration(totalAdjusted)}</p>
          {totalAdjusted !== totalMinutes && (
            <p className="text-xs text-dark-500 mt-1">
              Original: {formatDuration(totalMinutes)}
            </p>
          )}
        </div>
        <div className="bg-dark-700/50 rounded-xl p-4">
          <p className="text-dark-400 text-sm mb-1">Items</p>
          <p className="text-2xl font-bold text-white">{items.length}</p>
        </div>
        <div className="bg-accent-green/10 rounded-xl p-4">
          <p className="text-accent-green text-sm mb-1">Approved</p>
          <p className="text-2xl font-bold text-accent-green">{approvedCount}</p>
        </div>
        <div className="bg-accent-orange/10 rounded-xl p-4">
          <p className="text-accent-orange text-sm mb-1">Flagged</p>
          <p className="text-2xl font-bold text-accent-orange">{flaggedCount}</p>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {items.map((item) => {
          const config = categoryConfig[item.category] || { label: item.category, color: 'primary' };
          
          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.is_approved 
                  ? 'bg-accent-green/5 border-accent-green/30' 
                  : item.is_flagged
                  ? 'bg-accent-orange/5 border-accent-orange/30'
                  : 'bg-dark-700/30 border-dark-600/50 hover:bg-dark-700/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-${config.color}/20 text-accent-${config.color}`}>
                      {config.label}
                    </span>
                    {item.is_approved && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-accent-green/20 text-accent-green rounded-lg text-xs">
                        <Check className="w-3 h-3" />
                        Approved
                      </span>
                    )}
                    {item.is_flagged && !item.is_approved && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-accent-orange/20 text-accent-orange rounded-lg text-xs">
                        <AlertTriangle className="w-3 h-3" />
                        Review
                      </span>
                    )}
                  </div>
                  
                  <p className="text-dark-200 text-sm mb-2">{item.description}</p>
                  
                  {item.is_flagged && item.flag_reason && (
                    <p className="text-accent-orange text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {item.flag_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Duration */}
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={adjustedMinutes}
                        onChange={(e) => setAdjustedMinutes(parseInt(e.target.value) || 0)}
                        className="w-20 input-dark text-right text-sm py-2"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAdjust(item.id)}
                        className="p-2 text-accent-green hover:bg-accent-green/10 rounded-lg transition"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-dark-400 hover:bg-dark-600 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                          {item.adjusted_minutes || item.minutes}m
                        </span>
                        {item.adjusted_minutes && item.adjusted_minutes !== item.minutes && (
                          <span className="text-sm text-dark-500 line-through">
                            {item.minutes}m
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {editingId !== item.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setAdjustedMinutes(item.adjusted_minutes || item.minutes);
                        }}
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-600 rounded-lg transition"
                        title="Adjust time"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {!item.is_approved && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="p-2 text-accent-green hover:bg-accent-green/10 rounded-lg transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
