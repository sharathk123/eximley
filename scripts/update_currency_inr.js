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

async function updateCurrencyToINR() {
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

    // 2. Update Products
    const { error: prodError, count: prodCount } = await supabase
        .from('products')
        .update({ currency: 'INR' })
        .eq('company_id', companyUser.company_id)
        .eq('currency', 'USD')
        .select('id', { count: 'exact' });

    if (prodError) console.error("Product update failed:", prodError);
    else console.log(`Updated ${prodCount} products to INR.`);

    // 3. Update SKUs
    const { error: skuError, count: skuCount } = await supabase
        .from('skus')
        .update({ currency: 'INR' }) // If currency exists on SKU
        .eq('company_id', companyUser.company_id)
        .select('id', { count: 'exact' });
    // Note: SKUs might not have currency populated if it's optional, but we try anyway.

    if (skuError) {
        // Ignore column not found error if schema wasn't fully applied
        if (skuError.code !== '42703') console.error("SKU update warning:", skuError.message);
    } else {
        console.log(`Updated ${skuCount} SKUs to INR (if applicable).`);
    }

}

updateCurrencyToINR();
