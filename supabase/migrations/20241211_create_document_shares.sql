-- Create document shares table for secure sharing
-- Migration: Add document sharing functionality

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

-- RLS Policies
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
