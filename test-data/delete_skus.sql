-- Delete all SKUs from the skus table
-- Use this to clear the table before retesting bulk upload

-- Option 1: Delete all SKUs (recommended for testing)
DELETE FROM public.skus;

-- Option 2: Delete SKUs for a specific company only
-- Replace 'YOUR_COMPANY_ID' with your actual company ID
-- DELETE FROM public.skus WHERE company_id = 'YOUR_COMPANY_ID';

-- Option 3: Delete specific SKUs by SKU code pattern
-- DELETE FROM public.skus WHERE sku_code LIKE 'RICE-%';

-- Verify deletion
SELECT COUNT(*) as remaining_skus FROM public.skus;
