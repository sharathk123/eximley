
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
// Try loading .env if .env.local didn't provide keys
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: '.env' });
}

async function applyMigration() {
    const postgres = require('postgres');

    // Attempt to read DATABASE_URL from process or file
    let dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        try {
            const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const envConfig = require('dotenv').parse(envContent);
                dbUrl = envConfig.DATABASE_URL;
            }
        } catch (e) {
            console.error("Failed to read env files", e);
        }
    }

    if (!dbUrl) {
        console.error("DATABASE_URL not found. Cannot run migration.");
        process.exit(1);
    }

    const sql = postgres(dbUrl);
    const migrationPath = path.join(__dirname, '../supabase/migrations/20241211165500_add_product_price.sql');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');

    try {
        console.log("Applying migration...");
        await sql.unsafe(migrationContent);
        console.log("Migration applied successfully!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await sql.end();
    }
}

applyMigration();
