const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkUserAuth() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_SECRET;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Create service role client
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log('='.repeat(70));
        console.log('CHECKING USER: sharath.babuk@gmail.com');
        console.log('='.repeat(70));

        // Sign in as the user
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: 'sharath.babuk@gmail.com',
            password: 'pass1234'
        });

        if (authError) {
            console.error('Login failed:', authError);
            return;
        }

        console.log('\n✅ Login successful!');
        console.log('User ID:', authData.user.id);
        console.log('Email:', authData.user.email);

        // Check company_users for this user
        const { data: companyUser, error: cuError } = await supabaseService
            .from('company_users')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

        if (cuError) {
            console.error('\n❌ Error fetching company_users:', cuError);
            console.log('\nThis user is NOT in company_users table!');
            console.log('This is why quotes are not visible - RLS policies require user to be in company_users');
            return;
        }

        console.log('\n✅ Company User found:');
        console.log('  User ID:', companyUser.user_id);
        console.log('  Company ID:', companyUser.company_id);
        console.log('  Role:', companyUser.role);

        // Check if there are quotes for this company
        const { data: quotes, error: quotesError } = await supabaseService
            .from('quotes')
            .select('id, quote_number, company_id')
            .eq('company_id', companyUser.company_id);

        if (quotesError) {
            console.error('\n❌ Error fetching quotes:', quotesError);
        } else {
            console.log(`\n✅ Found ${quotes.length} quotes for this company:`);
            quotes.forEach(q => {
                console.log(`  - ${q.quote_number}`);
            });
        }

        // Now test with RLS (as the authenticated user)
        console.log('\n' + '='.repeat(70));
        console.log('TESTING WITH RLS (AS AUTHENTICATED USER)');
        console.log('='.repeat(70));

        const { data: quotesWithRLS, error: rlsError } = await supabaseClient
            .from('quotes')
            .select(`
                *,
                entities (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (rlsError) {
            console.error('\n❌ RLS Query Error:', rlsError);
        } else {
            console.log(`\n✅ RLS Query successful! Found ${quotesWithRLS.length} quotes`);
            if (quotesWithRLS.length === 0) {
                console.log('\n⚠️  RLS is blocking access to quotes!');
                console.log('This means the RLS policies are not working correctly.');
            } else {
                quotesWithRLS.forEach(q => {
                    console.log(`  - ${q.quote_number}`);
                });
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

checkUserAuth().catch(console.error);
