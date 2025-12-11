const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkUserQuotesAccess() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // User credentials
    const userEmail = 'sharath.babuk@gmail.com';
    const userId = '3092ba63-2f7c-4f6e-a2e7-988fb71389ba';
    const companyId = '48750c5a-1c91-4672-8d09-bb95ad358efb';

    console.log('='.repeat(70));
    console.log('CHECKING USER ACCESS TO QUOTES');
    console.log('='.repeat(70));
    console.log(`User: ${userEmail}`);
    console.log(`User ID: ${userId}`);
    console.log(`Company: Evo Eximora`);
    console.log(`Company ID: ${companyId}`);
    console.log('='.repeat(70));

    // Test 1: Service Role (bypasses RLS)
    console.log('\n📋 Test 1: Service Role Access (bypasses RLS)');
    console.log('─'.repeat(70));
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: serviceQuotes, error: serviceError } = await serviceClient
        .from('quotes')
        .select('id, quote_number, company_id, status, total_amount')
        .eq('company_id', companyId);

    if (serviceError) {
        console.log('❌ Error:', serviceError.message);
    } else {
        console.log(`✅ Found ${serviceQuotes?.length || 0} quotes`);
        serviceQuotes?.forEach(q => {
            console.log(`   - ${q.quote_number}: $${q.total_amount} (${q.status})`);
        });
    }

    // Test 2: Check if RLS is enabled
    console.log('\n🔒 Test 2: Checking RLS Status');
    console.log('─'.repeat(70));
    const { data: rlsStatus } = await serviceClient
        .rpc('exec_sql', {
            sql: `
                SELECT 
                    tablename,
                    relrowsecurity as rls_enabled
                FROM pg_class c
                JOIN pg_tables t ON c.relname = t.tablename
                WHERE t.schemaname = 'public' 
                AND t.tablename IN ('quotes', 'quote_items', 'enquiries', 'enquiry_items')
                ORDER BY tablename;
            `
        });

    if (rlsStatus) {
        rlsStatus.forEach(table => {
            const status = table.rls_enabled ? '✅ ENABLED' : '❌ DISABLED';
            console.log(`   ${table.tablename}: ${status}`);
        });
    }

    // Test 3: Check RLS policies
    console.log('\n📜 Test 3: Checking RLS Policies');
    console.log('─'.repeat(70));
    const { data: policies } = await serviceClient
        .rpc('exec_sql', {
            sql: `
                SELECT 
                    tablename,
                    policyname,
                    cmd as operation
                FROM pg_policies 
                WHERE schemaname = 'public'
                AND tablename IN ('quotes', 'quote_items', 'enquiries', 'enquiry_items')
                ORDER BY tablename, policyname;
            `
        });

    if (policies && policies.length > 0) {
        let currentTable = '';
        policies.forEach(p => {
            if (p.tablename !== currentTable) {
                console.log(`\n   ${p.tablename}:`);
                currentTable = p.tablename;
            }
            console.log(`      - ${p.policyname} (${p.operation})`);
        });
    } else {
        console.log('   ⚠️  No RLS policies found!');
    }

    // Test 4: Anon client (simulates user login - respects RLS)
    console.log('\n\n👤 Test 4: User Access via Anon Client (respects RLS)');
    console.log('─'.repeat(70));
    console.log('Note: This simulates what the frontend would see');

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try to sign in
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
        email: userEmail,
        password: 'test123' // You'll need to provide the actual password
    });

    if (authError) {
        console.log('⚠️  Could not sign in (need password):', authError.message);
        console.log('   Skipping authenticated user test...');
    } else {
        console.log('✅ Signed in successfully');

        const { data: userQuotes, error: userError } = await anonClient
            .from('quotes')
            .select('id, quote_number, company_id, status, total_amount');

        if (userError) {
            console.log('❌ Error fetching quotes:', userError.message);
        } else {
            console.log(`✅ User can see ${userQuotes?.length || 0} quotes`);
            userQuotes?.forEach(q => {
                console.log(`   - ${q.quote_number}: $${q.total_amount} (${q.status})`);
            });
        }

        await anonClient.auth.signOut();
    }

    // Test 5: Check company_users mapping
    console.log('\n\n🔗 Test 5: User-Company Mapping');
    console.log('─'.repeat(70));
    const { data: companyUsers } = await serviceClient
        .from('company_users')
        .select('user_id, company_id, role')
        .eq('user_id', userId);

    if (companyUsers && companyUsers.length > 0) {
        console.log('✅ User is properly linked to company:');
        companyUsers.forEach(cu => {
            console.log(`   User: ${cu.user_id}`);
            console.log(`   Company: ${cu.company_id}`);
            console.log(`   Role: ${cu.role}`);
        });
    } else {
        console.log('❌ User is NOT linked to any company!');
        console.log('   This is why quotes are not visible.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSIS COMPLETE');
    console.log('='.repeat(70));
}

checkUserQuotesAccess().catch(console.error);
