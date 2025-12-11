-- Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE, -- ISO 2-char code
    phone_code TEXT,
    currency_code TEXT,
    flag_emoji TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'countries'
      AND policyname = 'countries_read_all'
  ) THEN
    CREATE POLICY "countries_read_all" ON public.countries FOR SELECT USING (true);
  END IF;
END
$$;

-- Seed Data (Common Countries)
INSERT INTO public.countries (name, code, phone_code, currency_code, flag_emoji) VALUES
('United States', 'US', '+1', 'USD', '🇺🇸'),
('India', 'IN', '+91', 'INR', '🇮🇳'),
('United Kingdom', 'GB', '+44', 'GBP', '🇬🇧'),
('United Arab Emirates', 'AE', '+971', 'AED', '🇦🇪'),
('Canada', 'CA', '+1', 'CAD', '🇨🇦'),
('Australia', 'AU', '+61', 'AUD', '🇦🇺'),
('Germany', 'DE', '+49', 'EUR', '🇩🇪'),
('France', 'FR', '+33', 'EUR', '🇫🇷'),
('China', 'CN', '+86', 'CNY', '🇨🇳'),
('Japan', 'JP', '+81', 'JPY', '🇯🇵'),
('Singapore', 'SG', '+65', 'SGD', '🇸🇬'),
('Saudi Arabia', 'SA', '+966', 'SAR', '🇸🇦'),
('Brazil', 'BR', '+55', 'BRL', '🇧🇷'),
('South Africa', 'ZA', '+27', 'ZAR', '🇿🇦'),
('Russia', 'RU', '+7', 'RUB', '🇷🇺')
ON CONFLICT (code) DO NOTHING;

-- Seed Currencies if not exists (using existing table structure assumption from API check)
-- Ensuring we have the basics used in countries
INSERT INTO public.currencies (code, name, symbol) VALUES
('USD', 'US Dollar', '$'),
('INR', 'Indian Rupee', '₹'),
('GBP', 'British Pound', '£'),
('AED', 'UAE Dirham', 'د.إ'),
('CAD', 'Canadian Dollar', '$'),
('AUD', 'Australian Dollar', '$'),
('EUR', 'Euro', '€'),
('CNY', 'Chinese Yuan', '¥'),
('JPY', 'Japanese Yen', '¥'),
('SGD', 'Singapore Dollar', '$'),
('SAR', 'Saudi Riyal', '﷼'),
('BRL', 'Brazilian Real', 'R$'),
('ZAR', 'South African Rand', 'R'),
('RUB', 'Russian Ruble', '₽')
ON CONFLICT (code) DO NOTHING;
