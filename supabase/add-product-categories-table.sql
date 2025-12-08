-- Create Product Categories Table
-- This allows dynamic category management instead of hardcoded values

CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can read categories
CREATE POLICY "product_categories_read_all" ON public.product_categories
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only Super Admin can manage categories (insert/update/delete)
CREATE POLICY "product_categories_super_admin_manage" ON public.product_categories
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.company_users
            WHERE user_id = auth.uid()
            AND is_super_admin = true
        )
    );

-- Create index for faster lookups
CREATE INDEX idx_product_categories_active ON public.product_categories(is_active);
CREATE INDEX idx_product_categories_order ON public.product_categories(display_order);

-- Insert default categories
INSERT INTO public.product_categories (name, description, display_order, is_active) VALUES
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
ON CONFLICT (name) DO NOTHING;

-- Update products table to reference categories (optional - for future use)
-- ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.product_categories(id);
-- For now, we'll keep the category as TEXT in products table for backward compatibility

COMMENT ON TABLE public.product_categories IS 'Product categories that can be managed by Super Admin';
COMMENT ON COLUMN public.product_categories.display_order IS 'Order in which categories appear in dropdowns (lower number = higher priority)';
