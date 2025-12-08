
-- =============================================================
-- Source: supabase/schema.sql
-- =============================================================


-- Drop existing tables to allow clean reset (CASCADE handles dependent objects)
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.order_payments CASCADE;
DROP TABLE IF EXISTS public.shipment_items CASCADE;
DROP TABLE IF EXISTS public.shipments CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.export_orders CASCADE;
DROP TABLE IF EXISTS public.proforma_items CASCADE;
DROP TABLE IF EXISTS public.proforma_invoices CASCADE;
DROP TABLE IF EXISTS public.cost_sheets CASCADE;
DROP TABLE IF EXISTS public.company_hsn CASCADE;
DROP TABLE IF EXISTS public.skus CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;
DROP TABLE IF EXISTS public.currencies CASCADE;
DROP TABLE IF EXISTS public.company_users CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Consolidated Drops for Migration Tables
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.enquiry_items CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.quote_items CASCADE;
DROP TABLE IF EXISTS public.incoterms CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_order_payments CASCADE;
DROP TABLE IF EXISTS public.shipping_bills CASCADE;
DROP TABLE IF EXISTS public.shipping_bill_items CASCADE;
DROP TABLE IF EXISTS public.brcs CASCADE;
DROP TABLE IF EXISTS public.brc_payments CASCADE;
DROP TABLE IF EXISTS public.brc_reminders CASCADE;
DROP TABLE IF EXISTS public.incentive_claims CASCADE;
DROP TABLE IF EXISTS public.rodtep_rates CASCADE;
DROP TABLE IF EXISTS public.duty_drawback_rates CASCADE;
DROP TABLE IF EXISTS public.luts CASCADE;



-- Create entities table (Buyers, Suppliers, etc.)
CREATE TABLE public.entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL, -- Logical separation for multi-tenancy
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buyer', 'supplier', 'partner', 'other')),
    email TEXT,
    phone TEXT,
    address TEXT,
    country TEXT,
    tax_id TEXT,
    verification_status TEXT DEFAULT 'unverified'
);

-- Create Companies table (Company Profile for Documents)
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    iec_number TEXT, -- Import Export Code
    gstin TEXT, -- GST Identification Number
    pan TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pincode TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    -- Bank details for documents
    bank_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_swift TEXT,
    bank_branch TEXT,
    -- Authorized signatory
    signatory_name TEXT,
    signatory_designation TEXT
);

-- Enable RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select_all" ON public.companies FOR SELECT USING (true);
CREATE POLICY "companies_insert_auth" ON public.companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "companies_update_auth" ON public.companies FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create user_profiles table
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT,
    phone TEXT,
    job_title TEXT,
    avatar_url TEXT
);

-- Enable RLS for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Create company_users junction table (links users to companies)
CREATE TABLE public.company_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    UNIQUE(company_id, user_id)
);

-- Enable RLS for company_users
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_users_select_own" ON public.company_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "company_users_insert_auth" ON public.company_users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "company_users_update_own_company" ON public.company_users FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_users.company_id AND role IN ('owner', 'admin'))
);


-- Enable RLS for entities
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- Create policies for entities
CREATE POLICY "Enable read access for users in the same company" ON public.entities
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = entities.company_id
    ));

CREATE POLICY "Enable insert access for users in the same company" ON public.entities
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = entities.company_id
    ));

CREATE POLICY "Enable update access for users in the same company" ON public.entities
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = entities.company_id
    ));

-- Create products table
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    hsn_code TEXT,
    image_url TEXT
);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "products_select_same_company" ON public.products
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = products.company_id
    ));

CREATE POLICY "products_insert_same_company" ON public.products
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = products.company_id
    ));

CREATE POLICY "products_update_same_company" ON public.products
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = products.company_id
    ));

-- Create SKUs table (Child of Product)
CREATE TABLE public.skus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sku_code TEXT NOT NULL,
    name TEXT NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb, -- Store variant attributes like size, color, etc.
    unit TEXT DEFAULT 'pcs',
    weight_kg NUMERIC,
    dimensions_cm TEXT,
    base_price NUMERIC DEFAULT 0,
    -- Document generation fields
    hs_code TEXT, -- Harmonized System code for customs
    country_of_origin TEXT DEFAULT 'India',
    unit_of_measure TEXT DEFAULT 'PCS', -- PCS, KG, MTR, etc.
    gross_weight_kg NUMERIC, -- Gross weight per unit
    net_weight_kg NUMERIC -- Net weight per unit
);

