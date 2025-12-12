-- Migration: Add versioning, approval, and revision tracking to proforma_invoices
-- Date: 2024-12-12
-- Priority: P0 - Required for Proforma Invoice approval workflows

-- =====================================================
-- 1. Add version field for revision tracking
-- =====================================================

ALTER TABLE public.proforma_invoices
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- =====================================================
-- 2. Add revision tracking
-- =====================================================

ALTER TABLE public.proforma_invoices
  ADD COLUMN IF NOT EXISTS revised_from_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL;

-- =====================================================
-- 3. Update status constraint to include approval statuses
-- =====================================================

ALTER TABLE public.proforma_invoices
  DROP CONSTRAINT IF EXISTS proforma_invoices_status_check;

ALTER TABLE public.proforma_invoices
  ADD CONSTRAINT proforma_invoices_status_check
  CHECK (status IN (
    'draft',      -- Initial state
    'pending',    -- Awaiting approval
    'approved',   -- Approved by management
    'rejected',   -- Rejected with reason
    'revised',    -- Superseded by newer version
    'sent',       -- Sent to buyer
    'accepted',   -- Accepted by buyer
    'cancelled'   -- Cancelled
  ));

-- =====================================================
-- 4. Add approval/rejection audit fields
-- =====================================================

ALTER TABLE public.proforma_invoices
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =====================================================
-- 5. Add indexes for performance
-- =====================================================

-- Index for version queries (get latest version of an invoice)
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_version 
ON public.proforma_invoices(invoice_number, version DESC);

-- Index for revision lookups
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_revised_from 
ON public.proforma_invoices(revised_from_id);

-- Index for approval queries
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_status 
ON public.proforma_invoices(status);

-- =====================================================
-- 6. Add column comments for documentation
-- =====================================================

COMMENT ON COLUMN public.proforma_invoices.version IS 'Version number for revisions (1, 2, 3...). Same invoice_number can have multiple versions.';
COMMENT ON COLUMN public.proforma_invoices.revised_from_id IS 'Reference to the invoice this was revised from. NULL for original invoices.';
COMMENT ON COLUMN public.proforma_invoices.approved_by IS 'User who approved the invoice';
COMMENT ON COLUMN public.proforma_invoices.approved_at IS 'Timestamp when invoice was approved';
COMMENT ON COLUMN public.proforma_invoices.rejected_by IS 'User who rejected the invoice';
COMMENT ON COLUMN public.proforma_invoices.rejected_at IS 'Timestamp when invoice was rejected';
COMMENT ON COLUMN public.proforma_invoices.rejection_reason IS 'Reason for rejection if status is rejected';
