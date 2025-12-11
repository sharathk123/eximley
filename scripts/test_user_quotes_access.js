const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testQuotesAsUser() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_SECRET; // Using the correct key name from .env.local

    console.log('='.repeat(70));
    console.log('TESTING QUOTES ACCESS AS AUTHENTICATED USER');
    console.log('='.repeat(70));
    console.log('Supabase URL:', supabaseUrl);
    console.log('Using Anon Key:', supabaseAnonKey ? 'Found ✅' : 'Missing ❌');
    console.log('='.repeat(70));

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Sign in as the user
    console.log('\n🔐 Step 1: Signing in as sharath.babuk@gmail.com...');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'sharath.babuk@gmail.com',
        password: 'Sharath@123' // You'll need to provide the correct password
    });

    if (authError) {
        console.log('❌ Sign in failed:', authError.message);
        console.log('\n💡 To test properly, please provide the correct password.');
        console.log('   Or create a test script that uses the service role to set a known password.');
        return;
    }

    console.log('✅ Signed in successfully!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);

    // Get company association
    console.log('\n👥 Step 2: Getting company association...');
    const { data: companyUser, error: companyError } = await supabase
        .from('company_users')
        .select('company_id, role, companies(legal_name)')
        .eq('user_id', authData.user.id)
        .single();

    if (companyError) {
        console.log('❌ Error getting company:', companyError.message);
        await supabase.auth.signOut();
        return;
    }

    console.log('✅ Company found:');
    console.log('   Company ID:', companyUser.company_id);
    console.log('   Company Name:', companyUser.companies.legal_name);
    console.log('   Your Role:', companyUser.role);

    // Fetch quotes
    console.log('\n📋 Step 3: Fetching quotes...');
    const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
            id,
            quote_number,
            company_id,
            buyer_id,
            quote_date,
            total_amount,
            currency_code,
            status,
            entities (
                name,
                country
            ),
            quote_items (
                id,
                product_name,
                description,
                quantity,
                unit_price
            )
        `)
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

    if (quotesError) {
        console.log('❌ Error fetching quotes:', quotesError.message);
        console.log('   Code:', quotesError.code);
        console.log('   Details:', quotesError.details);
        console.log('   Hint:', quotesError.hint);
    } else {
        console.log(`✅ Successfully fetched ${quotes?.length || 0} quotes!`);

        if (quotes && quotes.length > 0) {
            console.log('\n📊 Quotes Details:');
            quotes.forEach((quote, idx) => {
                console.log(`\n${idx + 1}. ${quote.quote_number}`);
                console.log(`   Status: ${quote.status}`);
                console.log(`   Amount: ${quote.currency_code} ${quote.total_amount}`);
                console.log(`   Date: ${quote.quote_date}`);
                console.log(`   Buyer: ${quote.entities?.name || 'N/A'} (${quote.entities?.country || 'N/A'})`);
                console.log(`   Items: ${quote.quote_items?.length || 0}`);
                if (quote.quote_items && quote.quote_items.length > 0) {
                    quote.quote_items.forEach((item, i) => {
                        console.log(`      ${i + 1}. ${item.product_name || item.description || 'N/A'} - Qty: ${item.quantity}, Price: ${item.unit_price}`);
                    });
                }
            });
        } else {
            console.log('\n⚠️  No quotes found for your company.');
            console.log('   This could mean:');
            console.log('   - RLS policies are blocking access');
            console.log('   - No quotes exist for this company');
            console.log('   - There is a data mismatch');
        }
    }

    // Fetch enquiries
    console.log('\n\n📨 Step 4: Fetching enquiries...');
    const { data: enquiries, error: enquiriesError } = await supabase
        .from('enquiries')
        .select('id, enquiry_number, customer_name, status')
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

    if (enquiriesError) {
        console.log('❌ Error fetching enquiries:', enquiriesError.message);
    } else {
        console.log(`✅ Successfully fetched ${enquiries?.length || 0} enquiries!`);
        if (enquiries && enquiries.length > 0) {
            enquiries.forEach((enq, idx) => {
                console.log(`   ${idx + 1}. ${enq.enquiry_number} - ${enq.customer_name} (${enq.status})`);
            });
        }
    }

    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Signed out successfully');

    console.log('\n' + '='.repeat(70));
    console.log('TEST COMPLETE');
    console.log('='.repeat(70));
}

testQuotesAsUser().catch(console.error);
