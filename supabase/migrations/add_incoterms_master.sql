-- Create Incoterms Master Table
CREATE TABLE IF NOT EXISTS public.incoterms (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- Enable RLS
ALTER TABLE public.incoterms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incoterms_select_all" ON public.incoterms FOR SELECT USING (true);

-- Seed Data
INSERT INTO public.incoterms (code, name, description) VALUES
('EXW', 'Ex Works', 'Seller makes goods available at their premises.'),
('FCA', 'Free Carrier', 'Seller delivers goods to a carrier or another person nominated by the buyer.'),
('CPT', 'Carriage Paid To', 'Seller delivers goods to the carrier and pays for carriage to the named place of destination.'),
('CIP', 'Carriage and Insurance Paid To', 'Seller delivers goods to the carrier and pays for carriage and insurance to the named place of destination.'),
('DAP', 'Delivered at Place', 'Seller delivers when the goods are placed at the disposal of the buyer at the named place of destination.'),
('DPU', 'Delivered at Place Unloaded', 'Seller delivers when the goods, once unloaded, are placed at the disposal of the buyer at a named place of destination.'),
('DDP', 'Delivered Duty Paid', 'Seller takes all responsibility for transporting the goods to the destination country, clearing customs, and paying duties.'),
('FAS', 'Free Alongside Ship', 'Seller delivers when the goods are placed alongside the vessel at the named port of shipment.'),
('FOB', 'Free on Board', 'Seller delivers when the goods are placed on board the vessel nominated by the buyer at the named port of shipment.'),
('CFR', 'Cost and Freight', 'Seller delivers the goods on board the vessel and pays the costs and freight to bring the goods to the named port of destination.'),
('CIF', 'Cost, Insurance and Freight', 'Seller delivers the goods on board the vessel and pays the costs, insurance, and freight to bring the goods to the named port of destination.')
ON CONFLICT (code) DO NOTHING;

-- Update Quotes Table
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS incoterm_place TEXT;

-- Update Export Orders Table
ALTER TABLE public.export_orders
ADD COLUMN IF NOT EXISTS incoterm TEXT REFERENCES public.incoterms(code),
ADD COLUMN IF NOT EXISTS incoterm_place TEXT;

-- Note: We are not enforced FK on existing text columns in quotes/shipments to avoid breaking existing data with invalid codes,
-- but strictly speaking we should. Future cleanup might be needed.
