-- Sample Products & SKUs for Export Business
-- Categories: Home & Kitchenware, Textiles, Handicrafts, Furniture, Solar Accessories

-- NOTE: Replace 'YOUR_COMPANY_ID_HERE' with your actual company_id from the companies table
-- You can get it by running: SELECT id FROM companies WHERE legal_name = 'Your Company Name';

-- ============================================
-- 1. HOME & KITCHENWARE
-- ============================================

-- Product: Stainless Steel Cookware Set
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Stainless Steel Cookware Set', 'Premium quality stainless steel cookware with non-stick coating', 'Home & Kitchenware', true)
RETURNING id; -- Note the returned ID

-- SKUs for Cookware Set (replace PRODUCT_ID with the ID from above)
INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, length_cm, width_cm, height_cm)
VALUES 
('PRODUCT_ID', 'YOUR_COMPANY_ID_HERE', 'COOK-SS-5PC', '7323', '5-Piece Stainless Steel Cookware Set', 45.00, 'USD', 3.5, 35, 35, 20),
('PRODUCT_ID', 'YOUR_COMPANY_ID_HERE', 'COOK-SS-10PC', '7323', '10-Piece Stainless Steel Cookware Set', 85.00, 'USD', 6.0, 40, 40, 25);

-- Product: Ceramic Dinnerware Set
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Ceramic Dinnerware Set', 'Handcrafted ceramic dinnerware with traditional designs', 'Home & Kitchenware', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, length_cm, width_cm, height_cm)
VALUES 
((SELECT id FROM products WHERE name = 'Ceramic Dinnerware Set' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'DIN-CER-16PC', '6912', '16-Piece Ceramic Dinnerware Set', 65.00, 'USD', 8.0, 40, 30, 25),
((SELECT id FROM products WHERE name = 'Ceramic Dinnerware Set' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'DIN-CER-24PC', '6912', '24-Piece Ceramic Dinnerware Set', 95.00, 'USD', 12.0, 45, 35, 30);

-- ============================================
-- 2. TEXTILES
-- ============================================

-- Product: Cotton Bed Sheets
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Premium Cotton Bed Sheets', '100% Egyptian cotton bed sheets with 400 thread count', 'Textiles', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg)
VALUES 
((SELECT id FROM products WHERE name = 'Premium Cotton Bed Sheets' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'SHEET-COT-SINGLE', '6302', 'Single Bed Cotton Sheet Set', 25.00, 'USD', 1.2),
((SELECT id FROM products WHERE name = 'Premium Cotton Bed Sheets' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'SHEET-COT-DOUBLE', '6302', 'Double Bed Cotton Sheet Set', 35.00, 'USD', 1.8),
((SELECT id FROM products WHERE name = 'Premium Cotton Bed Sheets' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'SHEET-COT-KING', '6302', 'King Size Cotton Sheet Set', 45.00, 'USD', 2.2);

-- Product: Silk Scarves
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Handwoven Silk Scarves', 'Pure silk scarves with traditional hand-block prints', 'Textiles', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, length_cm, width_cm)
VALUES 
((SELECT id FROM products WHERE name = 'Handwoven Silk Scarves' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'SCARF-SILK-FLORAL', '6214', 'Silk Scarf - Floral Design', 18.00, 'USD', 0.1, 180, 90),
((SELECT id FROM products WHERE name = 'Handwoven Silk Scarves' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'SCARF-SILK-PAISLEY', '6214', 'Silk Scarf - Paisley Design', 18.00, 'USD', 0.1, 180, 90);

-- ============================================
-- 3. HANDICRAFTS
-- ============================================

-- Product: Wooden Carved Figurines
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Hand-Carved Wooden Figurines', 'Traditional wooden figurines carved by artisans', 'Handicrafts', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, height_cm)
VALUES 
((SELECT id FROM products WHERE name = 'Hand-Carved Wooden Figurines' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'FIG-WOOD-ELEPHANT-SM', '4420', 'Wooden Elephant Figurine - Small (15cm)', 12.00, 'USD', 0.3, 15),
((SELECT id FROM products WHERE name = 'Hand-Carved Wooden Figurines' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'FIG-WOOD-ELEPHANT-MD', '4420', 'Wooden Elephant Figurine - Medium (25cm)', 22.00, 'USD', 0.6, 25),
((SELECT id FROM products WHERE name = 'Hand-Carved Wooden Figurines' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'FIG-WOOD-BUDDHA', '4420', 'Wooden Buddha Figurine (30cm)', 28.00, 'USD', 0.8, 30);

-- Product: Brass Decorative Items
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Brass Decorative Items', 'Handcrafted brass items with antique finish', 'Handicrafts', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, height_cm)
VALUES 
((SELECT id FROM products WHERE name = 'Brass Decorative Items' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'BRASS-LAMP-DIYA', '7418', 'Brass Oil Lamp (Diya)', 8.00, 'USD', 0.2, 10),
((SELECT id FROM products WHERE name = 'Brass Decorative Items' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'BRASS-VASE-FLOWER', '7418', 'Brass Flower Vase', 15.00, 'USD', 0.5, 20);

-- ============================================
-- 4. FURNITURE
-- ============================================

-- Product: Wooden Dining Table
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Solid Wood Dining Table', 'Handcrafted solid wood dining table with natural finish', 'Furniture', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, length_cm, width_cm, height_cm)
VALUES 
((SELECT id FROM products WHERE name = 'Solid Wood Dining Table' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'TABLE-WOOD-4SEAT', '9403', '4-Seater Wooden Dining Table', 280.00, 'USD', 35.0, 120, 80, 75),
((SELECT id FROM products WHERE name = 'Solid Wood Dining Table' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'TABLE-WOOD-6SEAT', '9403', '6-Seater Wooden Dining Table', 380.00, 'USD', 50.0, 180, 90, 75);

-- Product: Rattan Chairs
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Handwoven Rattan Chairs', 'Eco-friendly rattan chairs with cushions', 'Furniture', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, length_cm, width_cm, height_cm)
VALUES 
((SELECT id FROM products WHERE name = 'Handwoven Rattan Chairs' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'CHAIR-RATTAN-SINGLE', '9401', 'Single Rattan Chair with Cushion', 65.00, 'USD', 5.0, 60, 60, 85),
((SELECT id FROM products WHERE name = 'Handwoven Rattan Chairs' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'CHAIR-RATTAN-SET4', '9401', 'Set of 4 Rattan Chairs', 240.00, 'USD', 20.0, 60, 60, 85);

-- ============================================
-- 5. SOLAR ACCESSORIES
-- ============================================

-- Product: MC4 Solar Connectors
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'MC4 Solar Panel Connectors', 'Waterproof MC4 connectors for solar panel installations', 'Solar Accessories', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg)
VALUES 
((SELECT id FROM products WHERE name = 'MC4 Solar Panel Connectors' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'MC4-CONN-PAIR', '8536', 'MC4 Connector Pair (Male + Female)', 2.50, 'USD', 0.05),
((SELECT id FROM products WHERE name = 'MC4 Solar Panel Connectors' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'MC4-CONN-10PAIR', '8536', 'MC4 Connector - 10 Pairs Pack', 22.00, 'USD', 0.5);

-- Product: Solar PV Cables
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Solar PV Cables', 'UV resistant solar cables for outdoor installations', 'Solar Accessories', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg)
VALUES 
((SELECT id FROM products WHERE name = 'Solar PV Cables' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'CABLE-PV-4MM-50M', '8544', '4mm² Solar Cable - 50 Meter Roll', 45.00, 'USD', 8.0),
((SELECT id FROM products WHERE name = 'Solar PV Cables' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'CABLE-PV-6MM-50M', '8544', '6mm² Solar Cable - 50 Meter Roll', 65.00, 'USD', 12.0);

-- Product: Solar Junction Boxes
INSERT INTO products (company_id, name, description, category, is_active)
VALUES ('YOUR_COMPANY_ID_HERE', 'Solar Junction Boxes', 'Weatherproof junction boxes with bypass diodes', 'Solar Accessories', true);

INSERT INTO skus (product_id, company_id, sku_code, hs_code, description, unit_price, currency_code, weight_kg, length_cm, width_cm, height_cm)
VALUES 
((SELECT id FROM products WHERE name = 'Solar Junction Boxes' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'JBOX-SOLAR-IP67', '8538', 'IP67 Rated Solar Junction Box', 8.50, 'USD', 0.15, 12, 8, 4),
((SELECT id FROM products WHERE name = 'Solar Junction Boxes' AND company_id = 'YOUR_COMPANY_ID_HERE'), 
 'YOUR_COMPANY_ID_HERE', 'JBOX-SOLAR-IP68', '8538', 'IP68 Rated Solar Junction Box (Premium)', 12.00, 'USD', 0.18, 15, 10, 5);

-- ============================================
-- SUMMARY
-- ============================================
-- Total Products: 12
-- Total SKUs: 28
-- Categories:
--   - Home & Kitchenware: 2 products, 4 SKUs
--   - Textiles: 2 products, 5 SKUs
--   - Handicrafts: 2 products, 5 SKUs
--   - Furniture: 2 products, 4 SKUs
--   - Solar Accessories: 3 products, 10 SKUs
