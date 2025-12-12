-- Migration to add Bank Details and Shipment fields to Proforma Invoices

-- 1. Add columns to proforma_invoices
ALTER TABLE public.proforma_invoices 
ADD COLUMN IF NOT EXISTS incoterm TEXT REFERENCES public.incoterms(code),
ADD COLUMN IF NOT EXISTS incoterm_place TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS port_of_loading TEXT,
ADD COLUMN IF NOT EXISTS port_of_discharge TEXT,
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.companies(id); -- Intention: link to bank details, but companies table has bank details directly.

-- Correction: public.companies table holds the bank details in columns (bank_name, bank_account_number etc). 
-- If we want to support multiple bank accounts per company, we need a separate 'company_banks' table.
-- However, checking schema-1.1.sql, companies table has single bank details.
-- So 'bank_id' might not be needed if we assume the company's default bank. 
-- BUT, if the user requested "Select Bank Account", it implies multiple.
-- Let's check if 'company_banks' exists. It wasn't in schema-1.1.sql.
-- I should create 'company_banks' table first if I want to offer selection.
-- Or simplistic approach: Just use the fields in 'companies' table for now and maybe add 'bank_id' later if they have multiple.
-- User asked "Select Bank Account". This strongly implies multiple.
-- I will create 'company_banks' table and migration in one go.

CREATE TABLE IF NOT EXISTS public.company_banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT,
    swift_code TEXT,
    branch_name TEXT,
    currency TEXT DEFAULT 'USD',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.company_banks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_banks' AND policyname = 'banks_select_same_company') THEN
    CREATE POLICY "banks_select_same_company" ON public.company_banks FOR SELECT USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_banks.company_id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_banks' AND policyname = 'banks_insert_same_company') THEN
    CREATE POLICY "banks_insert_same_company" ON public.company_banks FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_banks.company_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_banks' AND policyname = 'banks_update_same_company') THEN
    CREATE POLICY "banks_update_same_company" ON public.company_banks FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_banks.company_id));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_banks' AND policyname = 'banks_delete_same_company') THEN
    CREATE POLICY "banks_delete_same_company" ON public.company_banks FOR DELETE USING (auth.uid() IN (SELECT user_id FROM company_users WHERE company_id = company_banks.company_id));
  END IF;
END $$;

-- Now add bank_id reference to proforma_invoices
ALTER TABLE public.proforma_invoices 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.company_banks(id);
