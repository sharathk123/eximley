-- Add 'source' column for provenance tracking
-- It was missing from the schema but required by the new merge pipeline.

ALTER TABLE public.itc_gst_hsn_mapping 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Optional: Add comment
COMMENT ON COLUMN public.itc_gst_hsn_mapping.source IS 'Provenance of the record: File1, File2, or Both';
