-- Incentives Calculator Module: Database Schema
-- Creates tables for RoDTEP, Duty Drawback calculations and claims tracking

-- ============================================================================
-- 1. INCENTIVE CLAIMS TABLE
-- ============================================================================
-- Stores incentive claim records linked to shipping bills

CREATE TABLE IF NOT EXISTS incentive_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipping_bill_id UUID NOT NULL REFERENCES shipping_bills(id) ON DELETE CASCADE,
    claim_type VARCHAR(20) NOT NULL CHECK (claim_type IN ('rodtep', 'duty_drawback', 'both')),
    
    -- RoDTEP Details
    rodtep_amount DECIMAL(15,2),
    rodtep_rate DECIMAL(5,2),
    rodtep_claim_number VARCHAR(50),
    rodtep_claim_date DATE,
    rodtep_status VARCHAR(20) DEFAULT 'pending' CHECK (rodtep_status IN ('pending', 'filed', 'approved', 'rejected', 'received')),
    
    -- Duty Drawback Details
    drawback_amount DECIMAL(15,2),
    drawback_rate DECIMAL(5,2),
    drawback_claim_number VARCHAR(50),
    drawback_claim_date DATE,
    drawback_status VARCHAR(20) DEFAULT 'pending' CHECK (drawback_status IN ('pending', 'filed', 'approved', 'rejected', 'received')),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_claim_per_sb UNIQUE(shipping_bill_id, claim_type)
);

-- Indexes for performance
CREATE INDEX idx_incentive_claims_company ON incentive_claims(company_id);
CREATE INDEX idx_incentive_claims_sb ON incentive_claims(shipping_bill_id);
CREATE INDEX idx_incentive_claims_type ON incentive_claims(claim_type);
CREATE INDEX idx_incentive_claims_rodtep_status ON incentive_claims(rodtep_status);
CREATE INDEX idx_incentive_claims_drawback_status ON incentive_claims(drawback_status);

-- ============================================================================
-- 2. RODTEP RATES TABLE
-- ============================================================================
-- HSN-wise RoDTEP rates (government-notified)

CREATE TABLE IF NOT EXISTS rodtep_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hsn_code VARCHAR(8) NOT NULL,
    description TEXT,
    rate_percentage DECIMAL(5,2) NOT NULL,
    cap_per_unit DECIMAL(10,2),
    unit VARCHAR(10),
    effective_from DATE NOT NULL,
    effective_to DATE,
    notification_number VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for rate lookups
CREATE INDEX idx_rodtep_hsn ON rodtep_rates(hsn_code);
CREATE INDEX idx_rodtep_dates ON rodtep_rates(effective_from, effective_to);
CREATE INDEX idx_rodtep_hsn_dates ON rodtep_rates(hsn_code, effective_from, effective_to);

-- ============================================================================
-- 3. DUTY DRAWBACK RATES TABLE
-- ============================================================================
-- HSN-wise Duty Drawback rates (All Industry Rates - AIR)

CREATE TABLE IF NOT EXISTS duty_drawback_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hsn_code VARCHAR(8) NOT NULL,
    description TEXT,
    rate_percentage DECIMAL(5,2),
    rate_amount DECIMAL(10,2),
    unit VARCHAR(10),
    effective_from DATE NOT NULL,
    effective_to DATE,
    notification_number VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for rate lookups
CREATE INDEX idx_drawback_hsn ON duty_drawback_rates(hsn_code);
CREATE INDEX idx_drawback_dates ON duty_drawback_rates(effective_from, effective_to);
CREATE INDEX idx_drawback_hsn_dates ON duty_drawback_rates(hsn_code, effective_from, effective_to);

-- ============================================================================
-- 4. SAMPLE DATA - RoDTEP RATES
-- ============================================================================
-- Common export items with RoDTEP rates (as of 2024)

