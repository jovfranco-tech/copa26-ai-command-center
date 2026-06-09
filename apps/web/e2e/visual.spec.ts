import { test, expect } from '@playwright/test';

/**
 * Visual regression — chromium only (a single baseline set). Baselines are
 * generated in CI (Linux) by the "Update visual baselines" workflow and committed;
 * a local macOS run would need its own (gitignored) baselines.
 *
 * The sidebar (brand + nav + footer) is a deterministic target — it doesn't depend
 * on API data, so the snapshot is stable across runs.
 */
test.describe('visual regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'baseline is chromium-only');

  test('app shell sidebar', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot('sidebar.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
});
