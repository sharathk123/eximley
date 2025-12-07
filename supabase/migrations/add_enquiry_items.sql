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
