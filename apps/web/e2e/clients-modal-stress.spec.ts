import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? 'demo@agency.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'demo1234';
const CYCLES = Number(process.env.E2E_MODAL_CYCLES ?? 120);
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://api-production-a0a2.up.railway.app';

const MAX_AVG_OPEN_MS = Number(process.env.E2E_MAX_AVG_OPEN_MS ?? 800);
const MAX_AVG_CLOSE_MS = Number(process.env.E2E_MAX_AVG_CLOSE_MS ?? 800);
const MAX_SINGLE_OPEN_MS = Number(process.env.E2E_MAX_SINGLE_OPEN_MS ?? 3000);
const MAX_SINGLE_CLOSE_MS = Number(process.env.E2E_MAX_SINGLE_CLOSE_MS ?? 3000);
const MAX_HEAP_GROWTH_MB = Number(process.env.E2E_MAX_HEAP_GROWTH_MB ?? 120);
const IGNORE_CONSOLE_ERROR_PATTERNS = [
  /data-cursor-ref/i,
  /React DevTools/i,
  /Failed to load pipeline data:\s*TypeError:\s*Failed to fetch/i,
];

async function readHeapUsageMB(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize?: number };
    };
    const bytes = perf.memory?.usedJSHeapSize;
    return typeof bytes === 'number' ? bytes / (1024 * 1024) : null;
  });
}

async function loginAndOpenClients(page: Page, request: APIRequestContext): Promise<void> {
  const loginResp = await request.post(`${API_BASE}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });

  let accessToken: string | null = null;
  if (loginResp.ok()) {
    const payload = (await loginResp.json()) as { access_token?: string };
    accessToken = payload.access_token ?? null;
  } else {
    const businessResp = await request.post(`${API_BASE}/auth/business/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(businessResp.ok(), 'Business login failed in test setup').toBe(true);
    const payload = (await businessResp.json()) as { access_token?: string };
    accessToken = payload.access_token ?? null;
  }
  expect(accessToken, 'No access token returned in test setup').toBeTruthy();

  const persistValue = JSON.stringify({
    state: {
      token: accessToken,
      user: null,
      lastActivity: Date.now(),
    },
    version: 0,
  });

  await page.goto('/login');
  await page.evaluate((value) => {
    localStorage.setItem('palmcare-auth', value);
    localStorage.setItem('palmcare-walkthrough-seen', 'true');
  }, persistValue);
  await page.goto('/clients', { waitUntil: 'domcontentloaded' });
  expect(page.url().includes('/login'), 'Token seeding failed, redirected to login').toBe(false);
  await page.waitForFunction(
    () =>
      !!document.querySelector('[data-testid="open-quick-add-client"]') ||
      window.location.pathname.startsWith('/login'),
    { timeout: 60_000 },
  );
  expect(page.url().includes('/login'), 'Auth session expired before clients loaded').toBe(false);
}

test.describe('Clients quick-add modal stress checks', () => {
  test('handles 120 open/close cycles without degradation', async ({ page, request }, testInfo) => {
    test.setTimeout(Math.max(10 * 60 * 1000, CYCLES * 8_000));
    page.setDefaultTimeout(8_000);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORE_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await loginAndOpenClients(page, request);

    const openQuickAdd = page.getByTestId('open-quick-add-client');
    const modal = page.getByTestId('quick-add-modal');
    const closeModal = page.getByTestId('quick-add-close');

    await expect(openQuickAdd).toBeVisible();

    // Verify mobile layout quickly before stress loop.
    await page.setViewportSize({ width: 390, height: 844 });
    await openQuickAdd.click({ timeout: 3_000 });
    await expect(modal).toBeVisible();
    await expect(page.getByText('Add New Client')).toBeVisible();
    await closeModal.click({ timeout: 3_000 });
    await expect(modal).toBeHidden();

    // Stress loop on desktop viewport for consistent timing.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(openQuickAdd).toBeVisible();

    const openTimes: number[] = [];
    const closeTimes: number[] = [];
    const heapSamples: number[] = [];

    const baselineHeap = await readHeapUsageMB(page);
    if (baselineHeap !== null) heapSamples.push(baselineHeap);

    for (let i = 0; i < CYCLES; i += 1) {
      const openStart = Date.now();
      await openQuickAdd.click({ timeout: 3_000 });
      await modal.waitFor({ state: 'visible', timeout: 5_000 });
      openTimes.push(Date.now() - openStart);

      const closeStart = Date.now();
      await closeModal.click({ timeout: 3_000 });
      await modal.waitFor({ state: 'hidden', timeout: 5_000 });
      closeTimes.push(Date.now() - closeStart);

      if ((i + 1) % 20 === 0) {
        const heapNow = await readHeapUsageMB(page);
        if (heapNow !== null) heapSamples.push(heapNow);
      }
    }

    // Route switching sanity check after stress.
    for (const route of ['/pipeline', '/leads', '/clients']) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route}$`));
    }

    const finalHeap = await readHeapUsageMB(page);
    if (finalHeap !== null) heapSamples.push(finalHeap);

    const avg = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    const max = (values: number[]) => Math.max(...values);

    const avgOpen = avg(openTimes);
    const avgClose = avg(closeTimes);
    const maxOpen = max(openTimes);
    const maxClose = max(closeTimes);

    const heapGrowthMB =
      baselineHeap !== null && finalHeap !== null ? finalHeap - baselineHeap : null;

    await testInfo.attach('clients-modal-stress-metrics', {
      contentType: 'application/json',
      body: JSON.stringify(
        {
          cycles: CYCLES,
          avgOpen,
          avgClose,
          maxOpen,
          maxClose,
          baselineHeapMB: baselineHeap,
          finalHeapMB: finalHeap,
          heapGrowthMB,
          heapSamplesMB: heapSamples,
          consoleErrors,
          pageErrors,
        },
        null,
        2,
      ),
    });

    expect(consoleErrors, 'Unexpected console errors during stress run').toEqual([]);
    expect(pageErrors, 'Unexpected uncaught page errors during stress run').toEqual([]);

    expect(avgOpen, `Average open time exceeded ${MAX_AVG_OPEN_MS}ms`).toBeLessThan(
      MAX_AVG_OPEN_MS,
    );
    expect(avgClose, `Average close time exceeded ${MAX_AVG_CLOSE_MS}ms`).toBeLessThan(
      MAX_AVG_CLOSE_MS,
    );
    expect(maxOpen, `Single open exceeded ${MAX_SINGLE_OPEN_MS}ms`).toBeLessThan(
      MAX_SINGLE_OPEN_MS,
    );
    expect(maxClose, `Single close exceeded ${MAX_SINGLE_CLOSE_MS}ms`).toBeLessThan(
      MAX_SINGLE_CLOSE_MS,
    );

    if (heapGrowthMB !== null) {
      expect(
        heapGrowthMB,
        `Heap growth exceeded ${MAX_HEAP_GROWTH_MB}MB across ${CYCLES} cycles`,
      ).toBeLessThan(MAX_HEAP_GROWTH_MB);
    }
  });
});
