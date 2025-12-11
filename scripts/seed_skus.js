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

async function seedSkus() {
    // 1. Get user -> company
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
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

    if (!companyUser) {
        console.error("Company User not found");
        return;
    }
    console.log("Company ID:", companyUser.company_id);

    // 2. Get Products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyUser.company_id);

    if (!products || products.length === 0) {
        console.log("No products found to seed SKUs for.");
        return;
    }

    console.log(`Found ${products.length} products. Checking SKUs...`);

    let createdCount = 0;
    for (const product of products) {
        // Check if SKU exists
        const { data: existingSku } = await supabase
            .from('skus')
            .select('id')
            .eq('product_id', product.id)
            .maybeSingle(); // Use maybeSingle to avoid error if none

        if (!existingSku) {
            // Create default SKU
            const skuCode = `SKU-${product.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
            const { error: insertError } = await supabase
                .from('skus')
                .insert({
                    company_id: companyUser.company_id,
                    product_id: product.id,
                    name: product.name + " - Standard",
                    sku_code: skuCode
                });

            if (insertError) {
                console.error(`Failed to create SKU for ${product.name}:`, insertError);
            } else {
                console.log(`Created SKU ${skuCode} for ${product.name}`);
                createdCount++;
            }
        }
    }

    console.log(`Seeding complete. Created ${createdCount} new SKUs.`);
}

seedSkus();
