-- Create document access log table for audit trail
-- Migration: Add document access logging

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

-- RLS Policies
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
