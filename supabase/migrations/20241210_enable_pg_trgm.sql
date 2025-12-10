-- Enable pg_trgm extension for fuzzy search / trigram similarity
create extension if not exists pg_trgm;

-- Add GIN indexes for efficient text search on HSN columns
create index if not exists itc_gst_hsn_mapping_itc_desc_trgm_idx on itc_gst_hsn_mapping using gin (itc_hs_code_description gin_trgm_ops);
create index if not exists itc_gst_hsn_mapping_gst_desc_trgm_idx on itc_gst_hsn_mapping using gin (gst_hsn_code_description gin_trgm_ops);
create index if not exists itc_gst_hsn_mapping_commodity_trgm_idx on itc_gst_hsn_mapping using gin (commodity gin_trgm_ops);
