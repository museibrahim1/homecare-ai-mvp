import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? 'demo@agency.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'demo1234';
const CYCLES = Number(process.env.E2E_MODAL_CYCLES ?? 120);

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

async function loginAndOpenClients(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  let authenticated = false;
  for (let attempt = 0; attempt < 3 && !authenticated; attempt += 1) {
    await page.getByLabel('Email address').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);

    await page.getByRole('button', { name: 'Sign in' }).click();

    try {
      await page.waitForURL(/\/(welcome|dashboard|clients)/, { timeout: 12_000 });
      authenticated = true;
      break;
    } catch {
      // On very early clicks, the form can submit as plain HTML GET before hydration.
      // Retry once hydrated to keep the stress test deterministic.
      if (page.url().includes('/login?')) {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(250);
      }
    }
  }

  expect(authenticated, 'Unable to authenticate in test setup').toBe(true);

  if (page.url().includes('/welcome')) {
    await page.goto('/clients');
  }

  if (!page.url().includes('/clients')) {
    await page.goto('/clients');
  }

  await expect(page).toHaveURL(/\/clients/);
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible();
}

test.describe('Clients quick-add modal stress checks', () => {
  test('handles 120 open/close cycles without degradation', async ({ page }, testInfo) => {
    test.setTimeout(Math.max(10 * 60 * 1000, CYCLES * 8_000));

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORE_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await loginAndOpenClients(page);

    const openQuickAdd = page.getByTestId('open-quick-add-client');
    const modal = page.getByTestId('quick-add-modal');
    const closeModal = page.getByTestId('quick-add-close');

    await expect(openQuickAdd).toBeVisible();

    // Verify mobile layout quickly before stress loop.
    await page.setViewportSize({ width: 390, height: 844 });
    await openQuickAdd.click();
    await expect(modal).toBeVisible();
    await expect(page.getByText('Add New Client')).toBeVisible();
    await closeModal.click();
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
      await openQuickAdd.click();
      await modal.waitFor({ state: 'visible', timeout: 5_000 });
      openTimes.push(Date.now() - openStart);

      const closeStart = Date.now();
      await closeModal.click();
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
