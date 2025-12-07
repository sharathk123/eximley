const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Products data
const productsData = [
    { Name: 'Cotton T-Shirt', Category: 'apparel', Description: 'Premium quality cotton t-shirt', 'HSN Code': '6109' },
    { Name: 'Wireless Mouse', Category: 'electronics', Description: 'Ergonomic wireless mouse with USB receiver', 'HSN Code': '8471' },
    { Name: 'Basmati Rice', Category: 'food', Description: 'Premium aged basmati rice 1kg pack', 'HSN Code': '1006' },
    { Name: 'Leather Wallet', Category: 'apparel', Description: 'Genuine leather bifold wallet', 'HSN Code': '4202' },
    { Name: 'USB Cable', Category: 'electronics', Description: 'USB Type-C charging cable 2m', 'HSN Code': '8544' },
    { Name: 'Green Tea', Category: 'food', Description: 'Organic green tea leaves 100g', 'HSN Code': '0902' },
    { Name: 'Running Shoes', Category: 'apparel', Description: 'Lightweight running shoes', 'HSN Code': '6404' },
    { Name: 'Bluetooth Speaker', Category: 'electronics', Description: 'Portable bluetooth speaker with bass', 'HSN Code': '8518' },
    { Name: 'Cashew Nuts', Category: 'food', Description: 'Roasted and salted cashew nuts 500g', 'HSN Code': '0801' },
    { Name: 'Denim Jeans', Category: 'apparel', Description: 'Classic fit denim jeans', 'HSN Code': '6203' },
    { Name: 'Laptop Stand', Category: 'electronics', Description: 'Adjustable aluminum laptop stand', 'HSN Code': '8473' },
    { Name: 'Olive Oil', Category: 'food', Description: 'Extra virgin olive oil 500ml', 'HSN Code': '1509' },
    { Name: 'Winter Jacket', Category: 'apparel', Description: 'Waterproof winter jacket', 'HSN Code': '6201' },
    { Name: 'Power Bank', Category: 'electronics', Description: '10000mAh portable power bank', 'HSN Code': '8507' },
    { Name: 'Honey', Category: 'food', Description: 'Pure organic honey 250g', 'HSN Code': '0409' },
    { Name: 'Sports Cap', Category: 'apparel', Description: 'Cotton sports cap with adjustable strap', 'HSN Code': '6505' },
    { Name: 'HDMI Cable', Category: 'electronics', Description: '4K HDMI cable 3m', 'HSN Code': '8544' },
    { Name: 'Coffee Beans', Category: 'food', Description: 'Arabica coffee beans 250g', 'HSN Code': '0901' },
    { Name: 'Leather Belt', Category: 'apparel', Description: 'Genuine leather belt', 'HSN Code': '4203' },
    { Name: 'Keyboard', Category: 'electronics', Description: 'Mechanical gaming keyboard RGB', 'HSN Code': '8471' }
];

