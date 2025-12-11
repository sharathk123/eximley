const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createTestQuotes() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        const userEmail = 'sharath.babuk@gmail.com';
        console.log('Creating test quotes for:', userEmail);
        console.log('='.repeat(60));

        // Get user
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === userEmail);

        if (!user) {
            console.error('User not found');
            process.exit(1);
        }

        console.log('User ID:', user.id);

        // Get company
        const { data: companyUsers, error: companyError } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        if (companyError) {
            console.error('Error fetching company:', companyError);
            process.exit(1);
        }

        const companyId = companyUsers.company_id;
        console.log('Company ID:', companyId);

        // Get or create a buyer entity
        let { data: buyers } = await supabase
            .from('entities')
            .select('*')
            .eq('company_id', companyId)
            .eq('type', 'buyer')
            .limit(1);

        let buyerId;
        if (!buyers || buyers.length === 0) {
            console.log('Creating test buyer...');
            const { data: newBuyer, error: buyerError } = await supabase
                .from('entities')
                .insert({
                    company_id: companyId,
                    type: 'buyer',
                    name: 'Test Buyer Inc.',
                    email: 'buyer@testcompany.com',
                    phone: '+1-555-0123',
                    address: '123 Business St, New York, NY 10001',
                    country: 'USA',
                    tax_id: 'TAX123456',
                    verification_status: 'unverified',
                    is_active: true
                })
                .select()
                .single();

            if (buyerError) {
                console.error('Error creating buyer:', buyerError);
                process.exit(1);
            }
            buyerId = newBuyer.id;
            console.log('Created buyer:', buyerId);
        } else {
            buyerId = buyers[0].id;
            console.log('Using existing buyer:', buyerId);
        }

        // Get or create enquiries
        let { data: enquiries } = await supabase
            .from('enquiries')
            .select('*')
            .eq('company_id', companyId)
            .limit(2);

        let enquiryIds = [];
        if (!enquiries || enquiries.length === 0) {
            console.log('Creating test enquiries...');
            const { data: newEnquiries, error: enquiryError } = await supabase
                .from('enquiries')
                .insert([
                    {
                        company_id: companyId,
                        buyer_id: buyerId,
                        enquiry_number: `ENQ-${Date.now()}-1`,
                        status: 'pending',
                        enquiry_date: new Date().toISOString(),
                        product_details: 'Test Product 1',
                        quantity: 100,
                        unit: 'pcs',
                        notes: 'Test enquiry for quote creation'
                    },
                    {
                        company_id: companyId,
                        buyer_id: buyerId,
                        enquiry_number: `ENQ-${Date.now()}-2`,
                        status: 'pending',
                        enquiry_date: new Date().toISOString(),
                        product_details: 'Test Product 2',
                        quantity: 200,
                        unit: 'pcs',
                        notes: 'Another test enquiry'
                    }
                ])
                .select();

            if (enquiryError) {
                console.error('Error creating enquiries:', enquiryError);
                process.exit(1);
            }
            enquiryIds = newEnquiries.map(e => e.id);
            console.log('Created enquiries:', enquiryIds);
        } else {
            enquiryIds = enquiries.map(e => e.id);
            console.log('Using existing enquiries:', enquiryIds);
        }

        // Create test quotes
        console.log('\n' + '='.repeat(60));
        console.log('Creating test quotes...');
        console.log('='.repeat(60));

        const quotesToCreate = [
            {
                company_id: companyId,
                enquiry_id: enquiryIds[0],
                buyer_id: buyerId,
                quote_number: `QT-${Date.now()}-001`,
                quote_date: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'draft',
                currency_code: 'USD',
                subtotal: 5000.00,
                tax_amount: 500.00,
                total_amount: 5500.00,
                payment_terms: 'Net 30 days',
                delivery_terms: 'FOB',
                incoterms: 'FOB',
                notes: 'Test quote - Draft status'
            },
            {
                company_id: companyId,
                enquiry_id: enquiryIds[1] || enquiryIds[0],
                buyer_id: buyerId,
                quote_number: `QT-${Date.now()}-002`,
                quote_date: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'sent',
                currency_code: 'USD',
                subtotal: 10000.00,
                tax_amount: 1000.00,
                total_amount: 11000.00,
                payment_terms: 'Net 30 days',
                delivery_terms: 'CIF',
                incoterms: 'CIF',
                notes: 'Test quote - Sent status'
            },
            {
                company_id: companyId,
                enquiry_id: enquiryIds[0],
                buyer_id: buyerId,
                quote_number: `QT-${Date.now()}-003`,
                quote_date: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'accepted',
                currency_code: 'EUR',
                subtotal: 7500.00,
                tax_amount: 750.00,
                total_amount: 8250.00,
                payment_terms: 'Net 45 days',
                delivery_terms: 'DDP',
                incoterms: 'DDP',
                notes: 'Test quote - Accepted status'
            }
        ];

        const { data: createdQuotes, error: quotesError } = await supabase
            .from('quotes')
            .insert(quotesToCreate)
            .select();

        if (quotesError) {
            console.error('Error creating quotes:', quotesError);
            process.exit(1);
        }

        console.log(`\nSuccessfully created ${createdQuotes.length} quotes:`);
        createdQuotes.forEach(q => {
            console.log(`- ${q.quote_number}: ${q.status} (${q.currency_code} ${q.total_amount})`);
        });

        // Create quote items for each quote
        console.log('\n' + '='.repeat(60));
        console.log('Creating quote items...');
        console.log('='.repeat(60));

        for (const quote of createdQuotes) {
            const items = [
                {
                    quote_id: quote.id,
                    product_name: 'Sample Product A',
                    description: 'High quality product A',
                    quantity: 50,
                    unit_price: 80.00,
                    discount_percent: 0,
                    tax_percent: 10
                },
                {
                    quote_id: quote.id,
                    product_name: 'Sample Product B',
                    description: 'Premium product B',
                    quantity: 25,
                    unit_price: 40.00,
                    discount_percent: 0,
                    tax_percent: 10
                }
            ];

            const { data: createdItems, error: itemsError } = await supabase
                .from('quote_items')
                .insert(items)
                .select();

            if (itemsError) {
                console.error(`Error creating items for quote ${quote.quote_number}:`, itemsError);
            } else {
                console.log(`Created ${createdItems.length} items for quote ${quote.quote_number}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test data creation complete!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestQuotes().catch(console.error);
