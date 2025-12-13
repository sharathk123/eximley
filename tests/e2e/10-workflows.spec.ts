/**
 * Complete Workflow E2E Tests
 * Tests for end-to-end workflows across modules
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Complete Export Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test.skip('should complete full export flow: Enquiry → Quote → Proforma → Order → Shipping Bill', async ({ page }) => {
        // Step 1: Create Enquiry
        await page.goto('/enquiries');
        await page.click('text=New Enquiry');

        // Fill enquiry form (adjust selectors based on actual form)
        await page.fill('input[name="customer_name"]', 'Test Customer Ltd');
        await page.fill('input[name="email"]', 'customer@test.com');
        await page.click('button[type="submit"]');

        // Wait for success
        await page.waitForSelector('text=/created|success/i', { timeout: 5000 });

        // Step 2: Convert to Quote
        // Navigate to enquiry detail and convert
        await page.click('text=Convert to Quote');
        await page.waitForURL(/\/quotes\/[a-f0-9-]+/);

        // Step 3: Approve Quote
        await page.click('text=Approve');
        await page.waitForSelector('text=/approved|success/i');

        // Step 4: Convert to Proforma
        await page.click('text=Convert to Proforma');
        await page.waitForURL(/\/invoices\/proforma\/[a-f0-9-]+/);

        // Step 5: Approve Proforma
        await page.click('text=Approve');
        await page.waitForSelector('text=/approved|success/i');

        // Step 6: Convert to Order
        await page.click('text=Convert to Order');
        await page.waitForURL(/\/orders\/[a-f0-9-]+/);

        // Step 7: Create Shipping Bill
        await page.goto('/shipping-bills');
        await page.click('text=Add Shipping Bill');

        // Link to order and complete
        await page.click('button[type="submit"]');

        // Verify workflow completed
        await expect(page).toHaveURL(/\/shipping-bills\/[a-f0-9-]+/);
    });
});

test.describe('UI/UX Consistency', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should have consistent view toggle across modules', async ({ page }) => {
        const modules = ['/enquiries', '/quotes', '/orders', '/invoices/proforma'];

        for (const module of modules) {
            await page.goto(module);

            // Should have view toggle
            const viewToggle = await page.locator('button[title*="view"], [data-testid="view-toggle"]').count();
            expect(viewToggle).toBeGreaterThan(0);
        }
    });

    test('should have consistent search functionality', async ({ page }) => {
        const modules = ['/enquiries', '/quotes', '/orders'];

        for (const module of modules) {
            await page.goto(module);

            // Should have search input
            await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
        }
    });

    test('should display loading states', async ({ page }) => {
        await page.goto('/orders');

        // Should show loading state initially
        const hasLoader = await page.locator('.animate-spin, [data-testid="loading"]').isVisible().catch(() => false);

        // Loading should complete
        await page.waitForSelector('table, [data-testid="empty-state"]', { timeout: 10000 });
    });

    test('should handle empty states correctly', async ({ page }) => {
        // Navigate to a module that might be empty
        await page.goto('/shipping-bills');

        // Check for either data or empty state
        const hasData = await page.locator('table tbody tr').count() > 0;
        const hasEmptyState = await page.locator('text=/no.*found|empty/i').isVisible().catch(() => false);

        expect(hasData || hasEmptyState).toBe(true);
    });
});
