/**
 * Authentication & Onboarding E2E Tests
 * Tests for signup, login, logout flows
 */

import { test, expect } from '@playwright/test';
import { signup, login, logout, isAuthenticated } from '../helpers/auth';

test.describe('Authentication', () => {
    test('should display login page', async ({ page }) => {
        await page.goto('/login');

        // Check for login-related text (more flexible)
        const hasLoginText = await page.locator('text=/welcome|sign in|login/i').count() > 0;
        expect(hasLoginText).toBe(true);

        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty login', async ({ page }) => {
        await page.goto('/login');

        await page.click('button[type="submit"]');

        // Should show validation errors
        const errors = await page.locator('text=/required|invalid/i').count();
        expect(errors).toBeGreaterThan(0);
    });

    test('should login with valid credentials', async ({ page }) => {
        await login(page);

        // Should be on dashboard
        await expect(page).toHaveURL(/\/dashboard/);

        // Should be authenticated
        const authenticated = await isAuthenticated(page);
        expect(authenticated).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.fill('input[name="email"]', 'invalid@example.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.locator('text=/invalid|incorrect|failed/i')).toBeVisible({ timeout: 5000 });
    });

    test('should logout successfully', async ({ page }) => {
        await login(page);
        await logout(page);

        // Should be on login page
        await expect(page).toHaveURL(/\/login/);

        // Should not be authenticated
        const authenticated = await isAuthenticated(page);
        expect(authenticated).toBe(false);
    });

    test('should persist session on page reload', async ({ page }) => {
        await login(page);

        // Reload page
        await page.reload();

        // Should still be authenticated
        const authenticated = await isAuthenticated(page);
        expect(authenticated).toBe(true);
    });

    test('should redirect to login when not authenticated', async ({ page }) => {
        await page.goto('/dashboard');

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('Sign Up', () => {
    test('should display signup page', async ({ page }) => {
        await page.goto('/signup');

        await expect(page.locator('h1, h2')).toContainText(/sign up|register/i);
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
        await page.goto('/signup');

        await page.fill('input[name="email"]', 'invalid-email');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Should show email validation error
        await expect(page.locator('text=/valid email|email format/i')).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
        await page.goto('/signup');

        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', '123'); // Too short
        await page.click('button[type="submit"]');

        // Should show password validation error
        await expect(page.locator('text=/password.*characters|password.*long/i')).toBeVisible();
    });
});
