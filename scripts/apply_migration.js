
const postgres = require('postgres');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function run() {
    console.log("🚀 Applying Migration...");

    // Parse DB URL
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL; // Assuming standard env var names, but I verified .env.local usually has SUPABASE_URL. 
    // Wait, .env.local usually has API URL. I need the DB connection string.
    // I haven't seen DATABASE_URL in .env.local view yet.
    // If I don't have it, I might be blocked on direct SQL.
    // Let me check .env.local content again quickly.

    if (!dbUrl) {
        console.error("❌ DATABASE_URL or SUPABASE_DB_URL not found in env.");
        process.exit(1);
    }

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

// Actually, I need to check .env.local variables first.
// If I don't have the connection string, I CANNOT run this.
// I'll check .env.local content now.