-- Enable RLS for SKUs
ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;

-- Create policies for SKUs
CREATE POLICY "skus_select_same_company" ON public.skus
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = skus.company_id
    ));

CREATE POLICY "skus_insert_same_company" ON public.skus
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = skus.company_id
    ));

CREATE POLICY "skus_update_same_company" ON public.skus
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = skus.company_id
    ));


-- Create Currencies table
CREATE TABLE public.currencies (
    code TEXT PRIMARY KEY, -- USD, EUR, INR
    name TEXT NOT NULL,
    symbol TEXT NOT NULL
);

-- Enable RLS for Currencies (Publicly readable)
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies_read_all" ON public.currencies FOR SELECT USING (true);


-- Create Company HSN Codes table
CREATE TABLE public.company_hsn (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL,
    hsn_code TEXT NOT NULL,
    description TEXT,
    gst_rate NUMERIC DEFAULT 0,
    duty_rate NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS for Company HSN
ALTER TABLE public.company_hsn ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_hsn_select_same_company" ON public.company_hsn FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_hsn.company_id)
);
CREATE POLICY "company_hsn_insert_same_company" ON public.company_hsn FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_hsn.company_id)
);
CREATE POLICY "company_hsn_update_same_company" ON public.company_hsn FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_hsn.company_id)
);
CREATE POLICY "company_hsn_delete_same_company" ON public.company_hsn FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_hsn.company_id)
);

-- Index for Company HSN
CREATE INDEX idx_company_hsn_company_id ON public.company_hsn(company_id);
CREATE INDEX idx_company_hsn_code ON public.company_hsn(hsn_code);



-- Create Cost Sheets table
CREATE TABLE public.cost_sheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL,
    name TEXT NOT NULL, -- e.g. "Draft Costing for Cotton Shirts"
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Optional link
    sku_id UUID REFERENCES public.skus(id) ON DELETE SET NULL, -- Optional link
    target_currency_code TEXT REFERENCES public.currencies(code) DEFAULT 'USD',
    exchange_rate NUMERIC NOT NULL DEFAULT 1.0, -- Local to Target
    
    -- Cost Components (Simplified for now, can be JSONB later for flexibility)
    raw_material_cost NUMERIC DEFAULT 0,
    labor_cost NUMERIC DEFAULT 0,
    packaging_cost NUMERIC DEFAULT 0,
    overhead_cost NUMERIC DEFAULT 0,
    transport_cost NUMERIC DEFAULT 0,
    other_cost NUMERIC DEFAULT 0,
    
    total_cost_local NUMERIC GENERATED ALWAYS AS (raw_material_cost + labor_cost + packaging_cost + overhead_cost + transport_cost + other_cost) STORED,
    
    markup_percentage NUMERIC DEFAULT 0,
    final_price_local NUMERIC GENERATED ALWAYS AS ((raw_material_cost + labor_cost + packaging_cost + overhead_cost + transport_cost + other_cost) * (1 + markup_percentage/100)) STORED,
    
    final_price_export NUMERIC GENERATED ALWAYS AS (((raw_material_cost + labor_cost + packaging_cost + overhead_cost + transport_cost + other_cost) * (1 + markup_percentage/100)) / CASE WHEN exchange_rate = 0 THEN 1 ELSE exchange_rate END) STORED
);

-- Enable RLS for Cost Sheets
ALTER TABLE public.cost_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_sheets_select_same_company" ON public.cost_sheets FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = cost_sheets.company_id));
CREATE POLICY "cost_sheets_insert_same_company" ON public.cost_sheets FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = cost_sheets.company_id));
CREATE POLICY "cost_sheets_update_same_company" ON public.cost_sheets FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = cost_sheets.company_id));


-- Create Proforma Invoices table
CREATE TABLE public.proforma_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    invoice_number TEXT NOT NULL, -- Auto-generated usually
    buyer_id UUID REFERENCES public.entities(id),
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    currency_code TEXT REFERENCES public.currencies(code),
    conversion_rate NUMERIC DEFAULT 1.0,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, sent, approved, converted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for PI
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pi_select_same_company" ON public.proforma_invoices FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = proforma_invoices.company_id));
CREATE POLICY "pi_insert_same_company" ON public.proforma_invoices FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = proforma_invoices.company_id));
CREATE POLICY "pi_update_same_company" ON public.proforma_invoices FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = proforma_invoices.company_id));

