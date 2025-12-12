-- Migration: Add vessel and consignee fields to shipping_bills
-- Priority: P0 - Critical - Cannot file shipping bills without these fields
-- Date: 2024-12-12

-- Add missing mandatory fields to shipping_bills table
ALTER TABLE public.shipping_bills
  ADD COLUMN IF NOT EXISTS vessel_name TEXT,
  ADD COLUMN IF NOT EXISTS voyage_number TEXT,
  ADD COLUMN IF NOT EXISTS number_of_packages INTEGER,
  ADD COLUMN IF NOT EXISTS gross_weight NUMERIC,
  ADD COLUMN IF NOT EXISTS net_weight NUMERIC,
  ADD COLUMN IF NOT EXISTS ad_code TEXT,
  ADD COLUMN IF NOT EXISTS consignee_name TEXT,
  ADD COLUMN IF NOT EXISTS consignee_address TEXT,
  ADD COLUMN IF NOT EXISTS consignee_country TEXT,
  ADD COLUMN IF NOT EXISTS container_numbers TEXT,
  ADD COLUMN IF NOT EXISTS seal_numbers TEXT,
  ADD COLUMN IF NOT EXISTS marks_and_numbers TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipping_bills_vessel ON public.shipping_bills(vessel_name);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_ad_code ON public.shipping_bills(ad_code);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_consignee_country ON public.shipping_bills(consignee_country);

-- Add comments for documentation
COMMENT ON COLUMN public.shipping_bills.vessel_name IS 'Ship/Flight name - MANDATORY for customs filing';
COMMENT ON COLUMN public.shipping_bills.voyage_number IS 'Voyage/Flight number';
COMMENT ON COLUMN public.shipping_bills.number_of_packages IS 'Total number of packages - MANDATORY for customs';
COMMENT ON COLUMN public.shipping_bills.gross_weight IS 'Total gross weight in KGS - MANDATORY for customs';
COMMENT ON COLUMN public.shipping_bills.net_weight IS 'Total net weight in KGS - MANDATORY for customs';
COMMENT ON COLUMN public.shipping_bills.ad_code IS 'Authorized Dealer Code - MANDATORY for forex tracking and RBI compliance';
COMMENT ON COLUMN public.shipping_bills.consignee_name IS 'Buyer/Consignee name - MANDATORY';
COMMENT ON COLUMN public.shipping_bills.consignee_address IS 'Complete consignee address - MANDATORY';
COMMENT ON COLUMN public.shipping_bills.consignee_country IS 'Destination country - MANDATORY';
COMMENT ON COLUMN public.shipping_bills.container_numbers IS 'Container numbers (comma-separated if multiple)';
COMMENT ON COLUMN public.shipping_bills.seal_numbers IS 'Seal numbers (comma-separated if multiple)';
COMMENT ON COLUMN public.shipping_bills.marks_and_numbers IS 'Shipping marks and numbers on packages';
