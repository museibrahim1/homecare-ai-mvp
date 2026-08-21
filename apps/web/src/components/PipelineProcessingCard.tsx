'use client';

import { Check, Loader2, X } from 'lucide-react';

export type PipelineDocStatus = 'ready' | 'writing' | 'next' | 'failed';

export interface PipelineDocStep {
  id: string;
  title: string;
  status: PipelineDocStatus;
}

interface PipelineProcessingCardProps {
  readyCount: number;
  totalCount: number;
  clientFirstName: string;
  subtitle: string;
  steps: PipelineDocStep[];
  footer?: string;
  /** When true, rows are clickable to re-run a step */
  onStepClick?: (id: string) => void;
  processingStepId?: string | null;
}

/**
 * Paper Pipeline Glass → Processing artboard (web port of PalmPipelineProcessingCard).
 */
export default function PipelineProcessingCard({
  readyCount,
  totalCount,
  clientFirstName,
  subtitle,
  steps,
  footer = 'Stay on this screen. Usually about a minute.',
  onStepClick,
  processingStepId,
}: PipelineProcessingCardProps) {
  const progress = totalCount > 0 ? readyCount / totalCount : 0;
  const name = clientFirstName.trim();
  const hero = name ? `Building ${name}'s visit` : 'Building this visit';

  return (
    <div className="glass-panel p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold tracking-[0.04em] uppercase text-primary-600">
          {readyCount} of {totalCount} ready
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[#10211F]">{hero}</h2>
        <p className="text-[15px] font-medium text-[#64748B]">{subtitle}</p>
      </div>

      <div className="h-1.5 w-full rounded-full bg-primary-500/15 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-[width] duration-500"
          style={{ width: `${Math.max(progress * 100, progress > 0 ? 4 : 0)}%` }}
        />
      </div>

      <ul className="flex flex-col">
        {steps.map((step) => {
          const status = processingStepId === step.id ? 'writing' : step.status;
          const muted = status === 'next';
          const clickable = Boolean(onStepClick) && status !== 'writing';
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onStepClick?.(step.id)}
                className={`w-full flex items-center gap-3 h-14 sm:h-16 text-left ${
                  clickable ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
                }`}
              >
                <StepGlyph status={status} />
                <span
                  className={`flex-1 text-[16px] font-semibold ${
                    muted ? 'text-slate-400' : 'text-[#10211F]'
                  }`}
                >
                  {step.title}
                </span>
                <span
                  className={`text-[13px] ${
                    status === 'writing'
                      ? 'font-semibold text-primary-600'
                      : status === 'failed'
                        ? 'font-medium text-red-600'
                        : status === 'next'
                          ? 'font-medium text-slate-400'
                          : 'font-medium text-[#64748B]'
                  }`}
                >
                  {statusLabel(status)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {(readyCount < totalCount || processingStepId) && (
        <p className="text-center text-sm font-medium text-[#64748B]">{footer}</p>
      )}
    </div>
  );
}

function statusLabel(status: PipelineDocStatus) {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'writing':
      return 'Writing';
    case 'failed':
      return 'Failed';
    default:
      return 'Next';
  }
}

function StepGlyph({ status }: { status: PipelineDocStatus }) {
  if (status === 'ready') {
    return (
      <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-primary-500 flex items-center justify-center">
        <Check className="w-3 h-3 text-white stroke-[3]" />
      </span>
    );
  }
  if (status === 'writing') {
    return (
      <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-primary-500/15 border-[1.5px] border-primary-500 flex items-center justify-center">
        <Loader2 className="w-3.5 h-3.5 text-primary-600 animate-spin" />
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-red-50 flex items-center justify-center">
        <X className="w-3 h-3 text-red-600 stroke-[3]" />
      </span>
    );
  }
  return <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-[#10211F]/10" />;
}
