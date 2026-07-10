const API = '/api';

let _sessionId: string | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  if (typeof window === 'undefined') return 'ssr';

  const stored = sessionStorage.getItem('palm_sid');
  if (stored) { _sessionId = stored; return stored; }

  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem('palm_sid', id);
  _sessionId = id;
  return id;
}

interface TrackEvent {
  event_type: string;
  page_path?: string;
  element_id?: string;
  element_text?: string;
  element_tag?: string;
  click_x?: number;
  click_y?: number;
  viewport_w?: number;
  viewport_h?: number;
  funnel_step?: number;
  funnel_name?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

const _queue: TrackEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(flush, 2000);
}

async function flush() {
  _flushTimer = null;
  if (_queue.length === 0) return;

  const batch = _queue.splice(0, 50);
  const sid = getSessionId();

  try {
    await fetch(`${API}/analytics/public/track-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: batch.map(e => ({ ...e, session_id: sid })),
      }),
      keepalive: true,
    });
  } catch {
    // Re-queue on failure (best-effort)
    _queue.unshift(...batch);
  }
}

export function trackEvent(event: TrackEvent) {
  if (typeof window === 'undefined') return;

  _queue.push({
    ...event,
    page_path: event.page_path || window.location.pathname,
    referrer: event.referrer || document.referrer || undefined,
    viewport_w: event.viewport_w || window.innerWidth,
    viewport_h: event.viewport_h || window.innerHeight,
  });
  scheduleFlush();
}

export function trackPageView(path?: string) {
  trackEvent({ event_type: 'page_view', page_path: path || window.location.pathname });
}

export function trackClick(
  elementId: string,
  elementText: string,
  tag: string,
  x: number,
  y: number,
  meta?: Record<string, unknown>,
) {
  trackEvent({
    event_type: 'click',
    element_id: elementId,
    element_text: elementText.slice(0, 100),
    element_tag: tag,
    click_x: Math.round(x),
    click_y: Math.round(y),
    metadata: meta,
  });
}

export function trackFunnelStep(step: number, funnelName = 'registration', meta?: Record<string, unknown>) {
  trackEvent({
    event_type: 'funnel_step',
    funnel_step: step,
    funnel_name: funnelName,
    metadata: meta,
  });
}

/** Auto-track clicks on interactive elements (buttons, links, inputs). */
export function initClickTracking() {
  if (typeof window === 'undefined') return;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    const el = target.closest('a, button, [role="button"], input[type="submit"]') as HTMLElement | null;
    if (!el) return;

    const id = el.id || el.getAttribute('data-track') || el.getAttribute('aria-label') || '';
    const text = (el as HTMLButtonElement).innerText || el.getAttribute('aria-label') || '';
    const tag = el.tagName.toLowerCase();

    if (id || text) {
      trackClick(id, text, tag, e.pageX, e.pageY);
    }
  }, { passive: true, capture: true });
}

/** Flush pending events on page unload. */
export function initBeforeUnload() {
  if (typeof window === 'undefined') return;

  const onUnload = () => {
    if (_queue.length === 0) return;
    const sid = getSessionId();
    const payload = JSON.stringify({
      events: _queue.splice(0, 50).map(e => ({ ...e, session_id: sid })),
    });
    navigator.sendBeacon?.(`${API}/analytics/public/track-batch`, new Blob([payload], { type: 'application/json' }));
  };

  window.addEventListener('pagehide', onUnload);
  window.addEventListener('beforeunload', onUnload);
}
