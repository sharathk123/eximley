const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
let envConfig = {};
try {
    const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    envConfig = dotenv.parse(envLocal);
} catch (e) {
    console.log("Could not read .env.local, relying on process.env");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUniversalSkus() {
    // 1. Get user -> company
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users.users.find(u => u.email === 'sharath.babuk@gmail.com');

    if (!testUser) {
        console.log("User not found");
        return;
    }

    const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', testUser.id)
        .single();

    console.log("Company ID:", companyUser.company_id);

    // 2. Get Products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyUser.company_id);

    console.log(`Found ${products.length} products. Updating SKUs to Universal Format...`);

    let updatedCount = 0;
    for (const [index, product] of products.entries()) {
        const universalSku = `EXIM-${String(index + 1).padStart(4, '0')}`; // EXIM-0001, EXIM-0002...

        // Upsert SKU (update logic: if SKU exists for product, update code; else insert)
        const { data: existingSku } = await supabase
            .from('skus')
            .select('id')
            .eq('product_id', product.id)
            .maybeSingle();

        if (existingSku) {
            const { error } = await supabase
                .from('skus')
                .update({ sku_code: universalSku })
                .eq('id', existingSku.id);
            if (!error) updatedCount++;
        } else {
            const { error } = await supabase
                .from('skus')
                .insert({
                    company_id: companyUser.company_id,
                    product_id: product.id,
                    name: product.name + " - Universal",
                    sku_code: universalSku
                });
            if (!error) updatedCount++;
        }
    }

    console.log(`Seeding complete. standardised ${updatedCount} SKUs to Universal Format.`);
}

seedUniversalSkus();
