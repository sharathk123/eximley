
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
