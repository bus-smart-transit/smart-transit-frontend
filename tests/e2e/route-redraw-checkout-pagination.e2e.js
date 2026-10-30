import { test, expect, request as pwRequest } from '@playwright/test';

// Follow-up checks for three fixes: (1) the "Redraw route line" button is on every route, (2) the checkout return page
// ends in a confirmation instead of waiting forever, (3) long lists come back one page at a time. It reads data and queues
// no route redraw. It needs the frontend on E2E_BASE_URL and the backend on E2E_API_URL, with the demo accounts.
//
// PayMongo's hosted page cannot be driven from a test, so part 2 stands in for the server's answer at the browser; the
// server's own side of it (asking PayMongo when the webhook is late) is covered by the backend test
// CheckoutStatusProviderFallbackTest.

const API = process.env.E2E_API_URL || 'http://localhost:8000/api/';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';
const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL || 'operator@smarttransit.com';

let api;
const staffToken = async (email, role) => {
  const res = await api.post('auth/login', { data: { portal: 'staff', email, password: PASSWORD, role } });
  expect(res.ok(), `${email} can sign in`).toBeTruthy();
  const body = await res.json();
  expect(body.data.otp_required).toBe(false);
  return body.data.token;
};
const as = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

test.beforeAll(async () => {
  api = await pwRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });
});
test.afterAll(async () => { await api.dispose(); });

test.describe('Redraw route line is offered on every route', () => {
  test('the server lets an Operator redraw every route, including ones no fleet is assigned to', async () => {
    const token = await staffToken(OPERATOR_EMAIL, 'operator');
    const routes = (await (await api.get('operator/routes', as(token))).json()).data;
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(route.can_regenerate_geometry, `${route.route_name} can be redrawn`).toBe(true);
    }
  });

  test('every route page shows the button, so a route added later gets it too', async ({ page }) => {
    await page.goto('/employee/login');
    await page.getByRole('button', { name: 'Operator' }).click();
    await page.getByRole('textbox', { name: /Email/ }).fill(OPERATOR_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/operator\/dashboard/, { timeout: 60000 });

    await page.goto('/employee/operator/dashboard?tab=routes');
    const openButtons = page.getByRole('button', { name: /^Open route / });
    await expect(openButtons.first()).toBeVisible({ timeout: 30000 });
    const count = await openButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const label = await openButtons.nth(index).getAttribute('aria-label');
      await openButtons.nth(index).click();
      await expect(page.getByRole('button', { name: /Redraw route line|Redrawing\.\.\.|Queuing\.\.\./ }), `${label} (route ${index + 1} of ${count}) shows the redraw button`).toBeVisible({ timeout: 30000 });
      await page.getByRole('button', { name: 'All routes' }).click();
      await expect(openButtons.first()).toBeVisible();
    }
  });
});

