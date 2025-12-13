/**
 * Dashboard & Navigation E2E Tests
 * Tests for dashboard display and navigation
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should display dashboard correctly', async ({ page }) => {
        await page.goto('/dashboard');

        // Should have dashboard title or content
        const hasContent = await page.locator('main').isVisible();
        expect(hasContent).toBe(true);

        // Should have navigation menu
        await expect(page.locator('nav')).toBeVisible();
    });

    test('should display stats cards', async ({ page }) => {
        // Wait for dashboard to load
        await page.waitForTimeout(1000);

        // Should have at least some stat cards
        const cards = await page.locator('.shadow-stripe').count();
        expect(cards).toBeGreaterThan(0);
    });

    test('should navigate to modules from sidebar', async ({ page }) => {
        await page.goto('/dashboard');

        const modules = [
            { name: 'Enquiries', url: '/enquiries' },
            { name: 'Quotes', url: '/quotes' },
            { name: 'Orders', url: '/orders' },
        ];

        for (const module of modules) {
            // Click sidebar link
            await page.click(`nav >> text=${module.name}`);

            // Should navigate to module
            await expect(page).toHaveURL(new RegExp(module.url));

            // Go back to dashboard
            await page.goto('/dashboard');
        }
    });
});

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should navigate between all modules', async ({ page }) => {
        const modules = [
            { name: 'Enquiries', url: '/enquiries' },
            { name: 'Quotes', url: '/quotes' },
            { name: 'Proforma', url: '/invoices/proforma' },
            { name: 'Orders', url: '/orders' },
            { name: 'Purchase Orders', url: '/purchase-orders' },
            { name: 'Shipping Bills', url: '/shipping-bills' },
        ];

        for (const module of modules) {
            await page.goto(module.url);
            await expect(page).toHaveURL(new RegExp(module.url));
        }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
        await page.goto('/enquiries');
        await page.goto('/quotes');
        await page.goto('/orders');

        // Go back
        await page.goBack();
        await expect(page).toHaveURL(/\/quotes/);

        // Go back again
        await page.goBack();
        await expect(page).toHaveURL(/\/enquiries/);

        // Go forward
        await page.goForward();
        await expect(page).toHaveURL(/\/quotes/);
    });

    test('should display breadcrumbs correctly', async ({ page }) => {
        await page.goto('/orders');

        // Check if breadcrumbs exist
        const breadcrumbs = await page.locator('[data-testid="breadcrumb"], nav[aria-label="breadcrumb"]').count();
        if (breadcrumbs > 0) {
            await expect(page.locator('text=Orders')).toBeVisible();
        }
    });
});
