-- Add total_price column to quote_items table
-- This is a computed column that includes tax: quantity * unit_price * (1 - discount_percent/100) * (1 + tax_percent/100)

ALTER TABLE public.quote_items 
ADD COLUMN IF NOT EXISTS total_price NUMERIC GENERATED ALWAYS AS (
    quantity * unit_price * (1 - discount_percent/100) * (1 + tax_percent/100)
) STORED;

COMMENT ON COLUMN public.quote_items.total_price IS 'Total price including discount and tax: quantity * unit_price * (1 - discount/100) * (1 + tax/100)';
