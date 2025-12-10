-- Enable RLS for DELETE on products table
-- Policy: Users can delete products belonging to their company
CREATE POLICY "products_delete_same_company" ON public.products
    FOR DELETE USING (auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = products.company_id
    ));
