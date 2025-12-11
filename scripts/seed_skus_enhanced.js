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

async function seedEnhancedSkus() {
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

    // Get Company Details
    const { data: company } = await supabase
        .from('companies')
        .select('trade_name, legal_name')
        .eq('id', companyUser.company_id)
        .single();

    const companyName = company.trade_name || company.legal_name || "EXIM";
    const companyPrefix = companyName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'EXI');

    console.log(`Generating SKUs for Company: ${companyName} (${companyPrefix})`);

    // 2. Get Products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyUser.company_id);

    console.log(`Found ${products.length} products. Updating SKUs...`);

    let updatedCount = 0;

    // Track sequence per category-product combo to ensure uniqueness if needed, 
    // but request asks for Sequence at the end. 
    // Simple approach: One SKU per product for now, sequence 001.

    for (const product of products) {
        // Construct SKU Components
        const categoryCode = (product.category || "GEN").substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
        const productNameCode = product.name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');

        let colorCode = "STD";
        let sizeCode = "STD";

        if (product.attributes) {
            // Check for color keys
            const color = product.attributes.color || product.attributes.colour || product.attributes.Color;
            if (color) colorCode = color.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');

            // Check for size keys
            const size = product.attributes.size || product.attributes.Size || product.attributes.capacity || product.attributes.ram;
            if (size) sizeCode = size.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
        }

        const sequence = "001";

        // Format: CompanyPrefix-CategoryCode-ProductName-ColorCode-SizeCode-Sequence
        // Example: APX-TSHIRT-CLASSIC-BLU-M-001
        const enhancedSku = `${companyPrefix}-${categoryCode}-${productNameCode}-${colorCode}-${sizeCode}-${sequence}`;

        // Upsert SKU
        const { data: existingSku } = await supabase
            .from('skus')
            .select('id')
            .eq('product_id', product.id)
            .maybeSingle();

        if (existingSku) {
            const { error } = await supabase
                .from('skus')
                .update({ sku_code: enhancedSku })
                .eq('id', existingSku.id);
            if (!error) updatedCount++;
        } else {
            const { error } = await supabase
                .from('skus')
                .insert({
                    company_id: companyUser.company_id,
                    product_id: product.id,
                    name: product.name + " - Standard",
                    sku_code: enhancedSku
                });
            if (!error) updatedCount++;
        }
    }

    console.log(`Seeding complete. Enhanced ${updatedCount} SKUs.`);
}

seedEnhancedSkus();
