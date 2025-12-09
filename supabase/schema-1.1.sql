-- =============================================================
-- schema-1.1.sql
-- Consolidated database schema (schema-1.0.sql + AI-driven HSN/ITC mapping patch)
-- Version: 1.1
-- Purpose: Full DB creation script for Eximley/EVO EXIMORA including:
--   - Core application tables & RLS
--   - HSN/ITC unified master table (itc_gst_hsn_mapping)
--   - AI support objects (embeddings, suggestions audit)
--   - Shipping, invoicing, BRCs, incentives, LUTs, etc.
-- Notes:
--   - Safe for fresh creation. Uses IF NOT EXISTS and guarded ALTERs where applicable.
--   - This file assumes the "auth" schema (auth.users) is present (Supabase default).
--   - Review the seeded credentials/notifications section before running in production.
-- =============================================================

-- =============================================================
-- CLEANUP (Allow safe re-create)
-- =============================================================
-- WARNING: These DROP commands remove tables if they exist to ensure a clean recreation.
-- They are already present in your provided schema-1.0.sql. Keep them if you want destructive reset.
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
DROP TABLE IF EXISTS public.product_categories CASCADE;

-- =============================================================
-- CORE: Entities, Companies, Users, Company Users
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DANGER: Complete Reset of Auth Users (Development Mode)
-- This wipes all users, superadmins, and associated profiles.
DO $$
BEGIN
    RAISE NOTICE 'Wiping auth.users...';
    TRUNCATE auth.users CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to truncate auth.users (check permissions): %', SQLERRM;
END $$;

-- Companies table (Must be created BEFORE entities)
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    iec_number TEXT,
    gstin TEXT,
    pan TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    pincode TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_swift TEXT,
    bank_branch TEXT,
    signatory_name TEXT,
    signatory_designation TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    is_super_admin_company BOOLEAN DEFAULT false
);

-- Entities table (Buyers, Suppliers, etc.)
CREATE TABLE public.entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE, -- Multi-tenant separation
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

-- Enable RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- User profiles (linked to auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT,
    phone TEXT,
    job_title TEXT,
    avatar_url TEXT
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_select_own'
  ) THEN
    CREATE POLICY "user_profiles_select_own" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_insert_own'
  ) THEN
    CREATE POLICY "user_profiles_insert_own" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_update_own'
  ) THEN
    CREATE POLICY "user_profiles_update_own" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END
$$;

-- Function to auto-create user_profile on new auth.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Company users (junction)
CREATE TABLE public.company_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    is_super_admin BOOLEAN DEFAULT false,
    force_password_change BOOLEAN DEFAULT false,
    UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_users'
      AND policyname = 'company_users_select_own'
  ) THEN
    CREATE POLICY "company_users_select_own" ON public.company_users FOR SELECT USING (auth.uid() = user_id);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_users'
      AND policyname = 'company_users_insert_auth'
  ) THEN
    CREATE POLICY "company_users_insert_auth" ON public.company_users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_users'
      AND policyname = 'company_users_update_own_company'
  ) THEN
    CREATE POLICY "company_users_update_own_company" ON public.company_users FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_users.company_id AND role IN ('owner', 'admin'))
);
  END IF;
END
$$;

-- Companies policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'companies_select_super_admin'
  ) THEN
    CREATE POLICY "companies_select_super_admin" ON public.companies FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'companies_select_own'
  ) THEN
    CREATE POLICY "companies_select_own" ON public.companies FOR SELECT USING (
        id IN (
            SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'companies_insert_auth'
  ) THEN
    CREATE POLICY "companies_insert_auth" ON public.companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'companies_update_super_admin'
  ) THEN
    CREATE POLICY "companies_update_super_admin" ON public.companies FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.company_users 
            WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'companies_update_own'
  ) THEN
    CREATE POLICY "companies_update_own" ON public.companies FOR UPDATE USING (
        id IN (
            SELECT company_id FROM public.company_users 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
  END IF;
END
$$;

-- Protect Super Admin company via trigger
CREATE OR REPLACE FUNCTION public.protect_super_admin_company()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_super_admin_company IS DISTINCT FROM NEW.is_super_admin_company THEN
        RAISE EXCEPTION 'Cannot modify is_super_admin_company flag.';
    END IF;
    IF OLD.is_super_admin_company = true THEN
        IF NEW.status != 'active' THEN
            RAISE EXCEPTION 'The Global Super Admin company cannot be deactivated.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_company_update_protect ON public.companies;
CREATE TRIGGER on_company_update_protect BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_super_admin_company();

CREATE OR REPLACE FUNCTION public.prevent_super_admin_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_super_admin_company = true THEN
        RAISE EXCEPTION 'The Global Super Admin company cannot be deleted.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_company_delete_protect ON public.companies;
CREATE TRIGGER on_company_delete_protect BEFORE DELETE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_super_admin_delete();

-- Entities RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'entities'
      AND policyname = 'entities_select_same_company'
  ) THEN
    CREATE POLICY "entities_select_same_company" ON public.entities FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = entities.company_id
    ));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'entities'
      AND policyname = 'entities_insert_same_company'
  ) THEN
    CREATE POLICY "entities_insert_same_company" ON public.entities FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = entities.company_id
    ));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'entities'
      AND policyname = 'entities_update_same_company'
  ) THEN
    CREATE POLICY "entities_update_same_company" ON public.entities FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = entities.company_id
    ));
  END IF;
END
$$;

-- =============================================================
-- NEW MASTER: ITC-GST-HSN MAPPING (Unified)
-- =============================================================
-- Drop old master if any (safe)
DROP TABLE IF EXISTS public.master_hsn_codes CASCADE;

-- Create LUTs table (Letter of Undertaking)
CREATE TABLE public.luts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    lut_number TEXT NOT NULL,
    financial_year TEXT, -- e.g. "2024-25"
    expiry_date DATE,
    document_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.luts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'luts' AND policyname = 'luts_select_same_company') THEN
    CREATE POLICY "luts_select_same_company" ON public.luts FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = luts.company_id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'luts' AND policyname = 'luts_insert_same_company') THEN
    CREATE POLICY "luts_insert_same_company" ON public.luts FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = luts.company_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'luts' AND policyname = 'luts_update_same_company') THEN
    CREATE POLICY "luts_update_same_company" ON public.luts FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = luts.company_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'luts' AND policyname = 'luts_delete_same_company') THEN
    CREATE POLICY "luts_delete_same_company" ON public.luts FOR DELETE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = luts.company_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_luts_company ON public.luts(company_id);
CREATE INDEX IF NOT EXISTS idx_luts_expiry ON public.luts(expiry_date);


-- Create unified mapping table
CREATE TABLE IF NOT EXISTS public.itc_gst_hsn_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    itc_hs_code TEXT,
    commodity TEXT,
    gst_hsn_code TEXT NOT NULL,
    description TEXT,
    gst_rate NUMERIC,
    govt_notification_no TEXT,
    govt_published_date DATE,
    is_active BOOLEAN DEFAULT true,
    chapter TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_itc_hs_code ON public.itc_gst_hsn_mapping(itc_hs_code);
