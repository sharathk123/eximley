-- Migration: Add Indian export compliance fields to proforma_items
-- Priority: P0 - Critical for GST and customs compliance
-- Date: 2024-12-12

-- Add missing fields to proforma_items table
ALTER TABLE public.proforma_items
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS unit_of_measurement TEXT,
  ADD COLUMN IF NOT EXISTS net_weight NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_weight NUMERIC DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proforma_items_hsn ON public.proforma_items(hsn_code);

-- Add comments for documentation
COMMENT ON COLUMN public.proforma_items.hsn_code IS 'HSN code for GST and customs compliance - MANDATORY for Indian exports';
COMMENT ON COLUMN public.proforma_items.unit_of_measurement IS 'Unit of Measurement (PCS, KGS, MTR, etc.) - Required for customs';
COMMENT ON COLUMN public.proforma_items.net_weight IS 'Net weight per item - Required for shipping bill';
COMMENT ON COLUMN public.proforma_items.gross_weight IS 'Gross weight per item - Required for shipping bill';
