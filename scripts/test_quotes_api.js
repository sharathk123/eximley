const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testQuotesAPI() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_SECRET;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    // Create client with anon key (like the frontend)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const userEmail = 'sharath.babuk@gmail.com';
        console.log('Testing quotes API for:', userEmail);
        console.log('='.repeat(60));

        // Sign in as user
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: 'Test@123' // You'll need to provide the actual password
        });

        if (authError) {
            console.error('Auth error:', authError.message);
            console.log('\nTrying with service role key instead...');

            // Use service role key
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const adminSupabase = createClient(supabaseUrl, serviceKey);

            // Get user
            const { data: users } = await adminSupabase.auth.admin.listUsers();
            const user = users.users.find(u => u.email === userEmail);

            if (!user) {
                console.error('User not found');
                process.exit(1);
            }

            console.log('\nUser ID:', user.id);

            // Get company
            const { data: companyUsers } = await adminSupabase
                .from('company_users')
                .select('company_id')
                .eq('user_id', user.id)
                .single();

            const companyId = companyUsers.company_id;
            console.log('Company ID:', companyId);

            // Test quotes query with service role
            console.log('\n' + '='.repeat(60));
            console.log('Testing with SERVICE ROLE KEY:');
            console.log('='.repeat(60));

            const { data: quotes, error: quotesError } = await adminSupabase
                .from('quotes')
                .select('*')
                .eq('company_id', companyId);

            if (quotesError) {
                console.error('Error fetching quotes:', quotesError);
            } else {
                console.log(`Found ${quotes.length} quotes`);
                quotes.forEach(q => {
                    console.log(`- ${q.quote_number}: ${q.status} (${q.currency_code} ${q.total_amount})`);
                });
            }

            // Check RLS policies
            console.log('\n' + '='.repeat(60));
            console.log('CHECKING RLS POLICIES:');
            console.log('='.repeat(60));

            const { data: policies, error: policiesError } = await adminSupabase
                .from('pg_policies')
                .select('*')
                .eq('tablename', 'quotes');

            if (!policiesError && policies) {
                console.log(`Found ${policies.length} RLS policies for quotes table`);
                policies.forEach(p => {
                    console.log(`- ${p.policyname}: ${p.cmd} (${p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
                });
            } else {
                console.log('Could not fetch RLS policies');
            }

            return;
        }

        console.log('Authenticated successfully');
        console.log('User ID:', authData.user.id);

        // Get company
        const { data: companyUsers } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', authData.user.id)
            .single();

        console.log('Company ID:', companyUsers.company_id);

        // Test quotes query
        console.log('\n' + '='.repeat(60));
        console.log('Testing with USER SESSION:');
        console.log('='.repeat(60));

        const { data: quotes, error: quotesError } = await supabase
            .from('quotes')
            .select('*')
            .eq('company_id', companyUsers.company_id);

        if (quotesError) {
            console.error('Error fetching quotes:', quotesError);
        } else {
            console.log(`Found ${quotes.length} quotes`);
            quotes.forEach(q => {
                console.log(`- ${q.quote_number}: ${q.status}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testQuotesAPI().catch(console.error);