CREATE INDEX IF NOT EXISTS idx_gst_hsn_code ON public.itc_gst_hsn_mapping(gst_hsn_code);
CREATE INDEX IF NOT EXISTS idx_govt_published_date ON public.itc_gst_hsn_mapping(govt_published_date);
CREATE INDEX IF NOT EXISTS idx_itc_hs_code_lower ON public.itc_gst_hsn_mapping( lower(coalesce(itc_hs_code,'')) );
CREATE INDEX IF NOT EXISTS idx_gst_hsn_code_lower ON public.itc_gst_hsn_mapping( lower(coalesce(gst_hsn_code,'')) );
CREATE INDEX IF NOT EXISTS idx_itc_commodity_gin ON public.itc_gst_hsn_mapping USING GIN (to_tsvector('simple', coalesce(commodity,'')));
CREATE INDEX IF NOT EXISTS idx_itc_description_gin ON public.itc_gst_hsn_mapping USING GIN (to_tsvector('simple', coalesce(description,'')));

-- Enable RLS and policies (read for authenticated; write for super admins)
ALTER TABLE public.itc_gst_hsn_mapping ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_mapping'
      AND policyname = 'itc_hsn_read_all'
  ) THEN
    CREATE POLICY "itc_hsn_read_all" ON public.itc_gst_hsn_mapping FOR SELECT
USING (auth.role() = 'authenticated');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_mapping'
      AND policyname = 'itc_hsn_insert_super_admin'
  ) THEN
    CREATE POLICY "itc_hsn_insert_super_admin" ON public.itc_gst_hsn_mapping FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid() AND is_super_admin = true
    )
);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_mapping'
      AND policyname = 'itc_hsn_update_super_admin'
  ) THEN
    CREATE POLICY "itc_hsn_update_super_admin" ON public.itc_gst_hsn_mapping FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid() AND is_super_admin = true
    )
);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_mapping'
      AND policyname = 'itc_hsn_delete_super_admin'
  ) THEN
    CREATE POLICY "itc_hsn_delete_super_admin" ON public.itc_gst_hsn_mapping FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.company_users
        WHERE user_id = auth.uid() AND is_super_admin = true
    )
);
  END IF;
END
$$;

-- Updated_at trigger for mapping table
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_itc_hsn_timestamp ON public.itc_gst_hsn_mapping;
CREATE TRIGGER trg_update_itc_hsn_timestamp BEFORE UPDATE ON public.itc_gst_hsn_mapping
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

COMMENT ON TABLE public.itc_gst_hsn_mapping IS 'Unified ITC HS ↔ GST HSN mapping master table. Source: official GST/ITC data.';

-- =============================================================
-- PRODUCTS, SKUS, CATEGORIES
-- =============================================================
-- Products table (recreated with HSN fields)
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    hsn_code TEXT,
    image_url TEXT,
    itc_hs_code TEXT,
    hsn_confidence NUMERIC,
    hsn_status TEXT DEFAULT 'none',
    last_hsn_checked_at TIMESTAMPTZ
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'products_select_same_company'
  ) THEN
    CREATE POLICY "products_select_same_company" ON public.products FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = products.company_id
    ));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'products_insert_same_company'
  ) THEN
    CREATE POLICY "products_insert_same_company" ON public.products FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = products.company_id
    ));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'products_update_same_company'
  ) THEN
    CREATE POLICY "products_update_same_company" ON public.products FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = products.company_id
    ));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_hsn_code ON public.products(hsn_code);
CREATE INDEX IF NOT EXISTS idx_products_itc_hs_code ON public.products(itc_hs_code);

-- Trigger to update products.updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- SKUs table
CREATE TABLE public.skus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    sku_code TEXT NOT NULL,
    name TEXT NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb,
    unit TEXT DEFAULT 'pcs',
    weight_kg NUMERIC,
    dimensions_cm TEXT,
    base_price NUMERIC DEFAULT 0,
    hs_code TEXT,
    country_of_origin TEXT DEFAULT 'India',
    unit_of_measure TEXT DEFAULT 'PCS',
    gross_weight_kg NUMERIC,
    net_weight_kg NUMERIC,
    UNIQUE(company_id, sku_code)
);

ALTER TABLE public.skus ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'skus'
      AND policyname = 'skus_select_same_company'
  ) THEN
    CREATE POLICY "skus_select_same_company" ON public.skus FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = skus.company_id
    ));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'skus'
      AND policyname = 'skus_insert_same_company'
  ) THEN
    CREATE POLICY "skus_insert_same_company" ON public.skus FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = skus.company_id
    ));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'skus'
      AND policyname = 'skus_update_same_company'
  ) THEN
    CREATE POLICY "skus_update_same_company" ON public.skus FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = skus.company_id
    ));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_skus_company ON public.skus(company_id);

-- Product categories
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_system_unique_name 
ON public.product_categories(name) 
WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_company_unique_name 
ON public.product_categories(name, company_id) 
WHERE company_id IS NOT NULL;

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_categories'
      AND policyname = 'product_categories_read_policy'
  ) THEN
    CREATE POLICY "product_categories_read_policy" ON public.product_categories FOR SELECT
    USING (
        company_id IS NULL 
        OR 
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_categories'
      AND policyname = 'product_categories_super_admin_manage'
  ) THEN
    CREATE POLICY "product_categories_super_admin_manage" ON public.product_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.company_users
            WHERE user_id = auth.uid()
            AND is_super_admin = true
        )
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_categories'
      AND policyname = 'product_categories_company_manage'
  ) THEN
    CREATE POLICY "product_categories_company_manage" ON public.product_categories FOR ALL
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_product_categories_active ON public.product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_order ON public.product_categories(display_order);

