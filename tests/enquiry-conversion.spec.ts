
import { test, expect } from '@playwright/test';

test.describe('Enquiry to Quote Conversion', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Enquiries List
        await page.route('/api/enquiries*', async route => {
            await route.fulfill({
                json: {
                    enquiries: [
                        {
                            id: 'e1',
                            enquiry_number: 'ENQ-001',
                            customer_name: 'Test Customer',
                            status: 'new',
                            created_at: new Date().toISOString(),
                            enquiry_items: [
                                {
                                    id: 'ei1',
                                    quantity: 10,
                                    target_price: 100,
                                    notes: 'Test Item',
                                    skus: { name: 'Product A', sku_code: 'PA-01' }
                                }
                            ]
                        }
                    ]
                }
            });
        });

        // Mock Convert API
        await page.route('/api/enquiries/convert', async route => {
            if (route.request().method() === 'POST') {
                const body = route.request().postDataJSON();
                if (body.enquiry_id === 'e1') {
                    await route.fulfill({
                        json: {
                            quote: { id: 'q1', quote_number: 'Q-100' },
                            enquiry_id: 'e1'
                        }
                    });
                } else {
                    await route.fallback();
                }
            } else {
                await route.continue();
            }
        });

        // Mock Quotes Fetch (Target page)
        await page.route('/api/quotes*', async route => {
            await route.fulfill({
                json: {
                    quotes: [
                        { id: 'q1', quote_number: 'Q-100', status: 'draft', entities: { name: 'Test Customer' }, total_amount: 1000, quote_date: new Date().toISOString() }
                    ]
                }
            });
        });

        await page.goto('/login');
        await page.fill('input[type="email"]', 'sharath.babuk@gmail.com');
        await page.fill('input[type="password"]', 'pass1234');
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard');
    });

    test('should convert enquiry to quote successfully', async ({ page }) => {
        await page.goto('/enquiries');

        // 1. Open Enquiry Details
        // Click on the first row or "View Details"
        // Wait for table
        await page.locator('table').waitFor();
        // Monitor console for errors
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        // Monitor network traffic to ensure API is called
        const convertRequestPromise = page.waitForRequest(request =>
            request.url().includes('/api/enquiries/convert') && request.method() === 'POST'
        );

        // 2. Click "Quote" button in the list row? NO, let's test the Header button which was broken.
        // Navigate to details
        await page.locator('tbody tr').first().click({ force: true });

        // Wait for page header to load
        await expect(page.locator('h2')).toContainText('ENQ-001');

        // Click "Create Quote" in Header
        const createQuoteBtn = page.locator('button', { hasText: 'Create Quote' });
        await expect(createQuoteBtn).toBeVisible();
        await createQuoteBtn.click();

        // Wait for the API call to happen
        await convertRequestPromise;

        // 3. Verify Success Toast
        // Use a more generic text matcher just in case
        await expect(page.locator(":text-matches('converted successfully', 'i')")).toBeVisible();

        // Wait for redirect to quotes page (or click view quote)
        // Since our mock returns a redirect URL or the frontend logic pushes router.
        // Let's check if we can click "View Quote" on the toast
        const viewQuoteBtn = page.locator('button:has-text("View Quote")');
        if (await viewQuoteBtn.isVisible()) {
            await viewQuoteBtn.click();
        }

        // 4. Verify we are on Quotes page
        await expect(page).toHaveURL(/\/quotes/);

        // Verify the new quote is listed
        await expect(page.locator('text="Q-100"')).toBeVisible();
    });

});
