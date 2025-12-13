-- Migration: Export Lifecycle Completion
-- Add commercial invoice support, transport documents, and insurance to shipments

-- 1. Commercial Invoice Support
-- Add invoice_type to differentiate Proforma from Commercial Invoice
ALTER TABLE proforma_invoices 
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'proforma' 
CHECK (invoice_type IN ('proforma', 'commercial'));

-- Add converted_to_commercial_at timestamp
ALTER TABLE proforma_invoices
ADD COLUMN IF NOT EXISTS converted_to_commercial_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to set default type
UPDATE proforma_invoices 
SET invoice_type = 'proforma' 
WHERE invoice_type IS NULL;

-- 2. Transport Documents (BOL/AWB)
-- Add Bill of Lading and Airway Bill tracking to shipments
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS bl_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS bl_date DATE,
ADD COLUMN IF NOT EXISTS awb_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS awb_date DATE,
ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(20) DEFAULT 'sea'
CHECK (transport_mode IN ('sea', 'air', 'road', 'rail'));

-- 3. Insurance Certificate
-- Add insurance tracking for CIF/CIP shipments
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(200),
ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS insurance_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS insurance_date DATE,
ADD COLUMN IF NOT EXISTS insurance_coverage_type VARCHAR(50);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proforma_invoice_type ON proforma_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_shipments_transport_mode ON shipments(transport_mode);
CREATE INDEX IF NOT EXISTS idx_shipments_bl_number ON shipments(bl_number) WHERE bl_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_awb_number ON shipments(awb_number) WHERE awb_number IS NOT NULL;

-- 5. Comments for documentation
COMMENT ON COLUMN proforma_invoices.invoice_type IS 'Type of invoice: proforma (before shipment) or commercial (actual invoice for shipped goods)';
COMMENT ON COLUMN proforma_invoices.converted_to_commercial_at IS 'Timestamp when proforma was converted to commercial invoice';
COMMENT ON COLUMN shipments.bl_number IS 'Bill of Lading number for sea shipments';
COMMENT ON COLUMN shipments.awb_number IS 'Air Waybill number for air shipments';
COMMENT ON COLUMN shipments.insurance_policy_number IS 'Marine insurance policy number for CIF/CIP shipments';
