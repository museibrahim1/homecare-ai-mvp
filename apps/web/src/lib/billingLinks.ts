/** Apple IAP billing helpers for web (subscribe + manage flows). */

export const APP_STORE_URL =
  'https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988';

/** Opens Apple ID subscription management (change plan, cancel, payment method). */
export const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export const MOBILE_PRODUCT_ID = 'com.palmcareai.app.mobile.monthly';
export const PLATFORM_PRODUCT_ID = 'com.palmcareai.app.starter.monthly';

export type BillingPlanKey = 'mobile' | 'platform';

export function paywallDeepLink(plan?: BillingPlanKey): string {
  const product =
    plan === 'mobile' ? MOBILE_PRODUCT_ID : plan === 'platform' ? PLATFORM_PRODUCT_ID : '';
  const base = 'com.palmcareai.app://paywall';
  return product ? `${base}?product=${encodeURIComponent(product)}` : base;
}

export function subscriptionsDeepLink(): string {
  return 'com.palmcareai.app://subscriptions';
}

export function openAppleSubscriptions(): void {
  window.open(APPLE_SUBSCRIPTIONS_URL, '_blank', 'noopener,noreferrer');
}

/** Try to open the in-app paywall (iPhone/iPad with PalmCare installed). */
export function openPaywallInApp(plan?: BillingPlanKey): void {
  window.location.assign(paywallDeepLink(plan));
}

export function scrollToManageSubscription(): void {
  document.getElementById('manage-subscription')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
