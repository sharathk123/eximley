const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createSampleEnquiry() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        console.log('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Fetching company and user data...');

        const { data: companies, error: companyError } = await supabase
            .from('companies')
            .select('id, legal_name')
            .eq('status', 'active')
            .limit(1);

        if (companyError) throw companyError;
        if (!companies || companies.length === 0) {
            console.error('No active company found');
            process.exit(1);
        }

        const company = companies[0];
        console.log('Found company:', company.legal_name);

        const { data: users, error: userError } = await supabase
            .from('company_users')
            .select('user_id')
            .eq('company_id', company.id)
            .limit(1);

        if (userError) throw userError;
        if (!users || users.length === 0) {
            console.error('No users found for this company');
            process.exit(1);
        }

        const userId = users[0].user_id;
        console.log('Found user:', userId);

        let { data: buyers, error: buyerError } = await supabase
            .from('entities')
            .select('id, name')
            .eq('company_id', company.id)
            .eq('type', 'buyer')
            .limit(1);

        if (buyerError) throw buyerError;

        let buyer;
        if (!buyers || buyers.length === 0) {
            console.log('Creating sample buyer entity...');
            const { data: newBuyer, error: createBuyerError } = await supabase
                .from('entities')
                .insert({
                    company_id: company.id,
                    name: 'Global Trading Co.',
                    type: 'buyer',
                    email: 'contact@globaltrading.com',
                    phone: '+1-555-0123',
                    address: '123 Business Street, Suite 100',
                    country: 'United States'
                })
                .select()
                .single();

            if (createBuyerError) throw createBuyerError;
            buyer = newBuyer;
            console.log('Created buyer:', buyer.name);
        } else {
            buyer = buyers[0];
            console.log('Found existing buyer:', buyer.name);
        }

        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name')
            .eq('company_id', company.id)
            .limit(3);

        if (productsError) throw productsError;
        if (!products || products.length === 0) {
            console.error('No products found. Please create some products first');
            process.exit(1);
        }

        console.log('Found', products.length, 'products');

        const { data: existingEnquiries } = await supabase
            .from('enquiries')
            .select('enquiry_number')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(1);

        let enquiryNumber = 'ENQ-2024-001';
        if (existingEnquiries && existingEnquiries.length > 0) {
            const lastNumber = existingEnquiries[0].enquiry_number;
            const match = lastNumber.match(/ENQ-(\d{4})-(\d{3})/);
            if (match) {
                const year = new Date().getFullYear();
                const lastSeq = parseInt(match[2]);
                enquiryNumber = 'ENQ-' + year + '-' + String(lastSeq + 1).padStart(3, '0');
            }
        }

        console.log('Creating enquiry:', enquiryNumber);

        const { data: enquiry, error: enquiryError } = await supabase
            .from('enquiries')
            .insert({
                company_id: company.id,
                enquiry_number: enquiryNumber,
                entity_id: buyer.id,
                customer_name: 'John Smith',
                customer_email: 'john.smith@globaltrading.com',
                customer_phone: '+1-555-0123',
                customer_company: 'Global Trading Co.',
                customer_country: 'United States',
                source: 'email',
                subject: 'Bulk Order Inquiry for Export',
                description: 'We are interested in purchasing your products for export to the United States. Please provide a quotation for the items listed below.',
                status: 'new',
                priority: 'high',
                assigned_to: userId
            })
            .select()
            .single();

        if (enquiryError) throw enquiryError;
        console.log('Created enquiry:', enquiry.enquiry_number);

        console.log('Adding enquiry items...');

        const items = products.map((product, i) => ({
            enquiry_id: enquiry.id,
            product_id: product.id,
            quantity: (i + 1) * 100,
            target_price: 50 + (i * 10),
            notes: 'Sample item ' + (i + 1)
        }));

        const { error: itemsError } = await supabase
            .from('enquiry_items')
            .insert(items);

        if (itemsError) throw itemsError;

        products.forEach((product, i) => {
            console.log('  Added:', product.name, '(Qty:', (i + 1) * 100 + ')');
        });

        console.log('\nSample enquiry created successfully!');
        console.log('\nDetails:');
        console.log('   Enquiry Number:', enquiry.enquiry_number);
        console.log('   Customer: John Smith (Global Trading Co.)');
        console.log('   Items:', products.length);
        console.log('   Status: New');
        console.log('   Priority: High');
        console.log('\nYou can now:');
        console.log('   1. View this enquiry in the Enquiries page');
        console.log('   2. Click "Create Quote" to generate a quotation');
        console.log('   3. Generate and download the PDF');

    } catch (error) {
        console.error('Error creating enquiry:', error);
        throw error;
    }
}

createSampleEnquiry().catch(console.error);