test.describe('Checkout return page ends in a confirmation', () => {
  const statusUrl = '**/api/payments/status**';
  const reply = (route, status) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { transaction_reference: 'TXN-E2E', status } }) });

  // The page polls every 3 s for about a minute. Each poll is a real network round trip, so the fake clock moves in small
  // steps with a short real pause between them instead of one big jump.
  const letPollingRunOut = async (page) => {
    await expect(page.getByRole('heading', { name: 'Confirming your payment...' })).toBeVisible({ timeout: 30000 });
    for (let step = 0; step < 24; step += 1) {
      await page.clock.runFor(3100);
      await page.waitForTimeout(120);
    }
  };

  test('a payment the server now reports as paid is confirmed on the return page', async ({ page }) => {
    await page.route(statusUrl, (route) => reply(route, 'paid'));
    await page.goto('/checkout/success?ref=TXN-E2E');

    await expect(page.getByRole('heading', { name: 'Payment Completed' })).toBeVisible({ timeout: 30000 });
  });

  test('when confirmation is slow the page offers "Check again", and that ends in the confirmation', async ({ page }) => {
    let answer = 'pending';
    await page.route(statusUrl, (route) => reply(route, answer));
    await page.clock.install();
    await page.goto('/checkout/success?ref=TXN-E2E');

    // About a minute of polling with nothing recorded: the page stops waiting and says so.
    await letPollingRunOut(page);
    await expect(page.getByRole('heading', { name: 'Still Confirming' })).toBeVisible();
    const again = page.getByRole('button', { name: 'Check again' });
    await expect(again).toBeVisible();

    answer = 'paid';
    await again.click();
    await expect(page.getByRole('heading', { name: 'Payment Completed' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Check again' })).toHaveCount(0);
  });

  test('an unknown reference never hangs: the real server answers and the page settles', async ({ page }) => {
    await page.clock.install();
    await page.goto('/checkout/success?ref=TXN-DOES-NOT-EXIST');

    await letPollingRunOut(page);
    await expect(page.getByRole('heading', { name: /Still Confirming|Payment/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Confirming your payment...' })).toHaveCount(0);
  });
});

test.describe('Long lists come back one page at a time', () => {
  const metaShape = (meta) => {
    expect(meta).toEqual(expect.objectContaining({ current_page: expect.any(Number), last_page: expect.any(Number), per_page: expect.any(Number), total: expect.any(Number) }));
  };

  test('driver and conductor trips and shift blocks are paged, and an oversized page is refused', async () => {
    for (const [email, role, base] of [['driver@smarttransit.com', 'driver', 'driver'], ['conductor@smarttransit.com', 'conductor', 'conductor']]) {
      const token = await staffToken(email, role);
      for (const path of [`${base}/trips`, `${base}/shift-blocks`]) {
        const res = await api.get(`${path}?per_page=2`, as(token));
        expect(res.ok(), `${path} answers`).toBeTruthy();
        const body = await res.json();
        expect(Array.isArray(body.data), `${path} data is a plain list`).toBe(true);
        expect(body.data.length).toBeLessThanOrEqual(2);
        metaShape(body.meta);
        expect(body.meta.per_page).toBe(2);
        expect((await api.get(`${path}?per_page=500`, as(token))).status(), `${path} refuses a huge page`).toBe(422);
      }
    }
  });

  test('the Operator\'s trips and shift blocks are paged too', async () => {
    const token = await staffToken(OPERATOR_EMAIL, 'operator');
    for (const path of ['operator/trips', 'operator/shift-blocks']) {
      const body = await (await api.get(`${path}?per_page=3`, as(token))).json();
      expect(body.data.length).toBeLessThanOrEqual(3);
      metaShape(body.meta);
      if (body.meta.last_page > 1) {
        const next = await (await api.get(`${path}?per_page=3&page=2`, as(token))).json();
        expect(next.meta.current_page).toBe(2);
        expect(next.data.length).toBeGreaterThan(0);
        expect(JSON.stringify(next.data[0])).not.toBe(JSON.stringify(body.data[0]));
      }
    }
  });

  test('the passenger\'s tickets, payments and rewards are paged', async () => {
    const login = await api.post('auth/login', { data: { portal: 'passenger', email: 'passenger@smarttransit.com', password: PASSWORD } });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).data.token;
    for (const path of ['passengers/tickets', 'passengers/payments', 'passengers/rewards/history']) {
      const res = await api.get(`${path}?per_page=5`, as(token));
      expect(res.ok(), `${path} answers`).toBeTruthy();
      const data = (await res.json()).data;
      const rows = Array.isArray(data) ? data : data?.data;
      expect(Array.isArray(rows), `${path} lists rows`).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(5);
    }
  });
});

test.describe('Operator portal: redraw status and the stops directory', () => {
  const signIn = async (page) => {
    await page.goto('/employee/login');
    await page.getByRole('button', { name: 'Operator' }).click();
    await page.getByRole('textbox', { name: /Email/ }).fill(OPERATOR_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/operator\/dashboard/, { timeout: 60000 });
  };

  test('every route reports its redraw state, so the page can show progress and the result', async () => {
    const token = await staffToken(OPERATOR_EMAIL, 'operator');
    const routes = (await (await api.get('operator/routes', as(token))).json()).data;
    for (const route of routes) {
      expect(route.redraw, `${route.route_name} has a redraw state`).toEqual(expect.objectContaining({ pending: expect.any(Boolean) }));
      if (route.redraw.pending) expect(route.redraw.percent).toEqual(expect.any(Number));
    }
  });

  test('the stops directory is searchable and shows ten stops at a time', async ({ page }) => {
    await signIn(page);
    await page.goto('/employee/operator/dashboard?tab=routes');
    const table = page.getByRole('table', { name: 'Stops' });
    await expect(table).toBeVisible({ timeout: 30000 });

    const summary = page.getByRole('navigation', { name: 'Stops pages' }).getByRole('status');
    const match = (await summary.textContent()).match(/Showing (\d+)-(\d+) of (\d+) stops/);
    expect(match, 'the pager says how many stops there are').not.toBeNull();
    const [, , to, total] = match.map(Number);
    expect(to).toBeLessThanOrEqual(10);
    expect(await table.getByRole('row').count() - 1).toBe(to);

    if (total > 10) {
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(summary).toContainText('Showing 11-');
      await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
    }

    // Searching by the first word of a stop name narrows the list and goes back to page one.
    const firstName = (await table.getByRole('row').nth(1).getByRole('cell').first().innerText()).split('\n')[0].trim();
    const word = firstName.split(/\s+/)[0];
    await page.getByPlaceholder(/Search stops/).fill(word);
    await expect(summary).toContainText(/Showing 1-\d+ of \d+ stops/);
    expect(await table.getByRole('row').allInnerTexts()).toEqual(expect.arrayContaining([expect.stringContaining(word)]));
    await page.getByPlaceholder(/Search stops/).fill('zzzz-no-such-stop');
    await expect(page.getByText('No stop matches this search.')).toBeVisible();
  });
});
