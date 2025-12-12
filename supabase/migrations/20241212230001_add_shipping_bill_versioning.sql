-- Migration: Add versioning, approval, and revision tracking to shipping_bills
-- Date: 2024-12-12
-- Priority: P0 - Required for Shipping Bill approval workflows

-- =====================================================
-- 1. Add version field for revision tracking
-- =====================================================

ALTER TABLE public.shipping_bills
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- =====================================================
-- 2. Add revision tracking
-- =====================================================

ALTER TABLE public.shipping_bills
  ADD COLUMN IF NOT EXISTS revised_from_id UUID REFERENCES public.shipping_bills(id) ON DELETE SET NULL;

-- =====================================================
-- 3. Update status constraint to include approval statuses
-- =====================================================

ALTER TABLE public.shipping_bills
  DROP CONSTRAINT IF EXISTS shipping_bills_status_check;

ALTER TABLE public.shipping_bills
  ADD CONSTRAINT shipping_bills_status_check
  CHECK (status IN (
    'drafted',    -- Initial state
    'pending',    -- Awaiting approval
    'approved',   -- Approved by management
    'rejected',   -- Rejected with reason
    'revised',    -- Superseded by newer version
    'filed',      -- Filed with customs
    'cleared',    -- Customs cleared
    'shipped',    -- Goods shipped
    'cancelled'   -- Cancelled
  ));

-- =====================================================
-- 4. Add approval/rejection audit fields
-- =====================================================

ALTER TABLE public.shipping_bills
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =====================================================
-- 5. Add indexes for performance
-- =====================================================

-- Index for version queries
CREATE INDEX IF NOT EXISTS idx_shipping_bills_version 
ON public.shipping_bills(bill_number, version DESC);

-- Index for revision lookups
CREATE INDEX IF NOT EXISTS idx_shipping_bills_revised_from 
ON public.shipping_bills(revised_from_id);

-- Index for approval queries
CREATE INDEX IF NOT EXISTS idx_shipping_bills_status 
ON public.shipping_bills(status);

-- =====================================================
-- 6. Add column comments for documentation
-- =====================================================

COMMENT ON COLUMN public.shipping_bills.version IS 'Version number for revisions (1, 2, 3...). Same bill_number can have multiple versions.';
COMMENT ON COLUMN public.shipping_bills.revised_from_id IS 'Reference to the bill this was revised from. NULL for original bills.';
COMMENT ON COLUMN public.shipping_bills.approved_by IS 'User who approved the shipping bill';
COMMENT ON COLUMN public.shipping_bills.approved_at IS 'Timestamp when bill was approved';
COMMENT ON COLUMN public.shipping_bills.rejected_by IS 'User who rejected the shipping bill';
COMMENT ON COLUMN public.shipping_bills.rejected_at IS 'Timestamp when bill was rejected';
COMMENT ON COLUMN public.shipping_bills.rejection_reason IS 'Reason for rejection if status is rejected';