// Entities data
const entitiesData = [
    { Name: 'Global Imports LLC', Type: 'buyer', Email: 'contact@globalimports.com', Phone: '+1-555-0123', Country: 'United States', Address: '123 Trade St, New York, NY 10001', 'Tax ID': 'US-TAX-12345' },
    { Name: 'Shanghai Textiles Co', Type: 'supplier', Email: 'sales@shanghaitextiles.cn', Phone: '+86-21-5555-0100', Country: 'China', Address: '45 Manufacturing Rd, Shanghai 200000', 'Tax ID': 'CN-VAT-67890' },
    { Name: 'Euro Fashion GmbH', Type: 'buyer', Email: 'orders@eurofashion.de', Phone: '+49-30-5555-0200', Country: 'Germany', Address: '78 Fashion Ave, Berlin 10115', 'Tax ID': 'DE-UST-11223' },
    { Name: 'Mumbai Exports Pvt Ltd', Type: 'supplier', Email: 'info@mumbaiexports.in', Phone: '+91-22-5555-0300', Country: 'India', Address: '12 Export Plaza, Mumbai 400001', 'Tax ID': 'GSTIN-27AABCU9603R1ZM' },
    { Name: 'Tokyo Electronics KK', Type: 'supplier', Email: 'procurement@tokyoelectronics.jp', Phone: '+81-3-5555-0400', Country: 'Japan', Address: '56 Tech Park, Tokyo 100-0001', 'Tax ID': 'JP-TIN-44556' },
    { Name: 'London Trading Partners', Type: 'buyer', Email: 'purchasing@londontrading.co.uk', Phone: '+44-20-5555-0500', Country: 'United Kingdom', Address: '89 Commerce Rd, London EC1A 1BB', 'Tax ID': 'GB-VAT-77889' },
    { Name: 'Dubai Commodities FZE', Type: 'partner', Email: 'business@dubaicommodities.ae', Phone: '+971-4-555-0600', Country: 'United Arab Emirates', Address: '34 Free Zone, Dubai 12345', 'Tax ID': 'AE-TRN-99001' },
    { Name: 'Singapore Logistics Pte', Type: 'partner', Email: 'logistics@sglogistics.sg', Phone: '+65-6555-0700', Country: 'Singapore', Address: '23 Warehouse Blvd, Singapore 018956', 'Tax ID': 'SG-GST-22334' },
    { Name: 'Paris Wholesale SARL', Type: 'buyer', Email: 'achats@pariswholesale.fr', Phone: '+33-1-5555-0800', Country: 'France', Address: '67 Rue du Commerce, Paris 75001', 'Tax ID': 'FR-TVA-55667' },
    { Name: 'Seoul Manufacturing Ltd', Type: 'supplier', Email: 'export@seoulmanufacturing.kr', Phone: '+82-2-5555-0900', Country: 'South Korea', Address: '90 Industrial Complex, Seoul 04524', 'Tax ID': 'KR-BRN-88990' },
    { Name: 'Sydney Imports Pty', Type: 'buyer', Email: 'imports@sydneyimports.com.au', Phone: '+61-2-5555-1000', Country: 'Australia', Address: '45 Harbor St, Sydney NSW 2000', 'Tax ID': 'AU-ABN-12345678901' },
    { Name: 'Bangkok Traders Co', Type: 'supplier', Email: 'sales@bangkoktraders.th', Phone: '+66-2-555-1100', Country: 'Thailand', Address: '78 Market Rd, Bangkok 10200', 'Tax ID': 'TH-TIN-33445' },
    { Name: 'Toronto Distribution Inc', Type: 'buyer', Email: 'orders@torontodist.ca', Phone: '+1-416-555-1200', Country: 'Canada', Address: '123 Distribution Ave, Toronto ON M5H 2N2', 'Tax ID': 'CA-BN-66778899' },
    { Name: 'Milan Fashion House SRL', Type: 'buyer', Email: 'acquisti@milanfashion.it', Phone: '+39-02-5555-1300', Country: 'Italy', Address: '56 Via Moda, Milan 20121', 'Tax ID': 'IT-IVA-99887766' },
    { Name: 'Mexico City Exports SA', Type: 'supplier', Email: 'ventas@mexicityexports.mx', Phone: '+52-55-5555-1400', Country: 'Mexico', Address: '34 Zona Industrial, Mexico City 01000', 'Tax ID': 'MX-RFC-XAXX010101000' },
    { Name: 'Amsterdam Goods BV', Type: 'partner', Email: 'info@amsterdamgoods.nl', Phone: '+31-20-555-1500', Country: 'Netherlands', Address: '12 Canal St, Amsterdam 1012', 'Tax ID': 'NL-BTW-112233445' },
    { Name: 'Hong Kong Trade Ltd', Type: 'buyer', Email: 'procurement@hktrade.hk', Phone: '+852-2555-1600', Country: 'Hong Kong', Address: '89 Central Plaza, Hong Kong', 'Tax ID': 'HK-BR-55667788' },
    { Name: 'Stockholm Supplies AB', Type: 'supplier', Email: 'sales@stockholmsupplies.se', Phone: '+46-8-555-1700', Country: 'Sweden', Address: '67 Supply Rd, Stockholm 111 22', 'Tax ID': 'SE-VAT-99001122' },
    { Name: 'Sao Paulo Importers Ltda', Type: 'buyer', Email: 'compras@saopauloimporters.br', Phone: '+55-11-5555-1800', Country: 'Brazil', Address: '45 Rua Comercio, Sao Paulo 01310', 'Tax ID': 'BR-CNPJ-12345678000199' },
    { Name: 'Zurich Trading AG', Type: 'partner', Email: 'business@zurichtrading.ch', Phone: '+41-44-555-1900', Country: 'Switzerland', Address: '23 Finance St, Zurich 8001', 'Tax ID': 'CH-UID-33445566' }
];

// Create test-data directory if it doesn't exist
const testDataDir = path.join(__dirname, '..', 'test-data');
if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
}

// Generate Products Excel file
const productsWorksheet = XLSX.utils.json_to_sheet(productsData);
const productsWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(productsWorkbook, productsWorksheet, 'Products');
XLSX.writeFile(productsWorkbook, path.join(testDataDir, 'products-bulk-upload-sample.xlsx'));

// Generate Entities Excel file
const entitiesWorksheet = XLSX.utils.json_to_sheet(entitiesData);
const entitiesWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(entitiesWorkbook, entitiesWorksheet, 'Entities');
XLSX.writeFile(entitiesWorkbook, path.join(testDataDir, 'entities-bulk-upload-sample.xlsx'));

