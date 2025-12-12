-- Migration: Add missing logistics fields to proforma_invoices
-- Priority: P0 - Critical data loss fix
-- Date: 2024-12-12

-- Add logistics columns that are currently in the UI but missing from DB
ALTER TABLE public.proforma_invoices
  ADD COLUMN IF NOT EXISTS incoterm TEXT,
  ADD COLUMN IF NOT EXISTS incoterm_place TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS port_of_loading TEXT,
  ADD COLUMN IF NOT EXISTS port_of_discharge TEXT,
  ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.company_banks(id) ON DELETE SET NULL;

-- Add indexes for foreign key and common queries
CREATE INDEX IF NOT EXISTS idx_pi_bank ON public.proforma_invoices(bank_id);
CREATE INDEX IF NOT EXISTS idx_pi_incoterm ON public.proforma_invoices(incoterm);

-- Add comment for documentation
COMMENT ON COLUMN public.proforma_invoices.incoterm IS 'Incoterm code (e.g., FOB, CIF) - references incoterms table';
COMMENT ON COLUMN public.proforma_invoices.payment_terms IS 'Payment terms description (e.g., 50% Advance / 50% Balance against BL)';
COMMENT ON COLUMN public.proforma_invoices.bank_id IS 'Reference to company bank account for payment instructions';
