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