// Generate INVALID format files for testing validation
// Products data formatted as Entities (should fail on Products page)
const invalidProductsData = [
    { Name: 'Cotton T-Shirt', Type: 'buyer', Email: 'products@invalid.com', Phone: '+1-555-0001', Country: 'USA', Address: '123 Product St', 'Tax ID': 'PROD-001' },
    { Name: 'Wireless Mouse', Type: 'supplier', Email: 'mouse@invalid.com', Phone: '+1-555-0002', Country: 'China', Address: '456 Tech Ave', 'Tax ID': 'PROD-002' },
    { Name: 'Basmati Rice', Type: 'partner', Email: 'rice@invalid.com', Phone: '+91-555-0003', Country: 'India', Address: '789 Food Plaza', 'Tax ID': 'PROD-003' },
    { Name: 'Leather Wallet', Type: 'buyer', Email: 'wallet@invalid.com', Phone: '+1-555-0004', Country: 'Italy', Address: '321 Fashion Rd', 'Tax ID': 'PROD-004' },
    { Name: 'USB Cable', Type: 'supplier', Email: 'cable@invalid.com', Phone: '+86-555-0005', Country: 'China', Address: '654 Electronics Blvd', 'Tax ID': 'PROD-005' },
    { Name: 'Green Tea', Type: 'other', Email: 'tea@invalid.com', Phone: '+81-555-0006', Country: 'Japan', Address: '987 Tea Garden', 'Tax ID': 'PROD-006' },
    { Name: 'Running Shoes', Type: 'buyer', Email: 'shoes@invalid.com', Phone: '+49-555-0007', Country: 'Germany', Address: '147 Sports St', 'Tax ID': 'PROD-007' },
    { Name: 'Bluetooth Speaker', Type: 'supplier', Email: 'speaker@invalid.com', Phone: '+82-555-0008', Country: 'South Korea', Address: '258 Audio Ave', 'Tax ID': 'PROD-008' },
    { Name: 'Cashew Nuts', Type: 'partner', Email: 'nuts@invalid.com', Phone: '+91-555-0009', Country: 'India', Address: '369 Nut Farm', 'Tax ID': 'PROD-009' },
    { Name: 'Denim Jeans', Type: 'buyer', Email: 'jeans@invalid.com', Phone: '+1-555-0010', Country: 'USA', Address: '741 Denim Dr', 'Tax ID': 'PROD-010' }
];

const invalidProductsWorksheet = XLSX.utils.json_to_sheet(invalidProductsData);
const invalidProductsWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(invalidProductsWorkbook, invalidProductsWorksheet, 'Products');
XLSX.writeFile(invalidProductsWorkbook, path.join(testDataDir, 'products-INVALID-format.xlsx'));

// Entities data formatted as Products (should fail on Entities page)
const invalidEntitiesData = [
    { Name: 'Global Imports LLC', Category: 'electronics', Description: 'Large import company specializing in electronics', 'HSN Code': '8471' },
    { Name: 'Shanghai Textiles Co', Category: 'apparel', Description: 'Textile manufacturing and export company', 'HSN Code': '6109' },
    { Name: 'Euro Fashion GmbH', Category: 'apparel', Description: 'European fashion distributor', 'HSN Code': '6203' },
    { Name: 'Mumbai Exports Pvt Ltd', Category: 'food', Description: 'Food products export company', 'HSN Code': '1006' },
    { Name: 'Tokyo Electronics KK', Category: 'electronics', Description: 'Electronics manufacturer and supplier', 'HSN Code': '8518' },
    { Name: 'London Trading Partners', Category: 'general', Description: 'General trading and distribution', 'HSN Code': '9999' },
    { Name: 'Dubai Commodities FZE', Category: 'food', Description: 'Commodities trading in Middle East', 'HSN Code': '0901' },
    { Name: 'Singapore Logistics Pte', Category: 'general', Description: 'Logistics and supply chain services', 'HSN Code': '9999' },
    { Name: 'Paris Wholesale SARL', Category: 'apparel', Description: 'Wholesale fashion and apparel', 'HSN Code': '6404' },
    { Name: 'Seoul Manufacturing Ltd', Category: 'electronics', Description: 'Electronics manufacturing facility', 'HSN Code': '8473' }
];

const invalidEntitiesWorksheet = XLSX.utils.json_to_sheet(invalidEntitiesData);
const invalidEntitiesWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(invalidEntitiesWorkbook, invalidEntitiesWorksheet, 'Entities');
XLSX.writeFile(invalidEntitiesWorkbook, path.join(testDataDir, 'entities-INVALID-format.xlsx'));

console.log('✅ Test files generated successfully!');
console.log('📁 Products: test-data/products-bulk-upload-sample.xlsx');
console.log('📁 Entities: test-data/entities-bulk-upload-sample.xlsx');
console.log('');
console.log('⚠️  Invalid format test files (for validation testing):');
console.log('📁 Products (wrong format): test-data/products-INVALID-format.xlsx');
console.log('📁 Entities (wrong format): test-data/entities-INVALID-format.xlsx');
