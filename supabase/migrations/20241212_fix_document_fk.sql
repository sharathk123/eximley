-- ============================================================================
-- FIX: Clean up bad document records and make parent_document_id nullable
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the foreign key constraint issue
-- ============================================================================

-- Step 1: Delete any documents with invalid parent_document_id references
DELETE FROM public.documents
WHERE parent_document_id IS NOT NULL
  AND parent_document_id NOT IN (SELECT id FROM public.documents);

-- Step 2: Make parent_document_id nullable (if not already)
ALTER TABLE public.documents
ALTER COLUMN parent_document_id DROP NOT NULL;

-- Step 3: Verify the fix
SELECT 
    id,
    document_number,
    parent_document_id,
    reference_type,
    reference_id
FROM public.documents
WHERE reference_type = 'enquiry'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- After running this, try exporting the PDF again
-- ============================================================================
