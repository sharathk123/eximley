-- ============================================================================
-- SUPABASE STORAGE RLS POLICIES FOR DOCUMENTS BUCKET
-- ============================================================================
-- Run this AFTER creating the 'documents' storage bucket
-- ============================================================================

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
-- After running these policies, verify by checking:
-- 1. Supabase Dashboard → Storage → documents bucket → Policies tab
-- 2. You should see 4 policies listed
-- ============================================================================
