-- Migration: Add payment and shipping fields to export_orders
-- Priority: P1 - Required for forex compliance and contract management
-- Date: 2024-12-12

-- Add payment and shipping fields to export_orders table
ALTER TABLE public.export_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS shipment_period TEXT,
  ADD COLUMN IF NOT EXISTS latest_shipment_date DATE,
  ADD COLUMN IF NOT EXISTS advance_percentage NUMERIC,
  ADD COLUMN IF NOT EXISTS lc_number TEXT,
  ADD COLUMN IF NOT EXISTS lc_issuing_bank TEXT,
  ADD COLUMN IF NOT EXISTS partial_shipment_allowed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS transhipment_allowed BOOLEAN DEFAULT true;

-- Add constraint for payment method
ALTER TABLE public.export_orders
  DROP CONSTRAINT IF EXISTS export_orders_payment_method_check;

ALTER TABLE public.export_orders
  ADD CONSTRAINT export_orders_payment_method_check 
  CHECK (payment_method IN ('LC', 'TT', 'DA', 'DP', 'CAD', 'Advance', NULL));

-- Add constraint for advance percentage
ALTER TABLE public.export_orders
  ADD CONSTRAINT export_orders_advance_percentage_check 
  CHECK (advance_percentage IS NULL OR (advance_percentage >= 0 AND advance_percentage <= 100));

-- Add comments for documentation
COMMENT ON COLUMN public.export_orders.payment_method IS 'Payment method: LC (Letter of Credit), TT (Telegraphic Transfer), DA (Documents Against Acceptance), DP (Documents Against Payment), CAD (Cash Against Documents), Advance';
COMMENT ON COLUMN public.export_orders.shipment_period IS 'Shipment timeline (e.g., "Within 30 days from order date")';
COMMENT ON COLUMN public.export_orders.latest_shipment_date IS 'Last date for shipment - critical for LC and contract compliance';
COMMENT ON COLUMN public.export_orders.advance_percentage IS 'Percentage of advance payment (0-100)';
COMMENT ON COLUMN public.export_orders.lc_number IS 'Letter of Credit number if payment method is LC';
COMMENT ON COLUMN public.export_orders.lc_issuing_bank IS 'Bank issuing the LC';
