
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("🔍 Checking 'enquiry_items' table schema...");

    // Try to select the new column
    const { data, error } = await supabase
        .from('enquiry_items')
        .select('product_id')
        .limit(1);

    if (error) {
        console.error("❌ Error selecting product_id:", error.message);
        console.log("👉 This confirms the migration was NOT applied.");
    } else {
        console.log("✅ 'product_id' column exists. Migration was applied.");
    }
}

run();
