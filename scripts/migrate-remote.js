require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connectionString = process.env.DATABASE_URL; // Using Session Pooler or direct connection
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not defined in .env.local');
        process.exit(1);
    }

    console.log('🔌 Connecting to remote database...');
    const sql = postgres(connectionString, {
        ssl: { rejectUnauthorized: false }, // Often needed for Supabase from local
        max: 1
    });

    try {
        console.log('📂 Reading migration file...');
        const migrationPath = path.join(__dirname, '../supabase/migrations/20251212050000_add_quote_shipping_fields.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 Executing migration...');
        // Split statements if necessary or run as one block
        await sql.unsafe(migrationSql);

        console.log('✅ Migration applied successfully!');
        console.log('   - Added shipping fields to quotes table.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sql.end();
    }
}

runMigration();
