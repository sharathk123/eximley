
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
DROP TABLE IF EXISTS public.master_hsn_codes CASCADE;



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
    verification_status TEXT DEFAULT 'unverified',
    is_active BOOLEAN DEFAULT true
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
    signatory_designation TEXT,
    -- Multi-tenant fields
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    is_super_admin_company BOOLEAN DEFAULT false
);

-- Enable RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies moved to after company_users creation

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
    is_super_admin BOOLEAN DEFAULT false,
    force_password_change BOOLEAN DEFAULT false,
    UNIQUE(company_id, user_id)
);

-- Enable RLS for company_users
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_users_select_own" ON public.company_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "company_users_insert_auth" ON public.company_users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "company_users_update_own_company" ON public.company_users FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_users.company_id AND role IN ('owner', 'admin'))
);

-- Companies RLS Policies (Moved here to resolve dependency)
-- 1. Super Admins can SELECT all companies
CREATE POLICY "companies_select_super_admin" ON public.companies 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

-- 2. Members can SELECT their own company
CREATE POLICY "companies_select_own" ON public.companies 
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    );

-- 3. Insert access (for signup)
CREATE POLICY "companies_insert_auth" ON public.companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Super Admin can UPDATE any company (e.g. to approve)
CREATE POLICY "companies_update_super_admin" ON public.companies 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

-- 5. Owners/Admins can UPDATE their own company details
CREATE POLICY "companies_update_own" ON public.companies 
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM public.company_users 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- SECURITY: Protect Super Admin Company
CREATE OR REPLACE FUNCTION public.protect_super_admin_company()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Prevent changing 'is_super_admin_company' flag by anyone
    IF OLD.is_super_admin_company IS DISTINCT FROM NEW.is_super_admin_company THEN
        RAISE EXCEPTION 'Cannot modify is_super_admin_company flag.';
    END IF;

    -- 2. If it is the Super Admin Company, protect critical fields
    IF OLD.is_super_admin_company = true THEN
        -- Prevent deactivation
        IF NEW.status != 'active' THEN
            RAISE EXCEPTION 'The Global Super Admin company cannot be deactivated.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_company_update_protect
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_super_admin_company();

-- Prevent Deletion of Super Admin Company
CREATE OR REPLACE FUNCTION public.prevent_super_admin_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_super_admin_company = true THEN
        RAISE EXCEPTION 'The Global Super Admin company cannot be deleted.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_company_delete_protect
    BEFORE DELETE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_super_admin_delete();


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

-- Create Master HSN Codes table (Global List) - MUST be before products/SKUs that reference it
CREATE TABLE public.master_hsn_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hsn_code TEXT NOT NULL UNIQUE,
    description TEXT,
    gst_rate NUMERIC DEFAULT 0,
    chapter TEXT, -- First 2 digits usually
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Master HSN
ALTER TABLE public.master_hsn_codes ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "master_hsn_read_all" ON public.master_hsn_codes FOR SELECT USING (auth.role() = 'authenticated');

-- Allow Write Access ONLY to Super Admins
CREATE POLICY "master_hsn_write_super_admin" ON public.master_hsn_codes 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

CREATE POLICY "master_hsn_update_super_admin" ON public.master_hsn_codes 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

CREATE POLICY "master_hsn_delete_super_admin" ON public.master_hsn_codes 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );

-- Indexes
CREATE INDEX idx_master_hsn_code ON public.master_hsn_codes(hsn_code);
CREATE INDEX idx_master_hsn_description ON public.master_hsn_codes USING gin(to_tsvector('english', description));

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
    hs_code TEXT REFERENCES public.master_hsn_codes(hsn_code), -- Harmonized System code for customs
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



-- Company HSN Table REMOVED in favor of Global Master List



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

