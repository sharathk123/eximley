const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function inspectConstraints() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase.rpc('get_foreign_keys', { table_name: 'proforma_invoices' });

    // Since we can't easily run arbitrary SQL via client to check information_schema without a helper RPC or direct connection
    // and we failed to connect directly earlier. Use a different approach:
    // Try to insert a dummy record with a bank_id and see if it fails FK constraint? No, that's destructive.

    // Better: Try to just select using explicit linking syntax to see if that fixes the API error.
    // If that fails, we assume FK is missing and try to add it via a migration helper? No we can't run DDL.

    // Let's try to query internal Postgres info via RPC if available, or just fallback to the "Add FK" migration script re-run?
    // User already ran the migration. Maybe it failed?

    console.log("Checking if RPC exists...");
    const { error: rpcError } = await supabase.rpc('check_fk_exists');
    if (rpcError) console.log("RPC check_fk_exists not found (expected)");

    // Since we are limited to the JS client, and the user said "done" to running the migration...
    // Let's assume the column exists (the form relies on it).
    // Let's check if the column 'bank_id' actually exists on 'proforma_invoices'.

    const { data: cols, error: colError } = await supabase
        .from('proforma_invoices')
        .select('*')
        .limit(1);

    if (colError) {
        console.error('Error selecting:', colError);
        return;
    }

    console.log('Columns on proforma_invoices:', Object.keys(cols[0] || {}));

}

// Actually, I can use the 'postgres' library again, maybe I had the wrong port? 
// The user has 'npm run dev' running. 
// Let's try to infer if I can use the Supabase client to inspect constraints.
// No, standard client doesn't expose metadata easily.

// Plan B:
// 1. Check if 'bank_id' column exists.
// 2. Try to fetch with explicit relation syntax `company_banks!bank_id(*)`
// 3. If that works, update API.
// 4. If not, the FK is missing. I will provide a dedicated "Fix FK" SQL script for the user to run.

async function checkColumns() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: cols, error: colError } = await supabase
        .from('proforma_invoices')
        .select('*')
        .limit(1);

    if (colError) {
        console.error('Error selecting:', colError);
        return;
    }

    // If no rows, we can't see keys this way easily, but let's see.
    // If we have rows (we do, we have 7), we will see the keys.
    if (cols && cols.length > 0) {
        console.log('Columns found:', Object.keys(cols[0]));
        if (Object.keys(cols[0]).includes('bank_id')) {
            console.log('bank_id column EXISTS.');
        } else {
            console.log('bank_id column MISSING.');
        }
    } else {
        console.log('No rows found to inspect columns.');
    }
}

checkColumns();
