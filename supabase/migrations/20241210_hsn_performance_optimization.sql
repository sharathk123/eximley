-- Performance Optimization for HSN Tables
-- Created: 2025-12-10
-- Purpose: Add indexes and optimizations for faster HSN ingestion and embedding generation

-- 1. Add index on embedding_conv_status for faster pending record queries
CREATE INDEX IF NOT EXISTS idx_itc_hsn_embeddings_status 
ON public.itc_gst_hsn_embeddings(embedding_conv_status);

-- 2. Add composite index for join operations between mapping and embeddings
CREATE INDEX IF NOT EXISTS idx_itc_hsn_mapping_created 
ON public.itc_gst_hsn_mapping(created_at DESC);

-- 3. Add index on mapping_id for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_itc_hsn_embeddings_mapping_lookup
ON public.itc_gst_hsn_embeddings(mapping_id);

-- 4. Add statistics for better query planning
ANALYZE public.itc_gst_hsn_mapping;
ANALYZE public.itc_gst_hsn_embeddings;

-- 5. Set autovacuum settings for better performance during bulk inserts
ALTER TABLE public.itc_gst_hsn_mapping SET (
    autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum more frequently
    autovacuum_analyze_scale_factor = 0.02  -- Analyze more frequently
);

ALTER TABLE public.itc_gst_hsn_embeddings SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

COMMENT ON INDEX idx_itc_hsn_embeddings_status IS 'Speeds up queries filtering by embedding processing status';
COMMENT ON INDEX idx_itc_hsn_mapping_created IS 'Optimizes queries ordering by creation date (newest first)';
