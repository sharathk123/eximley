-- e-BRC Module: Database Schema
-- Creates tables for tracking Bank Realization Certificates and export proceeds compliance

-- ============================================================================
-- 1. BRCS TABLE
-- ============================================================================
-- Tracks BRC records linked to shipping bills

CREATE TABLE IF NOT EXISTS brcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shipping_bill_id UUID NOT NULL REFERENCES shipping_bills(id) ON DELETE CASCADE,
    
    -- BRC Details
    brc_number VARCHAR(100),
    brc_date DATE,
    bank_name VARCHAR(200),
    bank_branch VARCHAR(200),
    ad_code VARCHAR(50), -- Authorized Dealer Code
    
    -- Realization Details
    invoice_value DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    realized_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2),
    realization_status VARCHAR(20) DEFAULT 'pending' CHECK (realization_status IN ('pending', 'partial', 'full', 'overdue', 'written_off')),
    
    -- Compliance
    export_date DATE NOT NULL, -- From shipping bill
    due_date DATE NOT NULL, -- Export date + 9 months
    days_remaining INTEGER,
    is_overdue BOOLEAN DEFAULT false,
    
    -- Documents
    brc_document_url TEXT,
    swift_copy_url TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_brcs_company ON brcs(company_id);
CREATE INDEX idx_brcs_shipping_bill ON brcs(shipping_bill_id);
CREATE INDEX idx_brcs_status ON brcs(realization_status);
CREATE INDEX idx_brcs_due_date ON brcs(due_date);
CREATE INDEX idx_brcs_overdue ON brcs(is_overdue);

-- ============================================================================
-- 2. BRC PAYMENTS TABLE
-- ============================================================================
-- Links payment receipts to BRCs (many-to-many relationship)

CREATE TABLE IF NOT EXISTS brc_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brc_id UUID NOT NULL REFERENCES brcs(id) ON DELETE CASCADE,
    payment_id UUID, -- Optional link to payments table (if it exists)
    
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_reference VARCHAR(100),
    exchange_rate DECIMAL(10,4),
    amount_inr DECIMAL(15,2), -- Amount in INR if foreign currency
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brc_payments_brc ON brc_payments(brc_id);
CREATE INDEX idx_brc_payments_payment ON brc_payments(payment_id);

-- ============================================================================
-- 3. BRC REMINDERS TABLE
-- ============================================================================
-- Tracks compliance reminders and alerts

CREATE TABLE IF NOT EXISTS brc_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    brc_id UUID NOT NULL REFERENCES brcs(id) ON DELETE CASCADE,
    
    reminder_type VARCHAR(20) CHECK (reminder_type IN ('30_days', '15_days', '7_days', 'overdue')),
    reminder_date DATE NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brc_reminders_company ON brc_reminders(company_id);
CREATE INDEX idx_brc_reminders_brc ON brc_reminders(brc_id);
CREATE INDEX idx_brc_reminders_date ON brc_reminders(reminder_date);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE brcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brc_reminders ENABLE ROW LEVEL SECURITY;

-- BRCs: Users can only see their company's BRCs
CREATE POLICY brcs_select ON brcs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY brcs_insert ON brcs
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY brcs_update ON brcs
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY brcs_delete ON brcs
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

