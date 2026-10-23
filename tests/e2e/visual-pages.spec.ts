import { test, expect } from '@playwright/test';

/**
 * @testSuite Public Page Visual Regression
 * @description Screenshot baselines for pages styled mostly by Tailwind utilities
 * in app/. Guards against CSS regressions from Tailwind or PostCSS upgrades.
 */

const pages = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'reset-password', path: '/reset-password' },
];

test.describe('Public Page Visual Regression', () => {
  for (const { name, path } of pages) {
    test(`${name} page matches baseline`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Let fonts and entry transitions settle
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        animations: 'disabled',
        // Static pages: much stricter than the 5% default used for the graph
        maxDiffPixelRatio: 0.005,
        mask: [page.locator('canvas')],
      });
    });
  }
});