-- Create Proforma Items table
CREATE TABLE public.proforma_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.proforma_invoices(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id),
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);
-- RLS for PI Items (Inherit from parent effectively)
ALTER TABLE public.proforma_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pi_items_policy" ON public.proforma_items USING (
    EXISTS (SELECT 1 FROM public.proforma_invoices WHERE id = proforma_items.invoice_id AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()))
);


-- Create Export Orders table
CREATE TABLE public.export_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    order_number TEXT NOT NULL, -- e.g. SO-2024-001
    pi_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL, -- Link mainly for history
    buyer_id UUID REFERENCES public.entities(id),
    order_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending', -- pending, confirmed, in_production, ready, shipped, completed, cancelled
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
    total_amount NUMERIC DEFAULT 0,
    currency_code TEXT REFERENCES public.currencies(code),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Orders
ALTER TABLE public.export_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_same_company" ON public.export_orders FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = export_orders.company_id));
CREATE POLICY "orders_insert_same_company" ON public.export_orders FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = export_orders.company_id));
CREATE POLICY "orders_update_same_company" ON public.export_orders FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = export_orders.company_id));


-- Create Order Items table
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id),
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- RLS for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_policy" ON public.order_items USING (
    EXISTS (SELECT 1 FROM public.export_orders WHERE id = order_items.order_id AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()))
);


-- Create Shipments table
CREATE TABLE public.shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    shipment_number TEXT NOT NULL, -- e.g. SH-2024-001
    order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE,
    shipment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'drafted', -- drafted, packed, shipped, in_transit, delivered
    carrier TEXT,
    tracking_number TEXT,
    -- Shipping details for documents
    port_of_loading TEXT,
    port_of_discharge TEXT,
    final_destination TEXT,
    vessel_name TEXT,
    voyage_number TEXT,
    container_numbers TEXT[], -- Array of container numbers
    gross_weight_kg NUMERIC,
    net_weight_kg NUMERIC,
    total_packages INTEGER,
    freight_terms TEXT, -- Prepaid, Collect, etc.
    incoterms TEXT, -- FOB, CIF, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Shipments
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipments_select_same_company" ON public.shipments FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = shipments.company_id));
CREATE POLICY "shipments_insert_same_company" ON public.shipments FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = shipments.company_id));
CREATE POLICY "shipments_update_same_company" ON public.shipments FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = shipments.company_id));


-- Create Shipment Items table (Packing List)
CREATE TABLE public.shipment_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL, -- Quantity being shipped in this shipment
    package_number TEXT -- e.g. "Box 1"
);

-- RLS for Shipment Items
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipment_items_policy" ON public.shipment_items USING (
    EXISTS (SELECT 1 FROM public.shipments WHERE id = shipment_items.shipment_id AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()))
);


-- Create Order Payments table
CREATE TABLE public.order_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    currency_code TEXT REFERENCES public.currencies(code),
    exchange_rate NUMERIC DEFAULT 1, -- Exchange rate at time of payment
    payment_method TEXT, -- e.g., Wire Transfer, Cash, Check
    reference_number TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Order Payments
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_payments_select" ON public.order_payments FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = order_payments.company_id)
);
CREATE POLICY "order_payments_insert" ON public.order_payments FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = order_payments.company_id)
);
CREATE POLICY "order_payments_update" ON public.order_payments FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = order_payments.company_id)
);


