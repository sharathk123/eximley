
-- Create quote_templates table
CREATE TABLE IF NOT EXISTS public.quote_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing templates (same company)
CREATE POLICY "Users can view their company's templates" ON public.quote_templates
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Create policy for inserting templates (same company)
CREATE POLICY "Users can create templates for their company" ON public.quote_templates
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Create policy for updating templates (same company)
CREATE POLICY "Users can update their company's templates" ON public.quote_templates
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Create policy for deleting templates (same company)
CREATE POLICY "Users can delete their company's templates" ON public.quote_templates
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.company_users 
            WHERE user_id = auth.uid()
        )
    );
