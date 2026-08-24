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
}

/**
 * Paper Web Glass app chrome: mint wash + frosted rail, no TopBar.
 * Main content uses Paper padding (44/48) on desktop.
 */
export default function GlassShell({ children, title, subtitle, action }: GlassShellProps) {
  return (
    <div className="flex min-h-screen glass-page">
      <GlassRail />
      <main className="flex-1 min-w-0 flex flex-col px-5 sm:px-8 lg:px-12 py-8 lg:py-11 gap-6 overflow-x-hidden">
        <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-6 flex-1 min-w-0">
          {(title || action) && (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
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
              {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
            </div>
          )}
          <MobileWebGate>{children}</MobileWebGate>
        </div>
      </main>
    </div>
  );
}