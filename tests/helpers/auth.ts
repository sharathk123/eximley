/**
 * Authentication Helper Functions
 * Reusable functions for auth flows in E2E tests
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
    email: string;
    password: string;
    companyName?: string;
}

/**
 * Sign up a new user
 */
export async function signup(page: Page, user: TestUser) {
    await page.goto('/signup');

    // Fill signup form
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    if (user.companyName) {
        await page.fill('input[name="company"]', user.companyName);
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect (either to dashboard or email verification)
    await page.waitForURL(/\/(dashboard|verify-email)/, { timeout: 10000 });
}

/**
 * Login existing user
 */
export async function login(page: Page, user?: TestUser) {
    const email = user?.email || process.env.TEST_EMAIL || 'testuser_v1@example.com';
    const password = user?.password || process.env.TEST_PASSWORD || 'NewPass123!';

    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
    // Click user menu
    await page.click('[data-testid="user-menu"]');

    // Click logout
    await page.click('text=Logout');

    // Wait for redirect to login
    await page.waitForURL('**/login', { timeout: 5000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
    try {
        await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get auth token from cookies/storage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'sb-access-token' || c.name === 'auth-token');
    return authCookie?.value || null;
}
