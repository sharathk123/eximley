/**
 * Analytics E2E Tests
 * Tests for analytics dashboards across all modules
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Analytics Dashboards', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    const modules = [
        { name: 'Enquiries', url: '/enquiries' },
        { name: 'Quotes', url: '/quotes' },
        { name: 'Proforma Invoices', url: '/invoices/proforma' },
        { name: 'Orders', url: '/orders' },
        { name: 'Shipping Bills', url: '/shipping-bills' },
        { name: 'Purchase Orders', url: '/purchase-orders' },
    ];

    for (const module of modules) {
        test(`should toggle analytics on ${module.name}`, async ({ page }) => {
            await page.goto(module.url);

            // Find and click analytics toggle button
            const analyticsButton = page.locator('button[title*="Analytics"], button >> svg.lucide-bar-chart-3');
            await analyticsButton.click();

            // Analytics dashboard should be visible
            await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 5000 });

            // Toggle back to list view
            await analyticsButton.click();

            // List view should be visible again
            const hasTable = await page.locator('table').isVisible().catch(() => false);
            const hasTabs = await page.locator('[role="tablist"]').isVisible().catch(() => false);
            expect(hasTable || hasTabs).toBe(true);
        });

        test(`should display summary cards on ${module.name} analytics`, async ({ page }) => {
            await page.goto(module.url);

            // Toggle analytics
            await page.click('button[title*="Analytics"], button >> svg.lucide-bar-chart-3');

            // Should have at least 3 summary cards
            const cards = await page.locator('.card, [data-testid="analytics-card"]').count();
            expect(cards).toBeGreaterThanOrEqual(3);
        });

        test(`should display charts on ${module.name} analytics`, async ({ page }) => {
            await page.goto(module.url);

            // Toggle analytics
            await page.click('button[title*="Analytics"], button >> svg.lucide-bar-chart-3');

            // Should have area chart
            await expect(page.locator('.recharts-area')).toBeVisible({ timeout: 5000 });

            // Should have pie chart
            await expect(page.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
        });
    }

    test('should display correct metrics in analytics cards', async ({ page }) => {
        await page.goto('/enquiries');

        // Toggle analytics
        await page.click('button[title*="Analytics"], button >> svg.lucide-bar-chart-3');

        // Check for metric values (numbers)
        const metricValues = await page.locator('.text-2xl.font-bold').count();
        expect(metricValues).toBeGreaterThan(0);
    });

    test('should render charts without errors', async ({ page }) => {
        await page.goto('/orders');

        // Toggle analytics
        await page.click('button[title*="Analytics"], button >> svg.lucide-bar-chart-3');

        // Wait for charts to render
        await page.waitForSelector('.recharts-wrapper', { timeout: 5000 });

        // Check for chart elements
        const hasChartData = await page.locator('.recharts-surface').count() > 0;
        expect(hasChartData).toBe(true);
    });
});
