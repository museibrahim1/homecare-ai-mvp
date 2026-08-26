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

/** Logged-in product routes only — never marketing, auth, or landing pages. */
const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/clients',
  '/pipeline',
  '/schedule',
  '/visits',
  '/caregivers',
  '/documents',
  '/settings',
  '/billing',
  '/messages',
  '/reports',
  '/contracts',
  '/proposals',
  '/policies',
  '/integrations',
  '/notes',
  '/activity',
  '/care-tracker',
  '/leads',
  '/team-chat',
  '/admin',
] as const;

export function isLoggedInAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canShowWhatsNew(pathname: string, isAuthenticated: boolean): boolean {
  if (!isAuthenticated) return false;
  if (!isLoggedInAppRoute(pathname)) return false;
  return shouldShowWhatsNew();
}
