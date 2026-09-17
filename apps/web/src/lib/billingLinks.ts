/** Web billing helpers: Stripe checkout/portal on desktop, Apple IAP on iPhone. */

export const APP_STORE_URL =
  'https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988';

/** Apple ID subscription management (change plan, payment method, cancel). */
export const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export const MOBILE_PRODUCT_ID = 'com.palmcareai.app.mobile.monthly';
export const PLATFORM_PRODUCT_ID = 'com.palmcareai.app.starter.monthly';

export type BillingPlanKey = 'mobile' | 'platform';

export function isMobileIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAppleManagedCustomerId(customerId?: string | null): boolean {
  return Boolean(customerId?.startsWith('apple:'));
}

export function paywallDeepLink(plan?: BillingPlanKey): string {
  const product =
    plan === 'mobile' ? MOBILE_PRODUCT_ID : plan === 'platform' ? PLATFORM_PRODUCT_ID : '';
  const base = 'com.palmcareai.app://paywall';
  return product ? `${base}?product=${encodeURIComponent(product)}` : base;
}

/** Same-tab navigation is more reliable than window.open on mobile Safari. */
export function openAppleSubscriptions(): void {
  window.location.assign(APPLE_SUBSCRIPTIONS_URL);
}

/** Opens the native paywall when PalmCare is installed (iOS only). */
export function openPaywallInApp(plan?: BillingPlanKey): boolean {
  if (!isMobileIOS()) return false;
  window.location.assign(paywallDeepLink(plan));
  return true;
}

export function scrollToManageSubscription(): void {
  document.getElementById('manage-subscription')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export async function startStripeCheckout(
  token: string,
  planId: string,
  billingCycle: 'monthly' | 'annual' = 'monthly',
): Promise<string | null> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Could not start checkout');
  }
  const data = await res.json();
  return data.checkout_url || null;
}

export async function openStripePortal(token: string): Promise<string | null> {
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Could not open billing portal');
  }
  const data = await res.json();
  return data.portal_url || null;
}