-- Seed product categories (system-level)
INSERT INTO public.product_categories (id, company_id, name, description, display_order, is_active, created_at, updated_at)
SELECT gen_random_uuid(), NULL, name, description, display_order, is_active, now(), now()
FROM (VALUES
('General', 'General products and miscellaneous items', 1, true),
('Agriculture', 'Agricultural products and farming supplies', 2, true),
('Apparel', 'Clothing, garments, and fashion accessories', 3, true),
('Ayush Products', 'Ayurvedic, Yoga, Unani, Siddha, and Homeopathy products', 4, true),
('Certified Organics', 'Certified organic products and foods', 5, true),
('Chemicals', 'Chemical products and industrial chemicals', 6, true),
('Dehydrated Products', 'Dehydrated foods and preserved items', 7, true),
('Electronics', 'Electronic devices and components', 8, true),
('Engineering', 'Engineering products and industrial equipment', 9, true),
('Floriculture', 'Flowers, plants, and horticultural products', 10, true),
('Food & Agro', 'Food products and agricultural items', 11, true),
('Fresh Produce', 'Fresh fruits, vegetables, and produce', 12, true),
('Handicrafts', 'Handmade crafts and artisan products', 13, true),
('Handicrafts & Toys', 'Handcrafted items and traditional toys', 14, true),
('Home & Kitchen', 'Home decor, kitchen items, and household products', 15, true),
('Home & Living', 'Home furnishings and living essentials', 16, true),
('Leather Goods', 'Leather products and accessories', 17, true),
('Machinery', 'Industrial machinery and equipment', 18, true),
('Metals & Alloys', 'Metal products and alloy materials', 19, true),
('Pharmaceuticals', 'Pharmaceutical products and medicines', 20, true),
('Raw Materials', 'Raw materials and industrial supplies', 21, true),
('Solar Accessories', 'Solar panels, connectors, cables, and related accessories', 22, true),
('Textiles', 'Fabrics, bed linens, and textile products', 23, true),
('Furniture', 'Furniture and home furnishings', 24, true),
('Automotive', 'Auto parts and accessories', 25, true),
('Cosmetics & Personal Care', 'Beauty products and personal care items', 26, true),
('Sports & Fitness', 'Sports equipment and fitness products', 27, true),
('Toys & Games', 'Toys, games, and entertainment products', 28, true)
) AS t(name, description, display_order, is_active)
ON CONFLICT (name) WHERE company_id IS NULL DO NOTHING;

COMMENT ON TABLE public.product_categories IS 'Product categories that can be managed by Super Admin';
COMMENT ON COLUMN public.product_categories.display_order IS 'Order in which categories appear in dropdowns (lower number = higher priority)';

-- =============================================================
-- CURRENCIES
-- =============================================================
CREATE TABLE public.currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'currencies'
      AND policyname = 'currencies_read_all'
  ) THEN
    CREATE POLICY "currencies_read_all" ON public.currencies FOR SELECT USING (true);
  END IF;
END
$$;

INSERT INTO public.currencies (code, name, symbol) VALUES
('USD', 'United States Dollar', '$'),
('EUR', 'Euro', '€'),
('GBP', 'British Pound', '£'),
('INR', 'Indian Rupee', '₹'),
('AUD', 'Australian Dollar', 'A$'),
('CAD', 'Canadian Dollar', 'C$'),
('AED', 'United Arab Emirates Dirham', 'د.إ')
ON CONFLICT (code) DO NOTHING;



-- =============================================================

-- Create Incoterms table (Ref by Orders)
CREATE TABLE public.incoterms (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);
ALTER TABLE public.incoterms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incoterms_read_all" ON public.incoterms FOR SELECT USING (true);

-- Seed Incoterms (2020)
INSERT INTO public.incoterms (code, name, description) VALUES
('EXW', 'Ex Works', 'Seller makes goods available at their premises.'),
('FCA', 'Free Carrier', 'Seller delivers goods to a carrier or other person nominated by the buyer.'),
('CPT', 'Carriage Paid To', 'Seller pays for carriage to the named place of destination.'),
('CIP', 'Carriage and Insurance Paid To', 'Same as CPT, but seller also provides insurance.'),
('DAP', 'Delivered at Place', 'Seller delivers when goods are placed at buyer disposal at named place.'),
('DPU', 'Delivered at Place Unloaded', 'Seller delivers when goods are unloaded at named place.'),
('DDP', 'Delivered Duty Paid', 'Seller delivers goods cleared for import with all duties paid.'),
('FAS', 'Free Alongside Ship', 'Seller delivers when goods are placed alongside the vessel.'),
('FOB', 'Free on Board', 'Seller delivers when goods are on board the vessel.'),
('CFR', 'Cost and Freight', 'Seller pays cost and freight to named port of destination.'),
('CIF', 'Cost, Insurance and Freight', 'Same as CFR, but seller also provides insurance.')
ON CONFLICT (code) DO NOTHING;

-- =============================================================
-- COST SHEETS, PROFORMA INVOICES, EXPORT ORDERS, QUOTES
-- =============================================================
CREATE TABLE public.cost_sheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku_id UUID REFERENCES public.skus(id) ON DELETE SET NULL,
    target_currency_code TEXT REFERENCES public.currencies(code) DEFAULT 'USD',
    exchange_rate NUMERIC NOT NULL DEFAULT 1.0,
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

ALTER TABLE public.cost_sheets ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cost_sheets'
      AND policyname = 'cost_sheets_select_same_company'
  ) THEN
    CREATE POLICY "cost_sheets_select_same_company" ON public.cost_sheets FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = cost_sheets.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cost_sheets'
      AND policyname = 'cost_sheets_insert_same_company'
  ) THEN
    CREATE POLICY "cost_sheets_insert_same_company" ON public.cost_sheets FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = cost_sheets.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cost_sheets'
      AND policyname = 'cost_sheets_update_same_company'
  ) THEN
    CREATE POLICY "cost_sheets_update_same_company" ON public.cost_sheets FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = cost_sheets.company_id));
  END IF;
END
$$;

CREATE TABLE public.proforma_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    quote_id UUID, -- Track origin (FK added at end of script)
    buyer_id UUID REFERENCES public.entities(id),
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    currency_code TEXT REFERENCES public.currencies(code),
    conversion_rate NUMERIC DEFAULT 1.0,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    lut_id UUID REFERENCES public.luts(id) ON DELETE SET NULL
);

ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proforma_invoices'
      AND policyname = 'pi_select_same_company'
  ) THEN
    CREATE POLICY "pi_select_same_company" ON public.proforma_invoices FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = proforma_invoices.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proforma_invoices'
      AND policyname = 'pi_insert_same_company'
  ) THEN
    CREATE POLICY "pi_insert_same_company" ON public.proforma_invoices FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = proforma_invoices.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proforma_invoices'
      AND policyname = 'pi_update_same_company'
  ) THEN
    CREATE POLICY "pi_update_same_company" ON public.proforma_invoices FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = proforma_invoices.company_id));
  END IF;
END
$$;

CREATE TABLE public.proforma_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.proforma_invoices(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id),
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

ALTER TABLE public.proforma_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proforma_items'
      AND policyname = 'pi_items_policy'
  ) THEN
    CREATE POLICY "pi_items_policy" ON public.proforma_items USING (
    EXISTS (SELECT 1 FROM public.proforma_invoices WHERE id = proforma_items.invoice_id AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()))
);
  END IF;
END
$$;

CREATE TABLE public.export_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    pi_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES public.entities(id),
    order_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    total_amount NUMERIC DEFAULT 0,
    currency_code TEXT REFERENCES public.currencies(code),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    incoterm TEXT REFERENCES public.incoterms(code),
    incoterm_place TEXT,
    lut_id UUID REFERENCES public.luts(id) ON DELETE SET NULL
);

