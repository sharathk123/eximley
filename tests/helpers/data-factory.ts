/**
 * Data Factory Functions
 * Create test data for E2E tests
 */

import { Page } from '@playwright/test';

export interface TestEnquiry {
    customerName: string;
    email: string;
    product: string;
    quantity: number;
    notes?: string;
}

export interface TestQuote {
    customerName: string;
    items: Array<{ product: string; quantity: number; price: number }>;
    validUntil?: string;
}

/**
 * Create a test enquiry via UI
 */
export async function createEnquiry(page: Page, data: TestEnquiry) {
    await page.goto('/enquiries');
    await page.click('text=New Enquiry');

    // Fill form
    await page.fill('input[name="customer_name"]', data.customerName);
    await page.fill('input[name="email"]', data.email);
    await page.fill('input[name="product"]', data.product);
    await page.fill('input[name="quantity"]', data.quantity.toString());

    if (data.notes) {
        await page.fill('textarea[name="notes"]', data.notes);
    }

    // Submit
    await page.click('button[type="submit"]');

    // Wait for success
    await page.waitForSelector('text=/created|success/i', { timeout: 5000 });
}

/**
 * Create a test quote via UI
 */
export async function createQuote(page: Page, data: TestQuote) {
    await page.goto('/quotes/create');

    // Fill customer info
    await page.fill('input[name="customer_name"]', data.customerName);

    // Add items
    for (const item of data.items) {
        await page.click('text=Add Item');
        await page.fill('input[name="product"]', item.product);
        await page.fill('input[name="quantity"]', item.quantity.toString());
        await page.fill('input[name="price"]', item.price.toString());
    }

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/quotes\/[a-f0-9-]+/, { timeout: 5000 });
}

/**
 * Sample test data
 */
export const SAMPLE_ENQUIRY: TestEnquiry = {
    customerName: 'Test Customer Ltd',
    email: 'customer@test.com',
    product: 'Test Product',
    quantity: 100,
    notes: 'Test enquiry for E2E testing',
};

export const SAMPLE_QUOTE: TestQuote = {
    customerName: 'Test Customer Ltd',
    items: [
        { product: 'Product A', quantity: 50, price: 10.00 },
        { product: 'Product B', quantity: 30, price: 15.00 },
    ],
};
