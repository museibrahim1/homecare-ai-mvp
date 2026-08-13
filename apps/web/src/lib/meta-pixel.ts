/**
 * Thin wrappers around window.fbq so marketing pages can fire Meta Pixel
 * events without crashing when the pixel is blocked or still loading.
 *
 * Pixel ID: 1077310938132938 (initialized in app/layout.tsx)
 *
 * Standard events used for ad optimization:
 *   - PageView              (layout + SPA route changes)
 *   - CompleteRegistration  (website signup)
 *   - StartTrial            (signup includes 14-day trial)
 *   - Lead                  (demo booking / contact)
 *   - AppStoreClick         (custom — App Store CTA clicks)
 */

type MetaParams = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

function cleanParams(params: MetaParams): Record<string, string | number | boolean> {
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v;
  }
  return cleaned;
}

export function trackMetaEvent(name: string, params: MetaParams = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = cleanParams(params);
    if (Object.keys(cleaned).length > 0) {
      window.fbq?.('track', name, cleaned);
    } else {
      window.fbq?.('track', name);
    }
  } catch {
    // Analytics must never break the product.
  }
}

export function trackMetaCustom(name: string, params: MetaParams = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = cleanParams(params);
    if (Object.keys(cleaned).length > 0) {
      window.fbq?.('trackCustom', name, cleaned);
    } else {
      window.fbq?.('trackCustom', name);
    }
  } catch {
    // Analytics must never break the product.
  }
}

/** SPA navigations — layout fires the first PageView; this covers client routes. */
export function trackMetaPageView(): void {
  trackMetaEvent('PageView');
}
