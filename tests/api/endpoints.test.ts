import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || process.env.SUPABASE_ANON_KEY || '';

if (!AUTH_TOKEN) {
    console.warn('Warning: No auth token set. Set TEST_AUTH_TOKEN or SUPABASE_ANON_KEY env variable.');
}

const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
};

describe('Export Orders API', () => {
    it('should require authentication', async () => {
        const res = await fetch(`${BASE_URL}/api/orders`);
        expect(res.status).toBeGreaterThanOrEqual(401);
    });

    it('should list orders with auth', async () => {
        const res = await fetch(`${BASE_URL}/api/orders`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('orders');
        expect(Array.isArray(data.orders)).toBe(true);
    });

    it('should reject invalid order creation', async () => {
        const res = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ invalid: 'data' }),
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data).toHaveProperty('error');
    });

    it('should validate required fields', async () => {
        const res = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                currency_code: 'USD',
                // Missing buyer_id, order_date, items
            }),
        });

        expect(res.status).toBe(400);
    });
});

describe('Purchase Orders API', () => {
    it('should list purchase orders', async () => {
        const res = await fetch(`${BASE_URL}/api/purchase-orders`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('purchase_orders');
        expect(Array.isArray(data.purchase_orders)).toBe(true);
    });

    it('should reject invalid PO creation', async () => {
        const res = await fetch(`${BASE_URL}/api/purchase-orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ invalid: 'data' }),
        });

        expect(res.status).toBe(400);
    });
});

describe('Shipping Bills API', () => {
    it('should list shipping bills', async () => {
        const res = await fetch(`${BASE_URL}/api/shipping-bills`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('shippingBills');
        expect(Array.isArray(data.shippingBills)).toBe(true);
    });

    it('should reject invalid SB creation', async () => {
        const res = await fetch(`${BASE_URL}/api/shipping-bills`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ invalid: 'data' }),
        });

        expect(res.status).toBe(400);
    });
});

describe('Proforma Invoices API', () => {
    it('should list proforma invoices', async () => {
        const res = await fetch(`${BASE_URL}/api/invoices/proforma`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('invoices');
        expect(Array.isArray(data.invoices)).toBe(true);
    });
});

describe('Quotes API', () => {
    it('should list quotes', async () => {
        const res = await fetch(`${BASE_URL}/api/quotes`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('quotes');
        expect(Array.isArray(data.quotes)).toBe(true);
    });
});

describe('Enquiries API', () => {
    it('should list enquiries', async () => {
        const res = await fetch(`${BASE_URL}/api/enquiries`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('enquiries');
        expect(Array.isArray(data.enquiries)).toBe(true);
    });
});

describe('Master Data APIs', () => {
    it('should list buyers', async () => {
        const res = await fetch(`${BASE_URL}/api/entities?type=buyer`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('entities');
    });

    it('should list suppliers', async () => {
        const res = await fetch(`${BASE_URL}/api/entities?type=supplier`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('entities');
    });

    it('should list SKUs', async () => {
        const res = await fetch(`${BASE_URL}/api/skus`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('skus');
    });

    it('should list currencies', async () => {
        const res = await fetch(`${BASE_URL}/api/currencies`, { headers });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty('currencies');
    });
});

describe('Workflow APIs', () => {
    it('should return 404 for approve with invalid ID', async () => {
        const res = await fetch(`${BASE_URL}/api/invoices/proforma/invalid-id/approve`, {
            method: 'POST',
            headers,
        });

        expect(res.status).toBe(404);
    });

    it('should return 404 for reject with invalid ID', async () => {
        const res = await fetch(`${BASE_URL}/api/orders/invalid-id/reject`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reason: 'test' }),
        });

        expect(res.status).toBe(404);
    });
});

describe('PDF Generation APIs', () => {
    it('should return 404 for PDF with invalid PI ID', async () => {
        const res = await fetch(`${BASE_URL}/api/invoices/proforma/invalid-id/generate-pdf`, {
            method: 'POST',
            headers,
        });

        expect(res.status).toBe(404);
    });

    it('should return 404 for PDF with invalid order ID', async () => {
        const res = await fetch(`${BASE_URL}/api/orders/invalid-id/generate-pdf`, {
            method: 'POST',
            headers,
        });

        expect(res.status).toBe(404);
    });
});
