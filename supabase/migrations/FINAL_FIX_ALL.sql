-- ==============================================
-- FINAL CONSOLIDATED FIX FOR HSN PIPELINE
-- Run this entire script in Supabase SQL Editor
-- ==============================================

-- 1. Enable pg_trgm extension for Fuzzy Search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add 'source' column for Ingestion Provenance (Fixes "Upsert Batch Error")
ALTER TABLE public.itc_gst_hsn_mapping 
ADD COLUMN IF NOT EXISTS source TEXT;

-- 3. Fix Unique Constraint for Idempotent Ingestion (Fixes "Relation already exists" error)
-- We drop it first to be safe, then re-add it.
ALTER TABLE public.itc_gst_hsn_mapping 
DROP CONSTRAINT IF EXISTS unique_itc_gst_hsn_pair;

DROP INDEX IF EXISTS idx_unique_itc_gst_hsn;

ALTER TABLE public.itc_gst_hsn_mapping 
ADD CONSTRAINT unique_itc_gst_hsn_pair UNIQUE (itc_hs_code, gst_hsn_code);

-- 4. Create Smart Search Function (Ranked Search)
CREATE OR REPLACE FUNCTION public.search_hsn_smart(
  p_search_text TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  itc_hs_code TEXT,
  gst_hsn_code TEXT,
  commodity TEXT,
  itc_hs_code_description TEXT,
  gst_hsn_code_description TEXT,
  gst_rate NUMERIC,
  chapter TEXT,
  govt_notification_no TEXT,
  rank_score FLOAT
) 
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  base_query TEXT;
  clean_search TEXT;
BEGIN
  -- Normalize search text
  clean_search := trim(p_search_text);

  RETURN QUERY
  SELECT
    m.id,
    m.itc_hs_code,
    m.gst_hsn_code,
    m.commodity,
    m.itc_hs_code_description,
    m.gst_hsn_code_description,
    m.gst_rate,
    m.chapter,
    m.govt_notification_no,
    (
      -- SCORING LOGIC
      -- 1. Exact ITC Code Match (Score: 100)
      CASE WHEN m.itc_hs_code = clean_search THEN 100.0 ELSE 0 END +
      
      -- 2. Exact GST Code Match (Score: 90)
      CASE WHEN m.gst_hsn_code = clean_search THEN 90.0 ELSE 0 END +
      
      -- 3. Prefix Match (Score: 50)
      CASE WHEN m.itc_hs_code LIKE clean_search || '%' THEN 50.0 ELSE 0 END +
      
      -- 4. Keyword Match in Descriptions (Score: up to 20 based on frequency)
      (
        CASE 
           WHEN m.commodity ILIKE '%' || clean_search || '%' THEN 20.0 
           WHEN m.itc_hs_code_description ILIKE '%' || clean_search || '%' THEN 15.0
           WHEN m.gst_hsn_code_description ILIKE '%' || clean_search || '%' THEN 15.0
           ELSE 0
        END
      ) +

      -- 5. Fuzzy Match (using pg_trgm similarity, max 10 points)
      (similarity(m.commodity, clean_search) * 10.0) 
    ) AS rank_score
  FROM public.itc_gst_hsn_mapping m
  WHERE 
    -- Filter to only relevant rows to improve performance
    m.itc_hs_code ILIKE clean_search || '%' OR
    m.gst_hsn_code ILIKE clean_search || '%' OR
    m.commodity ILIKE '%' || clean_search || '%' OR
    m.itc_hs_code_description ILIKE '%' || clean_search || '%' OR
    m.gst_hsn_code_description ILIKE '%' || clean_search || '%' OR
    m.govt_notification_no ILIKE '%' || clean_search || '%' OR
    m.chapter ILIKE clean_search || '%'
  ORDER BY rank_score DESC, m.itc_hs_code ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
