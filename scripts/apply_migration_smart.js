
const postgres = require('postgres');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function run() {
    console.log("🚀 Applying Migration (Smart Mode)...");

    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.SUPABASE_POSTGRES_URL;

    if (!dbUrl) {
        console.error("❌ Could not find a Database Connection String in environment variables.");
        console.log("   Checked: DATABASE_URL, SUPABASE_DB_URL, POSTGRES_URL, SUPABASE_POSTGRES_URL");
        console.log("   Available Keys (filtered):", Object.keys(process.env).filter(k => k.includes('URL') || k.includes('DB')));
        process.exit(1);
    }

    console.log("✅ Found Connection String.");

    const sql = postgres(dbUrl);

    try {
        const migrationSql = fs.readFileSync('supabase/migrations/20241211_enable_products_in_enquiry.sql', 'utf8');
        console.log("Executing SQL...");
        await sql.unsafe(migrationSql);
        console.log("✅ Migration applied successfully!");
    } catch (e) {
        console.error("❌ Migration failed:", e);
    } finally {
        await sql.end();
    }
}

run();