ALTER TABLE public.export_orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'export_orders'
      AND policyname = 'orders_select_same_company'
  ) THEN
    CREATE POLICY "orders_select_same_company" ON public.export_orders FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = export_orders.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'export_orders'
      AND policyname = 'orders_insert_same_company'
  ) THEN
    CREATE POLICY "orders_insert_same_company" ON public.export_orders FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = export_orders.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'export_orders'
      AND policyname = 'orders_update_same_company'
  ) THEN
    CREATE POLICY "orders_update_same_company" ON public.export_orders FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = export_orders.company_id));
  END IF;
END
$$;

CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id),
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'order_items_policy'
  ) THEN
    CREATE POLICY "order_items_policy" ON public.order_items USING (
    EXISTS (SELECT 1 FROM public.export_orders WHERE id = order_items.order_id AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()))
);
  END IF;
END
$$;

CREATE TABLE public.shipments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    shipment_number TEXT NOT NULL,
    order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE,
    shipment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'drafted',
    carrier TEXT,
    tracking_number TEXT,
    port_of_loading TEXT,
    port_of_discharge TEXT,
    final_destination TEXT,
    vessel_name TEXT,
    voyage_number TEXT,
    container_numbers TEXT[],
    gross_weight_kg NUMERIC,
    net_weight_kg NUMERIC,
    total_packages INTEGER,
    freight_terms TEXT,
    incoterms TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipments'
      AND policyname = 'shipments_select_same_company'
  ) THEN
    CREATE POLICY "shipments_select_same_company" ON public.shipments FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = shipments.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipments'
      AND policyname = 'shipments_insert_same_company'
  ) THEN
    CREATE POLICY "shipments_insert_same_company" ON public.shipments FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = shipments.company_id));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipments'
      AND policyname = 'shipments_update_same_company'
  ) THEN
    CREATE POLICY "shipments_update_same_company" ON public.shipments FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = shipments.company_id));
  END IF;
END
$$;

CREATE TABLE public.shipment_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    package_number TEXT
);

ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipment_items'
      AND policyname = 'shipment_items_policy'
  ) THEN
    CREATE POLICY "shipment_items_policy" ON public.shipment_items USING (
    EXISTS (SELECT 1 FROM public.shipments WHERE id = shipment_items.shipment_id AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()))
);
  END IF;
END
$$;

CREATE TABLE public.order_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    currency_code TEXT REFERENCES public.currencies(code),
    exchange_rate NUMERIC DEFAULT 1,
    payment_method TEXT,
    reference_number TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_payments'
      AND policyname = 'order_payments_select'
  ) THEN
    CREATE POLICY "order_payments_select" ON public.order_payments FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = order_payments.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_payments'
      AND policyname = 'order_payments_insert'
  ) THEN
    CREATE POLICY "order_payments_insert" ON public.order_payments FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = order_payments.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_payments'
      AND policyname = 'order_payments_update'
  ) THEN
    CREATE POLICY "order_payments_update" ON public.order_payments FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = order_payments.company_id)
);
  END IF;
END
$$;

-- Indexes for Orders/Shipments
CREATE INDEX IF NOT EXISTS idx_entities_company ON public.entities(company_id);
CREATE INDEX IF NOT EXISTS idx_cost_sheets_company ON public.cost_sheets(company_id);
CREATE INDEX IF NOT EXISTS idx_pi_company ON public.proforma_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_pi_items_invoice ON public.proforma_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pi_quote ON public.proforma_invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_company ON public.export_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_pi ON public.export_orders(pi_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_company ON public.shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON public.shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_company_id ON public.order_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_date ON public.order_payments(payment_date);

-- =============================================================
-- DOCUMENTS (Storage metadata)
-- =============================================================
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_category TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT DEFAULT 'application/pdf',
    document_number TEXT,
    document_date DATE,
    issued_by TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    tags TEXT[],
    notes TEXT
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND policyname = 'documents_select_same_company'
  ) THEN
    CREATE POLICY "documents_select_same_company" ON public.documents FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND policyname = 'documents_insert_same_company'
  ) THEN
    CREATE POLICY "documents_insert_same_company" ON public.documents FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND policyname = 'documents_update_same_company'
  ) THEN
    CREATE POLICY "documents_update_same_company" ON public.documents FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND policyname = 'documents_delete_same_company'
  ) THEN
    CREATE POLICY "documents_delete_same_company" ON public.documents FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = documents.company_id)
);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_reference ON public.documents(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON public.documents(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(document_category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_composite ON public.documents(company_id, reference_type, reference_id);

-- =============================================================
-- ENQUIRIES, QUOTES & RELATED
-- =============================================================
CREATE TABLE public.enquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    enquiry_number TEXT NOT NULL,
    entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    customer_company TEXT,
    customer_country TEXT,
    source TEXT,
    subject TEXT,
    description TEXT,
    products_interested JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'medium',
    last_contact_date DATE,
    next_follow_up_date DATE,
    follow_up_notes TEXT,
    pi_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.export_orders(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,
    lost_reason TEXT,
    lost_notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enquiries'
      AND policyname = 'enquiries_select_same_company'
  ) THEN
    CREATE POLICY "enquiries_select_same_company" ON public.enquiries FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enquiries'
      AND policyname = 'enquiries_insert_same_company'
  ) THEN
    CREATE POLICY "enquiries_insert_same_company" ON public.enquiries FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enquiries'
      AND policyname = 'enquiries_update_same_company'
  ) THEN
    CREATE POLICY "enquiries_update_same_company" ON public.enquiries FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enquiries'
      AND policyname = 'enquiries_delete_same_company'
  ) THEN
    CREATE POLICY "enquiries_delete_same_company" ON public.enquiries FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = enquiries.company_id)
);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_enquiries_company ON public.enquiries(company_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_entity ON public.enquiries(entity_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_priority ON public.enquiries(priority);
CREATE INDEX IF NOT EXISTS idx_enquiries_pi ON public.enquiries(pi_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_order ON public.enquiries(order_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned ON public.enquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON public.enquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_follow_up ON public.enquiries(next_follow_up_date);

CREATE TABLE IF NOT EXISTS public.enquiry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    target_price NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.enquiry_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'enquiry_items'
      AND policyname = 'enquiry_items_all_auth'
  ) THEN
    CREATE POLICY "enquiry_items_all_auth" ON public.enquiry_items FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END
$$;

CREATE TABLE public.quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES public.entities(id),
    pi_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
    quote_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    currency_code TEXT REFERENCES public.currencies(code) DEFAULT 'USD',
    status TEXT DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    parent_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    subtotal NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_terms TEXT,
    delivery_terms TEXT,
    incoterms TEXT,
    notes TEXT,
    converted_to_pi_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_select_same_company'
  ) THEN
    CREATE POLICY "quotes_select_same_company" ON public.quotes FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_insert_same_company'
  ) THEN
    CREATE POLICY "quotes_insert_same_company" ON public.quotes FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_update_same_company'
  ) THEN
    CREATE POLICY "quotes_update_same_company" ON public.quotes FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quotes'
      AND policyname = 'quotes_delete_same_company'
  ) THEN
    CREATE POLICY "quotes_delete_same_company" ON public.quotes FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = quotes.company_id)
);
  END IF;
