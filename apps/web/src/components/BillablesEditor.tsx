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
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20',
    icon: Heart,
    serviceType: 'Personal Care'
  },
  ADL_DRESSING: { 
    label: 'Dressing Assistance', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20',
    icon: Heart,
    serviceType: 'Personal Care'
  },
  ADL_GROOMING: { 
    label: 'Grooming', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20',
    icon: Heart,
    serviceType: 'Personal Care'
  },
  MEAL_PREP: { 
    label: 'Meal Preparation', 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20',
    icon: Utensils,
    serviceType: 'Nutrition'
  },
  MEAL_ASSIST: { 
    label: 'Feeding Assistance', 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20',
    icon: Utensils,
    serviceType: 'Nutrition'
  },
  MED_REMINDER: { 
    label: 'Medication Management', 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20',
    icon: Pill,
    serviceType: 'Medication'
  },
  VITALS: { 
    label: 'Vital Signs Monitoring', 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20',
    icon: Activity,
    serviceType: 'Health Monitoring'
  },
  ADL_MOBILITY: { 
    label: 'Mobility Assistance', 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/20',
    icon: PersonStanding,
    serviceType: 'Mobility'
  },
  MOBILITY_ASSIST: { 
    label: 'Transfer Assistance', 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/20',
    icon: PersonStanding,
    serviceType: 'Mobility'
  },
  EXERCISE: { 
    label: 'Exercise & Therapy', 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/20',
    icon: PersonStanding,
    serviceType: 'Mobility'
  },
  HOUSEHOLD_LIGHT: { 
    label: 'Light Housekeeping', 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20',
    icon: Home,
    serviceType: 'Homemaking'
  },
  HOUSEHOLD_LAUNDRY: { 
    label: 'Laundry Services', 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20',
    icon: Home,
    serviceType: 'Homemaking'
  },
  COMPANIONSHIP: { 
    label: 'Companionship', 
    color: 'text-pink-400', 
    bgColor: 'bg-pink-500/20',
    icon: Users,
    serviceType: 'Companionship'
  },
  SUPERVISION: { 
    label: 'Safety Supervision', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20',
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
        <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-dark-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Services Detected</h3>
        <p className="text-dark-400 mb-2">Run the billing analysis to extract services from the transcript</p>
        <p className="text-sm text-dark-500">AI will identify care services mentioned in the conversation</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Identified Care Services</h3>
            <p className="text-dark-400 text-sm">
              {items.length} service{items.length !== 1 ? 's' : ''} extracted from transcript
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {flaggedCount > 0 && (
            <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm">
              {flaggedCount} to review
            </span>
          )}
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
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
                <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                  {serviceType}
                </h4>
                <span className="text-dark-500 text-sm">
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
                          ? 'bg-green-500/5 border-green-500/30' 
                          : item.is_flagged
                          ? 'bg-orange-500/5 border-orange-500/30'
                          : 'bg-dark-700/30 border-dark-600/50 hover:bg-dark-700/50'
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
                            <span className="font-medium text-white">{config.label}</span>
                            {item.is_approved && (
                              <Check className="w-4 h-4 text-green-400" />
                            )}
                            {item.is_flagged && !item.is_approved && (
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                            )}
                          </div>
                          <p className="text-dark-400 text-sm truncate">{item.description}</p>
                        </div>

                        {/* Evidence count & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.evidence && item.evidence.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-600/50 hover:bg-dark-600 rounded-lg text-dark-300 text-sm transition"
                            >
                              <MessageSquareQuote className="w-4 h-4" />
                              {item.evidence.length} quote{item.evidence.length !== 1 ? 's' : ''}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                          {!item.is_approved && (
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded Evidence Section */}
                      {isExpanded && item.evidence && item.evidence.length > 0 && (
                        <div className="px-4 pb-4 border-t border-dark-600/50 mt-1 pt-3">
                          <h5 className="text-xs font-medium text-dark-400 mb-3 flex items-center gap-2">
                            <MessageSquareQuote className="w-3 h-3" />
                            Transcript Evidence
                          </h5>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {item.evidence.map((ev: any, idx: number) => (
                              <div 
                                key={idx} 
                                className="bg-dark-800/80 rounded-lg p-3 border border-dark-600/30"
                              >
                                <div className="flex items-center gap-3 mb-2 text-xs text-dark-500">
                                  {ev.speaker && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-dark-700 rounded">
                                      <User className="w-3 h-3" />
                                      {ev.speaker}
                                    </span>
                                  )}
                                  {ev.matched && (
                                    <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded font-medium">
                                      Keyword: "{ev.matched}"
                                    </span>
                                  )}
                                </div>
                                <p className="text-dark-200 text-sm leading-relaxed">"{ev.text}"</p>
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
      <div className="mt-6 p-4 bg-dark-700/50 border border-dark-600 rounded-xl">
        <h4 className="text-white font-medium mb-3">Services Summary</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(groupedItems).map(([type, typeItems]) => (
            <span 
              key={type}
              className="px-3 py-1.5 bg-dark-600 text-dark-200 rounded-lg text-sm"
            >
              {type}: {typeItems.length}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
