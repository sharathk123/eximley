-- Create payment_terms table
create table if not exists public.payment_terms (
  id uuid default gen_random_uuid() primary key,
  label text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.payment_terms enable row level security;

-- Create policy for reading (public access)
create policy "Allow public read access" on public.payment_terms
  for select using (true);

-- Seed data
insert into public.payment_terms (label, description) values
  ('100% Advance', 'Buyer pays full amount before shipment. Safest for exporter.'),
  ('50% Advance / 50% Balance against BL', 'Split payment. Balance paid upon proof of shipment (Bill of Lading).'),
  ('100% LC at Sight', 'Bank guarantees payment upon presentation of compliant documents.'),
  ('Net 30 Days', 'Payment due 30 days after invoice date. Requires credit trust.'),
  ('Net 60 Days', 'Payment due 60 days after invoice date. Extended credit terms.'),
  ('CAD (Cash Against Documents)', 'Importer pays bank to release shipping documents.'),
  ('DP at Sight', 'Documents against Payment. Similar to CAD, payment on presentation.');