END
$$;

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'quote_items'
      AND policyname = 'quote_items_policy'
  ) THEN
    CREATE POLICY "quote_items_policy" ON public.quote_items USING (
    EXISTS (
        SELECT 1 FROM public.quotes 
        WHERE id = quote_items.quote_id 
        AND company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
    )
);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_quotes_company ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_enquiry ON public.quotes(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotes_buyer ON public.quotes(buyer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_pi ON public.quotes(pi_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON public.quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_parent ON public.quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sku ON public.quote_items(sku_id);


-- =============================================================
-- PURCHASE ORDERS & PAYMENTS (Simplified)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL UNIQUE,
    vendor_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    export_order_id UUID REFERENCES public.export_orders(id) ON DELETE SET NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'confirmed', 'received', 'completed', 'cancelled')),
    currency_code TEXT NOT NULL DEFAULT 'INR',
    subtotal NUMERIC DEFAULT 0,
    tax_total NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    terms_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid'))
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    sku_id UUID REFERENCES public.skus(id) ON DELETE RESTRICT,
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    tax_rate NUMERIC DEFAULT 0,
    total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'purchase_orders'
      AND policyname = 'purchase_orders_auth'
  ) THEN
    CREATE POLICY "purchase_orders_auth" ON public.purchase_orders FOR ALL USING (
        company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
    );
  END IF;
END
$$;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'purchase_order_items'
      AND policyname = 'purchase_order_items_auth'
  ) THEN
    CREATE POLICY "purchase_order_items_auth" ON public.purchase_order_items FOR ALL USING (
        po_id IN (SELECT id FROM purchase_orders WHERE company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()))
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.purchase_order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'INR',
    exchange_rate NUMERIC DEFAULT 1,
    payment_method TEXT,
    reference_number TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.purchase_order_payments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'purchase_order_payments'
      AND policyname = 'purchase_order_payments_auth'
  ) THEN
    CREATE POLICY "purchase_order_payments_auth" ON public.purchase_order_payments FOR ALL USING (
        company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);

