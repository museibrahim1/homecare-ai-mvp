'use client';

import type { ReactNode } from 'react';
import GlassRail from './GlassRail';
import MobileWebGate from './MobileWebGate';

interface GlassShellProps {
  children: ReactNode;
  /** Optional page header rendered above children with Paper spacing */
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  /**
   * Full-viewport layout for chat, calendar, and kanban.
   * Outer frame is locked; children should use h-full / min-h-0 and scroll internally.
   */
  fill?: boolean;
  /** Drop the 1200px content cap (wide boards that scroll horizontally). */
  wide?: boolean;
}

/**
 * Paper Web Glass app chrome: mint wash + frosted rail, no TopBar.
 * Main content uses Paper padding (44/48) on desktop.
 * Mobile gets top offset so the fixed hamburger does not cover titles/actions.
 */
export default function GlassShell({
  children,
  title,
  subtitle,
  action,
  fill = false,
  wide = false,
}: GlassShellProps) {
  return (
    <div
      className={`flex glass-page ${
        fill ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-dvh'
      }`}
    >
      <GlassRail />
      <main
        className={`flex-1 min-w-0 flex flex-col px-5 sm:px-8 lg:px-12 pt-16 md:pt-8 lg:pt-11 pb-14 lg:pb-16 gap-6 ${
          fill ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'
        }`}
      >
        <div
          className={`w-full mx-auto flex flex-col gap-6 flex-1 min-w-0 ${
            wide ? 'max-w-none' : 'max-w-[1200px]'
          } ${fill ? 'min-h-0 overflow-hidden' : ''}`}
        >
          {(title || action) && (
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 shrink-0">
              <div className="flex flex-col gap-1 min-w-0">
                {title && (
                  <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-tight text-[#10211F]">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-[15px] font-medium leading-6 text-[#64748B]">{subtitle}</p>
                )}
              </div>
              {action && (
                <div className="flex flex-wrap items-center gap-3">{action}</div>
              )}
            </div>
          )}
          <MobileWebGate>
            <div
              className={
                fill
                  ? 'flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden'
                  : 'min-w-0 w-full'
              }
            >
              {children}
            </div>
          </MobileWebGate>
        </div>
      </main>
    </div>
  );
}
