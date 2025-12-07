
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