-- =============================================================
-- SHIPPING BILLS & ITEMS (Customs)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.shipping_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sb_number TEXT NOT NULL,
  sb_date DATE NOT NULL,
  export_order_id UUID REFERENCES public.export_orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
  port_code TEXT,
  customs_house TEXT,
  customs_officer_name TEXT,
  fob_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  freight_value DECIMAL(15,2) DEFAULT 0,
  insurance_value DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  let_export_order_number TEXT,
  let_export_date DATE,
  status TEXT DEFAULT 'drafted' CHECK (status IN ('drafted', 'filed', 'cleared', 'shipped', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipping_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipping_bill_id UUID NOT NULL REFERENCES public.shipping_bills(id) ON DELETE CASCADE,
  hsn_code TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  fob_value DECIMAL(15,2) NOT NULL,
  assessable_value DECIMAL(15,2),
  export_duty_rate DECIMAL(5,2) DEFAULT 0,
  export_duty_amount DECIMAL(15,2) DEFAULT 0,
  cess_rate DECIMAL(5,2) DEFAULT 0,
  cess_amount DECIMAL(15,2) DEFAULT 0,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_bills_company ON public.shipping_bills(company_id);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_order ON public.shipping_bills(export_order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_date ON public.shipping_bills(sb_date);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_status ON public.shipping_bills(status);
CREATE INDEX IF NOT EXISTS idx_shipping_bills_sb_number ON public.shipping_bills(sb_number);

CREATE INDEX IF NOT EXISTS idx_shipping_bill_items_sb ON public.shipping_bill_items(shipping_bill_id);
CREATE INDEX IF NOT EXISTS idx_shipping_bill_items_hsn ON public.shipping_bill_items(hsn_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_bills_unique_sb_number 
ON public.shipping_bills(company_id, sb_number);

COMMENT ON TABLE public.shipping_bills IS 'Customs export declarations (Shipping Bills) - required for all Indian exports';
COMMENT ON TABLE public.shipping_bill_items IS 'HSN-wise breakdown of shipping bill items - critical for duty drawback and RoDTEP calculations';

ALTER TABLE public.shipping_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_bill_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bills'
      AND policyname = 'shipping_bills_select_same_company'
  ) THEN
    CREATE POLICY "shipping_bills_select_same_company" ON public.shipping_bills FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bills'
      AND policyname = 'shipping_bills_insert_same_company'
  ) THEN
    CREATE POLICY "shipping_bills_insert_same_company" ON public.shipping_bills FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bills'
      AND policyname = 'shipping_bills_update_same_company'
  ) THEN
    CREATE POLICY "shipping_bills_update_same_company" ON public.shipping_bills FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bills'
      AND policyname = 'shipping_bills_delete_same_company'
  ) THEN
    CREATE POLICY "shipping_bills_delete_same_company" ON public.shipping_bills FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bill_items'
      AND policyname = 'shipping_bill_items_select_same_company'
  ) THEN
    CREATE POLICY "shipping_bill_items_select_same_company" ON public.shipping_bill_items FOR SELECT USING (
        shipping_bill_id IN (
            SELECT id FROM public.shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bill_items'
      AND policyname = 'shipping_bill_items_insert_same_company'
  ) THEN
    CREATE POLICY "shipping_bill_items_insert_same_company" ON public.shipping_bill_items FOR INSERT WITH CHECK (
        shipping_bill_id IN (
            SELECT id FROM public.shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bill_items'
      AND policyname = 'shipping_bill_items_update_same_company'
  ) THEN
    CREATE POLICY "shipping_bill_items_update_same_company" ON public.shipping_bill_items FOR UPDATE USING (
        shipping_bill_id IN (
            SELECT id FROM public.shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shipping_bill_items'
      AND policyname = 'shipping_bill_items_delete_same_company'
  ) THEN
    CREATE POLICY "shipping_bill_items_delete_same_company" ON public.shipping_bill_items FOR DELETE USING (
        shipping_bill_id IN (
            SELECT id FROM public.shipping_bills WHERE company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
        )
    );
  END IF;
END
$$;

-- =============================================================
-- BRCs, PAYMENTS, REMINDERS and functions
-- =============================================================
CREATE TABLE IF NOT EXISTS public.brcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    shipping_bill_id UUID NOT NULL REFERENCES public.shipping_bills(id) ON DELETE CASCADE,
    brc_number VARCHAR(100),
    brc_date DATE,
    bank_name VARCHAR(200),
    bank_branch VARCHAR(200),
    ad_code VARCHAR(50),
    invoice_value DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    realized_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2),
    realization_status VARCHAR(20) DEFAULT 'pending' CHECK (realization_status IN ('pending', 'partial', 'full', 'overdue', 'written_off')),
    export_date DATE NOT NULL,
    due_date DATE NOT NULL,
    days_remaining INTEGER,
    is_overdue BOOLEAN DEFAULT false,
    brc_document_url TEXT,
    swift_copy_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.brc_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brc_id UUID NOT NULL REFERENCES public.brcs(id) ON DELETE CASCADE,
    payment_id UUID,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_reference VARCHAR(100),
    exchange_rate DECIMAL(10,4),
    amount_inr DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.brc_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    brc_id UUID NOT NULL REFERENCES public.brcs(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) CHECK (reminder_type IN ('30_days', '15_days', '7_days', 'overdue')),
    reminder_date DATE NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.brcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brc_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brcs'
      AND policyname = 'brcs_select'
  ) THEN
    CREATE POLICY brcs_select ON public.brcs FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brcs'
      AND policyname = 'brcs_insert'
  ) THEN
    CREATE POLICY brcs_insert ON public.brcs FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brcs'
      AND policyname = 'brcs_update'
  ) THEN
    CREATE POLICY brcs_update ON public.brcs FOR UPDATE USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brcs'
      AND policyname = 'brcs_delete'
  ) THEN
    CREATE POLICY brcs_delete ON public.brcs FOR DELETE USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brc_payments'
      AND policyname = 'brc_payments_select'
  ) THEN
    CREATE POLICY brc_payments_select ON public.brc_payments FOR SELECT USING (brc_id IN (SELECT id FROM brcs WHERE company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brc_payments'
      AND policyname = 'brc_payments_insert'
  ) THEN
    CREATE POLICY brc_payments_insert ON public.brc_payments FOR INSERT WITH CHECK (brc_id IN (SELECT id FROM brcs WHERE company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brc_payments'
      AND policyname = 'brc_payments_delete'
  ) THEN
    CREATE POLICY brc_payments_delete ON public.brc_payments FOR DELETE USING (brc_id IN (SELECT id FROM brcs WHERE company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brc_reminders'
      AND policyname = 'brc_reminders_select'
  ) THEN
    CREATE POLICY brc_reminders_select ON public.brc_reminders FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;

-- Functions for BRCs
CREATE OR REPLACE FUNCTION public.calculate_brc_due_date(p_export_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN p_export_date + INTERVAL '9 months';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_days_remaining(p_due_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (p_due_date - CURRENT_DATE));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_brc_status()
RETURNS TRIGGER AS $$
DECLARE
    total_realized DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_realized FROM public.brc_payments WHERE brc_id = NEW.brc_id;
    UPDATE public.brcs
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

DROP TRIGGER IF EXISTS trigger_update_brc_status ON public.brc_payments;
CREATE TRIGGER trigger_update_brc_status AFTER INSERT ON public.brc_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_brc_status();

CREATE OR REPLACE FUNCTION public.update_overdue_brcs()
RETURNS void AS $$
BEGIN
    UPDATE public.brcs
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

CREATE OR REPLACE FUNCTION public.create_brc_reminders()
RETURNS void AS $$
BEGIN
    INSERT INTO public.brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, '30_days', due_date - INTERVAL '30 days'
    FROM public.brcs
    WHERE realization_status IN ('pending', 'partial')
      AND due_date - INTERVAL '30 days' = CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM public.brc_reminders WHERE brc_id = brcs.id AND reminder_type = '30_days');

    INSERT INTO public.brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, '15_days', due_date - INTERVAL '15 days'
    FROM public.brcs
    WHERE realization_status IN ('pending', 'partial')
      AND due_date - INTERVAL '15 days' = CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM public.brc_reminders WHERE brc_id = brcs.id AND reminder_type = '15_days');

    INSERT INTO public.brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, '7_days', due_date - INTERVAL '7 days'
    FROM public.brcs
    WHERE realization_status IN ('pending', 'partial')
      AND due_date - INTERVAL '7 days' = CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM public.brc_reminders WHERE brc_id = brcs.id AND reminder_type = '7_days');

    INSERT INTO public.brc_reminders (company_id, brc_id, reminder_type, reminder_date)
    SELECT company_id, id, 'overdue', CURRENT_DATE
    FROM public.brcs
    WHERE realization_status IN ('pending', 'partial', 'overdue')
      AND due_date < CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM public.brc_reminders WHERE brc_id = brcs.id AND reminder_type = 'overdue' AND reminder_date = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- INCENTIVES: RoDTEP & Duty Drawback Rates + Claims
-- =============================================================
CREATE TABLE IF NOT EXISTS public.incentive_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    shipping_bill_id UUID NOT NULL REFERENCES public.shipping_bills(id) ON DELETE CASCADE,
    claim_type VARCHAR(20) NOT NULL CHECK (claim_type IN ('rodtep', 'duty_drawback', 'both')),
    rodtep_amount DECIMAL(15,2),
    rodtep_rate DECIMAL(5,2),
    rodtep_claim_number VARCHAR(50),
    rodtep_claim_date DATE,
    rodtep_status VARCHAR(20) DEFAULT 'pending' CHECK (rodtep_status IN ('pending', 'filed', 'approved', 'rejected', 'received')),
    drawback_amount DECIMAL(15,2),
    drawback_rate DECIMAL(5,2),
    drawback_claim_number VARCHAR(50),
    drawback_claim_date DATE,
    drawback_status VARCHAR(20) DEFAULT 'pending' CHECK (drawback_status IN ('pending', 'filed', 'approved', 'rejected', 'received')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_claim_per_sb UNIQUE(shipping_bill_id, claim_type)
);

CREATE INDEX IF NOT EXISTS idx_incentive_claims_company ON public.incentive_claims(company_id);
CREATE INDEX IF NOT EXISTS idx_incentive_claims_sb ON public.incentive_claims(shipping_bill_id);
CREATE INDEX IF NOT EXISTS idx_incentive_claims_type ON public.incentive_claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_incentive_claims_rodtep_status ON public.incentive_claims(rodtep_status);
CREATE INDEX IF NOT EXISTS idx_incentive_claims_drawback_status ON public.incentive_claims(drawback_status);

CREATE TABLE IF NOT EXISTS public.rodtep_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hsn_code VARCHAR(8) NOT NULL,
    description TEXT,
    rate_percentage DECIMAL(5,2) NOT NULL,
    cap_per_unit DECIMAL(10,2),
    unit VARCHAR(10),
    effective_from DATE NOT NULL,
    effective_to DATE,
    notification_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rodtep_hsn ON public.rodtep_rates(hsn_code);
CREATE INDEX IF NOT EXISTS idx_rodtep_dates ON public.rodtep_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_rodtep_hsn_dates ON public.rodtep_rates(hsn_code, effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.duty_drawback_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hsn_code VARCHAR(8) NOT NULL,
    description TEXT,
    rate_percentage DECIMAL(5,2),
    rate_amount DECIMAL(10,2),
    unit VARCHAR(10),
    effective_from DATE NOT NULL,
    effective_to DATE,
    notification_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawback_hsn ON public.duty_drawback_rates(hsn_code);
CREATE INDEX IF NOT EXISTS idx_drawback_dates ON public.duty_drawback_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_drawback_hsn_dates ON public.duty_drawback_rates(hsn_code, effective_from, effective_to);

-- Sample seed data for duty_drawback_rates
INSERT INTO public.duty_drawback_rates (hsn_code, description, rate_percentage, rate_amount, unit, effective_from, notification_number) VALUES
('620342', 'Men''s Cotton T-Shirts', 3.8, 45, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('620520', 'Men''s Cotton Shirts', 4.2, 52, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('620462', 'Women''s Cotton Trousers', 4.0, 48, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('640399', 'Leather Footwear', 2.1, 38, 'PAIR', '2024-01-01', 'Notification 25/2024-Customs'),
('630260', 'Cotton Bed Linen', 3.5, NULL, 'KG', '2024-01-01', 'Notification 25/2024-Customs'),
('420310', 'Leather Garments', 2.8, 65, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('610910', 'Cotton T-Shirts Knitted', 4.1, 42, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('611020', 'Cotton Pullovers', 3.7, 55, 'PCS', '2024-01-01', 'Notification 25/2024-Customs'),
('630790', 'Made-up Textile Articles', 3.2, NULL, 'KG', '2024-01-01', 'Notification 25/2024-Customs'),
('392690', 'Plastic Articles', 2.3, NULL, 'KG', '2024-01-01', 'Notification 25/2024-Customs')
ON CONFLICT DO NOTHING;

ALTER TABLE public.incentive_claims ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'incentive_claims'
      AND policyname = 'incentive_claims_select'
  ) THEN
    CREATE POLICY incentive_claims_select ON public.incentive_claims FOR SELECT USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'incentive_claims'
      AND policyname = 'incentive_claims_insert'
  ) THEN
    CREATE POLICY incentive_claims_insert ON public.incentive_claims FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'incentive_claims'
      AND policyname = 'incentive_claims_update'
  ) THEN
    CREATE POLICY incentive_claims_update ON public.incentive_claims FOR UPDATE USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'incentive_claims'
      AND policyname = 'incentive_claims_delete'
  ) THEN
    CREATE POLICY incentive_claims_delete ON public.incentive_claims FOR DELETE USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));
  END IF;
END
$$;

ALTER TABLE public.rodtep_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_drawback_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- RoDTEP Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rodtep_rates' AND policyname = 'rodtep_rates_select') THEN
      CREATE POLICY "rodtep_rates_select" ON public.rodtep_rates FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rodtep_rates' AND policyname = 'rodtep_rates_admin_all') THEN
      CREATE POLICY "rodtep_rates_admin_all" ON public.rodtep_rates FOR ALL USING (
          EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true)
      );
  END IF;

  -- Duty Drawback Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'duty_drawback_rates' AND policyname = 'duty_drawback_rates_select') THEN
      CREATE POLICY "duty_drawback_rates_select" ON public.duty_drawback_rates FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'duty_drawback_rates' AND policyname = 'duty_drawback_rates_admin_all') THEN
      CREATE POLICY "duty_drawback_rates_admin_all" ON public.duty_drawback_rates FOR ALL USING (
          EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true)
      );
  END IF;
