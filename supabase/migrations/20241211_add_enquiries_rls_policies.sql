-- RLS Policies for enquiries table
-- These policies ensure users can only access enquiries from their own company

-- SELECT policy
CREATE POLICY "enquiries_select_same_company" ON public.enquiries FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = enquiries.company_id
    )
);

-- INSERT policy  
CREATE POLICY "enquiries_insert_same_company" ON public.enquiries FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = enquiries.company_id
    )
);

-- UPDATE policy
CREATE POLICY "enquiries_update_same_company" ON public.enquiries FOR UPDATE USING (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = enquiries.company_id
    )
);

-- DELETE policy
CREATE POLICY "enquiries_delete_same_company" ON public.enquiries FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id FROM company_users WHERE company_id = enquiries.company_id
    )
);

-- RLS Policies for enquiry_items table
-- These policies ensure users can only access enquiry items from their own company's enquiries

CREATE POLICY "enquiry_items_policy" ON public.enquiry_items USING (
    EXISTS (
        SELECT 1 FROM enquiries
        WHERE enquiries.id = enquiry_items.enquiry_id
        AND enquiries.company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    )
);