-- Indexes for performance
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_entities_company ON public.entities(company_id);
CREATE INDEX idx_skus_company ON public.skus(company_id);
CREATE INDEX idx_cost_sheets_company ON public.cost_sheets(company_id);
CREATE INDEX idx_pi_company ON public.proforma_invoices(company_id);
CREATE INDEX idx_pi_items_invoice ON public.proforma_items(invoice_id);
CREATE INDEX idx_orders_company ON public.export_orders(company_id);
CREATE INDEX idx_orders_pi ON public.export_orders(pi_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_shipments_company ON public.shipments(company_id);
CREATE INDEX idx_shipments_order ON public.shipments(order_id);
CREATE INDEX idx_shipment_items_shipment_id ON public.shipment_items(shipment_id);

-- Indexes for Order Payments
CREATE INDEX idx_order_payments_order_id ON public.order_payments(order_id);
CREATE INDEX idx_order_payments_company_id ON public.order_payments(company_id);
CREATE INDEX idx_order_payments_date ON public.order_payments(payment_date);


-- Seed Data for Currencies
INSERT INTO public.currencies (code, name, symbol) VALUES
('USD', 'United States Dollar', '$'),
('EUR', 'Euro', '€'),
('GBP', 'British Pound', '£'),
('INR', 'Indian Rupee', '₹'),
('AUD', 'Australian Dollar', 'A$'),
('CAD', 'Canadian Dollar', 'C$'),
('AED', 'United Arab Emirates Dirham', 'د.إ')
ON CONFLICT (code) DO NOTHING;


-- ============================================
-- DOCUMENT MANAGEMENT SYSTEM
-- ============================================

-- Create Documents table for storing document metadata
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    
    -- Document Classification
    document_type TEXT NOT NULL, -- 'commercial_invoice', 'packing_list', 'purchase_order', etc.
    document_category TEXT NOT NULL, -- 'generated', 'uploaded'
    
    -- Reference (what this document is for)
    reference_type TEXT, -- 'order', 'shipment', 'payment', etc.
    reference_id UUID,
    
    -- File Details
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT DEFAULT 'application/pdf',
    
    -- Metadata
    document_number TEXT, -- Invoice #, PO #, etc.
    document_date DATE,
    issued_by TEXT, -- Who created/sent this
    
    -- Audit
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Tags for search
    tags TEXT[],
    notes TEXT
);

-- Enable RLS for Documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_same_company" ON public.documents 
FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);

CREATE POLICY "documents_insert_same_company" ON public.documents 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);

CREATE POLICY "documents_update_same_company" ON public.documents 
FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);

CREATE POLICY "documents_delete_same_company" ON public.documents 
FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);

-- Indexes for Documents
CREATE INDEX idx_documents_company ON public.documents(company_id);
CREATE INDEX idx_documents_reference ON public.documents(reference_type, reference_id);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_documents_date ON public.documents(document_date);
CREATE INDEX idx_documents_category ON public.documents(document_category);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_composite ON public.documents(company_id, reference_type, reference_id);


-- ============================================
-- STORAGE BUCKET SETUP INSTRUCTIONS
-- ============================================
-- Run these commands in Supabase Dashboard > Storage:
--
-- 1. Create bucket 'export-documents' (private)
--
-- 2. Add RLS policies for storage.objects:
--
-- Policy: "Company users can view their documents"
-- CREATE POLICY "company_storage_select" ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'export-documents' 
--   AND auth.uid() IN (
--     SELECT user_id FROM public.company_users 
--     WHERE company_id = split_part(name, '/', 1)::uuid
--   )
-- );
--
-- Policy: "Company users can upload their documents"
-- CREATE POLICY "company_storage_insert" ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'export-documents'
--   AND auth.uid() IN (
--     SELECT user_id FROM public.company_users 
--     WHERE company_id = split_part(name, '/', 1)::uuid
--   )
-- );
--
-- Policy: "Company users can delete their documents"
-- CREATE POLICY "company_storage_delete" ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'export-documents'
--   AND auth.uid() IN (
--     SELECT user_id FROM public.company_users 
--     WHERE company_id = split_part(name, '/', 1)::uuid
--   )
-- );

-- =============================================================
-- Source: supabase/migrations/add_enquiries_table.sql
-- =============================================================

-- ============================================
-- ENQUIRIES MANAGEMENT SYSTEM
-- ============================================

-- Create Enquiries table
CREATE TABLE public.enquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    enquiry_number TEXT NOT NULL, -- Auto-generated: ENQ-2024-001
    
    -- Customer Information
    entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_company TEXT,
    customer_country TEXT,
    
    -- Enquiry Details
    source TEXT, -- 'email', 'phone', 'website', 'trade_show', 'referral', 'other'
    subject TEXT,
    description TEXT,
    
    -- Products/SKUs of Interest
    products_interested JSONB DEFAULT '[]'::jsonb, -- [{product_id, sku_id, quantity, notes}]
    
    -- Status Tracking
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'quoted', 'won', 'lost', 'converted'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    
    -- Follow-up
    last_contact_date DATE,
    next_follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Conversion Tracking
    pi_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.export_orders(id) ON DELETE SET NULL,
    converted_at TIMESTAMP WITH TIME ZONE,
    
    -- Loss Tracking
    lost_reason TEXT, -- 'price', 'timeline', 'competitor', 'no_response', 'other'
    lost_notes TEXT,
    
    -- Audit
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Enquiries
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "enquiries_select_same_company" ON public.enquiries 
FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);

