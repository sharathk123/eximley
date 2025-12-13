/**
 * Assertion Helper Functions
 * Reusable assertions for E2E tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Assert list view is displayed correctly
 */
export async function assertListView(page: Page, options: {
    hasData?: boolean;
    emptyMessage?: string;
}) {
    if (options.hasData) {
        // Should have table or cards
        const hasTable = await page.locator('table tbody tr').count() > 0;
        const hasCards = await page.locator('[data-testid="card-item"]').count() > 0;
        expect(hasTable || hasCards).toBe(true);
    } else if (options.emptyMessage) {
        // Should show empty state
        await expect(page.locator(`text=${options.emptyMessage}`)).toBeVisible();
    }
}

/**
 * Assert analytics dashboard is displayed
 */
export async function assertAnalytics(page: Page) {
    // Should have summary cards
    const cards = await page.locator('[data-testid="analytics-card"]').count();
    expect(cards).toBeGreaterThanOrEqual(3);

    // Should have charts
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
}

/**
 * Assert form has required fields
 */
export async function assertForm(page: Page, fields: string[]) {
    for (const field of fields) {
        await expect(page.locator(`[name="${field}"]`)).toBeVisible();
    }
}

/**
 * Assert toast notification appears
 */
export async function assertToast(page: Page, message: string) {
    await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 3000 });
}

/**
 * Assert page has specific tabs
 */
export async function assertTabs(page: Page, tabs: string[]) {
    for (const tab of tabs) {
        await expect(page.locator(`text=${tab}`)).toBeVisible();
    }
}
