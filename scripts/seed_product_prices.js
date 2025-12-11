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

async function seedProductPrices() {
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
        .select('id, name, price')
        .eq('company_id', companyUser.company_id);

    console.log(`Found ${products.length} products. Updating prices...`);

    let updatedCount = 0;
    for (const product of products) {
        // Update price only if it's 0 or null
        if (!product.price || product.price === 0) {
            const { error } = await supabase
                .from('products')
                .update({
                    price: Math.floor(Math.random() * 500) + 50, // Random price 50-550
                    currency: 'USD'
                })
                .eq('id', product.id);

            if (!error) {
                // console.log(`Updated price for ${product.name}`);
                updatedCount++;
            } else {
                console.error(`Failed to update ${product.name}:`, error.message);
            }
        }
    }

    console.log(`Seeding complete. Updated prices for ${updatedCount} products.`);
}

seedProductPrices();
