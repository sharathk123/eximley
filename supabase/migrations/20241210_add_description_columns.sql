-- Migration: Add separate description columns for ITC and GST sources
-- Date: 2024-12-10
-- Purpose: Preserve all information from both PDF sources without data loss

-- Add new description columns
ALTER TABLE public.itc_gst_hsn_mapping 
ADD COLUMN IF NOT EXISTS itc_hs_code_description TEXT,
ADD COLUMN IF NOT EXISTS gst_hsn_code_description TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.itc_gst_hsn_mapping.itc_hs_code_description IS 'Description from ITC HS Code source (e.g., HS_Code_Mappin.pdf)';
COMMENT ON COLUMN public.itc_gst_hsn_mapping.gst_hsn_code_description IS 'Description from GST HSN Code source (e.g., hscodewiselistwithgstrates.pdf)';

-- Migrate existing data from 'description' column to gst_hsn_code_description
-- (Assuming existing data came from GST source)
UPDATE public.itc_gst_hsn_mapping 
SET gst_hsn_code_description = description
WHERE description IS NOT NULL 
  AND gst_hsn_code_description IS NULL;

-- Add GIN indexes for full-text search on new description columns
CREATE INDEX IF NOT EXISTS idx_itc_hs_description_gin 
ON public.itc_gst_hsn_mapping 
USING GIN (to_tsvector('simple', coalesce(itc_hs_code_description, '')));

CREATE INDEX IF NOT EXISTS idx_gst_hsn_description_gin 
ON public.itc_gst_hsn_mapping 
USING GIN (to_tsvector('simple', coalesce(gst_hsn_code_description, '')));

-- Remove old description column (data already migrated to gst_hsn_code_description)
ALTER TABLE public.itc_gst_hsn_mapping DROP COLUMN IF EXISTS description;
