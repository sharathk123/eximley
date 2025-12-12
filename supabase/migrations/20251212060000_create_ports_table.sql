-- Create ports table
CREATE TABLE IF NOT EXISTS ports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL, -- UN/LOCODE or IATA
    country text NOT NULL,
    type text NOT NULL CHECK (type IN ('sea', 'air')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add index for search
CREATE INDEX IF NOT EXISTS idx_ports_name_trgm ON ports USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ports_code ON ports (code);
CREATE INDEX IF NOT EXISTS idx_ports_type ON ports (type);

-- RLS Policies
ALTER TABLE ports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
    ON ports FOR SELECT
    TO authenticated
    USING (true);

-- Seed Data (Major Seaports and Airports)
INSERT INTO ports (name, code, country, type) VALUES
-- Seaports
('Port of Singapore', 'SGSIN', 'Singapore', 'sea'),
('Port of Shanghai', 'CNSHA', 'China', 'sea'),
('Port of Ningbo-Zhoushan', 'CNNBG', 'China', 'sea'),
('Port of Shenzhen', 'CNSZX', 'China', 'sea'),
('Port of Guangzhou', 'CNGZG', 'China', 'sea'),
('Port of Busan', 'KRPUS', 'South Korea', 'sea'),
('Port of Qingdao', 'CNQDG', 'China', 'sea'),
('Port of Hong Kong', 'HKHKG', 'Hong Kong', 'sea'),
('Port of Tianjin', 'CNTXG', 'China', 'sea'),
('Port of Rotterdam', 'NLRTM', 'Netherlands', 'sea'),
('Port of Antwerp', 'BEANR', 'Belgium', 'sea'),
('Port of Jebel Ali', 'AEJEA', 'UAE', 'sea'),
('Port of Port Klang', 'MYPKG', 'Malaysia', 'sea'),
('Port of Xiamen', 'CNXMN', 'China', 'sea'),
('Port of Kaohsiung', 'TWKHH', 'Taiwan', 'sea'),
('Port of Los Angeles', 'USLAX', 'USA', 'sea'),
('Port of Long Beach', 'USLGB', 'USA', 'sea'),
('Port of New York/New Jersey', 'USNYC', 'USA', 'sea'),
('Port of Hamburg', 'DEHAM', 'Germany', 'sea'),
('Port of Nhava Sheva', 'INNSA', 'India', 'sea'),
('Port of Mundra', 'INMUN', 'India', 'sea'),
('Port of Chennai', 'INMAA', 'India', 'sea'),
('Port of Visakhapatnam', 'INVTZ', 'India', 'sea'),
('Port of Kolkata', 'INCCU', 'India', 'sea'),
('Port of Cochin', 'INCOK', 'India', 'sea'),
('Port of Felixstowe', 'GBFXT', 'UK', 'sea'),
('Port of Santos', 'BRSSZ', 'Brazil', 'sea'),
('Port of Melbourne', 'AUMEL', 'Australia', 'sea'),
('Port of Tokyo', 'JPTY', 'Japan', 'sea'),
('Port of Colombo', 'LKCMB', 'Sri Lanka', 'sea'),

-- Airports
('Hong Kong International Airport', 'HKG', 'Hong Kong', 'air'),
('Memphis International Airport', 'MEM', 'USA', 'air'),
('Shanghai Pudong International Airport', 'PVG', 'China', 'air'),
('Anchorage International Airport', 'ANC', 'USA', 'air'),
('Incheon International Airport', 'ICN', 'South Korea', 'air'),
('Louisville Muhammad Ali International Airport', 'SDF', 'USA', 'air'),
('Taipei Taoyuan International Airport', 'TPE', 'Taiwan', 'air'),
('Tokyo Narita International Airport', 'NRT', 'Japan', 'air'),
('Los Angeles International Airport', 'LAX', 'USA', 'air'),
('Doha Hamad International Airport', 'DOH', 'Qatar', 'air'),
('Singapore Changi Airport', 'SIN', 'Singapore', 'air'),
('Frankfurt Airport', 'FRA', 'Germany', 'air'),
('Paris Charles de Gaulle Airport', 'CDG', 'France', 'air'),
('Miami International Airport', 'MIA', 'USA', 'air'),
('Beijing Capital International Airport', 'PEK', 'China', 'air'),
('Dubai International Airport', 'DXB', 'UAE', 'air'),
('London Heathrow Airport', 'LHR', 'UK', 'air'),
('Amsterdam Airport Schiphol', 'AMS', 'Netherlands', 'air'),
('Chicago O Hare International Airport', 'ORD', 'USA', 'air'),
('Indira Gandhi International Airport', 'DEL', 'India', 'air'),
('Chhatrapati Shivaji Maharaj International Airport', 'BOM', 'India', 'air'),
('Kempegowda International Airport', 'BLR', 'India', 'air'),
('Chennai International Airport', 'MAA', 'India', 'air'),
('Rajiv Gandhi International Airport', 'HYD', 'India', 'air');
