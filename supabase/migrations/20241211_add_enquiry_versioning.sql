-- Add versioning columns to enquiries table

ALTER TABLE public.enquiries 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL;

-- Index for parent_enquiry_id for faster lookups of history
CREATE INDEX IF NOT EXISTS idx_enquiries_parent ON public.enquiries(parent_enquiry_id);
