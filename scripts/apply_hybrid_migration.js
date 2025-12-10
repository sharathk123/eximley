
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function runMigration() {
    // Try multiple env vars
    const connectionString =
        process.env.DATABASE_URL ||
        process.env.SUPABASE_DB_URL ||
        process.env.POSTGRES_URL ||
        "postgresql://postgres:postgres@127.0.0.1:5432/postgres"; // Try 5432 first

    console.log('Using connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Mask password

    const sql = postgres(connectionString);

    try {
        const migrationPath = path.join(__dirname, '../supabase/migrations/20241210_fix_hsn_search_rpcs.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration: 20241210_fix_hsn_search_rpcs.sql');

        // We need to drop first because we are changing return type
        await sql`DROP FUNCTION IF EXISTS public.match_hsn_hybrid(vector, float, int, text)`;

        // Execute the file content
        await sql.unsafe(migrationSql);

        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await sql.end();
    }
}

runMigration();
