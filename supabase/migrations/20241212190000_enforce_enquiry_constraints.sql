-- Migration: Enforce mandatory fields in enquiries
-- Priority: P1 - Data integrity
-- Date: 2024-12-12
-- WARNING: This will fail if existing records have NULL values in these fields

-- Step 1: Update existing NULL values with defaults (if any exist)
UPDATE public.enquiries 
SET customer_email = 'noemail@placeholder.com' 
WHERE customer_email IS NULL;

UPDATE public.enquiries 
SET customer_phone = '+00 0000000000' 
WHERE customer_phone IS NULL;

UPDATE public.enquiries 
SET source = 'other' 
WHERE source IS NULL;

-- Step 2: Add NOT NULL constraints
ALTER TABLE public.enquiries
  ALTER COLUMN customer_email SET NOT NULL,
  ALTER COLUMN customer_phone SET NOT NULL,
  ALTER COLUMN source SET NOT NULL;

-- Add constraint to ensure valid email format (basic check)
ALTER TABLE public.enquiries
  ADD CONSTRAINT enquiries_email_format CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add constraint to ensure source is from valid enum
ALTER TABLE public.enquiries
  ADD CONSTRAINT enquiries_source_valid CHECK (source IN ('website', 'referral', 'trade_show', 'social_media', 'email', 'phone', 'other'));
