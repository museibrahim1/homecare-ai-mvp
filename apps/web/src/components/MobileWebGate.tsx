'use client';

import type { ReactNode } from 'react';

interface MobileWebGateProps {
  children: ReactNode;
}

/**
 * Previously blocked Mobile subscribers from the web CRM.
 * Mobile now includes lite web CRM (15 assessments / 30 clients),
 * so this gate is a pass-through. Kept as a wrapper for easy reintroduction
 * if an add-on model returns later.
 */
export default function MobileWebGate({ children }: MobileWebGateProps) {
  return <>{children}</>;
}
