-- Hybrid Search Function (Vector + Keyword)
-- Ensures we don't miss direct matches while keeping semantic understanding.

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
        + ts_rank_cd(to_tsvector('english', coalesce(itc_gst_hsn_mapping.description,'')), plainto_tsquery('english', query_text))
        as score
      FROM itc_gst_hsn_mapping
      WHERE 
        to_tsvector('english', coalesce(itc_gst_hsn_mapping.commodity,'') || ' ' || coalesce(itc_gst_hsn_mapping.description,'')) @@ plainto_tsquery('english', query_text)
        OR itc_gst_hsn_mapping.commodity ILIKE '%' || query_text || '%' -- Fallback for partial/substring exact match
      ORDER BY score DESC
      LIMIT match_count
  )
  SELECT DISTINCT ON (m.id)
    m.id,
    m.itc_hs_code,
    m.gst_hsn_code,
    m.description,
    m.commodity,
    GREATEST(COALESCE(v.score, 0), COALESCE(k.score, 0)) as similarity, -- Max score wins
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
