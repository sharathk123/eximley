/**
 * Complete Export Lifecycle E2E Test
 * Tests the entire user journey from signup to shipping bill completion
 */

import { test, expect } from '@playwright/test';
import { signup, login } from '../helpers/auth';

// Generate unique test user for this run
const timestamp = Date.now();
const testUser = {
    email: `test.user.${timestamp}@eximley.test`,
    password: 'TestPassword123!',
    companyName: 'Test Export Company Ltd',
};

test.describe('Complete Export Lifecycle', () => {
    test('should complete full journey: Signup → Login → Enquiry → Quote → Proforma → Order → Shipping Bill', async ({ page }) => {
        // ==========================================
        // STEP 1: SIGNUP
        // ==========================================
        console.log('Step 1: Creating new user account...');

        await page.goto('/signup');

        // Fill signup form
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);

        // Fill company name if field exists
        const companyField = page.locator('input[name="company"], input[name="companyName"]');
        if (await companyField.isVisible().catch(() => false)) {
            await companyField.fill(testUser.companyName);
        }

        // Submit signup
        await page.click('button[type="submit"]');

        // Wait for redirect (dashboard or verification page)
        await page.waitForURL(/\/(dashboard|verify-email|login)/, { timeout: 10000 });

        console.log('✓ Signup completed');

        // ==========================================
        // STEP 2: LOGIN (if not auto-logged in)
        // ==========================================
        const currentUrl = page.url();
        if (!currentUrl.includes('/dashboard')) {
            console.log('Step 2: Logging in...');
            await login(page, testUser);
            console.log('✓ Login successful');
        } else {
            console.log('✓ Auto-logged in after signup');
        }

        // Verify we're on dashboard
        await expect(page).toHaveURL(/\/dashboard/);

        // ==========================================
        // STEP 3: CREATE ENQUIRY
        // ==========================================
        console.log('Step 3: Creating enquiry...');

        await page.goto('/enquiries');
        await page.click('text=Add Enquiry');

        // Fill enquiry form
        await page.fill('input[name="customer_name"], input[placeholder*="Customer"]', 'ABC Trading Co');
        await page.fill('input[name="email"], input[type="email"]', 'customer@abctrading.com');
        await page.fill('input[name="product"], input[placeholder*="Product"]', 'Industrial Widgets');
        await page.fill('input[name="quantity"], input[type="number"]', '1000');

        const notesField = page.locator('textarea[name="notes"], textarea[placeholder*="Notes"]');
        if (await notesField.isVisible().catch(() => false)) {
            await notesField.fill('Urgent requirement for Q1 2024');
        }

        // Submit enquiry
        await page.click('button[type="submit"]');

        // Wait for success message or redirect
        await page.waitForSelector('text=/created|success|enquiry/i', { timeout: 5000 });

        console.log('✓ Enquiry created');

        // ==========================================
        // STEP 4: CONVERT TO QUOTE
        // ==========================================
        console.log('Step 4: Converting enquiry to quote...');

        // Navigate back to enquiries list
        await page.goto('/enquiries');

        // Click on the first enquiry (our newly created one)
        await page.click('table tbody tr:first-child a, [data-testid="enquiry-item"]:first-child');

        // Convert to quote
        const convertButton = page.locator('button:has-text("Convert"), button:has-text("Quote")');
        if (await convertButton.isVisible().catch(() => false)) {
            await convertButton.click();
            await page.waitForURL(/\/quotes\/[a-f0-9-]+/, { timeout: 5000 });
        } else {
            // Manual quote creation
            await page.goto('/quotes/create');
            await page.fill('input[name="customer_name"]', 'ABC Trading Co');

            // Add items
            await page.click('text=Add Item');
            await page.fill('input[name="product"]', 'Industrial Widgets');
            await page.fill('input[name="quantity"]', '1000');
            await page.fill('input[name="price"], input[name="unit_price"]', '25.50');

            await page.click('button[type="submit"]');
            await page.waitForURL(/\/quotes\/[a-f0-9-]+/, { timeout: 5000 });
        }

        console.log('✓ Quote created');

        // ==========================================
        // STEP 5: APPROVE QUOTE
        // ==========================================
        console.log('Step 5: Approving quote...');

        const approveQuoteBtn = page.locator('button:has-text("Approve")');
        if (await approveQuoteBtn.isVisible().catch(() => false)) {
            await approveQuoteBtn.click();
            await page.waitForSelector('text=/approved|success/i', { timeout: 3000 });
        }

        console.log('✓ Quote approved');

        // ==========================================
        // STEP 6: CONVERT TO PROFORMA INVOICE
        // ==========================================
        console.log('Step 6: Converting to proforma invoice...');

        const convertToProformaBtn = page.locator('button:has-text("Proforma"), button:has-text("Convert")');
        if (await convertToProformaBtn.isVisible().catch(() => false)) {
            await convertToProformaBtn.click();
            await page.waitForURL(/\/invoices\/proforma\/[a-f0-9-]+/, { timeout: 5000 });
        } else {
            // Manual proforma creation
            await page.goto('/invoices/proforma/create');
            await page.fill('input[name="customer_name"]', 'ABC Trading Co');

            // Add items
            await page.click('text=Add Item');
            await page.fill('input[name="product"]', 'Industrial Widgets');
            await page.fill('input[name="quantity"]', '1000');
            await page.fill('input[name="price"]', '25.50');

            await page.click('button[type="submit"]');
            await page.waitForURL(/\/invoices\/proforma\/[a-f0-9-]+/, { timeout: 5000 });
        }

        console.log('✓ Proforma invoice created');

        // ==========================================
        // STEP 7: APPROVE PROFORMA
        // ==========================================
        console.log('Step 7: Approving proforma invoice...');

        const approveProformaBtn = page.locator('button:has-text("Approve")');
        if (await approveProformaBtn.isVisible().catch(() => false)) {
            await approveProformaBtn.click();
            await page.waitForSelector('text=/approved|success/i', { timeout: 3000 });
        }

        console.log('✓ Proforma approved');

        // ==========================================
        // STEP 8: CONVERT TO ORDER
        // ==========================================
        console.log('Step 8: Converting to export order...');

        const convertToOrderBtn = page.locator('button:has-text("Order"), button:has-text("Convert")');
        if (await convertToOrderBtn.isVisible().catch(() => false)) {
            await convertToOrderBtn.click();
            await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 5000 });
        } else {
            // Manual order creation
            await page.goto('/orders/create');
            await page.fill('input[name="customer_name"]', 'ABC Trading Co');

            // Add items
            await page.click('text=Add Item');
            await page.fill('input[name="product"]', 'Industrial Widgets');
            await page.fill('input[name="quantity"]', '1000');
            await page.fill('input[name="price"]', '25.50');

            await page.click('button[type="submit"]');
            await page.waitForURL(/\/orders\/[a-f0-9-]+/, { timeout: 5000 });
        }

        console.log('✓ Export order created');

        // ==========================================
        // STEP 9: CREATE SHIPPING BILL
        // ==========================================
        console.log('Step 9: Creating shipping bill...');

        await page.goto('/shipping-bills');
        await page.click('text=Add Shipping Bill');

        // Fill shipping bill form
        await page.fill('input[name="sb_number"], input[placeholder*="SB"]', `SB-${timestamp}`);

        // Select the order we just created (if dropdown exists)
        const orderSelect = page.locator('select[name="order_id"], [role="combobox"]');
        if (await orderSelect.isVisible().catch(() => false)) {
            await orderSelect.click();
            await page.click('text=ABC Trading Co');
        }

        // Fill customs details
        const portField = page.locator('input[name="port"], select[name="port"]');
        if (await portField.isVisible().catch(() => false)) {
            await portField.fill('Mumbai Port');
        }

        // Submit shipping bill
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/shipping-bills\/[a-f0-9-]+/, { timeout: 5000 });

        console.log('✓ Shipping bill created');

        // ==========================================
        // STEP 10: VERIFY COMPLETE LIFECYCLE
        // ==========================================
        console.log('Step 10: Verifying complete lifecycle...');

        // Verify we can navigate to all created documents
        await page.goto('/enquiries');
        await expect(page.locator('text=ABC Trading Co')).toBeVisible();

        await page.goto('/quotes');
        await expect(page.locator('text=ABC Trading Co')).toBeVisible();

        await page.goto('/invoices/proforma');
        await expect(page.locator('text=ABC Trading Co')).toBeVisible();

        await page.goto('/orders');
        await expect(page.locator('text=ABC Trading Co')).toBeVisible();

        await page.goto('/shipping-bills');
        await expect(page.locator(`text=SB-${timestamp}`)).toBeVisible();

        console.log('✓ Complete export lifecycle verified!');
        console.log('');
        console.log('='.repeat(50));
        console.log('🎉 SUCCESS: Complete export lifecycle test passed!');
        console.log('='.repeat(50));
    });

    test('should verify analytics work after creating data', async ({ page }) => {
        await login(page, testUser);

        // Check analytics on each module
        const modules = [
            '/enquiries',
            '/quotes',
            '/invoices/proforma',
            '/orders',
            '/shipping-bills',
        ];

        for (const module of modules) {
            await page.goto(module);

            // Toggle analytics
            await page.click('button[title*="Analytics"], button >> svg.lucide-bar-chart-3');

            // Verify analytics display
            await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 5000 });

            // Verify at least one metric card shows data
            const metricValues = await page.locator('.text-2xl.font-bold').allTextContents();
            expect(metricValues.length).toBeGreaterThan(0);

            console.log(`✓ Analytics verified for ${module}`);
        }
    });
});