CREATE POLICY "enquiries_insert_same_company" ON public.enquiries 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);

CREATE POLICY "enquiries_update_same_company" ON public.enquiries 
FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);

CREATE POLICY "enquiries_delete_same_company" ON public.enquiries 
FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);

-- Indexes for Performance
CREATE INDEX idx_enquiries_company ON public.enquiries(company_id);
CREATE INDEX idx_enquiries_entity ON public.enquiries(entity_id);
CREATE INDEX idx_enquiries_status ON public.enquiries(status);
CREATE INDEX idx_enquiries_priority ON public.enquiries(priority);
CREATE INDEX idx_enquiries_pi ON public.enquiries(pi_id);
CREATE INDEX idx_enquiries_order ON public.enquiries(order_id);
CREATE INDEX idx_enquiries_assigned ON public.enquiries(assigned_to);
CREATE INDEX idx_enquiries_created ON public.enquiries(created_at);
CREATE INDEX idx_enquiries_follow_up ON public.enquiries(next_follow_up_date);

-- =============================================================
-- Source: supabase/migrations/add_enquiry_items.sql
-- =============================================================

-- Create Enquiry Items table
CREATE TABLE IF NOT EXISTS public.enquiry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    target_price NUMERIC, -- Optional: Price customer is aiming for
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.enquiry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.enquiry_items
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================================
-- Source: supabase/migrations/add_quotes_table.sql
-- =============================================================

-- ============================================
-- QUOTES MANAGEMENT SYSTEM
-- ============================================

-- Create Quotes table
CREATE TABLE public.quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    quote_number TEXT NOT NULL, -- QT-2024-001
    
    -- Links
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES public.entities(id),
    pi_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
    
    -- Quote Details
    quote_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    currency_code TEXT REFERENCES public.currencies(code) DEFAULT 'USD',
    
    -- Status
    status TEXT DEFAULT 'draft', -- draft, sent, revised, approved, rejected, converted
    version INTEGER DEFAULT 1, -- For revisions
    parent_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL, -- For revisions
    
    -- Pricing
    subtotal NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    
    -- Terms
    payment_terms TEXT,
    delivery_terms TEXT,
    incoterms TEXT, -- FOB, CIF, etc.
    notes TEXT,
    
    -- Conversion
    converted_to_pi_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Quote Items table
CREATE TABLE public.quote_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id),
    product_name TEXT,
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount_percent NUMERIC DEFAULT 0,
    tax_percent NUMERIC DEFAULT 0,
    line_total NUMERIC GENERATED ALWAYS AS (
        quantity * unit_price * (1 - discount_percent/100)
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Quotes
CREATE POLICY "quotes_select_same_company" ON public.quotes 
FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);

CREATE POLICY "quotes_insert_same_company" ON public.quotes 
FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);

CREATE POLICY "quotes_update_same_company" ON public.quotes 
FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);

CREATE POLICY "quotes_delete_same_company" ON public.quotes 
FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);

-- Enable RLS for Quote Items
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Quote Items
CREATE POLICY "quote_items_policy" ON public.quote_items USING (
    EXISTS (
        SELECT 1 FROM public.quotes 
        WHERE id = quote_items.quote_id 
        AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
    )
);

