import { test, expect, type Page } from '@playwright/test';

/**
 * @testSuite Explorer Visual Regression
 * @description Screenshot baselines for the explorer's panels and modals, at a
 * laptop width (where the app uses its compact sizes) and a wide desktop width.
 * The graph canvas is masked: its layout isn't part of what these guard.
 */

const viewports = [
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'wide', width: 2560, height: 1440 },
];

async function openExplorer(page: Page) {
  await page.goto('/explorer?skip-intro=true');
  await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 45000 });
  // The Next.js dev tools badge overlaps the settings button
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForTimeout(1500);
}

async function expectScreen(page: Page, name: string) {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
    mask: [page.locator('canvas')],
  });
}

for (const viewport of viewports) {
  test.describe(`Explorer visuals (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('company list and tabs', async ({ page }) => {
      await openExplorer(page);
      await expectScreen(page, `explorer-list-${viewport.name}`);
    });

    test('CMF panel', async ({ page }) => {
      await openExplorer(page);
      await page.getByRole('button', { name: 'Expand CMF details panel' }).click();
      await page.waitForTimeout(500);
      await expectScreen(page, `explorer-cmf-${viewport.name}`);
    });

    test('company details', async ({ page }) => {
      await openExplorer(page);
      await page.getByText('ServiceNow', { exact: true }).last().click();
      await page.waitForTimeout(800);
      await expectScreen(page, `explorer-detail-${viewport.name}`);
    });

    test('settings', async ({ page }) => {
      await openExplorer(page);
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.waitForTimeout(500);
      await expectScreen(page, `explorer-settings-${viewport.name}`);
    });
  });
}
