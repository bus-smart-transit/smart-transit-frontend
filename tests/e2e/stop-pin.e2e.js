import { test, expect } from '@playwright/test';

// 2026-11-06 (Batch 47 part A): a company admin adds a stop by placing a pin on the map (search helps find the place),
// and the stop is saved where the pin is. The test stop is deleted
// at the end. Place suggestions come from the live place service through our backend, so the test only checks them
// when the service answers.

const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL || 'operator@smarttransit.com';
const OPERATOR_PASSWORD = process.env.E2E_OPERATOR_PASSWORD || 'password123';

async function signIn(page) {
  await page.goto('/employee/login');
  await page.getByRole('textbox', { name: /Email/ }).fill(OPERATOR_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(OPERATOR_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/operator\/dashboard/, { timeout: 60000 });
}

for (const [width, height] of [[1280, 900], [390, 844]]) {
  test(`adds a stop with a map pin at ${width} px`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${String(error).slice(0, 200)}`));
    page.on('response', (response) => { if (response.status() >= 500) problems.push(`${response.status()} ${new URL(response.url()).pathname}`); });

    await signIn(page);
    await page.goto('/employee/operator/dashboard?tab=routes');
    await expect(page.getByRole('table', { name: 'Stops' })).toBeVisible({ timeout: 30000 });


    await page.getByRole('button', { name: 'Add stop' }).click();
    const dialog = page.getByRole('dialog');
    const name = `Pin test ${width} ${Date.now() % 100000}`;
    await dialog.getByLabel('Stop name').fill(name);
    // Batch 56 (user): no Area or landmark box; the city or town is filled from the pin.
    await expect(dialog.getByTestId('stop-town-note')).toContainText('The city or town is filled in from the pin when you save.');

    // Search helps find a place; when the service answers, picking a result sets the pin.
    await dialog.getByRole('combobox').fill('public market');
    const firstOption = dialog.getByRole('option').first();
    const suggested = await firstOption.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    if (suggested) {
      await firstOption.click();
      await expect(dialog.getByLabel('Latitude')).not.toHaveValue('');
    }

    // Tapping the map moves the pin there.
    const map = dialog.getByRole('application', { name: 'Map for placing the stop' });
    await expect(map.locator('canvas')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1500);
    const before = await dialog.getByLabel('Latitude').inputValue();
    await map.click({ position: { x: 60, y: 60 } }); // away from the centre, where a picked place puts the pin
    await expect(dialog.getByLabel('Latitude')).not.toHaveValue(before);
    await page.screenshot({ path: testInfo.outputPath(`stop-pin-${width}.png`) });

    // The phone layout has a full-screen map.
    await dialog.getByRole('button', { name: 'Full screen map' }).click();
    await expect(page.getByText('Tap the map to place the stop')).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();

    // A pin off a road or outside the region is refused by the server; a tap on the map may land on either, so use
    // the place of a seeded stop, a little apart, which is on a road.
    const seeded = await page.evaluate(async () => {
      const token = sessionStorage.getItem('staff_token');
      const res = await fetch('/api/operator/stops', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      const rows = (await res.json()).data;
      return rows.find((row) => !String(row.stop_name).startsWith('Pin test'));
    });
    await dialog.getByLabel('Latitude').fill(String(Number(seeded.latitude) + 0.0001));
    await dialog.getByLabel('Longitude').fill(String(Number(seeded.longitude)));
    await dialog.getByRole('button', { name: 'Create stop' }).click();
    await expect(dialog).toBeHidden({ timeout: 20000 });
    await expect(page.getByText(/Stop created successfully\. .* is only \d+ m away\. Is this the same stop\?/)).toBeVisible();

    // Batch 56: the server fills the city or town from the pin a few seconds after saving (a queued lookup).
    const townOf = () => page.evaluate(async (stopName) => {
      const token = sessionStorage.getItem('staff_token');
      const res = await fetch('/api/operator/stops', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      return (await res.json()).data.find((r) => r.stop_name === stopName)?.municipality ?? null;
    }, name);
    await expect.poll(townOf, { timeout: 60000, message: 'the town is filled from the pin' }).toBeTruthy();
    const town = await townOf();
    await page.reload();
    await expect(page.getByRole('table', { name: 'Stops' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('searchbox', { name: 'Search stops' }).fill(name);
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row.getByText('Pinned')).toBeVisible();
    await expect(row.getByText(town, { exact: true })).toBeVisible();

    page.once('dialog', (confirm) => confirm.accept());
    await page.getByRole('button', { name: `Delete stop ${name}` }).click();
    await expect(page.getByText('Stop deleted successfully.')).toBeVisible();

    expect(problems).toEqual([]);
    await context.close();
  });
}
