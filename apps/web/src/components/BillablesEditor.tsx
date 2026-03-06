'use client';

import { useState } from 'react';
import { 
  Check, AlertTriangle, DollarSign, 
  ChevronDown, ChevronUp, MessageSquareQuote, User,
  Heart, Pill, Activity, Utensils, PersonStanding, 
  Home, Users, Shield, Sparkles, Clock
} from 'lucide-react';
import { BillableItem } from '@/lib/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface BillablesEditorProps {
  items: BillableItem[];
  visitId: string;
  onUpdate: () => void;
}

// Service category configuration
const categoryConfig: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ComponentType<any>;
  serviceType: string;
}> = {
  ADL_HYGIENE: { 
    label: 'Bathing & Hygiene', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    icon: Heart,
    serviceType: 'Personal Care'
  },
  ADL_DRESSING: { 
    label: 'Dressing Assistance', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    icon: Heart,
    serviceType: 'Personal Care'
  },
  ADL_GROOMING: { 
    label: 'Grooming', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    icon: Heart,
    serviceType: 'Personal Care'
  },
  MEAL_PREP: { 
    label: 'Meal Preparation', 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50',
    icon: Utensils,
    serviceType: 'Nutrition'
  },
  MEAL_ASSIST: { 
    label: 'Feeding Assistance', 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50',
    icon: Utensils,
    serviceType: 'Nutrition'
  },
  MED_REMINDER: { 
    label: 'Medication Management', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50',
    icon: Pill,
    serviceType: 'Medication'
  },
  VITALS: { 
    label: 'Vital Signs Monitoring', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    icon: Activity,
    serviceType: 'Health Monitoring'
  },
  ADL_MOBILITY: { 
    label: 'Mobility Assistance', 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50',
    icon: PersonStanding,
    serviceType: 'Mobility'
  },
  MOBILITY_ASSIST: { 
    label: 'Transfer Assistance', 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50',
    icon: PersonStanding,
    serviceType: 'Mobility'
  },
  EXERCISE: { 
    label: 'Exercise & Therapy', 
    color: 'text-cyan-600', 
    bgColor: 'bg-cyan-50',
    icon: PersonStanding,
    serviceType: 'Mobility'
  },
  HOUSEHOLD_LIGHT: { 
    label: 'Light Housekeeping', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50',
    icon: Home,
    serviceType: 'Homemaking'
  },
  HOUSEHOLD_LAUNDRY: { 
    label: 'Laundry Services', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50',
    icon: Home,
    serviceType: 'Homemaking'
  },
  COMPANIONSHIP: { 
    label: 'Companionship', 
    color: 'text-pink-600', 
    bgColor: 'bg-pink-500/20',
    icon: Users,
    serviceType: 'Companionship'
  },
  SUPERVISION: { 
    label: 'Safety Supervision', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50',
    icon: Shield,
    serviceType: 'Safety'
  },
};

