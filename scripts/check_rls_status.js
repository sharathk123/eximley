const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkRLSStatus() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('='.repeat(70));
        console.log('CHECKING RLS STATUS FOR QUOTES TABLE');
        console.log('='.repeat(70));

        // Check if RLS is enabled
        const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
            sql: `
                SELECT 
                    schemaname,
                    tablename,
                    rowsecurity
                FROM pg_tables
                WHERE tablename IN ('quotes', 'quote_items', 'company_users')
                ORDER BY tablename;
            `
        });

        if (rlsError) {
            console.log('RLS check failed, trying alternative method...');

            // Alternative: Check policies directly
            const { data: policies, error: policiesError } = await supabase
                .from('pg_policies')
                .select('*')
                .in('tablename', ['quotes', 'quote_items']);

            if (policiesError) {
                console.error('Error checking policies:', policiesError);
            } else {
                console.log('\nPolicies found:', policies);
            }
        } else {
            console.log('\nRLS Status:', rlsStatus);
        }

        // Check company_users for the test user
        console.log('\n' + '='.repeat(70));
        console.log('CHECKING COMPANY_USERS FOR TEST USER');
        console.log('='.repeat(70));

        const { data: users, error: usersError } = await supabase
            .from('auth.users')
            .select('id, email')
            .eq('email', 'sharath.babuk@gmail.com');

        if (usersError) {
            console.log('Cannot query auth.users directly, checking company_users...');
        } else {
            console.log('User found:', users);
        }

        // Get all company_users
        const { data: companyUsers, error: cuError } = await supabase
            .from('company_users')
            .select('*');

        if (cuError) {
            console.error('Error fetching company_users:', cuError);
        } else {
            console.log('\nAll company_users:');
            companyUsers.forEach(cu => {
                console.log(`  User ID: ${cu.user_id.substring(0, 12)}...`);
                console.log(`  Company ID: ${cu.company_id}`);
                console.log(`  Role: ${cu.role}`);
                console.log('  ---');
            });
        }

        // Try to fetch quotes with RLS bypassed (using service role)
        console.log('\n' + '='.repeat(70));
        console.log('FETCHING QUOTES (SERVICE ROLE - RLS BYPASSED)');
        console.log('='.repeat(70));

        const { data: quotes, error: quotesError } = await supabase
            .from('quotes')
            .select(`
                id,
                quote_number,
                company_id,
                buyer_id,
                status,
                entities (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (quotesError) {
            console.error('Error fetching quotes:', quotesError);
        } else {
            console.log(`\nFound ${quotes.length} quotes:`);
            quotes.forEach(q => {
                console.log(`  ${q.quote_number} - Company: ${q.company_id.substring(0, 12)}... - Buyer: ${q.entities?.name || 'N/A'}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

checkRLSStatus().catch(console.error);
