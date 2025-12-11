-- ============================================================================
-- DOCUMENT MANAGEMENT SYSTEM (DMS) - COMPLETE MIGRATION
-- ============================================================================
-- This migration adds comprehensive document management features including:
-- 1. Enhanced documents table with version control and metadata
-- 2. Document access logging for audit trails
-- 3. Secure document sharing with expiring links
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE DOCUMENTS TABLE
-- ============================================================================

-- Add new columns for version control and metadata
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

-- ============================================================================
-- PART 2: CREATE DOCUMENT ACCESS LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_access_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('view', 'download', 'share', 'delete', 'upload')),
    ip_address TEXT,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_document_access_log_document ON public.document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_user ON public.document_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_company ON public.document_access_log(company_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_date ON public.document_access_log(accessed_at);
CREATE INDEX IF NOT EXISTS idx_document_access_log_action ON public.document_access_log(action);

-- Enable RLS
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_access_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_access_log'
      AND policyname = 'document_access_log_select'
  ) THEN
    CREATE POLICY "document_access_log_select" ON public.document_access_log FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = document_access_log.company_id)
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_access_log'
      AND policyname = 'document_access_log_insert'
  ) THEN
    CREATE POLICY "document_access_log_insert" ON public.document_access_log FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = document_access_log.company_id)
    );
  END IF;
END
$$;

-- Add comments
COMMENT ON TABLE public.document_access_log IS 'Audit log for document access and actions';
COMMENT ON COLUMN public.document_access_log.action IS 'Type of action: view, download, share, delete, upload';

-- ============================================================================
-- PART 3: CREATE DOCUMENT SHARES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES auth.users(id),
    share_token TEXT UNIQUE NOT NULL,
    recipient_email TEXT,
    expires_at TIMESTAMPTZ,
    password_hash TEXT,
    max_downloads INTEGER,
    download_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_accessed_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_document_shares_token ON public.document_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_document_shares_document ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_company ON public.document_shares(company_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_active ON public.document_shares(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_document_shares_expires ON public.document_shares(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_shares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_shares'
      AND policyname = 'document_shares_select'
  ) THEN
    CREATE POLICY "document_shares_select" ON public.document_shares FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = document_shares.company_id)
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_shares'
      AND policyname = 'document_shares_insert'
  ) THEN
    CREATE POLICY "document_shares_insert" ON public.document_shares FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = document_shares.company_id)
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_shares'
      AND policyname = 'document_shares_update'
  ) THEN
    CREATE POLICY "document_shares_update" ON public.document_shares FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = document_shares.company_id)
    );
  END IF;
END
$$;

-- Add comments
COMMENT ON TABLE public.document_shares IS 'Secure document sharing with expiring links';
COMMENT ON COLUMN public.document_shares.share_token IS 'Unique token for accessing shared document';
COMMENT ON COLUMN public.document_shares.max_downloads IS 'Maximum number of downloads allowed (NULL = unlimited)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The following features are now available:
-- ✅ Document version control and history
-- ✅ Document access audit logging
-- ✅ Secure document sharing with expiring links
-- ✅ Multi-tenant isolation via RLS policies
-- ✅ Performance optimized with indexes
-- ============================================================================
