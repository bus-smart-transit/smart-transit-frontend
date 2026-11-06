import { expect, test } from '@playwright/test';

// 2026-11-04: replaces the mocked Reports test in the old dropoff-policy.e2e.js (its two route tests were removed;
// RoutesPage.test.jsx covers them). This one runs against the real local backend: the Operator
// opens Reports, runs each of the three reports for a seeded fleet, and the page shows results with no failed calls.
// Needs the app on E2E_BASE_URL and its backend with the demo seeders (staff sign in without the emailed code).

const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL || 'operator@smarttransit.com';
const PASSWORD = process.env.E2E_PASSWORD || 'password123';

const manilaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

async function signIn(page) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(OPERATOR_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/operator\/dashboard/, { timeout: 60000 });
}

function watch(page) {
  const problems = [];
  const reportCalls = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/') && response.status() >= 400) problems.push(`${response.status()} ${response.request().method()} ${url}`);
    if (url.includes('/reports/')) reportCalls.push(url);
  });
  return { problems, reportCalls };
}

async function runReport(page) {
  const fleet = page.getByLabel('Fleet');
  await expect(fleet.locator('option')).not.toHaveCount(1);
  await fleet.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Run report' }).click();
}

test('Reports: the Operator runs Route Adherence, Occupancy Trends and Daily Summary for a fleet', async ({ page }) => {
  const seen = watch(page);
  await signIn(page);
  await page.goto('/employee/operator/dashboard?tab=reports');
  await expect(page.getByRole('heading', { name: 'Fleet Reports' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Select a fleet and run a report.')).toBeVisible();

  await runReport(page);
  const adherence = page.getByRole('region', { name: 'Route Adherence results' });
  await expect(adherence).toBeVisible({ timeout: 30000 });
  await expect(adherence.getByText('GPS-verified trips')).toBeVisible();
  await expect(adherence.getByText('Completion proxies')).toBeVisible();
  await expect(adherence.getByRole('table', { name: 'Trip stop coverage' }).or(adherence.getByText('No trips in this fleet and period.'))).toBeVisible();

  await page.getByRole('tab', { name: 'Occupancy Trends' }).click();
  await runReport(page);
  await expect(page.getByRole('region', { name: 'Occupancy Trends results' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('region', { name: 'Average occupancy by scheduled departure hour' })).toBeVisible();

  const today = manilaDate();
  await page.getByRole('tab', { name: 'Daily Summary' }).click();
  await page.getByLabel('Report date').fill(today);
  await runReport(page);
  const daily = page.getByRole('region', { name: 'Daily Summary results' });
  await expect(daily).toBeVisible({ timeout: 30000 });
  await expect(daily.getByText('Gross paid revenue')).toBeVisible();
  await expect(page.getByTestId('report-period')).toContainText(today);

  const dailyCall = seen.reportCalls.find((url) => url.includes('/reports/daily-summary'));
  expect(dailyCall, 'the Daily Summary asked the server').toBeTruthy();
  expect(new URL(dailyCall).searchParams.get('date')).toBe(today);
  expect(new URL(dailyCall).searchParams.has('start_date')).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(daily).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'no sideways scroll at 390 px').toBeLessThanOrEqual(1);

  expect(seen.problems, seen.problems.join('\n')).toEqual([]);
});
