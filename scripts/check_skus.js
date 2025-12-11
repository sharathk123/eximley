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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    // 1. Get user by email to find company_id
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    const testUser = users.users.find(u => u.email === 'sharath.babuk@gmail.com');

    if (!testUser) {
        console.log("User not found via admin API");
        return;
    }
    console.log("Found User ID:", testUser.id);

    // 2. Get company_id
    const { data: companyUser, error: companyError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', testUser.id)
        .single();

    if (companyError || !companyUser) {
        console.error("Company User Error:", companyError);
        return;
    }
    console.log("Company ID:", companyUser.company_id);

    // 3. Check Products
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyUser.company_id);

    console.log("Products count:", products ? products.length : 0);
    if (products && products.length > 0) console.log("Sample Product:", products[0]);

    // 4. Check SKUs
    const { data: skus, error: skuError } = await supabase
        .from('skus')
        .select('*')
        .eq('company_id', companyUser.company_id);

    console.log("SKUs count:", skus ? skus.length : 0);
    if (skus && skus.length > 0) console.log("Sample SKU:", skus[0]);
}

checkData();
