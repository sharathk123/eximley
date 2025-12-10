-- Safely drop the constraint if it already exists (idempotent)
ALTER TABLE public.itc_gst_hsn_mapping 
DROP CONSTRAINT IF EXISTS unique_itc_gst_hsn_pair;

-- Also drop the previous index if it exists, to keep things clean
DROP INDEX IF EXISTS idx_unique_itc_gst_hsn;

-- Now add the strict UNIQUE constraint required for reliable upserts
ALTER TABLE public.itc_gst_hsn_mapping 
ADD CONSTRAINT unique_itc_gst_hsn_pair UNIQUE (itc_hs_code, gst_hsn_code);
