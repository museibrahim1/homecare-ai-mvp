'use client';

import type { LucideIcon } from 'lucide-react';

export interface GlassTab {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface GlassTabsProps {
  tabs: GlassTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  /** toolbar = flat pills on glass bar (Paper Clients). Default = gray segmented rail. */
  variant?: 'default' | 'toolbar';
}

/**
 * Segmented tab switcher in the botanical mint glass style.
 */
export default function GlassTabs({
  tabs,
  active,
  onChange,
  className = '',
  variant = 'default',
}: GlassTabsProps) {
  if (variant === 'toolbar') {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`} role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#10211F] font-semibold shadow-[0_1px_3px_#0F172A14]'
                  : 'text-[#64748B] font-medium hover:text-[#334155] hover:bg-white/40'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-primary-50 text-primary-600' : 'bg-black/5 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`glass-tabs ${className}`} role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`glass-tab ${isActive ? 'glass-tab-active' : ''}`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-primary-50 text-primary-600' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