INSERT INTO rodtep_rates (hsn_code, description, rate_percentage, cap_per_unit, unit, effective_from, notification_number) VALUES
('620342', 'Men''s Cotton T-Shirts', 4.3, NULL, 'PCS', '2024-01-01', 'Notification 01/2024'),
('620520', 'Men''s Cotton Shirts', 4.1, NULL, 'PCS', '2024-01-01', 'Notification 01/2024'),
('620462', 'Women''s Cotton Trousers', 4.2, NULL, 'PCS', '2024-01-01', 'Notification 01/2024'),
('640399', 'Leather Footwear', 2.5, NULL, 'PAIR', '2024-01-01', 'Notification 01/2024'),
('630260', 'Cotton Bed Linen', 3.8, NULL, 'KG', '2024-01-01', 'Notification 01/2024'),
('420310', 'Leather Garments', 3.2, NULL, 'PCS', '2024-01-01', 'Notification 01/2024'),
('610910', 'Cotton T-Shirts Knitted', 4.5, NULL, 'PCS', '2024-01-01', 'Notification 01/2024'),
('611020', 'Cotton Pullovers', 4.0, NULL, 'PCS', '2024-01-01', 'Notification 01/2024'),
('630790', 'Made-up Textile Articles', 3.5, NULL, 'KG', '2024-01-01', 'Notification 01/2024'),
('392690', 'Plastic Articles', 2.8, NULL, 'KG', '2024-01-01', 'Notification 01/2024');

-- ============================================================================
-- 5. SAMPLE DATA - DUTY DRAWBACK RATES
-- ============================================================================
-- Common export items with Duty Drawback rates (AIR)

INSERT INTO duty_drawback_rates (hsn_code, description, rate_percentage, rate_amount, unit, effective_from, notification_number) VALUES
('620342', 'Men''s Cotton T-Shirts', 3.8, 45, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('620520', 'Men''s Cotton Shirts', 4.2, 52, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('620462', 'Women''s Cotton Trousers', 4.0, 48, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('640399', 'Leather Footwear', 2.1, 38, 'PAIR', '2024-01-01', 'Notification 25/2024-Customs'),
('630260', 'Cotton Bed Linen', 3.5, NULL, 'KG', '2024-01-01', 'Notification 25/2024-Customs'),
('420310', 'Leather Garments', 2.8, 65, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('610910', 'Cotton T-Shirts Knitted', 4.1, 42, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('611020', 'Cotton Pullovers', 3.7, 55, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('630790', 'Made-up Textile Articles', 3.2, NULL, 'KG', '2024-01-01', 'Notification 25/2024-Customs'),
('392690', 'Plastic Articles', 2.3, NULL, 'KG', '2024-01-01', 'Notification 25/2024-Customs');

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE incentive_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE rodtep_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_drawback_rates ENABLE ROW LEVEL SECURITY;

-- Incentive Claims: Users can only see their company's claims
CREATE POLICY incentive_claims_select ON incentive_claims
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY incentive_claims_insert ON incentive_claims
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY incentive_claims_update ON incentive_claims
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY incentive_claims_delete ON incentive_claims
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

-- Rate tables: Read-only for all authenticated users
CREATE POLICY rodtep_rates_select ON rodtep_rates
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY duty_drawback_rates_select ON duty_drawback_rates
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 7. FUNCTIONS
-- ============================================================================

-- Function to get applicable RoDTEP rate for HSN on a specific date
CREATE OR REPLACE FUNCTION get_rodtep_rate(p_hsn_code VARCHAR, p_date DATE)
RETURNS TABLE (
    rate_percentage DECIMAL(5,2),
    cap_per_unit DECIMAL(10,2),
    unit VARCHAR(10),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.rate_percentage,
        r.cap_per_unit,
        r.unit,
        r.description
    FROM rodtep_rates r
    WHERE r.hsn_code = p_hsn_code
      AND r.effective_from <= p_date
      AND (r.effective_to IS NULL OR r.effective_to >= p_date)
    ORDER BY r.effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get applicable Duty Drawback rate for HSN on a specific date
CREATE OR REPLACE FUNCTION get_duty_drawback_rate(p_hsn_code VARCHAR, p_date DATE)
RETURNS TABLE (
    rate_percentage DECIMAL(5,2),
    rate_amount DECIMAL(10,2),
    unit VARCHAR(10),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.rate_percentage,
        d.rate_amount,
        d.unit,
        d.description
    FROM duty_drawback_rates d
    WHERE d.hsn_code = p_hsn_code
      AND d.effective_from <= p_date
      AND (d.effective_to IS NULL OR d.effective_to >= p_date)
    ORDER BY d.effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
