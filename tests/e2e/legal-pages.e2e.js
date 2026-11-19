import { test, expect } from '@playwright/test';

// 2026-11-06: the sample Privacy Policy and Terms (test period) open from the footer and from sign-up, and fit a phone.
for (const width of [390, 1280]) {
  test(`Privacy Policy and Terms open and fit a ${width} px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, title] of [['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service']]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId('legal-sample-note')).toContainText('Sample text for the test period');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    }

    await page.goto('/about');
    const legal = page.getByRole('navigation', { name: 'Legal' });
    await expect(legal.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    await expect(legal.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  });
}
