-- GST & LUT Module: Database Schema
-- Creates tables for tracking Letters of Undertaking (LUT) for zero-rated exports

-- ============================================================================
-- 1. LUTS TABLE
-- ============================================================================
-- Tracks LUT details for each financial year

CREATE TABLE IF NOT EXISTS luts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    lut_number VARCHAR(100) NOT NULL,
    financial_year VARCHAR(20) NOT NULL, -- e.g., "2024-25"
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    filed_date DATE,
    acknowledgment_number VARCHAR(100),
    document_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: One active LUT per financial year per company (usually)
CREATE UNIQUE INDEX idx_luts_unique_fy ON luts(company_id, financial_year);
CREATE INDEX idx_luts_company ON luts(company_id);
CREATE INDEX idx_luts_status ON luts(status);

-- ============================================================================
-- 2. LINK LUTS TO INVOICES
-- ============================================================================
-- Add Foreign Key to proforma_invoices table

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proforma_invoices' AND column_name = 'lut_id') THEN
        ALTER TABLE proforma_invoices 
        ADD COLUMN lut_id UUID REFERENCES luts(id) ON DELETE SET NULL;
    END IF;

    -- Also add Link to export_orders for redundancy/ease of access
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_orders' AND column_name = 'lut_id') THEN
        ALTER TABLE export_orders 
        ADD COLUMN lut_id UUID REFERENCES luts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE luts ENABLE ROW LEVEL SECURITY;

CREATE POLICY luts_select ON luts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY luts_insert ON luts
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY luts_update ON luts
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY luts_delete ON luts
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON TABLE luts IS 'Letters of Undertaking for zero-rated exports under GST';
COMMENT ON COLUMN luts.financial_year IS 'Financial Year for which LUT is valid (e.g. 2024-25)';
