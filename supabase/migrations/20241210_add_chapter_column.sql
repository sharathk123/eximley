-- Add missing chapter column to itc_gst_hsn_mapping table
-- This column should have been in the base schema but appears to be missing

ALTER TABLE public.itc_gst_hsn_mapping 
ADD COLUMN IF NOT EXISTS chapter TEXT;

-- Add comment
COMMENT ON COLUMN public.itc_gst_hsn_mapping.chapter IS 'Chapter or category classification (e.g., Articles of Iron or Steel)';
