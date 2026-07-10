/**
 * Marketing attribution — answers "where did this visitor come from?"
 *
 * On the first page of a visit we snapshot the referrer, landing page, UTM
 * parameters, and ad click IDs, then classify them into a channel
 * (google-organic, chatgpt, facebook, email, direct, ...).
 *
 * - First touch is stored in localStorage for 90 days (survives across visits,
 *   so a signup 2 weeks after the first Google click still credits Google).
 * - Last touch is stored in sessionStorage (this visit).
 *
 * Both are attached to the registration payload and to a `session_start`
 * analytics event, so the SEO source of every visitor and signup is queryable.
 */

export interface TouchPoint {
  channel: string;
  referrer: string | null;
  landing_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  captured_at: string;
}

export interface Attribution {
  first_touch: TouchPoint;
  last_touch: TouchPoint;
}

const FIRST_TOUCH_KEY = 'palm_first_touch';
const LAST_TOUCH_KEY = 'palm_last_touch';
const FIRST_TOUCH_MAX_AGE_DAYS = 90;

const SEARCH_ENGINES: Record<string, string> = {
  'google.': 'google-organic',
  'bing.com': 'bing-organic',
  'duckduckgo.com': 'duckduckgo-organic',
  'search.yahoo.com': 'yahoo-organic',
  'search.brave.com': 'brave-organic',
  'ecosia.org': 'ecosia-organic',
};

const AI_ASSISTANTS: Record<string, string> = {
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'perplexity.ai': 'perplexity',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot',
};

const SOCIAL_NETWORKS: Record<string, string> = {
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'instagram.com': 'instagram',
  'linkedin.com': 'linkedin',
  'lnkd.in': 'linkedin',
  't.co': 'twitter-x',
  'twitter.com': 'twitter-x',
  'x.com': 'twitter-x',
  'tiktok.com': 'tiktok',
  'youtube.com': 'youtube',
  'reddit.com': 'reddit',
  'pinterest.com': 'pinterest',
};

function classifyChannel(params: URLSearchParams, referrer: string): string {
  // Explicit campaign tags win
  const source = (params.get('utm_source') || '').toLowerCase();
  const medium = (params.get('utm_medium') || '').toLowerCase();
  if (params.get('gclid')) return 'google-ads';
  if (params.get('fbclid')) return source || 'facebook';
  if (params.get('msclkid')) return 'bing-ads';
  if (source) {
    if (medium.includes('cpc') || medium.includes('paid') || medium.includes('ppc')) return `${source}-ads`;
    if (medium.includes('email')) return 'email';
    return source;
  }

  if (!referrer) return 'direct';

  let host = '';
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'direct';
  }
  if (host === window.location.hostname.replace(/^www\./, '')) return 'internal';

  for (const [needle, channel] of Object.entries(SEARCH_ENGINES)) {
    if (host.includes(needle)) return channel;
  }
  for (const [needle, channel] of Object.entries(AI_ASSISTANTS)) {
    if (host === needle || host.endsWith(`.${needle}`)) return channel;
  }
  for (const [needle, channel] of Object.entries(SOCIAL_NETWORKS)) {
    if (host === needle || host.endsWith(`.${needle}`)) return channel;
  }
  return `referral:${host}`;
}

function buildTouchPoint(): TouchPoint {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || null;
  return {
    channel: classifyChannel(params, referrer || ''),
    referrer,
    landing_page: window.location.pathname + window.location.search,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
    gclid: params.get('gclid'),
    fbclid: params.get('fbclid'),
    captured_at: new Date().toISOString(),
  };
}

function readStored(storage: Storage, key: string): TouchPoint | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as TouchPoint;
  } catch {
    return null;
  }
}

function isExpired(touch: TouchPoint): boolean {
  const age = Date.now() - new Date(touch.captured_at).getTime();
  return age > FIRST_TOUCH_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Snapshot attribution for this visit. Call once on the first page load.
 * Returns true if this is a brand-new session (used to fire session_start).
 */
export function captureAttribution(): boolean {
  if (typeof window === 'undefined') return false;

  const isNewSession = !readStored(sessionStorage, LAST_TOUCH_KEY);

  const touch = buildTouchPoint();

  // Internal navigation isn't a meaningful touch — never overwrite with it.
  if (touch.channel !== 'internal') {
    if (isNewSession) {
      try { sessionStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(touch)); } catch { /* private mode */ }
    }
    const first = readStored(localStorage, FIRST_TOUCH_KEY);
    if (!first || isExpired(first)) {
      try { localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch)); } catch { /* private mode */ }
    }
  }

  return isNewSession;
}

/** Full attribution for this visitor (used at signup time). */
export function getAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  const last = readStored(sessionStorage, LAST_TOUCH_KEY);
  const first = readStored(localStorage, FIRST_TOUCH_KEY);
  const fallback = buildTouchPoint();
  return {
    first_touch: first || last || fallback,
    last_touch: last || fallback,
  };
}

/** Short channel name for the current visitor, e.g. "google-organic". */
export function getSignupSource(): string {
  const attr = getAttribution();
  if (!attr) return 'direct';
  const last = attr.last_touch.channel;
  // "internal" means we only ever saw internal navigation — treat as direct.
  return !last || last === 'internal' ? attr.first_touch.channel || 'direct' : last;
}
