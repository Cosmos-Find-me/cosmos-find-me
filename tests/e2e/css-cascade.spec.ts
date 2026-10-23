import { test, expect, type Page } from '@playwright/test';

/**
 * @testSuite CSS Cascade Regression
 * @description src/styles/index.css overrides some Tailwind utilities on laptop
 * screens (<= 1920px). These checks catch cascade changes (e.g. Tailwind v3 -> v4)
 * that make those overrides double up spacing or beat responsive variants.
 */

// Children of space-y-* containers must be spaced from one side only
async function findDoubledSpacing(page: Page) {
  return page.evaluate(() => {
    const offenders: string[] = [];
    document.querySelectorAll<HTMLElement>('[class*="space-y-"]').forEach((parent) => {
      const children = Array.from(parent.children) as HTMLElement[];
      for (let i = 1; i < children.length; i++) {
        const above = parseFloat(getComputedStyle(children[i - 1]).marginBottom);
        const below = parseFloat(getComputedStyle(children[i]).marginTop);
        if (above > 0 && below > 0) {
          offenders.push(`${parent.className.slice(0, 60)} [child ${i}]: ${above}px + ${below}px`);
          break;
        }
      }
    });
    return offenders;
  });
}

test.describe('CSS Cascade Regression', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('landing page responsive text sizes win over laptop overrides', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const waitlistCopy = page.getByText('Be the first to get access to Cosmos');
    // lg:text-2xl = 1.5rem
    await expect(waitlistCopy).toHaveCSS('font-size', '24px');
  });

  test('laptop font-size overrides keep a fixed line-height', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // .text-lg is reduced to 1rem on laptops but keeps its 1.75rem line-height
    const email = page.locator('input[type="email"]');
    await expect(email).toHaveCSS('font-size', '16px');
    await expect(email).toHaveCSS('line-height', '28px');
  });

  for (const path of ['/', '/login']) {
    test(`no doubled space-y spacing on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      expect(await findDoubledSpacing(page)).toEqual([]);
    });
  }

  test('no doubled space-y spacing in the explorer panels', async ({ page }) => {
    await page.goto('/explorer?skip-intro=true');
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 45000 });
    await page.waitForTimeout(1000);

    expect(await findDoubledSpacing(page)).toEqual([]);
  });
});