END
$$;

-- Helper functions for rate lookups
CREATE OR REPLACE FUNCTION public.get_rodtep_rate(p_hsn_code VARCHAR, p_date DATE)
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
    FROM public.rodtep_rates r
    WHERE r.hsn_code = p_hsn_code
      AND r.effective_from <= p_date
      AND (r.effective_to IS NULL OR r.effective_to >= p_date)
    ORDER BY r.effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_duty_drawback_rate(p_hsn_code VARCHAR, p_date DATE)
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
    FROM public.duty_drawback_rates d
    WHERE d.hsn_code = p_hsn_code
      AND d.effective_from <= p_date
      AND (d.effective_to IS NULL OR d.effective_to >= p_date)
    ORDER BY d.effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;




-- =============================================================
-- SEED: Super Admin User & Company
-- (Careful: creates an auth.users row — ensure this is acceptable in your environment)
-- =============================================================
-- Reseed Super Admin (Safe run)
-- 1. Ensure User Exists or Update Password
DO $$
DECLARE
    new_user_id UUID;
    existing_user_id UUID;
    new_company_id UUID;
BEGIN
    SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@eximley.com';
    
    IF existing_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'admin@eximley.com',
            crypt('Admin123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO new_user_id;

        -- Profile
        INSERT INTO public.user_profiles (id, full_name)
        VALUES (new_user_id, 'Super Admin')
        ON CONFLICT (id) DO NOTHING;
    ELSE
        new_user_id := existing_user_id;
        -- RESET PASSWORD
        UPDATE auth.users 
        SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
            updated_at = NOW(),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE id = new_user_id;
    END IF;

    -- 2. Ensure Company Exists
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
    END IF;

    -- 3. Link User to Company as Owner/SuperAdmin
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
        true -- Set to true to enforce password change on first login
    )
    ON CONFLICT (company_id, user_id) 
    DO UPDATE SET 
        role = 'owner', 
        is_super_admin = true;

END $$;



-- =============================================================
-- AI-RELATED ADDITIONS (embeddings + suggestions + helpers)
-- Version bump: integrated into schema-1.1.sql
-- =============================================================

-- 1) Helper: HSN status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hsn_status_enum') THEN
    CREATE TYPE public.hsn_status_enum AS ENUM ('none','ai_suggested','verified');
  END IF;
END$$;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Embeddings table (portable JSONB storage + pgvector)
CREATE TABLE IF NOT EXISTS public.itc_gst_hsn_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mapping_id UUID NOT NULL REFERENCES public.itc_gst_hsn_mapping(id) ON DELETE CASCADE UNIQUE,
    embedding JSONB, -- Kept for archival/portable compatibility if needed
    embedding_vector vector(384), -- Native pgvector support (384 dim for all-MiniLM-L6-v2)
    embedding_conv_status TEXT DEFAULT 'pending' CHECK (embedding_conv_status IN ('pending', 'processed', 'failed')),
    embedding_meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itc_hsn_embeddings_mapping_id ON public.itc_gst_hsn_embeddings(mapping_id);
CREATE INDEX IF NOT EXISTS idx_itc_hsn_embeddings_created_at ON public.itc_gst_hsn_embeddings(created_at);
-- HNSW index for fast similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_itc_hsn_embeddings_vector ON public.itc_gst_hsn_embeddings USING hnsw (embedding_vector vector_cosine_ops);

