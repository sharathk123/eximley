-- Add unique constraint to enable UPSERT
-- We use COALESCE in the index to handle potential nulls if strictly necessary, 
-- but ideally these are our composite primary keys for the domain.
-- Assuming itc_hs_code and gst_hsn_code are the non-nullable composite key.

-- First, ensure no duplicates exist (cleanup)
DELETE FROM public.itc_gst_hsn_mapping
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (partition BY itc_hs_code, gst_hsn_code ORDER BY updated_at DESC) AS rnum
    FROM public.itc_gst_hsn_mapping
  ) t
  WHERE t.rnum > 1
);

-- Then add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_itc_gst_hsn 
ON public.itc_gst_hsn_mapping (itc_hs_code, gst_hsn_code);

-- Also ensure gst_hsn_code is NOT NULL (it was already defined as such but good to be sure)
ALTER TABLE public.itc_gst_hsn_mapping ALTER COLUMN gst_hsn_code SET NOT NULL;
-- itc_hs_code should effectively be not null for this mapping
ALTER TABLE public.itc_gst_hsn_mapping ALTER COLUMN itc_hs_code SET NOT NULL;
