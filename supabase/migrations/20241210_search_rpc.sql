-- FUNCTION: search_hsn_smart
-- PURPOSE: Provide a ranked search result for HSN codes based on "Smart Search" criteria:
-- 1. Exact ITC Code Match (Highest Priority)
-- 2. Exact GST Code Match
-- 3. Code Prefix / Start Match (Chapter or Partial)
-- 4. Text Keyword Match (Commodity / Description)
-- 5. Fuzzy / Trigram Match (Misspellings)

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
    -- Only include if we have a non-zero match (fuzzy search implies this via similarity or ILIKE)
  ORDER BY rank_score DESC, m.itc_hs_code ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
