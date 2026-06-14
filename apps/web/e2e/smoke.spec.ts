import { test, expect } from '@playwright/test';

test.describe('Copa 2026 dashboard — smoke', () => {
  test('home loads with the Copa26 Command Center brand', async ({ page }) => {
    await page.goto('/');
    
    // Smoke check: Wait for the app shell / layout to appear
    await expect(page.locator('header h1')).toBeVisible();

    // Verify correct branding in body
    const body = await page.textContent('body');
    expect(body).toMatch(/Copa 2026/i);
    expect(body).not.toMatch(/powered by fifa|official tournament/i);
  });

  test('language toggle switches ES ⇄ EN with no flash of the wrong language', async ({ page }) => {
    await page.goto('/');
    // Spanish default
    await expect(page.getByText('Proyecto personal · sin afiliación oficial.')).toBeVisible();

    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByText('Personal project · no official affiliation.')).toBeVisible();

    await page.getByRole('button', { name: 'ES', exact: true }).click();
    await expect(page.getByText('Proyecto personal · sin afiliación oficial.')).toBeVisible();
  });

  test('Aloria attribution links to aloria.mx in a new tab, accessibly', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /aloria/i }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://aloria.mx');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  });

  test('primary navigation reaches a lazy route (Standings)', async ({ page }) => {
    await page.goto('/standings');
    // The standings route is lazy-loaded; it should resolve and render content.
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page).toHaveURL(/\/standings/);
  });
});
