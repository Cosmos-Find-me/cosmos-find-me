import { test, expect } from '@playwright/test';

/**
 * Critical interaction tests to prevent regression of core features
 * These tests would have caught the node selection and infinite loop issues
 */

test.describe('Critical User Interactions', () => {
  // Helper function for common page setup
  // Note: We avoid 'networkidle' as it's unreliable on webkit due to analytics/polling
  async function setupPage(page: any) {
    await page.goto('/explorer?skip-intro=true');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the graph container with extended timeout
    // The auth verification can sometimes be slow, especially under parallel load
    try {
      await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 45000 });
    } catch {
      // If we timed out, try to get more info for debugging
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        throw new Error('Authentication failed - redirected to login page');
      }
      throw new Error(`Page load timed out at URL: ${currentUrl}`);
    }

    // Brief additional wait for any initial renders to complete
    await page.waitForTimeout(1000);
  }

  test('should maintain node selection without flickering', async ({ page }) => {
    await setupPage(page);
    // Wait for graph to load
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 20000 });
    
    // Monitor network requests to detect infinite loops
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/user/data')) {
        apiCalls.push(request.url());
      }
    });

    // Try to click on a company node (simulate node selection)
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    await canvas.click({ position: { x: 200, y: 200 } });

    // Wait a moment for any effects to trigger
    await page.waitForTimeout(2000);

    // Should not have excessive API calls (infinite loop detection)
    expect(apiCalls.length).toBeLessThan(5);

    // Look for company detail panel or selected state indicators
    // This ensures selection actually worked and wasn't immediately cleared
    const detailPanel = page.locator('[class*="detail"], [class*="panel"], [class*="selected"]');
    
    // At least one selection indicator should be visible
    const hasSelectionIndicator = await detailPanel.count() > 0;
    expect(hasSelectionIndicator).toBeTruthy();
  });

  test('should not trigger infinite API calls on page load', async ({ page }) => {
    const apiCalls: string[] = [];
    const startTime = Date.now();

    // Set up monitoring BEFORE navigation
    page.on('request', request => {
      if (request.url().includes('/api/user/data')) {
        apiCalls.push(request.url());
      }
    });

    // Navigate and load
    await setupPage(page);

    // Wait additional time to catch any delayed infinite loops
    await page.waitForTimeout(3000);

    const duration = Date.now() - startTime;

    // One load per page, even on the dev server, where Strict Mode re-runs the
    // mount effect (AppContainer guards against that)
    expect(apiCalls.length).toBe(1);

    // Should not take excessively long due to infinite loops
    expect(duration).toBeLessThan(15000); // 15 seconds max
  });

  test('should handle rapid user interactions without breaking', async ({ page }) => {
    await setupPage(page);
    await page.waitForSelector('[data-cy="cytoscape-container"]', { timeout: 20000 });
    
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    
    // Perform rapid clicks to test selection stability
    for (let i = 0; i < 5; i++) {
      await canvas.click({ position: { x: 150 + i * 20, y: 150 + i * 10 } });
      await page.waitForTimeout(100); // Brief pause between clicks
    }

    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();

    // Should not show any error toasts or broken states
    // Sonner toasts have data-sonner-toast attribute, check for error/destructive variants
    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });

  test('should maintain performance under load', async ({ page }) => {
    // Set up console monitoring BEFORE navigation
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and load
    await setupPage(page);

    // Interact with various UI elements
    const canvas = page.locator('[data-cy="cytoscape-container"] canvas').first();
    
    // Simulate user browsing behavior
    for (let i = 0; i < 10; i++) {
      await canvas.click({ position: { x: 100 + i * 15, y: 100 + i * 15 } });
      await page.waitForTimeout(200);
    }

    // Should not have performance-related console errors
    const performanceErrors = consoleErrors.filter(error => 
      error.includes('Maximum update depth') || 
      error.includes('infinite') ||
      error.includes('Too many re-renders')
    );
    
    expect(performanceErrors).toHaveLength(0);
  });

  test('should recover gracefully from errors', async ({ page }) => {
    // Set up route mock BEFORE navigation
    await page.route('/api/user/data', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    // Navigate with mocked error response
    await page.goto('/explorer?skip-intro=true');
    await page.waitForLoadState('domcontentloaded');
    // Wait for app to attempt loading (even with error, some UI should render)
    await page.waitForTimeout(3000);

    // Should handle error gracefully without crashing
    // The app should still render (not white screen of death)
    await expect(page.locator('body')).toBeVisible();

    // Should not have infinite loops or excessive console errors
    await page.waitForTimeout(2000);

    // Page should remain functional (not frozen)
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    expect(isResponsive).toBe(true);
  });

  // next/image only optimizes local URLs with a query string that match
  // images.localPatterns; /api/logo?domain=... crashed the page in dev and
  // returned 400 in production until next.config.js allowed it
  for (const button of ['Settings', 'Add Company']) {
    test(`opens ${button} with its logos loaded`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await setupPage(page);
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

      await page.getByRole('button', { name: button, exact: true }).first().click();

      const logos = page.locator('img[src*="api%2Flogo"], img[src*="/api/logo"]');
      await expect(logos.first()).toBeVisible();
      await expect.poll(() =>
        logos.evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0))
      ).toBe(true);
      expect(pageErrors).toEqual([]);
    });
  }
});
