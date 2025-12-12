-- Add version and parent_invoice_id to proforma_invoices to support revisions
ALTER TABLE public.proforma_invoices 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES public.proforma_invoices(id);

-- Optional: Add index on parent_invoice_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_pi_parent_invoice_id ON public.proforma_invoices(parent_invoice_id);