ALTER TABLE public.itc_gst_hsn_embeddings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_embeddings'
      AND policyname = 'itc_hsn_embeddings_select_auth'
  ) THEN
    CREATE POLICY "itc_hsn_embeddings_select_auth" ON public.itc_gst_hsn_embeddings FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_embeddings'
      AND policyname = 'itc_hsn_embeddings_insert_super_admin'
  ) THEN
    CREATE POLICY "itc_hsn_embeddings_insert_super_admin" ON public.itc_gst_hsn_embeddings FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true)
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_embeddings'
      AND policyname = 'itc_hsn_embeddings_update_super_admin'
  ) THEN
    CREATE POLICY "itc_hsn_embeddings_update_super_admin" ON public.itc_gst_hsn_embeddings FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true)
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'itc_gst_hsn_embeddings'
      AND policyname = 'itc_hsn_embeddings_delete_super_admin'
  ) THEN
    CREATE POLICY "itc_hsn_embeddings_delete_super_admin" ON public.itc_gst_hsn_embeddings FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true)
    );
  END IF;
END
$$;

COMMENT ON TABLE public.itc_gst_hsn_embeddings IS 'Embeddings for semantic search (stored as JSONB array).';

-- 3) AI suggestions / audit log
CREATE TABLE IF NOT EXISTS public.ai_hsn_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    mapping_id UUID REFERENCES public.itc_gst_hsn_mapping(id) ON DELETE SET NULL,
    suggested_hsn_code TEXT,
    suggested_itc_hs_code TEXT,
    confidence NUMERIC,
    status TEXT DEFAULT 'suggested',
    model TEXT,
    raw_response JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_hsn_suggestions_product ON public.ai_hsn_suggestions(product_id);
CREATE INDEX IF NOT EXISTS idx_ai_hsn_suggestions_mapping ON public.ai_hsn_suggestions(mapping_id);
CREATE INDEX IF NOT EXISTS idx_ai_hsn_suggestions_created_at ON public.ai_hsn_suggestions(created_at);

ALTER TABLE public.ai_hsn_suggestions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_hsn_suggestions'
      AND policyname = 'ai_suggestions_insert_auth'
  ) THEN
    CREATE POLICY "ai_suggestions_insert_auth" ON public.ai_hsn_suggestions FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_hsn_suggestions'
      AND policyname = 'ai_suggestions_select_creator_or_company'
  ) THEN
    CREATE POLICY "ai_suggestions_select_creator_or_company" ON public.ai_hsn_suggestions FOR SELECT
    USING (
        (created_by = auth.uid())
        OR (
            product_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.products p
                JOIN public.company_users cu ON cu.company_id = p.company_id
                WHERE p.id = ai_hsn_suggestions.product_id
                  AND cu.user_id = auth.uid()
            )
        )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_hsn_suggestions'
      AND policyname = 'ai_suggestions_update_delete_owner_or_super'
  ) THEN
    CREATE POLICY "ai_suggestions_update_delete_owner_or_super" ON public.ai_hsn_suggestions FOR UPDATE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_hsn_suggestions'
      AND policyname = 'ai_suggestions_update_delete_owner_or_super_check'
  ) THEN
    CREATE POLICY "ai_suggestions_update_delete_owner_or_super_check" ON public.ai_hsn_suggestions FOR UPDATE WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_hsn_suggestions'
      AND policyname = 'ai_suggestions_delete_owner_or_super'
  ) THEN
    CREATE POLICY "ai_suggestions_delete_owner_or_super" ON public.ai_hsn_suggestions FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND is_super_admin = true
        )
    );
  END IF;
END
$$;

COMMENT ON TABLE public.ai_hsn_suggestions IS 'Audit log of AI HSN suggestions and user actions (suggested/accepted/rejected).';

-- 4) Convenience view: latest suggestion per product
CREATE OR REPLACE VIEW public.v_latest_ai_hsn_suggestion AS
SELECT DISTINCT ON (product_id)
    id,
    product_id,
    mapping_id,
    suggested_hsn_code,
    suggested_itc_hs_code,
    confidence,
    status,
    model,
    created_by,
    created_at
FROM public.ai_hsn_suggestions
ORDER BY product_id, created_at DESC;

COMMENT ON VIEW public.v_latest_ai_hsn_suggestion IS 'Latest AI HSN suggestion per product (convenience view).';

-- 5) Simple search helper (text match)
CREATE OR REPLACE FUNCTION public.find_hsn_candidates(p_text TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (
    mapping_id UUID,
    itc_hs_code TEXT,
    gst_hsn_code TEXT,
    description TEXT,
    gst_rate NUMERIC,
    score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT id AS mapping_id, itc_hs_code, gst_hsn_code, description, gst_rate,
        ts_rank_cd(to_tsvector('simple', coalesce(commodity,'') || ' ' || coalesce(description,'')), plainto_tsquery('simple', p_text)) AS score
    FROM public.itc_gst_hsn_mapping
    WHERE to_tsvector('simple', coalesce(commodity,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('simple', p_text)
    ORDER BY score DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5a) Semantic search helper (vector cosine match)
CREATE OR REPLACE FUNCTION public.match_itc_hsn_cosine (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  mapping_id uuid,
  itc_hs_code text,
  gst_hsn_code text,
  description text,
  commodity text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.mapping_id,
    m.itc_hs_code,
    m.gst_hsn_code,
    m.description,
    m.commodity,
    1 - (e.embedding_vector <=> query_embedding) as similarity
  FROM itc_gst_hsn_embeddings e
  JOIN itc_gst_hsn_mapping m ON e.mapping_id = m.id
  WHERE 1 - (e.embedding_vector <=> query_embedding) > match_threshold
  ORDER BY e.embedding_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================
-- FINAL HOUSEKEEPING: triggers, comments, indexes
-- =============================================================
-- Ensure update_timestamp trigger exists for products (already created earlier)
-- (update_timestamp function defined above)

-- Add trigger for products (safe check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();
  END IF;
END$$;

COMMENT ON TABLE public.itc_gst_hsn_mapping IS 'Unified ITC HS ↔ GST HSN mapping master table. Use this for HSN lookup and mapping.';
COMMENT ON TABLE public.itc_gst_hsn_embeddings IS 'Embeddings for semantic search (stored as JSONB array).';
COMMENT ON TABLE public.ai_hsn_suggestions IS 'Audit log of AI HSN suggestions and user actions (suggested/accepted/rejected).';

-- =============================================================
-- END OF schema-1.1.sql
-- =============================================================


-- =============================================================
-- PERMISSIONS & HOUSEKEEPING
-- =============================================================
-- Grant permissions to standard Supabase roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant auth schema usage just in case (though usually restricted)
-- GRANT USAGE ON SCHEMA auth TO service_role; 
-- (Better not to mess with auth schema permissions unless necessary)

-- Add cyclic foreign keys (PI -> Quote)
-- This must be done after both tables exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pi_quote') THEN
        ALTER TABLE public.proforma_invoices
          ADD CONSTRAINT fk_pi_quote FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Force refresh of schema cache (if using PostgREST)
NOTIFY pgrst, 'reload config';
