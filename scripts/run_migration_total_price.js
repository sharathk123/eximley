const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    // Parse Supabase connection details
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Extract project reference from URL
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

    // Construct direct database URL
    // Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
    const dbHost = `db.${projectRef}.supabase.co`;
    const dbUrl = `postgresql://postgres.${projectRef}:${supabaseServiceKey}@${dbHost}:6543/postgres`;

    console.log('='.repeat(70));
    console.log('RUNNING MIGRATION: Add total_price to quote_items');
    console.log('='.repeat(70));
    console.log(`\nConnecting to: ${dbHost}`);

    const migrationSQL = `
ALTER TABLE public.quote_items 
ADD COLUMN IF NOT EXISTS total_price NUMERIC GENERATED ALWAYS AS (
    quantity * unit_price * (1 - discount_percent/100) * (1 + tax_percent/100)
) STORED;
`;

    try {
        const sql = postgres(dbUrl, {
            ssl: 'require',
            max: 1
        });

        console.log('\n✅ Connected to database');
        console.log('\nExecuting migration...');
        console.log(migrationSQL);

        await sql.unsafe(migrationSQL);

        console.log('\n✅ Migration executed successfully!');

        // Verify the column
        const result = await sql`
            SELECT column_name, data_type, is_generated, generation_expression
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'quote_items'
            AND column_name = 'total_price'
        `;

        if (result.length > 0) {
            console.log('\n✅ Column verified:');
            console.log(result[0]);
        }

        // Test with actual data
        const testData = await sql`
            SELECT id, quantity, unit_price, discount_percent, tax_percent, line_total, total_price
            FROM quote_items
            LIMIT 3
        `;

        if (testData.length > 0) {
            console.log('\n✅ Sample data with new column:');
            testData.forEach((row, idx) => {
                console.log(`\n${idx + 1}. Qty: ${row.quantity}, Price: ${row.unit_price}, Discount: ${row.discount_percent}%, Tax: ${row.tax_percent}%`);
                console.log(`   Line Total: ${row.line_total}, Total Price: ${row.total_price}`);
            });
        }

        await sql.end();
        console.log('\n' + '='.repeat(70));
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration().catch(console.error);
