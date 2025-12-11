-- Add currency_code to enquiries table
ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code) DEFAULT 'USD';
