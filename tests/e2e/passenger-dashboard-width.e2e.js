import { test, expect } from '@playwright/test';

// 2026-11-06 (found on production 2026-11-04 and again 2026-11-06): the passenger dashboard's wide tables (Bus Schedule,
// Recent Bookings) pushed the page 156 px past a 390 px screen. They must scroll inside their cards instead.
for (const width of [390, 1280]) {
  test(`the passenger dashboard fits a ${width} px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/passenger/dashboard');
    await expect(page.getByRole('heading', { name: 'Bus Schedule' })).toBeVisible({ timeout: 30000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
