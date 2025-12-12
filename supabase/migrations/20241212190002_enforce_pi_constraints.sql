-- Migration: Enforce mandatory fields in proforma_invoices
-- Priority: P1 - Data integrity
-- Date: 2024-12-12
-- WARNING: This will fail if existing records have NULL values in these fields

-- Step 1: Check for NULL values (informational)
DO $$
DECLARE
  null_buyer_count INTEGER;
  null_date_count INTEGER;
  null_currency_count INTEGER;
  null_rate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_buyer_count FROM public.proforma_invoices WHERE buyer_id IS NULL;
  SELECT COUNT(*) INTO null_date_count FROM public.proforma_invoices WHERE date IS NULL;
  SELECT COUNT(*) INTO null_currency_count FROM public.proforma_invoices WHERE currency_code IS NULL;
  SELECT COUNT(*) INTO null_rate_count FROM public.proforma_invoices WHERE conversion_rate IS NULL;
  
  RAISE NOTICE 'PIs with NULL buyer_id: %', null_buyer_count;
  RAISE NOTICE 'PIs with NULL date: %', null_date_count;
  RAISE NOTICE 'PIs with NULL currency_code: %', null_currency_count;
  RAISE NOTICE 'PIs with NULL conversion_rate: %', null_rate_count;
  
  IF null_buyer_count > 0 OR null_date_count > 0 OR null_currency_count > 0 OR null_rate_count > 0 THEN
    RAISE WARNING 'Found PIs with NULL mandatory fields. Please clean data before applying constraints.';
  END IF;
END $$;

-- Step 2: Update NULL values with defaults
UPDATE public.proforma_invoices 
SET date = CURRENT_DATE 
WHERE date IS NULL;

UPDATE public.proforma_invoices 
SET currency_code = 'USD' 
WHERE currency_code IS NULL;

UPDATE public.proforma_invoices 
SET conversion_rate = 1.0 
WHERE conversion_rate IS NULL;

-- Step 3: Add NOT NULL constraints
ALTER TABLE public.proforma_invoices
  ALTER COLUMN buyer_id SET NOT NULL,
  ALTER COLUMN date SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL,
  ALTER COLUMN conversion_rate SET NOT NULL;

-- Add constraint to ensure conversion_rate is positive
ALTER TABLE public.proforma_invoices
  ADD CONSTRAINT pi_conversion_rate_positive CHECK (conversion_rate > 0);

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proforma_invoices_buyer_id_fkey'
  ) THEN
    ALTER TABLE public.proforma_invoices
      ADD CONSTRAINT proforma_invoices_buyer_id_fkey 
      FOREIGN KEY (buyer_id) 
      REFERENCES public.entities(id);
  END IF;
END $$;