-- Enable Row Level Security
ALTER TABLE shipping_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_bill_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipping_bills
CREATE POLICY "shipping_bills_select_same_company" ON shipping_bills
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "shipping_bills_insert_same_company" ON shipping_bills
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "shipping_bills_update_same_company" ON shipping_bills
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "shipping_bills_delete_same_company" ON shipping_bills
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for shipping_bill_items (via parent shipping_bill)
CREATE POLICY "shipping_bill_items_select_same_company" ON shipping_bill_items
    FOR SELECT USING (
        shipping_bill_id IN (
            SELECT id FROM shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "shipping_bill_items_insert_same_company" ON shipping_bill_items
    FOR INSERT WITH CHECK (
        shipping_bill_id IN (
            SELECT id FROM shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "shipping_bill_items_update_same_company" ON shipping_bill_items
    FOR UPDATE USING (
        shipping_bill_id IN (
            SELECT id FROM shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "shipping_bill_items_delete_same_company" ON shipping_bill_items
    FOR DELETE USING (
        shipping_bill_id IN (
            SELECT id FROM shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );

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
-- Seeding Master HSN Codes
INSERT INTO public.master_hsn_codes (hsn_code, description, gst_rate, chapter) VALUES
('33019031', 'Attars of all kinds in fixed oil base,3301,"Essential oils (terpeneless or not), including concretes and absolutes; resinoids; extracted oleoresins; concentrates of essential oils in fats, in fixed oils, in waxes or the like, obtained by enfleurage or maceration; terpenic by-products of the deterpenation of essential oils; aqueous distillates and aqueous solutions of essential oils such as essential oils of citrus fruit, essential oils other than those of citrus fruit such as eucalyptus oil, etc., flavouring essences all types (including those for liquors), attars of all kinds in fixed oil bases', 18, '33'),
('33074100', 'Agarbatti and other odoriferous preparations which', 0, '33'),
('33074900', 'Other,3307,"Pre-shave, shaving or after-shave preparations, personal deodorants, bath preparations, depilatories and other perfumery, cosmetic or toilet preparations, not elsewhere specified or included; prepared room deodorisers, whether or not perfumed or having disinfectant properties [other than shaving cream, shaving lotion and aftershave', 0, '33'),
('34060010', 'Candles,3406,"Candles, tapers and the like', 5, '34'),
('39231020', 'Watch-box, jewellery box and similar containers of', 0, '39'),
('3923', 'Articles for the conveyance or packing of goods, of plastics; stoppers', 0, '39'),
('42022910', 'Hand bags of other materials excluding wicker-work or basket work,"4202 22, 4202', 0, '42'),
('42023110', 'With outer surface of leather or of composition of Leather -Jewellery box,"4202 22, 4202', 0, '42'),
('42023910', 'Other -Jewellery box,"4202 22, 4202', 0, '42'),
('44141000', 'WOODEN FRAMES FOR PAINTINGS, PHOTOGRAPHS', 0, '44'),
('4414', 'Wooden frames for painting, photographs, mirrors, etc.', 5, '44'),
('44149000', 'WOODEN FRAMES FOR PAINTINGS, PHOTOGRAPHS, MIRRORS OR SIMILAR OBJECTS -Other",4414,"Wooden frames for painting, photographs, mirrors, etc.', 5, '44'),
('44191900', 'Other,4419,Tableware and Kitchenware of wood', 5, '44'),
('44199090', 'Other,4419,Tableware and Kitchenware of wood', 5, '44'),
('44201100', 'Statuettes and other ornaments, of wood: Of tropical wood",4420,"Statuettes & other ornaments of wood, wood marquetry & inlaid, jewellery box, wood lathe and lacquer work (including lathe and lacquer work, ambadi sisal craft)', 5, '44'),
('44201900', 'Statuettes and other ornaments, of wood: -Other",4420,"Statuettes & other ornaments of wood, wood marquetry & inlaid', 0, '44'),
('44209010', 'Wood marquetry and inlaid wood,4420,"Wood marquetry and inlaid wood; caskets and cases for jewellery or cutlery, and similar articles, of wood; statuettes and other ornaments, of wood; wooden articles of furniture not falling in Chapter 94', 5, '44'),
('44209090', 'Other,4420,"Wood marquetry and inlaid wood; caskets and cases for jewellery or cutlery, and similar articles, of wood; statuettes and other ornaments, of wood; wooden articles of furniture not falling in Chapter 94', 5, '44'),
('44219160', 'Parts of domestic decorative articles used as tableware and kitchenware,4421,"Other articles of wood; such as clothes hangers, Spools, cops, bobbins, sewing thread reels and the like of turned wood for various textile machinery, Match splints, Pencil slats, Parts of wood, namely oars, paddles and rudders for ships, boats and other similar floating structures, Parts of domestic decorative articles used as tableware and kitchenware [other than Wood paving blocks, articles of densified wood not elsewhere included or specified, Parts of domestic decorative articles used as tableware and kitchenware]', 5, '44'),
('46012900', 'Mats, matting and screens of vegetable materials -Other","4601 and', 0, '46'),
('46019900', 'Other,"4601 and', 0, '46'),
('46021100', 'Of bamboo,"4601, 4602","Manufactures of straw, of esparto or of other plaiting materials;', 0, '46'),
('46021200', 'Of rattan,"4601, 4602","Manufactures of straw, of esparto or of other plaiting materials;', 0, '46'),
('46021911', 'Baskets,"4601, 4602","Manufactures of straw, of esparto or of other plaiting materials;', 0, '46'),
('46021919', 'Other,"4601, 4602","Manufactures of straw, of esparto or of other plaiting materials;', 0, '46'),
('46021990', 'Other,"4601, 4602","Manufactures of straw, of esparto or of other plaiting materials;', 0, '46'),
('48021010', 'Hand-made paper -Paper,4802,Hand-made paper and paperboard', 5, '48'),
('48021020', 'Hand-made paperboard,4802,Hand-made paper and paperboard', 5, '48'),
('48237030', 'Articles made of paper mache other than artware and', 0, '48'),
('4823', 'Articles made of paper mache', 5, '48'),
('48239018', 'Products consisting of sheets of paper or paperboard, impregnated, coated or covered with plastics (including thermoset resins or mixtures thereof or chemical ormulations containing melamine, phenol or urea formaldehyde with or without curing agents",4823,"Paper pulp moulded trays; Kites, Paper mache articles', 5, '48'),
('56050020', 'Imitation zari thread,5605,"Metallised yarn, whether or not gimped, being textile yarn, or strip or the like of heading 5404 or 5405, combined with metal in the form of thread, strip or powder or covered with metal, including real zari thread (gold) and silver thread combined with textile thread, imitation zari thread or yarn known by any name in trade parlance', 5, '56'),
('56050090', 'Metallised yarn, whether or not gimped, being textile yarn, or strip or the like of heading 5404 or 5405, combined with metal in the form of thread, strip or powder or covered with metal :- Other",5605,"Metallised yarn, whether or not gimped, being textile yarn, or strip or the like of heading 5404 or 5405, combined with metal in the form of thread, strip or powder or covered with metal, including real zari thread (gold) and silver thread combined with textile thread, imitation zari thread or yarn known by any name in trade parlance', 5, '56'),
('58041090', 'Tulles and other net fabrics :- Other,5804,"Tulles and other net fabrics, not including woven, knitted or crocheted fabrics; lace in the piece, in strips or in motifs, other than fabrics of', 0, '58'),
('58043000', 'Hand-made lace,5804 30 00,Handmade lace', 5, '58'),
('58050010', 'Tapestries hand made or needle worked by hand, of cotton",5805,"Hand-woven tapestries of the type Gobelins, Flanders, Aubusson, Beauvais and the like, and needle-worked tapestries (for example, petit point, cross stitch), whether or not made up', 5, '58'),
('5805', 'Hand-woven tapestries', 5, '58'),
('58081090', 'Braids, in the piece :- Other",5808 10,Hand-made braids and ornamental trimming in the piece', 5, '58'),
('58090010', 'Zari border,5809,"Woven fabrics of metal thread and woven fabrics of metallised yarn of heading 5605, of a kind used in apparel, as furnishing fabrics or for similar purposes, not elsewhere specified or included; such as Zari', 0, '58'),
('58090090', 'Woven fabrics of metal thread and woven fabrics of metallised yarn of heading 5605, of a kind used in apparel, as furnishing fabrics or for similar purposes, not elsewhere specified or included :- Other","5809, 5810","Embroidery or zari articles, that is to say,- imi, zari, kasab, salma, dabka, chumki, gota, sitara, naqsi, kora, glass beads, badla, gizai', 5, '58'),
('58101000', 'Embroidery without visible ground,5810,Hand embroidered articles', 5, '58'),
('58109210', 'Embroidered badges, motifs and the like",5810,"Embroidery in the piece, in strips or in motifs, Embroidered badges', 0, '58'),
('58110010', 'Kantha (multilayer stitched textile fabrics in piece used for bedding, mattress pads or clothing)",5811,"Quilted textile products in the piece, composed of one or more layers of textile materials assembled with padding by stitching or otherwise, other than embroidery of heading 5810', 5, '58'),
('58110020', 'Quilted wadding,5811,"Quilted textile products in the piece, composed of one or more layers of textile materials assembled with padding by stitching or otherwise, other than embroidery of heading 5810', 5, '58'),
('61043100', 'Jackets and blazers :- Of wool or fine animal hair,61,"Article of apparel and clothing accessories, knitted or crocheted, of sale', 0, '61'),
('61171020', 'Shawls, scarves, mufflers, mantillas, veils and the like :-', 0, '61'),
('6117', '6214",Handmade/hand embroidered shawls', 5, '61'),
('63041100', 'Bedspreads :- Knitted or crocheted,"63 [other than', 0, '63'),
('63049190', 'Knitted or crocheted :- Other,"63 [other than', 0, '63'),
('63079011', 'Dress materials hand printed :- Of cotton,"63 [other than', 0, '63'),
('63079012', 'Dress materials hand printed :- Of silk,"63 [other than', 0, '63'),
('63079013', 'Dress materials hand printed :- Of man-made fibres,"63 [other than', 0, '63'),
('63079019', 'Dress materials hand printed :- Other,"63 [other than', 0, '63'),
('63079020', 'Dress materials hand printed :- Made up articles of cotton,"63 [other than', 0, '63'),
('63079090', 'Dress materials hand printed :-  Other,"63 [other than', 0, '63'),
('64032040', 'Kolapuri chappals and similar footwear,64,Footwear of sale value not exceeding Rs.2500 per pair', 5, '64'),
('64061010', 'Embroidered uppers of textile materials,64,Footwear of sale value not exceeding Rs.2500 per pair', 5, '64'),
('65040000', 'HATS AND OTHER HEADGEAR, PLAITED OR MADE BY', 0, '65'),
('65050090', 'Hats and other headgear, knitted or crocheted, or made up from lace, felt or other textile fabric, in the piece (but not in strips), whether or not lined or trimmed; hair-nets of any material, whether or not lined or trimmed - Other",6505,Hats (knitted/crocheted) or made up from lace or other textile fabrics', 5, '65'),
('66020000', 'WALKING-STICKS, SEAT-STICKS, WHIPS, RIDING CROPS', 0, '66'),
('67010010', 'Feather dusters,6701,"Skins and other parts of birds with their feathers or down, feathers, parts of feathers, down and articles thereof (other than goods of', 0, '67'),
('67029090', 'ARTIFICIAL FLOWERS, FOLIAGE AND FRUIT AND PARTS THEREOF; ARTICLES MADE OF ARTIFICIAL FLOWERS', 0, '67'),
('6702', 'Artificial  flowers,  foliage  and  fruit  and parts  thereof;  articles  made of  artificial flowers, foliage or fruit', 18, '67'),
('68022190', 'Others - Marble, travertine and alabaster",6802,"Carved stone products (e.g., statues, statuettes, figures of animals, writing sets, ashtray, candle stand)', 5, '68'),
('68159990', 'Other,6815 99 90,"Stone art ware, stone inlay work', 5, '68'),
('69111011', 'Tableware :- Of bone china and soft porcelain,6911,"Tableware, kitchenware, other household articles and toilet articles, of', 0, '69'),
('69111019', 'Tableware :-Other,6911,"Tableware, kitchenware, other household articles and toilet articles, of', 0, '69'),
('69111021', 'Kitchenware:- Of Bone china and soft porcelain,6911,"Tableware, kitchenware, other household articles and toilet articles, of', 0, '69'),
('69111029', 'Kitchenware:- Other,6911,"Tableware, kitchenware, other household articles and toilet articles, of', 0, '69'),
('69119010', 'Toilet articles,6911,"Tableware, kitchenware, other household articles and toilet articles, of', 0, '69'),
('69119090', 'Other,6911,"Tableware, kitchenware, other household articles and toilet articles, of', 0, '69'),
('69120010', 'Tableware,"6912 00 10,","Tableware and kitchenware of clay and terracotta, other clay articles', 5, '69'),
('69120020', 'Kitchenware,6912 00 20,"Tableware and kitchenware of clay and terracotta, other clay articles', 5, '69'),
('69120030', 'Toilet articles,6912,"Tableware, kitchenware, other household articles and toilet articles', 0, '69'),
('69120040', 'Clay articles,69120040,Earthen pot and clay lamps,NIL', 0, '69'),
('69120090', 'Ceramic tableware, kitchenware, other household articles and toilet articles, other than of porcelain or', 0, '69'),
('6912', 'Tableware, kitchenware, other household articles and toilet articles, other than of porcelain or china', 5, '69'),
('69131000', 'Of porcelain or china,6913,Statues and other ornamental articles', 5, '69'),
('69139000', 'STATUETTES AND OTHER ORNAMENTAL CERAMIC ARTICLES:- Other,6913 90 00,Statuettes & other ornamental ceramic articles (incl. blue potteries)', 5, '69'),
('69141000', 'Of porcelain or china,6914,Other ceramic articles', 18, '69'),
('69149000', 'OTHER CERAMIC ARTICLES:- Other,6914,Other ceramic articles', 18, '69'),
('70099200', 'Rear-view mirrors for vehicles :- Other:- Framed,7009 92 00,Ornamental framed mirrors', 5, '70'),
('70132800', 'Stemware drinking glasses, other than of glass-ceramics :-Other",7013,"Glassware of a kind used for table, kitchen, toilet, office, indoor decoration or similar purposes (other than that of heading 7010 or', 0, '70'),
('70133300', 'Other drinking glasses, other than of glassceramics :-Of lead crystal",7013,"Glassware of a kind used for table, kitchen, toilet, office, indoor decoration or similar purposes (other than that of heading 7010 or', 0, '70'),
('70133700', 'Other drinking glasses, other than of glassceramics :-Other",7013,"Glassware of a kind used for table, kitchen, toilet, office, indoor decoration or similar purposes (other than that of heading 7010 or', 0, '70'),
('70134100', 'Of lead crystal,7013,"Glassware of a kind used for table, kitchen, toilet, office, indoor', 0, '70'),
('70134900', 'Other glassware,7013,"Glassware of a kind used for table, kitchen, toilet, office, indoor', 0, '70'),
('70139100', 'Of lead crystal,7013,"Glassware of a kind used for table, kitchen, toilet, office, indoor', 0, '70'),
('70181010', 'Bangles,7018 10,"Bangles, beads and small ware', 5, '70'),
('70181020', 'Beads,7018,Glass beads', 5, '70'),
('70181090', 'Glass beads, imitation pearls, imitation precious or semi-precious stones and similar glass smallwares :- Other",7018,"Imitation pearls, imitation precious or semi-precious stones and similar glass smallwares, and articles thereof other than imitation jewellery; glass eyes other than prosthetic articles; statuettes and other ornaments of lamp-worked glass, other than imitation jewellery; glass microspheres not exceeding 1 mm in diameter', 18, '70'),
('70189010', 'Glass statues,7018 90 10,Glass statues [other than those of crystal]', 5, '70'),
('70200011', 'Globes for lamps and lanterns,7020,"Globes for lamps and lanterns, Founts for kerosene wick lamps, Glass', 0, '70'),
('70200029', 'Glass chimneys :- Other,7020,"Other articles of glass [other than Globes for lamps and lanterns, Founts for kerosene wick lamps, Glass chimneys for lamps and', 0, '70'),
('70200090', 'Glass chimneys :- Other,7020 00 90,"Glass art ware [ incl. pots, jars, votive, cask, cake cover, tulip bottle, vase]', 5, '70'),
('71131110', 'Jewellery with filigree work,7113 11 10,Silver filigree work', 3, '71'),
('71171100', 'Cuff-links and studs,7117,"Handmade imitation jewellery (including natural seeds, beads jewellery, cardamom garland)', 3, '71'),
('71171910', 'Bangles,7117,Bangles of lac/shellac,NIL', 0, '71'),
('71171920', 'German silver jewellery,7117,Imitation jewellery [other than bangles of lac/shellac]', 3, '71'),
('71171990', 'Other,7117,Imitation jewellery [other than bangles of lac/shellac]', 3, '71'),
('71179010', 'Jewellery studded with imitation pearls or imitation or', 0, '71'),
('7117', 'Imitation jewellery [other than bangles of lac/shellac]', 3, '71'),
('71179090', 'Other,7117,"Handmade imitation jewellery (including natural seeds, beads', 0, '71'),
('73239200', 'Of cast iron, enamelled",7323,"Table, kitchen or other household articles of iron & steel; Utensils', 5, '73'),
('73239420', 'Utensils,7323,"Table, kitchen or other household articles of iron & steel; Utensils', 5, '73'),
('73239490', 'Of iron (other than cast iron) or steel, enamelled :- Other",7323,"Table, kitchen or other household articles of iron & steel; Utensils', 5, '73'),
('74181021', 'Of Brass,7418,"Table, kitchen or other household articles of copper; Utensils', 5, '74'),
('74181022', 'Of Copper,7418,"Table, kitchen or other household articles of copper; Utensils', 5, '74'),
('74181023', 'Of other copper alloys,7418,"Table, kitchen or other household articles of copper; Utensils', 5, '74'),
('74181024', 'E.P.N.S. Ware,7418,"Table, kitchen or other household articles of copper; Utensils', 5, '74'),
('74181031', 'Of E.P.N.S,7418,"Table, kitchen or other household articles of copper; Utensils', 5, '74'),
('74181039', 'Other,7418,"All goods (other than table, kitchen or other household articles of', 18, '74'),
('74198020', 'Articles of copper alloys electro-plated with nickel silver,7419 80,"Artware of brass, copper/copper alloys, electro plated with nickel/silver', 5, '74'),
('74198030', 'Articles of brass,7419 80 30,Brass Kerosene Pressure Stove', 5, '74'),
('74198040', 'Copper worked articles,7419 80,"Artware of brass, copper/copper alloys, electro plated with', 0, '74'),
('76151030', 'Other table, kitchen or household articles",7615,"Table, kitchen or other household articles of aluminium; Utensils', 5, '76'),
('76151090', 'Pressure cookers, solar collectors:- Parts",7616 99 90,Aluminium art ware', 5, '76'),
('83061000', 'Bells, gongs and the like",8306,"Bells, gongs and the like, non-electric, of base metal; statuettes and other ornaments, of base metal; photograph, picture or similar frames, of base metal; mirrors of base metal; metal bidriware', 5, '83'),
('83062190', 'Plated with precious metal:- Other,8306,"Bells, gongs and the like, non-electric, of base metal; statuettes and other ornaments, of base metal; photograph, picture or similar frames, of base metal; mirrors of base metal; metal bidriware', 5, '83'),
('83062910', 'Statuettes,8306,"Bells, gongs and the like, non-electric, of base metal; statuettes and other ornaments, of base metal; photograph, picture or similar frames, of base metal; mirrors of base metal; metal bidriware', 5, '83'),
('83062990', 'Other,8306,"Bells, gongs and the like, non-electric, of base metal; statuettes and other ornaments, of base metal; photograph, picture or similar frames, of base metal; mirrors of base metal; metal bidriware', 5, '83'),
('83063000', 'Photograph, picture or similar frames; mirrors",8306,"Bells, gongs and the like, non-electric, of base metal; statuettes and other ornaments, of base metal; photograph, picture or similar frames, of base metal; mirrors of base metal; metal bidriware', 5, '83'),
('83089020', 'Imitation zari spangles,8308,"Clasps, frames with clasps, buckles, buckle-clasps, hooks, eyes, eyelets and the like, of base metal, of a kind used for clothing or clothing accessories, footwear, jewellery, wrist watches, books, awnings, leather goods, travel goods or saddlery or for other made up articles; tubular or bifurcated rivets, of base metal; beads and pangles, of base', 0, '83'),
('83089031', 'For garments, made ups, knitwear, plastic and leather goods",8308,"Clasps, frames with clasps, buckles, buckle-clasps, hooks, eyes, eyelets and the like, of base metal, of a kind used for clothing or clothing accessories, footwear, jewellery, wrist watches, books, awnings, leather goods, travel goods or saddlery or for other made up articles; tubular or bifurcated rivets, of base metal; beads and pangles, of base', 0, '83'),
('83089039', 'Beads and spangles of base metal:- Other,8308,"Clasps, frames with clasps, buckles, buckle-clasps, hooks, eyes, eyelets and the like, of base metal, of a kind used for clothing or clothing accessories, footwear, jewellery, wrist watches, books, awnings, leather goods, travel goods or saddlery or for other made up articles; tubular or bifurcated rivets, of base metal; beads and pangles, of base', 0, '83'),
('92029000', 'OTHER STRING MUSICAL INSTRUMENTS (FOR EXAMPLE', 0, '92'),
('92059010', 'Flutes,9205,"Wind musical instruments (for example, keyboard pipe organs, accordions, clarinets, trumpets, bagpipes), other than fairground organs and mechanical street organs', 18, '92'),
('92059090', 'Other,9205,"Wind musical instruments (for example, keyboard pipe organs, accordions, clarinets, trumpets, bagpipes), other than fairground organs and mechanical street organs', 18, '92'),
('92060000', 'PERCUSSION MUSICAL INSTRUMENTS (FOR EXAMPLE, DRUMS, XYLOPHONES, CYMBOLS, CASTANETS', 0, '92'),
('94033010', 'Cabinetware,9403,"Other furniture [other than furniture wholly made of bamboo, cane or', 0, '94'),
('94033090', 'Wooden furniture of a kind used in offices:- Other,9403,"Other furniture [other than furniture wholly made of bamboo, cane or', 0, '94'),
('94035010', 'Bed stead,9403,"Other furniture [other than furniture wholly made of bamboo, cane or', 0, '94'),
('94035090', 'Wooden furniture of a kind used in the bed room:- Other,9403,"Other furniture [other than furniture wholly made of bamboo, cane or', 0, '94'),
('94036000', 'Other wooden furniture,9403,"Other furniture [other than furniture wholly made of bamboo, cane or', 0, '94'),
('94038200', 'Of bamboo,9403,"Furniture wholly made of bamboo, cane or rattan', 5, '94'),
('94038900', 'Furniture of other materials, including cane, osier', 0, '94'),
('9403', 'Furniture wholly made of bamboo, cane or rattan', 5, '94'),
('94039100', 'Furniture of other materials, including cane, osier, bamboo or similar materials - Parts - of wood",9403,"Furniture wholly made of bamboo, cane or rattan', 5, '94'),
('94039900', 'Furniture of other materials, including cane, osier', 0, '94'),
('94049000', 'Quilts, bedspreads, eiderdowns and duvets', 0, '94'),
('9404', 'Cotton quilts of sale value not exceeding Rs. 2500 per piece', 5, '94'),
('94051100', 'Chandeliers and other electric ceiling or wall lighting fittings, excluding those of a kind used for lighting public open spaces or thoroughfares - Designed for use solely with light-emitting diode  (LED) light sources",9405,"Hurricane lanterns, Kerosene lamp / pressure lantern, petromax, glass chimney, and parts thereof', 5, '94'),
('94051900', 'Other,9405 10,Handcrafted lamps (including Panchloga lamp)', 5, '94'),
('94053100', 'Lighting strings of a kind used for Christmas trees: Designed for use solely with light-emitting diode (LED)', 0, '94'),
('94053900', 'Other,9405 10,Handcrafted lamps (including Panchloga lamp)', 5, '94'),
('94055000', 'Non-electrical luminaires and lighting fittings,9405,"Luminaires and lighting fittings including searchlights and spotlights and parts thereof, not elsewhere specified or included; illuminated signs, illuminated nameplates and the like, having a permanently fixed light source, and parts thereof not elsewhere specified or included [other than kerosene pressure lantern and parts thereof including gas mantles; hurricane lanterns, kerosene lamp, petromax, glass chimney, and parts thereof', 18, '94'),
('95030010', 'Of wood,9503,"Toy balloons made of natural rubber latex and Toys like tricycles, scooters, pedal cars etc. (including parts and', 0, '95'),
('95030090', 'Tricycles, scooters, pedal cars and similar wheeled toys; dolls'' carriages; dolls; other toys; reduced-size (�scale�) models and similar recreational models, working or not; puzzles of all kinds:- Other",9503,"Dolls or other toys made of wood or metal or textile material (including wooden toys of Sawantwadi, Channapatna toys, Thanjavur doll)', 5, '95'),
('95051000', 'Articles for Christmas festivities,9505,"Festive, carnival or other entertainment articles, including conjuring tricks and novelty jokes', 18, '95'),
('95059010', 'Magical equipments,9505,"Festive, carnival or other entertainment articles, including conjuring tricks and novelty jokes', 18, '95'),
('96011000', 'Worked ivory and articles of ivory,9601,"Worked ivory, bone, tortoise shell, horn, antlers, corals, mother of pearl, and other animal carving material and articles of these materials, articles of coral (including articles obtained by moulding)', 5, '96'),
('96019010', 'Worked tortoise-shell and articles thereof,9601,"Worked ivory, bone, tortoise shell, horn, antlers, corals, mother of pearl, and other animal carving material and articles of these materials, articles of coral (including articles obtained by moulding)', 5, '96'),
('96019020', 'Worked mother-of-pearl and articles thereof,9601,"Worked ivory, bone, tortoise shell, horn, antlers, corals, mother of pearl, and other animal carving material and articles of these materials, articles of coral (including articles obtained by moulding)', 5, '96'),
('96019030', 'Worked bone (excluding whale bone) and  articles thereof,9601,"Worked ivory, bone, tortoise shell, horn, antlers, corals, mother of pearl, and other animal carving material and articles of these materials, articles of coral (including articles obtained by moulding)', 5, '96'),
('96019040', 'Worked horn, coral and other animal carving  material and articles thereof",9601,"Worked ivory, bone, tortoise shell, horn, antlers, corals, mother of pearl, and other animal carving material and articles of these materials, articles of coral (including articles obtained by moulding)', 5, '96'),
('96019090', 'Other,9601,"Worked ivory, bone, tortoise shell, horn, antlers, corals, mother of pearl, and other animal carving material and articles of these materials, articles of coral (including articles obtained by moulding)', 5, '96'),
('96020010', 'Worked vegetable carving material and articles thereof,9602,"Worked vegetable or mineral carving materials and articles thereof; articles of wax, Stearin, natural gums or natural resins, or of modelling pastes, etc. (including articles of lac, shellac)', 5, '96'),
('96020020', 'Moulded or carved articles of wax, stearin, natural gums and resins and other moulded or carved articles",9602,"Worked vegetable or mineral carving materials and articles thereof; articles of wax, Stearin, natural gums or natural resins, or of modelling pastes, etc. (including articles of lac, shellac)', 5, '96'),
('96020040', 'Other articles of unhardened gelatin,9602,"Worked vegetable or mineral carving materials and articles thereof; articles of wax, Stearin, natural gums or natural resins, or of modelling pastes, etc. (including articles of lac, shellac)', 5, '96'),
('96020090', 'Worked vegetable or mineral carving material and articles of these materials moulded or carved articles of wax, of stearin, of natural gums or natural resins or of modelling pastes, and other moulded or carved articles, not elsewhere specified or included",9602,"Worked vegetable or mineral carving materials and articles thereof; articles of wax, Stearin, natural gums or natural resins, or of modelling pastes, etc. (including articles of lac, shellac)', 5, '96'),
('96031000', 'Brooms and brushes, consisting of twigs or other', 0, '96'),
('96062200', 'Of base metals, not covered with textile material","9606 21 00', 0, '96'),
('96089910', 'Pen holders, pencil holders and similar holders",9608,"Ball point pens; felt tipped and other porous-tipped pens and markers; fountain pens; stylograph pens and other pens; duplicating stylos; pen holders, pencil holders and similar holders; parts (including caps and clips) of the foregoing articles, other than those of heading 9609', 18, '96'),
('96140000', 'SMOKING PIPES (INCLUDING PIPE BOWLS) AND CIGAR OR CIGARETTE HOLDERS AND PARTS THEREOF,9614,"Smoking pipes (including pipe bowls) and cigar or cigarette holders, and parts thereof', 40, '96'),
('97012100', 'PAINTINGS, DRAWINGS AND PASTELS, EXECUTED ENTIRELY BY HAND, OTHER THAN DRAWINGS OF HEADING 4906 AND OTHER THAN HAND-PAINTED OR HAND-DECORATED MANUFACTURED ARTICLES; COLLAGES, MOSAICS AND SIMILAR DECORATIVE', 0, '97'),
('97012200', 'PAINTINGS, DRAWINGS AND PASTELS, EXECUTED ENTIRELY BY HAND, OTHER THAN DRAWINGS OF HEADING 4906 AND OTHER THAN HAND-PAINTED OR HAND-DECORATED MANUFACTURED ARTICLES; COLLAGES, MOSAICS AND SIMILAR DECORATIVE', 0, '97'),
('9701', 'Hand paintings, drawings, and pastels (including Mysore painting, Rajasthan painting, Tanjore painting, Palm leaf painting, Basoli, etc.)', 5, '97'),
('97012900', 'PAINTINGS, DRAWINGS AND PASTELS, EXECUTED ENTIRELY BY HAND, OTHER THAN DRAWINGS OF HEADING 4906 AND OTHER THAN HAND-PAINTED OR HAND-DECORATED MANUFACTURED ARTICLES; COLLAGES, MOSAICS AND SIMILAR DECORATIVE', 0, '97'),
('97019100', 'PAINTINGS, DRAWINGS AND PASTELS, EXECUTED ENTIRELY BY HAND, OTHER THAN DRAWINGS OF HEADING 4906 AND OTHER THAN HAND-PAINTED OR HAND-DECORATED MANUFACTURED ARTICLES; COLLAGES, MOSAICS AND SIMILAR DECORATIVE', 0, '97'),
('97019200', 'PAINTINGS, DRAWINGS AND PASTELS, EXECUTED ENTIRELY BY HAND, OTHER THAN DRAWINGS OF HEADING 4906 AND OTHER THAN HAND-PAINTED OR HAND-DECORATED MANUFACTURED ARTICLES; COLLAGES, MOSAICS AND SIMILAR DECORATIVE', 0, '97'),
('97019900', 'PAINTINGS, DRAWINGS AND PASTELS, EXECUTED ENTIRELY BY HAND, OTHER THAN DRAWINGS OF HEADING 4906 AND OTHER THAN HAND-PAINTED OR HAND-DECORATED MANUFACTURED ARTICLES; COLLAGES, MOSAICS AND SIMILAR DECORATIVE', 0, '97'),
('97021000', 'ORIGINAL ENGRAVINGS, PRINTS AND LITHOGRAPHS - Of', 0, '97'),
('9702', 'Original engravings, prints and lithographs', 5, '97'),
('97029000', 'ORIGINAL ENGRAVINGS, PRINTS AND LITHOGRAPHS :-', 0, '97'),
('97031010', 'ORIGINAL SCULPTURES AND STATUARY, IN ANY', 0, '97'),
('9703', 'Original sculptures and statuary, in metal, stone, or any other material', 5, '97'),
('97031020', 'ORIGINAL SCULPTURES AND STATUARY, IN ANY', 0, '97'),
('97031090', 'ORIGINAL SCULPTURES AND STATUARY, IN ANY', 0, '97'),
('97039010', 'ORIGINAL SCULPTURES AND STATUARY, IN ANY', 0, '97'),
('97039020', 'ORIGINAL SCULPTURES AND STATUARY, IN ANY', 0, '97'),
('97039090', 'ORIGINAL SCULPTURES AND STATUARY, IN ANY', 0, '97'),
('97040010', 'Used postal stamp,9704,"Postage or revenue stamps, stamp-postmarks, first-day covers, postal stationery (stamped paper), and the like, used or unused, other than', 0, '97'),
('97040020', 'Used or unused first-day covers for philatelists,9704,"Postage or revenue stamps, stamp-postmarks, first-day covers, postal stationery (stamped paper), and the like, used or unused, other than', 0, '97'),
('97040090', 'Postage or revenue stamps, stamp-post marks, first-day covers, postal stationery (stamped paper), and the like, used or unused, other than those of heading 490 :- Other",9704,"Postage or revenue stamps, stamp-postmarks, first-day covers, postal stationery (stamped paper), and the like, used or unused, other than those of heading 4907', 5, '97'),
('97051000', 'Collections and collectors'' pieces of archaeological, ethnographic or historical interest Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical or paleontological interest Collections and collectors'' pieces of archaeologic",9705,"Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical, historical, archaeological, 29 paleontological, ethnographic or numismatic interest [other than numismatic coins]', 5, '97'),
('97052100', 'Collections and collectors'' pieces of archaeological, ethnographic or historical interest Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical or paleontological interest - Collections and collectors'' pieces of zoological",9705,"Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical, historical, archaeological, 29 paleontological, ethnographic or numismatic interest [other than numismatic coins]', 5, '97'),
('97052200', 'Collections and collectors'' pieces of archaeological, ethnographic or historical interest Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical or paleontological interest - Collections and collectors'' pieces of zoological",9705,"Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical, historical, archaeological, 29 paleontological, ethnographic or numismatic interest [other than numismatic coins]', 5, '97'),
('97052900', 'Collections and collectors'' pieces of archaeological, ethnographic or historical interest Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical or paleontological interest - Collections and collectors'' pieces of zoological",9705,"Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical, historical, archaeological, 29 paleontological, ethnographic or numismatic interest [other than numismatic coins]', 5, '97'),
('97053100', 'Collections and collectors'' pieces of archaeological, ethnographic or historical interest Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical or paleontological interest - Collections and collectors'' pieces of numismatic",9705,"Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical, historical, archaeological, 29 paleontological, ethnographic or numismatic interest [other than numismatic coins]', 5, '97'),
('97053900', 'Collections and collectors'' pieces of archaeological, ethnographic or historical interest Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical or paleontological interest - Collections and collectors'' pieces of numismatic",9705,"Collections and collectors'' pieces of zoological, botanical, mineralogical, anatomical, historical, archaeological, 29 paleontological, ethnographic or numismatic interest [other than numismatic coins]', 5, '97'),
('97061000', 'ANTIQUES OF AN AGE EXCEEDING 100 YEARS - Of an age', 0, '97'),
('9706', 'Antiques of an age exceeding one hundred years', 5, '97')
ON CONFLICT (hsn_code) DO NOTHING;

-- =============================================================
-- SEED: Super Admin User & Company
-- =============================================================

DO $$
DECLARE
    new_user_id UUID;
    new_company_id UUID;
    existing_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@eximley.com';
    
    IF existing_user_id IS NULL THEN
        -- Create Auth User for Super Admin
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@eximley.com',
            crypt('Admin123!', gen_salt('bf')), -- Default password: Admin123!
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO new_user_id;
        
        -- Create user profile for the Super Admin (if not exists)
        INSERT INTO public.user_profiles (id, full_name)
        VALUES (new_user_id, 'Super Admin')
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created new Super Admin user with ID: %', new_user_id;
    ELSE
        new_user_id := existing_user_id;
        RAISE NOTICE 'Super Admin user already exists with ID: %', new_user_id;
    END IF;

    -- Create the Eximley Global Super Admin Company (if not exists)
    SELECT id INTO new_company_id FROM public.companies WHERE legal_name = 'Eximley Global';
    
    IF new_company_id IS NULL THEN
        INSERT INTO public.companies (
            legal_name,
            trade_name,
            email,
            is_super_admin_company,
            status,
            country
        )
        VALUES (
            'Eximley Global',
            'Eximley Admin',
            'admin@eximley.com',
            true,
            'active',
            'India'
        )
        RETURNING id INTO new_company_id;
        
        RAISE NOTICE 'Created Eximley Global company with ID: %', new_company_id;
    ELSE
        RAISE NOTICE 'Eximley Global company already exists with ID: %', new_company_id;
    END IF;

    -- Link the user to the company as Super Admin (if not already linked)
    IF NOT EXISTS (
        SELECT 1 FROM public.company_users 
        WHERE company_id = new_company_id AND user_id = new_user_id
    ) THEN
        INSERT INTO public.company_users (
            company_id,
            user_id,
            role,
            is_super_admin,
            force_password_change
        )
        VALUES (
            new_company_id,
            new_user_id,
            'owner',
            true,
            true
        );
        
        RAISE NOTICE 'Linked user to company as Super Admin';
    ELSE
        RAISE NOTICE 'User already linked to company';
    END IF;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Super Admin Setup Complete!';
    RAISE NOTICE 'Email: admin@eximley.com';
    RAISE NOTICE 'Password: Admin123!';
    RAISE NOTICE '===========================================';
END $$;
