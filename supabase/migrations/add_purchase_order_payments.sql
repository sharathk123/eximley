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
