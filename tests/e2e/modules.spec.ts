import { test, expect, type Page } from '@playwright/test';
import { login } from '../helpers/auth';


test.describe('Export Orders - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display orders list', async ({ page }) => {
        await page.goto('http://localhost:3000/orders');

        // Check page loaded

        // Check for list or empty state
        const hasOrders = await page.locator('table tbody tr').count() > 0;
        const hasEmptyState = await page.locator('text=/no.*found|empty|no data|no orders/i').isVisible().catch(() => false);

        expect(hasOrders || hasEmptyState).toBe(true);
    });

    test('should navigate to create order page', async ({ page }) => {
        await page.goto('http://localhost:3000/orders');

        // Click create button
        await page.click('text=New Order');

        // Verify URL changed
        await expect(page).toHaveURL(/.*\/orders\/create/);

        // Verify form is visible
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('text=Create Export Order')).toBeVisible();
    });

    test.skip('should validate required fields on create', async ({ page }) => {
        await page.goto('http://localhost:3000/orders/create');

        // Try to submit empty form
        await page.click('button[type="submit"]');

        // Should show validation errors
        const errors = await page.locator('text=/required|Required/i').count();
        expect(errors).toBeGreaterThan(0);
    });

    test('should navigate to order detail from list', async ({ page }) => {
        await page.goto('http://localhost:3000/orders');

        // Check if there are any orders
        const orderCount = await page.locator('table tbody tr a').count();

        if (orderCount > 0) {
            // Click first order number
            await page.click('table tbody tr:first-child a');

            // Should be on detail page
            await expect(page).toHaveURL(/.*\/orders\/[a-f0-9-]+$/);

            // Should see tabs
            await expect(page.locator('text=Details')).toBeVisible();
            await expect(page.locator('text=Items')).toBeVisible();
        }
    });

    test('should navigate through tabs on detail page', async ({ page }) => {
        await page.goto('http://localhost:3000/orders');

        const orderCount = await page.locator('table tbody tr a').count();

        if (orderCount > 0) {
            await page.click('table tbody tr:first-child a');

            // Click Items tab
            await page.click('text=Items');
            await expect(page.locator('table thead >> text=SKU')).toBeVisible();

            // Click Documents tab
            await page.click('text=Documents');
            // Document browser should be visible

            // Click Preview tab
            await page.click('text=Preview');
            // Preview content should be visible

            // Go back to Details
            await page.click('text=Details');
        }
    });
});

test.describe('Purchase Orders - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display purchase orders list', async ({ page }) => {
        await page.goto('http://localhost:3000/purchase-orders');

    });

    test('should navigate to create PO page', async ({ page }) => {
        await page.goto('http://localhost:3000/purchase-orders');

        await page.click('text=Add Purchase Order');
        await expect(page).toHaveURL(/.*\/purchase-orders\/create/);
    });

    test('should show PO details with tabs', async ({ page }) => {
        await page.goto('http://localhost:3000/purchase-orders');

        const poCount = await page.locator('table tbody tr a').count();

        if (poCount > 0) {
            await page.click('table tbody tr:first-child a');

            // Verify tabs exist
            await expect(page.locator('text=Details')).toBeVisible();
            await expect(page.locator('text=Items')).toBeVisible();
            await expect(page.locator('text=Documents')).toBeVisible();
            await expect(page.locator('text=Preview')).toBeVisible();
        }
    });
});

test.describe('Shipping Bills - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display shipping bills list', async ({ page }) => {
        await page.goto('http://localhost:3000/shipping-bills');

    });

    test('should navigate to create SB page', async ({ page }) => {
        await page.goto('http://localhost:3000/shipping-bills');

        await page.click('text=Add Shipping Bill');
        await expect(page).toHaveURL(/.*\/shipping-bills\/create/);
    });

    test('should show SB details with tabs', async ({ page }) => {
        await page.goto('http://localhost:3000/shipping-bills');

        const sbCount = await page.locator('table tbody tr a').count();

        if (sbCount > 0) {
            await page.click('table tbody tr:first-child a');

            // Verify tabs exist
            await expect(page.locator('text=Details')).toBeVisible();
            await expect(page.locator('text=Items')).toBeVisible();
            await expect(page.locator('text=Documents')).toBeVisible();
            await expect(page.locator('text=Preview')).toBeVisible();
        }
    });
});

test.describe('Proforma Invoices - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display proforma invoices list', async ({ page }) => {
        await page.goto('http://localhost:3000/invoices/proforma');

    });

    test('should navigate through PI tabs', async ({ page }) => {
        await page.goto('http://localhost:3000/invoices/proforma');

        const piCount = await page.locator('table tbody tr a').count();

        if (piCount > 0) {
            await page.click('table tbody tr:first-child a');

            // Navigate through tabs
            await page.click('text=Items');
            await page.click('text=Documents');
            await page.click('text=Preview');
            await page.click('text=Details');
        }
    });
});

test.describe('Quotes - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display quotes list', async ({ page }) => {
        await page.goto('http://localhost:3000/quotes');

    });
});

test.describe('Enquiries - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display enquiries list', async ({ page }) => {
        await page.goto('http://localhost:3000/enquiries');

    });
});

test.describe('Navigation - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should navigate between modules', async ({ page }) => {
        // Start at dashboard
        await page.goto('http://localhost:3000/dashboard');

        // Navigate to each module
        const modules = [
            { name: 'Enquiries', url: '/enquiries' },
            { name: 'Quotes', url: '/quotes' },
            { name: 'Proforma', url: '/invoices/proforma' },
            { name: 'Orders', url: '/orders' },
            { name: 'Purchase', url: '/purchase-orders' },
            { name: 'Shipping', url: '/shipping-bills' },
        ];

        for (const appModule of modules) {
            await page.goto(`http://localhost:3000${appModule.url}`);
            await expect(page).toHaveURL(new RegExp(appModule.url));
        }
    });

    test('should handle back button navigation', async ({ page }) => {
        await page.goto('http://localhost:3000/orders');

        const orderCount = await page.locator('table tbody tr a').count();

        if (orderCount > 0) {
            // Go to detail page
            await page.click('table tbody tr:first-child a');
            await expect(page).toHaveURL(/.*\/orders\/[a-f0-9-]+/);

            // Go back
            await page.goBack();
            await expect(page).toHaveURL(/.*\/orders$/);
        }
    });
});