-- Indexes for Performance
CREATE INDEX idx_quotes_company ON public.quotes(company_id);
CREATE INDEX idx_quotes_enquiry ON public.quotes(enquiry_id);
CREATE INDEX idx_quotes_buyer ON public.quotes(buyer_id);
CREATE INDEX idx_quotes_pi ON public.quotes(pi_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created ON public.quotes(created_at);
CREATE INDEX idx_quotes_parent ON public.quotes(parent_quote_id);
CREATE INDEX idx_quote_items_quote ON public.quote_items(quote_id);
CREATE INDEX idx_quote_items_sku ON public.quote_items(sku_id);

-- =============================================================
-- Source: supabase/migrations/add_incoterms_master.sql
-- =============================================================

-- Create Incoterms Master Table
CREATE TABLE IF NOT EXISTS public.incoterms (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- Enable RLS
ALTER TABLE public.incoterms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incoterms_select_all" ON public.incoterms FOR SELECT USING (true);

-- Seed Data
INSERT INTO public.incoterms (code, name, description) VALUES
('EXW', 'Ex Works', 'Seller makes goods available at their premises.'),
('FCA', 'Free Carrier', 'Seller delivers goods to a carrier or another person nominated by the buyer.'),
('CPT', 'Carriage Paid To', 'Seller delivers goods to the carrier and pays for carriage to the named place of destination.'),
('CIP', 'Carriage and Insurance Paid To', 'Seller delivers goods to the carrier and pays for carriage and insurance to the named place of destination.'),
('DAP', 'Delivered at Place', 'Seller delivers when the goods are placed at the disposal of the buyer at the named place of destination.'),
('DPU', 'Delivered at Place Unloaded', 'Seller delivers when the goods, once unloaded, are placed at the disposal of the buyer at a named place of destination.'),
('DDP', 'Delivered Duty Paid', 'Seller takes all responsibility for transporting the goods to the destination country, clearing customs, and paying duties.'),
('FAS', 'Free Alongside Ship', 'Seller delivers when the goods are placed alongside the vessel at the named port of shipment.'),
('FOB', 'Free on Board', 'Seller delivers when the goods are placed on board the vessel nominated by the buyer at the named port of shipment.'),
('CFR', 'Cost and Freight', 'Seller delivers the goods on board the vessel and pays the costs and freight to bring the goods to the named port of destination.'),
('CIF', 'Cost, Insurance and Freight', 'Seller delivers the goods on board the vessel and pays the costs, insurance, and freight to bring the goods to the named port of destination.')
ON CONFLICT (code) DO NOTHING;

-- Update Quotes Table
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS incoterm_place TEXT;

-- Update Export Orders Table
ALTER TABLE public.export_orders
ADD COLUMN IF NOT EXISTS incoterm TEXT REFERENCES public.incoterms(code),
ADD COLUMN IF NOT EXISTS incoterm_place TEXT;

-- Note: We are not enforced FK on existing text columns in quotes/shipments to avoid breaking existing data with invalid codes,
-- but strictly speaking we should. Future cleanup might be needed.

-- =============================================================
-- Source: supabase/migrations/add_purchase_orders.sql
-- =============================================================

-- Create Purchase Orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number TEXT NOT NULL UNIQUE,
    vendor_id UUID REFERENCES public.entities(id) ON DELETE SET NULL, -- Type should be 'supplier' ideally
    export_order_id UUID REFERENCES public.export_orders(id) ON DELETE SET NULL, -- Link for Back-to-Back orders
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'confirmed', 'received', 'completed', 'cancelled')),
    currency_code TEXT NOT NULL DEFAULT 'INR',
    subtotal NUMERIC DEFAULT 0,
    tax_total NUMERIC DEFAULT 0, -- GST
    total_amount NUMERIC DEFAULT 0,
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Purchase Order Items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id) ON DELETE RESTRICT,
    description TEXT, -- In case vendor description differs
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0, -- % GST
    total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED, -- Basic line total
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS Policies (Simplified for MVP - authenticated users can do everything)
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.purchase_orders FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.purchase_order_items FOR ALL USING (auth.role() = 'authenticated');

-- =============================================================
-- Source: supabase/migrations/add_purchase_order_payments.sql
-- =============================================================

-- Create Purchase Order Payments table
CREATE TABLE IF NOT EXISTS public.purchase_order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id), -- Assuming simple multi-tenancy for now, or use RLS helper
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'INR',
    exchange_rate NUMERIC DEFAULT 1,
    payment_method TEXT, -- Wire, Check, Cash, etc.
    reference_number TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add payment_status to purchase_orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'payment_status') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.purchase_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.purchase_order_payments
    FOR ALL USING (auth.role() = 'authenticated');

-- =============================================================
-- Source: supabase/migrations/add_shipping_bills.sql
-- =============================================================

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

-- =============================================================
-- Source: supabase/migrations/add_brcs.sql
-- =============================================================

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

-- =============================================================
-- Source: supabase/migrations/add_incentives.sql
-- =============================================================

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

-- =============================================================
-- Source: supabase/migrations/add_lut_schema.sql
-- =============================================================

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
