
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync'; // Need to install csv-parse

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Demo Products Configuration
const productsToSeed = [
    { category: 'Home & Kitchenware', name: 'Stainless Steel Dinner Set', description: 'Premium quality 32-piece stainless steel dinner set', hsn_code: '7323', sku: { code: 'HK-001', name: 'SS Dinner Set - 32 Pc', price: 1500, unit: 'Set', weight: 4.5 } },
    { category: 'Textiles', name: 'Cotton Bed Sheets', description: '100% Cotton double bed sheet with 2 pillow covers', hsn_code: '6304', sku: { code: 'TX-001', name: 'Cotton Bed Sheet - King', price: 800, unit: 'Pcs', weight: 1.2 } },
    { category: 'Handicrafts', name: 'Wooden Carved Box', description: 'Handcrafted wooden jewelry box with intricate carvings', hsn_code: '4420', sku: { code: 'HC-001', name: 'Wooden Box - Med', price: 1200, unit: 'Pcs', weight: 0.8 } },
    { category: 'Furniture', name: 'Teak Wood Chair', description: 'Solid teak wood dining chair with cushion', hsn_code: '9403', sku: { code: 'FN-001', name: 'Teak Chair - Std', price: 4500, unit: 'Pcs', weight: 6.5 } },
    { category: 'Solar equipments', name: 'Solar Panel 500W', description: 'Monocrystalline solar panel 500W high efficiency', hsn_code: '8541', sku: { code: 'SL-001', name: 'Solar Panel 500W', price: 12000, unit: 'Pcs', weight: 22.0 } }
];

async function seedHSN() {
    console.log('📦 Seeding Master HSN Codes...');
    const csvPath = path.resolve(process.cwd(), 'test-data/hsn-codewiselist-with-gst-rates.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found:', csvPath);
        return;
    }

    let fileContent = fs.readFileSync(csvPath, 'utf-8');

    // Pre-process: Very aggressive cleaning for broken CSV
    // 1. Remove all quotes that are not at start/end of fields or part of proper escaping
    // 2. Replace erratic double quotes

    // Simplest approach: Remove all quotes from the content entirely if logic permits, 
    // BUT we need them for fields with commas.
    // Better: use a regex to fix common issues or just use relax_quotes

    // Attempt 3: Use 'quote' option as empty to treat quotes as literals?
    // No, let's try to parse line-by-line manually if the library fails repeatedly.
    // Manual parsing because the CSV is too malformed for standard parsers
    const lines = fileContent.split(/\r?\n/);
    const records = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        // Simple heuristic: 
        // Col 0: HSN Code (Digits)
        // Col 2: HSN Description (Long text)
        // Col 3: Rate (Percentage)

        // Split by comma, but respect "some quotes" loosely?
        // Actually, given the messy data shown in logs, specific column targeting is safer.
        // Let's regex for the HSN Code at the start.

        const match = line.match(/^"?(\d{4,8})"?\s*,/);
        if (!match) continue; // Skip lines that don't start with an HSN code

        const hsnCode = match[1];

        // Extract rate by finding "X%" pattern
        const rateMatch = line.match(/(\d+(?:\.\d+)?)%/);
        const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;

        // Extract description: Everything between the first comma and the rate (or end)
        // This is fuzzy but likely sufficient for seed data
        let description = line.substring(match[0].length).trim();
        // Remove rate part from description if found
        if (rateMatch) {
            const rateIndex = description.lastIndexOf(rateMatch[0]);
            if (rateIndex > -1) {
                description = description.substring(0, rateIndex);
            }
        }

        // Cleanup description
        description = description.replace(/^,/, '').replace(/,$/, '').replace(/^"/, '').replace(/"$/, '').trim();
        // Remove internal messy quotes
        description = description.replace(/""/g, '"');

        records.push([hsnCode, '', description, `${rate}%`]);
    }

    const hsnEntries: any[] = [];
    const seenCodes = new Set();

    // Skip header rows roughly
    for (let i = 2; i < records.length; i++) {
        const row = records[i];
        // Heuristic: Column 0 is usually HSN Code (checks if numeric)
        // Adjust based on observation of CSV: 
        // Row[0] = "33019031", Row[1] ="..."

        let code = row[0]?.toString().trim();
        let desc = row[2]?.toString().trim() || row[1]?.toString().trim(); // Sometimes desc is in col 2 or 1
        let rateStr = row[3]?.toString().trim(); // Rate often in col 3

        // Clean Code
        code = code.replace(/[^0-9]/g, '');

        // Validate Code - must be at least 4 digits
        if (code.length < 4 || seenCodes.has(code)) continue;

        // Clean Rate
        let rate = 0;
        if (rateStr && rateStr.includes('%')) {
            rate = parseFloat(rateStr.replace('%', ''));
        }

        if (code && desc) {
            seenCodes.add(code);
            hsnEntries.push({
                hsn_code: code,
                description: desc.substring(0, 500), // Truncate if too long
                gst_rate: isNaN(rate) ? 0 : rate,
                chapter: code.substring(0, 2)
            });
        }
    }

    console.log(`Found ${hsnEntries.length} valid HSN entries.`);

    if (hsnEntries.length > 0) {
        // Batch insert to avoid payload limits
        const batchSize = 1000;
        for (let i = 0; i < hsnEntries.length; i += batchSize) {
            const batch = hsnEntries.slice(i, i + batchSize);
            const { error } = await supabase
                .from('master_hsn_codes')
                .upsert(batch, { onConflict: 'hsn_code', ignoreDuplicates: false });

            if (error) console.error(`Batch insert error (row ${i}):`, error.message);
            else console.log(`Inserted batch ${i} - ${i + batchSize}`);
        }
    }
    console.log('✅ HSN Seeding Complete.');
}

async function seedProducts() {
    console.log('🌱 Starting Product Seeding...');

    // 1. Get a Company ID
    const { data: companies } = await supabase.from('companies').select('id').limit(1);
    let companyId = companies?.[0]?.id;

    if (!companyId) {
        console.log('Creating default company...');
        const { data: newCompany } = await supabase
            .from('companies')
            .insert({ legal_name: 'Evo EximOra Demo', email: 'admin@evoeximora.com' })
            .select().single();
        companyId = newCompany.id;
    }

    console.log('Using Company ID:', companyId);

    // 2. Insert Products & SKUs
    for (const item of productsToSeed) {
        const { data: product } = await supabase
            .from('products')
            .upsert({
                company_id: companyId,
                name: item.name,
                category: item.category,
                description: item.description,
                hsn_code: item.hsn_code
            }, { onConflict: 'company_id, name' as any })
            .select() // Need ID
            .single();

        if (product) {
            // Check for existing SKU to update or insert
            const { data: existingSku } = await supabase
                .from('skus')
                .select('id')
                .eq('company_id', companyId)
                .eq('product_id', product.id)
                .eq('sku_code', item.sku.code)
                .single();

            const skuPayload = {
                company_id: companyId,
                product_id: product.id,
                sku_code: item.sku.code,
                name: item.sku.name,
                base_price: item.sku.price,
                unit: item.sku.unit,
                hs_code: item.hsn_code,
                weight_kg: item.sku.weight
            };

            if (existingSku) {
                await supabase.from('skus').update(skuPayload).eq('id', existingSku.id);
                console.log(`Updated SKU: ${item.sku.code}`);
            } else {
                await supabase.from('skus').insert(skuPayload);
                console.log(`Created SKU: ${item.sku.code}`);
            }
        }
    }
    console.log('✅ Product Seeding Complete.');
}

async function main() {
    await seedHSN();
    await seedProducts();
}

main().catch(console.error);
