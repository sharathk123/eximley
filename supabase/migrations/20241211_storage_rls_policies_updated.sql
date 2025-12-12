-- ============================================================================
-- SUPABASE STORAGE RLS POLICIES FOR DOCUMENTS BUCKET (UPDATED)
-- ============================================================================
-- Run this in Supabase SQL Editor to allow company users to manage their files
-- ============================================================================

-- First, ensure the documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents from their company" ON storage.objects;

-- Policy 1: Allow users to upload documents for their company
CREATE POLICY "Users can upload documents for their company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM company_users WHERE user_id = auth.uid()
  )
);

-- Policy 2: Allow users to view documents from their company
CREATE POLICY "Users can view documents from their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM company_users WHERE user_id = auth.uid()
  )
);

-- Policy 3: Allow users to update documents from their company
CREATE POLICY "Users can update documents from their company"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM company_users WHERE user_id = auth.uid()
  )
);

-- Policy 4: Allow users to delete documents from their company
CREATE POLICY "Users can delete documents from their company"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM company_users WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running, verify in Supabase Dashboard:
-- Storage → documents bucket → Policies tab
-- You should see 4 policies listed
-- ============================================================================
