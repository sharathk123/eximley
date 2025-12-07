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
