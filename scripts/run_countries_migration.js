const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: '.env' });
}

async function applyMigration() {
    // Attempt to read DATABASE_URL from process or file
    let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DIRECT_URL || process.env.SUPABASE_DB_URL;

    // Debug: print keys containing URL/DB (masked)
    const envKeys = Object.keys(process.env).filter(k => k.includes('URL') || k.includes('DB'));
    console.log("Available ENV keys with URL/DB:", envKeys);

    if (!dbUrl) {
        // Fallback: search in both .env.local and .env
        try {
            const filesToCheck = ['.env.local', '.env'];
            for (const file of filesToCheck) {
                if (fs.existsSync(file)) {
                    console.log(`Checking ${file}...`);
                    const content = fs.readFileSync(file, 'utf8');
                    const match = content.match(/^\s*(?:DATABASE_URL|POSTGRES_URL|SUPABASE_DB_URL|DIRECT_URL)\s*=\s*(.*)$/m);
                    if (match) {
                        dbUrl = match[1].replace(/["']/g, '').trim();
                        console.log(`Found URL in ${file}`);
                        break;
                    }
                }
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
    const migrationPath = path.join(__dirname, '../supabase/migrations/20241211142000_add_countries_table.sql');
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
