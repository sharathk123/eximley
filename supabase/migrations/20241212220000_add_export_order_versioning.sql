-- Migration: Add versioning, approval, and revision tracking to export_orders
-- Date: 2024-12-12
-- Priority: P0 - Required for Export Order details page

-- =====================================================
-- 1. Add version field for revision tracking
-- =====================================================

ALTER TABLE public.export_orders
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- =====================================================
-- 2. Add revision tracking
-- =====================================================

ALTER TABLE public.export_orders
  ADD COLUMN IF NOT EXISTS revised_from_id UUID REFERENCES public.export_orders(id) ON DELETE SET NULL;

-- =====================================================
-- 3. Update status constraint to include 'revised'
-- =====================================================

ALTER TABLE public.export_orders
  DROP CONSTRAINT IF EXISTS export_orders_status_check;

ALTER TABLE public.export_orders
  ADD CONSTRAINT export_orders_status_check
  CHECK (status IN (
    'pending',    -- Awaiting approval
    'approved',   -- Approved by management
    'rejected',   -- Rejected with reason
    'revised',    -- Superseded by newer version
    'confirmed',  -- Buyer confirmed (locked)
    'shipped',    -- Goods shipped
    'completed',  -- Order fulfilled
    'cancelled'   -- Order cancelled
  ));

-- =====================================================
-- 4. Add approval/rejection audit fields
-- =====================================================

ALTER TABLE public.export_orders
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- =====================================================
-- 5. Add indexes for performance
-- =====================================================

-- Index for version queries (get latest version of an order)
CREATE INDEX IF NOT EXISTS idx_export_orders_version 
ON public.export_orders(order_number, version DESC);

-- Index for revision lookups
CREATE INDEX IF NOT EXISTS idx_export_orders_revised_from 
ON public.export_orders(revised_from_id);

-- Index for approval queries
CREATE INDEX IF NOT EXISTS idx_export_orders_status 
ON public.export_orders(status);

-- =====================================================
-- 6. Add column comments for documentation
-- =====================================================

COMMENT ON COLUMN public.export_orders.version IS 'Version number for revisions (1, 2, 3...). Same order_number can have multiple versions.';
COMMENT ON COLUMN public.export_orders.revised_from_id IS 'Reference to the order this was revised from. NULL for original orders.';
COMMENT ON COLUMN public.export_orders.rejection_reason IS 'Reason for rejection if status is rejected';
COMMENT ON COLUMN public.export_orders.approved_by IS 'User who approved the order';
COMMENT ON COLUMN public.export_orders.approved_at IS 'Timestamp when order was approved';
COMMENT ON COLUMN public.export_orders.rejected_by IS 'User who rejected the order';
COMMENT ON COLUMN public.export_orders.rejected_at IS 'Timestamp when order was rejected';
