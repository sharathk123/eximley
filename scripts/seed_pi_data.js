const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedPIData() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const TEST_USER = {
        email: 'testuser_v1@example.com',
        password: 'NewPass123!',
        full_name: 'Test User V1'
    };

    try {
        console.log(`Checking user: ${TEST_USER.email}...`);

        // 1. Get or Create User
        let userId;
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === TEST_USER.email);

        if (existingUser) {
            console.log('User already exists.');
            userId = existingUser.id;
        } else {
            console.log('Creating new user...');
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: TEST_USER.email,
                password: TEST_USER.password,
                email_confirm: true,
                user_metadata: { full_name: TEST_USER.full_name }
            });
            if (createError) throw createError;
            userId = newUser.user.id;
            console.log('User created successfully.');
        }

        // 2. Ensure Company & Link
        console.log('Checking company association...');
        let companyId;
        const { data: companyUser, error: cuError } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', userId)
            .single();

        if (companyUser) {
            companyId = companyUser.company_id;
            console.log('User linked to company:', companyId);
        } else {
            console.log('No company found. Creating new company...');
            const { data: newCompany, error: coError } = await supabase
                .from('companies')
                .insert({
                    legal_name: 'Test Setup Company',
                    email: TEST_USER.email,
                    status: 'active'
                })
                .select()
                .single();

            if (coError) throw coError;
            companyId = newCompany.id;

            // Link user
            await supabase.from('company_users').insert({
                company_id: companyId,
                user_id: userId,
                role: 'owner'
            });
            console.log('Created company and linked user.');
        }

        // 3. Ensure Buyer Entity
        console.log('Ensuring Buyer entity...');
        let buyerId;
        const { data: buyers } = await supabase
            .from('entities')
            .select('id')
            .eq('company_id', companyId)
            .eq('type', 'buyer')
            .limit(1);

        if (buyers && buyers.length > 0) {
            buyerId = buyers[0].id;
        } else {
            const { data: newBuyer, error: buyerError } = await supabase
                .from('entities')
                .insert({
                    company_id: companyId,
                    type: 'buyer',
                    name: 'Global Imports LLC',
                    email: 'purchasing@globalimports.example.com',
                    country: 'USA'
                })
                .select()
                .single();
            if (buyerError) throw buyerError;
            buyerId = newBuyer.id;
            console.log('Created new Buyer entity.');
        }

        // 4. Create SKUs if needed (Optional, but good for joins)
        // Check for SKUs
        let skuId;
        const { data: skus } = await supabase.from('skus').select('id').eq('company_id', companyId).limit(1);
        if (skus && skus.length > 0) {
            skuId = skus[0].id;
        } else {
            // Need a product first
            const { data: product } = await supabase.from('products').insert({
                company_id: companyId,
                name: 'Test Widget',
                hsn_code: '1234'
            }).select().single();

            const { data: newSku } = await supabase.from('skus').insert({
                company_id: companyId,
                product_id: product.id,
                sku_code: 'WID-001',
                name: 'Widget Standard',
                base_price: 100
            }).select().single();
            skuId = newSku.id;
        }


        // 5. Create Proforma Invoices
        console.log('Seeding Proforma Invoices...');
        const pis = [
            {
                company_id: companyId,
                buyer_id: buyerId,
                invoice_number: `PI-${Date.now()}-01`,
                date: new Date().toISOString(),
                valid_until: new Date(Date.now() + 86400000 * 30).toISOString(), // +30 days
                currency_code: 'USD',
                total_amount: 1500,
                status: 'draft'
            },
            {
                company_id: companyId,
                buyer_id: buyerId,
                invoice_number: `PI-${Date.now()}-02`,
                date: new Date().toISOString(),
                valid_until: new Date(Date.now() + 86400000 * 15).toISOString(),
                currency_code: 'EUR',
                total_amount: 2500,
                status: 'sent'
            }
        ];

        const { data: createdPis, error: piError } = await supabase
            .from('proforma_invoices')
            .insert(pis)
            .select();

        if (piError) throw piError;

        console.log(`Created ${createdPis.length} Proforma Invoices.`);

        // 6. Create Items
        for (const pi of createdPis) {
            await supabase.from('proforma_items').insert({
                invoice_id: pi.id,
                sku_id: skuId,
                description: 'Standard Widget Item',
                quantity: 10,
                unit_price: pi.total_amount / 10
            });
        }
        console.log('Added items to PIs.');

        console.log('\nSUCCESS! Seeded data for testuser_v1@example.com');

    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
}

seedPIData();
