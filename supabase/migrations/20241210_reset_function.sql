
CREATE OR REPLACE FUNCTION truncate_hsn_data()
RETURNS void AS $$
BEGIN
  TRUNCATE TABLE public.itc_gst_hsn_embeddings CASCADE;
  TRUNCATE TABLE public.itc_gst_hsn_mapping CASCADE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
