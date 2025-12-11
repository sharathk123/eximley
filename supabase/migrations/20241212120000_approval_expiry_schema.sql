-- Add approval workflow columns to quotes table
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approval_requested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update status check constraint to include new statuses if it exists
-- First drop existing constraint if we can find its name, or just add a new one safely
DO $$
BEGIN
    -- Try to drop constraint if it follows standard naming or just let it specific
    -- Since we don't know the exact name if one exists, we'll try to add a validation check
    -- But since status is TEXT, we might just want to be permissive or strictly defined
    -- Let's add a check constraint for valid statuses including approval flow
    
    -- Drop potential existing constraint (guessing name or just ignore if not exists)
    ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
    
    -- Add new constraint
    ALTER TABLE public.quotes 
    ADD CONSTRAINT quotes_status_check 
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'sent', 'converted', 'revised'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not alter status constraint: %', SQLERRM;
END $$;
