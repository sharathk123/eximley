-- Enhance documents table with version control and metadata
-- Migration: Add DMS features to documents table

-- Add new columns for version control
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'documents',
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS checksum TEXT,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_version ON public.documents(reference_type, reference_id, version);
CREATE INDEX IF NOT EXISTS idx_documents_latest ON public.documents(is_latest_version) WHERE is_latest_version = true;
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON public.documents(storage_path);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON public.documents(is_archived);

-- Add comments
COMMENT ON COLUMN public.documents.version IS 'Version number for document revisions';
COMMENT ON COLUMN public.documents.parent_document_id IS 'Reference to parent document for versioning';
COMMENT ON COLUMN public.documents.is_latest_version IS 'Flag to identify the latest version of a document';
COMMENT ON COLUMN public.documents.storage_bucket IS 'Supabase storage bucket name';
COMMENT ON COLUMN public.documents.storage_path IS 'Full path in storage bucket';
COMMENT ON COLUMN public.documents.metadata IS 'Additional metadata in JSON format';
