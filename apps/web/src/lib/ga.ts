/**
 * Thin wrappers around window.gtag so marketing pages can fire GA4 events
 * without crashing when the tag is blocked or still loading.
 *
 * Key events to mark as conversions in GA4 Admin → Events:
 *   - sign_up          (already fired on /register success)
 *   - app_store_click  (fired on /app hop and on-site App Store CTAs)
 *   - generate_lead    (optional: book-demo / contact form success)
 */

type GaParams = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackGaEvent(name: string, params: GaParams = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') cleaned[k] = v;
    }
    window.gtag?.('event', name, cleaned);
  } catch {
    // Analytics must never break the product.
  }
}

/** Fired when a user clicks through toward the App Store listing. */
export function trackAppStoreClick(placement: string, extra: GaParams = {}): void {
  trackGaEvent('app_store_click', {
    placement,
    link_url: 'https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988',
    ...extra,
  });
}

/** Fired on successful website registration (also keep the existing sign_up call). */
export function trackSignUp(params: GaParams = {}): void {
  trackGaEvent('sign_up', { method: 'website', ...params });
}

/** Fired when a demo is booked or a contact form converts. */
export function trackGenerateLead(params: GaParams = {}): void {
  trackGaEvent('generate_lead', params);
}
