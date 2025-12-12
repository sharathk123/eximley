-- Migration: Robust Document ID Generation System
-- Priority: P0 - Critical for preventing duplicate document numbers
-- Date: 2024-12-12

-- =====================================================
-- 1. Create document_sequences table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.document_sequences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('ENQUIRY', 'QUOTE', 'PROFORMA', 'ORDER', 'SHIPPING_BILL', 'PURCHASE_ORDER')),
    period_key TEXT NOT NULL, -- '2024' for yearly, '2024-12-12' for daily
    current_seq INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Unique constraint to prevent duplicates per company/type/period
    CONSTRAINT unique_company_doc_period UNIQUE(company_id, doc_type, period_key)
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_doc_sequences_lookup 
ON public.document_sequences(company_id, doc_type, period_key);

CREATE INDEX IF NOT EXISTS idx_doc_sequences_company 
ON public.document_sequences(company_id);

-- Add comments for documentation
COMMENT ON TABLE public.document_sequences IS 'Stores atomic sequences for document number generation to prevent race conditions';
COMMENT ON COLUMN public.document_sequences.doc_type IS 'Type of document: ENQUIRY, QUOTE, PROFORMA, ORDER, SHIPPING_BILL, PURCHASE_ORDER';
COMMENT ON COLUMN public.document_sequences.period_key IS 'Period for sequence reset: YYYY for yearly (PI), YYYY-MM-DD for daily (others)';
COMMENT ON COLUMN public.document_sequences.current_seq IS 'Current sequence number for this period';

-- =====================================================
-- 2. Create atomic sequence generation function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_company_id UUID,
    p_doc_type TEXT,
    p_period_key TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_seq INTEGER;
BEGIN
    -- Attempt to increment existing sequence atomically
    UPDATE public.document_sequences
    SET 
        current_seq = current_seq + 1,
        updated_at = timezone('utc'::text, now())
    WHERE 
        company_id = p_company_id
        AND doc_type = p_doc_type
        AND period_key = p_period_key
    RETURNING current_seq INTO v_next_seq;
    
    -- If no row exists, insert new sequence starting at 1
    IF v_next_seq IS NULL THEN
        INSERT INTO public.document_sequences (
            company_id,
            doc_type,
            period_key,
            current_seq
        ) VALUES (
            p_company_id,
            p_doc_type,
            p_period_key,
            1
        )
        ON CONFLICT (company_id, doc_type, period_key) 
        DO UPDATE SET 
            current_seq = public.document_sequences.current_seq + 1,
            updated_at = timezone('utc'::text, now())
        RETURNING current_seq INTO v_next_seq;
    END IF;
    
    RETURN v_next_seq;
END;
$$;

COMMENT ON FUNCTION public.get_next_document_number IS 'Atomically generates next sequence number for document generation - prevents race conditions';

-- =====================================================
-- 3. Enable RLS and create policies
-- =====================================================

ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sequences for their company
CREATE POLICY document_sequences_select ON public.document_sequences
    FOR SELECT 
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert sequences for their company
CREATE POLICY document_sequences_insert ON public.document_sequences
    FOR INSERT 
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update sequences for their company
CREATE POLICY document_sequences_update ON public.document_sequences
    FOR UPDATE 
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Note: No DELETE policy - sequences should never be deleted
-- If reset is needed, update current_seq to 0

-- =====================================================
-- 4. Grant necessary permissions
-- =====================================================

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_document_number TO authenticated;
