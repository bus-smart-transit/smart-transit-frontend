import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// UI baseline of the Operator portal: every sidebar item and view at 1280 px and 390 px. It reads what the running
// app shows; it changes nothing. The data is whatever the local database holds, so screenshots taken on another day
// differ in content, not in layout. Output: docs/ui-baseline/screens/<page>_<width>.png and docs/ui-baseline/report.json.

const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL || 'operator@smarttransit.com';
const OPERATOR_PASSWORD = process.env.E2E_OPERATOR_PASSWORD || 'password123';
const OUT = path.resolve('docs/ui-baseline');

const PAGES = [
  ['dashboard', 'tab=dashboard'],
  ['staffs', 'tab=staffs'],
  ['fleets', 'tab=fleets'],
  ['routes', 'tab=routes'],
  ['schedule-calendar', 'tab=schedule&view=calendar'],
  ['schedule-blocks', 'tab=schedule&view=blocks'],
  ['schedule-trips', 'tab=schedule&view=trips'],
  ['finance-overview', 'tab=finance&view=overview'],
  ['finance-transactions', 'tab=finance&view=transactions'],
  ['finance-remittances', 'tab=finance&view=remittances'],
  ['finance-refunds', 'tab=finance&view=refunds'],
  ['reports', 'tab=reports'],
  ['account', 'tab=account'],
];

const WIDTHS = [[1280, 900], [390, 844]];

async function signIn(page) {
  await page.goto('/employee/login');
  await page.getByRole('button', { name: 'Operator' }).click();
  await page.getByRole('textbox', { name: /Email/ }).fill(OPERATOR_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(OPERATOR_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/operator\/dashboard/, { timeout: 60000 });
}

test('Operator portal baseline screenshots', async ({ browser }) => {
  mkdirSync(path.join(OUT, 'screens'), { recursive: true });
  const report = [];

  for (const [width, height] of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${String(error).slice(0, 200)}`));
    page.on('response', (response) => { if (response.status() >= 500) problems.push(`${response.status()} ${new URL(response.url()).pathname}`); });

    await signIn(page);
    for (const [name, query] of PAGES) {
      await page.goto(`/employee/operator/dashboard?${query}`);
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, 'screens', `${name}_${width}.png`), fullPage: true });
      const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      report.push({ page: name, width, overflowX: size.scroll > size.client });
    }

    // The Blocks card opens one modal with the crew and the legs (Batch 35).
    await page.goto('/employee/operator/dashboard?tab=schedule&view=blocks');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.getByRole('button', { name: 'All', exact: true }).click(); // the default view hides past blocks
    const card = page.getByTestId('shift-block-card').first();
    if (await card.count()) {
      await card.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(600); // the dialog fades in
      await page.screenshot({ path: path.join(OUT, 'screens', `schedule-blocks-modal_${width}.png`) });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }

    report.push({ width, problems: [...new Set(problems)] });
    await context.close();
  }

  writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  expect(report.filter((row) => row.problems?.length)).toEqual([]);
});
