const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testUserRLS() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_ANON_SECRET;

    if (!supabaseUrl) {
        console.error('Missing SUPABASE_URL');
        process.exit(1);
    }
    if (!anonKey) {
        console.error('Missing ANON KEY (tried NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_KEY)');
        console.log('Available Env Vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, anonKey);

    // 1. Sign In
    const email = 'testuser_v1@example.com';
    const password = 'NewPass123!';

    console.log(`Attempting login as ${email}...`);
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error('Login Failed:', loginError.message);
        process.exit(1);
    }
    console.log('Login Successful. User ID:', session.user.id);

    // 2. Fetch PIs
    console.log('Fetching Proforma Invoices via RLS...');
    const { data: pis, error: fetchError } = await supabase
        .from('proforma_invoices')
        .select('id, invoice_number, company_id, status');

    if (fetchError) {
        console.error('Fetch Failed:', fetchError.message);
    } else {
        console.log(`Fetched ${pis.length} Invoices:`);
        pis.forEach(p => console.log(`- ${p.invoice_number} (${p.status})`));
    }
}

testUserRLS();
