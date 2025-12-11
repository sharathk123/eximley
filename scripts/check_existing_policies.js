const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkExistingPolicies() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('='.repeat(70));
    console.log('CHECKING EXISTING RLS POLICIES');
    console.log('='.repeat(70));

    // Method 1: Direct query to pg_policies
    try {
        const { data, error } = await supabase
            .from('pg_policies')
            .select('*')
            .in('tablename', ['quotes', 'quote_items', 'enquiries', 'enquiry_items']);

        if (error) {
            console.log('Cannot query pg_policies directly:', error.message);
        } else if (data && data.length > 0) {
            console.log(`\n✅ Found ${data.length} policies:\n`);
            let currentTable = '';
            data.forEach(p => {
                if (p.tablename !== currentTable) {
                    console.log(`\n📋 ${p.tablename}:`);
                    currentTable = p.tablename;
                }
                console.log(`   - ${p.policyname} (${p.cmd})`);
            });
        } else {
            console.log('No policies found via pg_policies view');
        }
    } catch (e) {
        console.log('Error querying pg_policies:', e.message);
    }

    // Method 2: Check via information_schema
    console.log('\n' + '='.repeat(70));
    console.log('CHECKING RLS ENABLED STATUS');
    console.log('='.repeat(70));

    const tables = ['quotes', 'quote_items', 'enquiries', 'enquiry_items'];

    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(0);

        console.log(`\n${table}:`);
        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
            console.log(`   Code: ${error.code}`);
        } else {
            console.log(`   ✅ Accessible (RLS may be disabled or policies allow access)`);
        }
    }

    // Method 3: Try to query as if we're a user
    console.log('\n' + '='.repeat(70));
    console.log('TESTING ACTUAL DATA ACCESS');
    console.log('='.repeat(70));

    const userId = '3092ba63-2f7c-4f6e-a2e7-988fb71389ba';
    const companyId = '48750c5a-1c91-4672-8d09-bb95ad358efb';

    // Check quotes
    const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, quote_number, company_id')
        .eq('company_id', companyId);

    console.log(`\nQuotes for company ${companyId}:`);
    if (quotesError) {
        console.log(`   ❌ Error: ${quotesError.message}`);
    } else {
        console.log(`   ✅ Found ${quotes?.length || 0} quotes`);
        quotes?.forEach(q => console.log(`      - ${q.quote_number}`));
    }

    // Check enquiries
    const { data: enquiries, error: enquiriesError } = await supabase
        .from('enquiries')
        .select('id, enquiry_number, company_id')
        .eq('company_id', companyId);

    console.log(`\nEnquiries for company ${companyId}:`);
    if (enquiriesError) {
        console.log(`   ❌ Error: ${enquiriesError.message}`);
    } else {
        console.log(`   ✅ Found ${enquiries?.length || 0} enquiries`);
        enquiries?.forEach(e => console.log(`      - ${e.enquiry_number}`));
    }

    console.log('\n' + '='.repeat(70));
}

checkExistingPolicies().catch(console.error);
