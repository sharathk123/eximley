ALTER TABLE products 
ALTER COLUMN currency SET DEFAULT 'INR';

ALTER TABLE skus 
ALTER COLUMN currency SET DEFAULT 'INR';

-- Update existing records
UPDATE products SET currency = 'INR' WHERE currency = 'USD';
UPDATE skus SET currency = 'INR' WHERE currency = 'USD';
