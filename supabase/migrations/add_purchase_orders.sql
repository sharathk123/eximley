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