-- BRC Payments: Access through BRC ownership
CREATE POLICY brc_payments_select ON brc_payments
    FOR SELECT USING (
        brc_id IN (
            SELECT id FROM brcs WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY brc_payments_insert ON brc_payments
    FOR INSERT WITH CHECK (
        brc_id IN (
            SELECT id FROM brcs WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY brc_payments_delete ON brc_payments
    FOR DELETE USING (
        brc_id IN (
            SELECT id FROM brcs WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

-- BRC Reminders: Users can only see their company's reminders
CREATE POLICY brc_reminders_select ON brc_reminders
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. FUNCTIONS
-- ============================================================================

-- Function to calculate due date (export date + 9 months)
CREATE OR REPLACE FUNCTION calculate_brc_due_date(p_export_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN p_export_date + INTERVAL '9 months';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate days remaining until due date
CREATE OR REPLACE FUNCTION calculate_days_remaining(p_due_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (p_due_date - CURRENT_DATE));
END;
$$ LANGUAGE plpgsql;

-- Function to update BRC status based on realized amount
CREATE OR REPLACE FUNCTION update_brc_status()
RETURNS TRIGGER AS $$
DECLARE
    total_realized DECIMAL(15,2);
    brc_record RECORD;
BEGIN
    -- Get BRC details
    SELECT * INTO brc_record FROM brcs WHERE id = NEW.brc_id;
    
    -- Calculate total realized amount
    SELECT COALESCE(SUM(amount), 0) INTO total_realized
    FROM brc_payments
    WHERE brc_id = NEW.brc_id;
    
    -- Update BRC
    UPDATE brcs
    SET 
        realized_amount = total_realized,
        pending_amount = invoice_value - total_realized,
        realization_status = CASE
            WHEN total_realized = 0 THEN 
                CASE WHEN is_overdue THEN 'overdue' ELSE 'pending' END
            WHEN total_realized >= invoice_value THEN 'full'
            ELSE 'partial'
        END,
        updated_at = NOW()
    WHERE id = NEW.brc_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update BRC status when payment is added
CREATE TRIGGER trigger_update_brc_status
AFTER INSERT ON brc_payments
FOR EACH ROW
EXECUTE FUNCTION update_brc_status();

-- Function to update overdue status (to be run daily via cron)
CREATE OR REPLACE FUNCTION update_overdue_brcs()
RETURNS void AS $$
BEGIN
    UPDATE brcs
    SET 
        is_overdue = true,
        days_remaining = EXTRACT(DAY FROM (due_date - CURRENT_DATE)),
        realization_status = CASE
            WHEN realization_status = 'pending' THEN 'overdue'
            ELSE realization_status
        END,
        updated_at = NOW()
    WHERE due_date < CURRENT_DATE
      AND realization_status != 'full'
      AND is_overdue = false;
END;
$$ LANGUAGE plpgsql;

-- Function to create reminders for upcoming due dates
CREATE OR REPLACE FUNCTION create_brc_reminders()
RETURNS void AS $$
BEGIN
    -- 30 days reminder
    INSERT INTO brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, '30_days', due_date - INTERVAL '30 days'
    FROM brcs
    WHERE realization_status IN ('pending', 'partial')
      AND due_date - INTERVAL '30 days' = CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM brc_reminders 
          WHERE brc_id = brcs.id AND reminder_type = '30_days'
      );
    
    -- 15 days reminder
    INSERT INTO brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, '15_days', due_date - INTERVAL '15 days'
    FROM brcs
    WHERE realization_status IN ('pending', 'partial')
      AND due_date - INTERVAL '15 days' = CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM brc_reminders 
          WHERE brc_id = brcs.id AND reminder_type = '15_days'
      );
    
    -- 7 days reminder
    INSERT INTO brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, '7_days', due_date - INTERVAL '7 days'
    FROM brcs
    WHERE realization_status IN ('pending', 'partial')
      AND due_date - INTERVAL '7 days' = CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM brc_reminders 
          WHERE brc_id = brcs.id AND reminder_type = '7_days'
      );
    
    -- Overdue reminder
    INSERT INTO brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, 'overdue', CURRENT_DATE
    FROM brcs
    WHERE realization_status IN ('pending', 'partial', 'overdue')
      AND due_date < CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM brc_reminders 
          WHERE brc_id = brcs.id 
            AND reminder_type = 'overdue' 
            AND reminder_date = CURRENT_DATE
      );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE brcs IS 'Bank Realization Certificates - tracks export proceeds realization for RBI compliance';
COMMENT ON TABLE brc_payments IS 'Payment receipts linked to BRCs - supports partial realizations';
COMMENT ON TABLE brc_reminders IS 'Compliance reminders for approaching BRC due dates';

COMMENT ON COLUMN brcs.due_date IS 'RBI mandates export proceeds realization within 9 months of export date';
COMMENT ON COLUMN brcs.realization_status IS 'pending: no payment, partial: some payment, full: complete, overdue: past due date';
COMMENT ON COLUMN brcs.ad_code IS 'Authorized Dealer Code - bank code for forex transactions';
