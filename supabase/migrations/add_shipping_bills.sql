-- Shipping Bills Module Migration
-- This creates the tables needed for customs export declarations (Shipping Bills)

-- Main Shipping Bills table
CREATE TABLE IF NOT EXISTS shipping_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sb_number TEXT NOT NULL,
  sb_date DATE NOT NULL,
  
  -- Links to other documents
  export_order_id UUID REFERENCES export_orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES proforma_invoices(id) ON DELETE SET NULL,
  
  -- Port and Customs Details
  port_code TEXT, -- e.g., "INMAA1" (Chennai), "INNSA1" (JNPT)
  customs_house TEXT,
  customs_officer_name TEXT,
  
  -- Financial Details (in export currency, typically USD)
  fob_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  freight_value DECIMAL(15,2) DEFAULT 0,
  insurance_value DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  
  -- Let Export Order (LEO) - Customs clearance
  let_export_order_number TEXT,
  let_export_date DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'drafted' CHECK (status IN ('drafted', 'filed', 'cleared', 'shipped', 'cancelled')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping Bill Items (HSN-wise breakdown)
-- This is CRITICAL for duty drawback and RoDTEP calculations
CREATE TABLE IF NOT EXISTS shipping_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_bill_id UUID NOT NULL REFERENCES shipping_bills(id) ON DELETE CASCADE,
  
  -- Item Details
  hsn_code TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit TEXT NOT NULL, -- e.g., 'PCS', 'KGS', 'MTR'
  
  -- Pricing
  unit_price DECIMAL(15,2) NOT NULL,
  fob_value DECIMAL(15,2) NOT NULL,
  assessable_value DECIMAL(15,2), -- FOB - freight - insurance (for duty calculation)
  
  -- Duty Details (usually 0 for exports, but tracked for compliance)
  export_duty_rate DECIMAL(5,2) DEFAULT 0,
  export_duty_amount DECIMAL(15,2) DEFAULT 0,
  cess_rate DECIMAL(5,2) DEFAULT 0,
  cess_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Link to order item (optional, for traceability)
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipping_bills_company ON shipping_bills(company_id);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_order ON shipping_bills(export_order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_date ON shipping_bills(sb_date);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_status ON shipping_bills(status);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_sb_number ON shipping_bills(sb_number);

CREATE INDEX IF NOT EXISTS idx_shipping_bill_items_sb ON shipping_bill_items(shipping_bill_id);
CREATE INDEX IF NOT EXISTS idx_shipping_bill_items_hsn ON shipping_bill_items(hsn_code);

-- Unique constraint: One company cannot have duplicate SB numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_bills_unique_sb_number 
ON shipping_bills(company_id, sb_number);

-- Comments for documentation
COMMENT ON TABLE shipping_bills IS 'Customs export declarations (Shipping Bills) - required for all Indian exports';
COMMENT ON TABLE shipping_bill_items IS 'HSN-wise breakdown of shipping bill items - critical for duty drawback and RoDTEP calculations';
COMMENT ON COLUMN shipping_bills.sb_number IS 'Shipping Bill number from customs';
COMMENT ON COLUMN shipping_bills.let_export_order_number IS 'Let Export Order - customs clearance number';
COMMENT ON COLUMN shipping_bill_items.assessable_value IS 'Value used for duty calculation (FOB - freight - insurance)';
