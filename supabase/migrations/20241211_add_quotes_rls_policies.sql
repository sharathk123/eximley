-- RLS Policies for quotes table
-- These policies ensure users can only access quotes from their own company

-- SELECT policy
CREATE POLICY "quotes_select_same_company" ON public.quotes FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = quotes.company_id
    )
);

-- INSERT policy  
CREATE POLICY "quotes_insert_same_company" ON public.quotes FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = quotes.company_id
    )
);

-- UPDATE policy
CREATE POLICY "quotes_update_same_company" ON public.quotes FOR UPDATE USING (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = quotes.company_id
    )
);

-- DELETE policy
CREATE POLICY "quotes_delete_same_company" ON public.quotes FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = quotes.company_id
    )
);

-- RLS Policies for quote_items table
-- These policies ensure users can only access quote items from their own company's quotes

CREATE POLICY "quote_items_policy" ON public.quote_items USING (
    EXISTS (
        SELECT 1 FROM quotes
        WHERE quotes.id = quote_items.quote_id
        AND quotes.company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    )
);