export default function BillablesEditor({ items, visitId, onUpdate }: BillablesEditorProps) {
  const { token } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate stats
  const approvedCount = items.filter(i => i.is_approved).length;
  const flaggedCount = items.filter(i => i.is_flagged && !i.is_approved).length;

  // Group items by service type
  const groupedItems = items.reduce((acc, item) => {
    const config = categoryConfig[item.category] || { serviceType: 'Other Services' };
    const type = config.serviceType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, BillableItem[]>);

  // Service type order
  const serviceOrder = ['Personal Care', 'Medication', 'Health Monitoring', 'Nutrition', 'Mobility', 'Homemaking', 'Companionship', 'Safety', 'Other Services'];

  const handleApprove = async (itemId: string) => {
    if (!token) return;
    try {
      await api.updateBillableItem(token, visitId, itemId, { is_approved: true });
      onUpdate();
    } catch (err) {
      console.error('Failed to approve item:', err);
    }
  };

  const handleApproveAll = async () => {
    if (!token) return;
    try {
      for (const item of items.filter(i => !i.is_approved)) {
        await api.updateBillableItem(token, visitId, item.id, { is_approved: true });
      }
      onUpdate();
    } catch (err) {
      console.error('Failed to approve items:', err);
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Services Detected</h3>
        <p className="text-slate-500 mb-2">Run the billing analysis to extract services from the transcript</p>
        <p className="text-sm text-slate-400">AI will identify care services mentioned in the conversation</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Identified Care Services</h3>
            <p className="text-slate-500 text-sm">
              {items.length} service{items.length !== 1 ? 's' : ''} extracted from transcript
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {flaggedCount > 0 && (
            <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-sm">
              {flaggedCount} to review
            </span>
          )}
          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-sm">
            {approvedCount}/{items.length} approved
          </span>
          {approvedCount < items.length && (
            <button
              onClick={handleApproveAll}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
            >
              Approve All
            </button>
          )}
        </div>
      </div>

      {/* Service Groups */}
      <div className="space-y-6">
        {serviceOrder.map(serviceType => {
          const typeItems = groupedItems[serviceType];
          if (!typeItems || typeItems.length === 0) return null;
          
          return (
            <div key={serviceType} className="space-y-2">
              {/* Service Type Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full"></div>
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  {serviceType}
                </h4>
                <span className="text-slate-400 text-sm">
                  ({typeItems.length})
                </span>
              </div>
              
              {/* Items in this category */}
              <div className="space-y-2 ml-3">
                {typeItems.map((item) => {
                  const config = categoryConfig[item.category] || { 
                    label: item.category, 
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-500/20',
                    icon: DollarSign,
                    serviceType: 'Other'
                  };
                  const Icon = config.icon;
                  const isExpanded = expandedId === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all ${
                        item.is_approved 
                          ? 'bg-green-500/5 border-emerald-200' 
                          : item.is_flagged
                          ? 'bg-orange-500/5 border-orange-200'
                          : 'bg-slate-50/30 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {/* Main Row */}
                      <div className="p-4 flex items-center gap-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        
                        {/* Service Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-slate-900">{config.label}</span>
                            {item.is_approved && (
                              <Check className="w-4 h-4 text-emerald-600" />
                            )}
                            {item.is_flagged && !item.is_approved && (
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            )}
                          </div>
                          <p className="text-slate-500 text-sm truncate">{item.description}</p>
                        </div>

                        {/* Evidence count & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.evidence && item.evidence.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/50 hover:bg-slate-100 rounded-lg text-slate-600 text-sm transition"
                            >
                              <MessageSquareQuote className="w-4 h-4" />
                              {item.evidence.length} quote{item.evidence.length !== 1 ? 's' : ''}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                          {!item.is_approved && (
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-green-500/30 text-emerald-600 rounded-lg text-sm font-medium transition"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded Evidence Section */}
                      {isExpanded && item.evidence && item.evidence.length > 0 && (
                        <div className="px-4 pb-4 border-t border-slate-200 mt-1 pt-3">
                          <h5 className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-2">
                            <MessageSquareQuote className="w-3 h-3" />
                            Transcript Evidence
                          </h5>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {item.evidence?.map((ev: any, idx: number) => (
                              <div 
                                key={idx} 
                                className="bg-white/80 rounded-lg p-3 border border-slate-200/30"
                              >
                                <div className="flex items-center gap-3 mb-2 text-xs text-slate-400">
                                  {ev.speaker && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded">
                                      <User className="w-3 h-3" />
                                      {ev.speaker}
                                    </span>
                                  )}
                                  {ev.matched && (
                                    <span className="px-2 py-0.5 bg-primary-50 text-primary-400 rounded font-medium">
                                      Keyword: "{ev.matched}"
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-700 text-sm leading-relaxed">"{ev.text}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-slate-100 border border-slate-200 rounded-xl">
        <h4 className="text-slate-900 font-medium mb-3">Services Summary</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(groupedItems).map(([type, typeItems]) => (
            <span 
              key={type}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm"
            >
              {type}: {typeItems.length}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
