-- FIX: Re-apply Hybrid and Cosine Search Functions
-- This fixes "HSN Search Error" by ensuring the RPCs used by /api/hsn/suggest exist.
-- UPDATED: Corrected column names to match schema (itc_hs_code_description, gst_hsn_code_description)

-- 1. match_hsn_hybrid (Primary Search)
CREATE OR REPLACE FUNCTION public.match_hsn_hybrid(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  query_text text
)
RETURNS TABLE (
  mapping_id uuid,
  itc_hs_code text,
  gst_hsn_code text,
  description text,
  commodity text,
  similarity float,
  match_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_hits AS (
      SELECT
        e.mapping_id,
        1 - (e.embedding_vector <=> query_embedding) as score
      FROM itc_gst_hsn_embeddings e
      WHERE 1 - (e.embedding_vector <=> query_embedding) > match_threshold
      ORDER BY score DESC
      LIMIT match_count
  ),
  keyword_hits AS (
      SELECT
        id as mapping_id,
      -- Boost exact matches in commodity heavily
        ts_rank_cd(to_tsvector('english', coalesce(itc_gst_hsn_mapping.commodity,'')), plainto_tsquery('english', query_text)) * 2
        + ts_rank_cd(to_tsvector('english', coalesce(itc_gst_hsn_mapping.gst_hsn_code_description, itc_gst_hsn_mapping.itc_hs_code_description, '')), plainto_tsquery('english', query_text))
        as score
      FROM itc_gst_hsn_mapping
      WHERE 
        to_tsvector('english', coalesce(itc_gst_hsn_mapping.commodity,'') || ' ' || coalesce(itc_gst_hsn_mapping.gst_hsn_code_description, itc_gst_hsn_mapping.itc_hs_code_description, '')) @@ plainto_tsquery('english', query_text)
        OR itc_gst_hsn_mapping.commodity ILIKE '%' || query_text || '%' 
      ORDER BY score DESC
      LIMIT match_count
  )
  SELECT DISTINCT ON (m.id)
    m.id,
    m.itc_hs_code,
    m.gst_hsn_code,
    COALESCE(m.gst_hsn_code_description, m.itc_hs_code_description) as description,
    m.commodity,
    GREATEST(COALESCE(v.score, 0), COALESCE(k.score, 0)) as similarity, 
    CASE 
        WHEN v.mapping_id IS NOT NULL AND k.mapping_id IS NOT NULL THEN 'hybrid'
        WHEN k.mapping_id IS NOT NULL THEN 'keyword'
        ELSE 'semantic'
    END as match_type
  FROM itc_gst_hsn_mapping m
  LEFT JOIN vector_hits v ON m.id = v.mapping_id
  LEFT JOIN keyword_hits k ON m.id = k.mapping_id
  WHERE v.mapping_id IS NOT NULL OR k.mapping_id IS NOT NULL
  ORDER BY m.id, similarity DESC
  LIMIT match_count;
END;
$$;

-- 2. match_itc_hsn_cosine (Fallback Search)
CREATE OR REPLACE FUNCTION public.match_itc_hsn_cosine (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  mapping_id uuid,
  itc_hs_code text,
  gst_hsn_code text,
  description text,
  commodity text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.mapping_id,
    m.itc_hs_code,
    m.gst_hsn_code,
    COALESCE(m.gst_hsn_code_description, m.itc_hs_code_description) as description,
    m.commodity,
    1 - (e.embedding_vector <=> query_embedding) as similarity
  FROM itc_gst_hsn_embeddings e
  JOIN itc_gst_hsn_mapping m ON e.mapping_id = m.id
  WHERE 1 - (e.embedding_vector <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
