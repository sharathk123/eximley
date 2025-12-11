-- Add product_id to enquiry_items and make sku_id nullable
ALTER TABLE public.enquiry_items 
ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.enquiry_items 
ALTER COLUMN sku_id DROP NOT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_enquiry_items_product ON public.enquiry_items(product_id);
