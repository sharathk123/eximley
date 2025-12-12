const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedBanks() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get the company for 'testuser_v1@example.com'
    const email = 'testuser_v1@example.com';
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    // Simple filter since listUsers returns paginated
    const user = users.users.find(u => u.email === email);

    if (!user) {
        console.error(`User ${email} not found.`);
        process.exit(1);
    }

    const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

    if (!companyUser) {
        console.error(`Company not found for user ${email}`);
        process.exit(1);
    }

    console.log(`Seeding bank for Company ID: ${companyUser.company_id}`);

    // 2. Insert Bank
    const bankData = {
        company_id: companyUser.company_id,
        bank_name: 'HDFC Bank',
        account_number: '50100234567890',
        // account_holder_name removed as it is not in migration
        branch_name: 'Mumbai Main Branch',
        ifsc_code: 'HDFC0000123',
        swift_code: 'HDFCINBB',
        currency: 'USD',
        is_default: true
    };

    const { data: bank, error: bankError } = await supabase
        .from('company_banks')
        .insert(bankData)
        .select()
        .single();

    if (bankError) {
        if (bankError.code === '42P01') {
            console.error('ERROR: Table "company_banks" does not exist. Please run the migration first.');
        } else {
            console.error('Error inserting bank:', bankError);
        }
    } else {
        console.log('Successfully seeded bank:', bank);
    }
}

seedBanks();
