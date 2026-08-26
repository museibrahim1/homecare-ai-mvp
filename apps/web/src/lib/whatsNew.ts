/**
 * Bump CURRENT_WHATS_NEW_VERSION and add a release entry whenever you ship
 * user-facing web app updates. Users who have not seen that version get the popup.
 */

export const CURRENT_WHATS_NEW_VERSION = '2026-08-25-crm';

export const WHATS_NEW_STORAGE_KEY = 'palmcare-whats-new-seen';

export type WhatsNewIcon =
  | 'sparkles'
  | 'infinity'
  | 'play'
  | 'calendar'
  | 'users'
  | 'kanban'
  | 'clipboard'
  | 'activity';

export interface WhatsNewFeature {
  icon: WhatsNewIcon;
  title: string;
  description: string;
}

export interface WhatsNewRelease {
  version: string;
  label: string;
  title: string;
  heroImage: string;
  heroAlt: string;
  features: WhatsNewFeature[];
  learnMoreUrl?: string;
  learnMoreLabel?: string;
  ctaLabel: string;
  ctaHref: string;
}

export const WHATS_NEW_RELEASES: WhatsNewRelease[] = [
  {
    version: '2026-08-25-crm',
    label: 'Now Available',
    title: 'Agency CRM in the Web App',
    heroImage: '/screenshots/crm/deals_pipeline.png',
    heroAlt: 'PalmCare AI pipeline board with client stages',
    features: [
      {
        icon: 'kanban',
        title: 'Pipeline on the Web',
        description:
          'Move leads and clients through intake, assessment, and contract stages without leaving your browser.',
      },
      {
        icon: 'calendar',
        title: 'Schedule and Appointments',
        description:
          'Book visits, see what is on the calendar, and keep follow-ups tied to each client record.',
      },
      {
        icon: 'activity',
        title: 'Care Tracker and Activity',
        description:
          'Log care notes, track ADLs, and see a running timeline of what happened with each client.',
      },
    ],
    learnMoreUrl: '/pipeline',
    learnMoreLabel: 'Open pipeline',
    ctaLabel: 'Explore CRM',
    ctaHref: '/pipeline',
  },
];

export function getCurrentRelease(): WhatsNewRelease | undefined {
  return WHATS_NEW_RELEASES.find((release) => release.version === CURRENT_WHATS_NEW_VERSION);
}

export function getSeenWhatsNewVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WHATS_NEW_STORAGE_KEY);
}

export function shouldShowWhatsNew(): boolean {
  const release = getCurrentRelease();
  if (!release) return false;
  return getSeenWhatsNewVersion() !== CURRENT_WHATS_NEW_VERSION;
}

export function markWhatsNewSeen(version: string = CURRENT_WHATS_NEW_VERSION): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WHATS_NEW_STORAGE_KEY, version);
}

/** Marketing, auth, and legal pages — never show What's New here. */
const PUBLIC_EXACT_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing',
  '/features',
  '/mobile-app',
  '/about',
  '/contact',
  '/faq',
  '/terms',
  '/privacy',
  '/book-demo',
  '/compare',
  '/alternatives',
  '/roi-calculator',
  '/home-care-documentation-software',
  '/beta',
  '/status',
  '/unsubscribe',
  '/app',
  '/welcome',
]);

const PUBLIC_ROUTE_PREFIXES = [
  '/blog',
  '/a/',
  '/oauth/',
  '/register/',
  '/verification-status/',
  '/compare/',
  '/alternatives/',
] as const;

export function isLoggedInAppRoute(pathname: string): boolean {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return false;
  return !PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/**
 * Desktop web only. Never show on phone-sized viewports.
 * iOS Safari / WebViews report Darwin + Mobile; those stay excluded even if
 * matchMedia later flips (e.g. iPad "Request Desktop Website").
 */
export function isDesktopWebClient(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/PalmCareAI|PalmCare/i.test(ua)) return false;
  if (/iPhone|iPod/i.test(ua)) return false;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return false;
  return window.matchMedia('(min-width: 768px)').matches;
}

export function canShowWhatsNew(pathname: string, token: string | null | undefined): boolean {
  if (!token) return false;
  if (!isLoggedInAppRoute(pathname)) return false;
  if (!isDesktopWebClient()) return false;
  return shouldShowWhatsNew();
}
