-- Migration: Enforce mandatory fields in quotes
-- Priority: P1 - Data integrity
-- Date: 2024-12-12

-- Step 1: Check for NULL values and report
DO $$
DECLARE
  null_buyer_count INTEGER;
  null_date_count INTEGER;
  null_currency_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_buyer_count FROM public.quotes WHERE buyer_id IS NULL;
  SELECT COUNT(*) INTO null_date_count FROM public.quotes WHERE quote_date IS NULL;
  SELECT COUNT(*) INTO null_currency_count FROM public.quotes WHERE currency_code IS NULL;
  
  RAISE NOTICE 'Quotes with NULL buyer_id: %', null_buyer_count;
  RAISE NOTICE 'Quotes with NULL quote_date: %', null_date_count;
  RAISE NOTICE 'Quotes with NULL currency_code: %', null_currency_count;
END $$;

-- Step 2: Handle NULL buyer_id - DELETE quotes without buyers
-- These are invalid quotes that cannot be fixed automatically
DELETE FROM public.quotes WHERE buyer_id IS NULL;

-- Step 3: Update other NULL values with defaults
UPDATE public.quotes 
SET quote_date = CURRENT_DATE 
WHERE quote_date IS NULL;

UPDATE public.quotes 
SET currency_code = 'USD' 
WHERE currency_code IS NULL;

-- Step 4: Add NOT NULL constraints
ALTER TABLE public.quotes
  ALTER COLUMN buyer_id SET NOT NULL,
  ALTER COLUMN quote_date SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL;

-- Step 5: Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quotes_buyer_id_fkey'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_buyer_id_fkey 
      FOREIGN KEY (buyer_id) 
      REFERENCES public.entities(id);
  END IF;
END $$;
