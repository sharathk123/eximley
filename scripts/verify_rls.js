const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyRLSPolicies() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Checking RLS policies for quotes table...\n');

        // Check if policies exist
        const { data: policies, error } = await supabase
            .rpc('exec_sql', {
                sql: `
                    SELECT 
                        schemaname,
                        tablename,
                        policyname,
                        permissive,
                        roles,
                        cmd,
                        qual,
                        with_check
                    FROM pg_policies 
                    WHERE tablename IN ('quotes', 'quote_items', 'enquiries', 'enquiry_items')
                    ORDER BY tablename, policyname;
                `
            });

        if (error) {
            console.log('Could not fetch via RPC, trying direct query...\n');

            // Alternative: Check table RLS status
            const { data: tables } = await supabase
                .from('pg_tables')
                .select('*')
                .in('tablename', ['quotes', 'quote_items', 'enquiries', 'enquiry_items']);

            console.log('Tables found:', tables?.map(t => t.tablename));
        } else {
            console.log('Policies found:', policies);
        }

        // Test actual data access
        console.log('\n' + '='.repeat(60));
        console.log('Testing data access with service role:');
        console.log('='.repeat(60));

        const { data: quotes } = await supabase
            .from('quotes')
            .select('id, quote_number, company_id')
            .limit(5);

        console.log('\nQuotes (service role):', quotes?.length || 0);
        quotes?.forEach(q => console.log(`  - ${q.quote_number} (company: ${q.company_id.substring(0, 8)}...)`));

        const { data: enquiries } = await supabase
            .from('enquiries')
            .select('id, enquiry_number, company_id')
            .limit(5);

        console.log('\nEnquiries (service role):', enquiries?.length || 0);
        enquiries?.forEach(e => console.log(`  - ${e.enquiry_number} (company: ${e.company_id.substring(0, 8)}...)`));

        // Check if RLS is enabled
        console.log('\n' + '='.repeat(60));
        console.log('Checking RLS status:');
        console.log('='.repeat(60));

        const tables = ['quotes', 'quote_items', 'enquiries', 'enquiry_items'];
        for (const table of tables) {
            const { data, error } = await supabase
                .rpc('exec_sql', {
                    sql: `
                        SELECT relrowsecurity as rls_enabled
                        FROM pg_class
                        WHERE relname = '${table}';
                    `
                });

            if (!error && data) {
                console.log(`${table}: RLS ${data[0]?.rls_enabled ? 'ENABLED' : 'DISABLED'}`);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyRLSPolicies().catch(console.error);
