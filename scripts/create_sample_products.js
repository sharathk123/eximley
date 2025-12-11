const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createSampleProducts() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Fetching company...');

        const { data: companies } = await supabase
            .from('companies')
            .select('id')
            .eq('status', 'active')
            .limit(1);

        if (!companies || companies.length === 0) {
            console.error('No active company found');
            process.exit(1);
        }

        const companyId = companies[0].id;

        const products = [
            { name: 'Cotton T-Shirts', description: 'Premium quality cotton t-shirts', category: 'Apparel' },
            { name: 'Leather Wallets', description: 'Genuine leather wallets', category: 'Accessories' },
            { name: 'Ceramic Mugs', description: 'Handcrafted ceramic mugs', category: 'Home & Kitchen' },
            { name: 'Spice Mix', description: 'Authentic Indian spice blend', category: 'Food & Beverages' },
            { name: 'Wooden Handicrafts', description: 'Traditional wooden crafts', category: 'Handicrafts' }
        ];

        console.log('Creating', products.length, 'sample products...');

        const productsToInsert = products.map(p => ({
            company_id: companyId,
            name: p.name,
            description: p.description,
            category: p.category
        }));

        const { data, error } = await supabase
            .from('products')
            .insert(productsToInsert)
            .select();

        if (error) throw error;

        console.log('Created', data.length, 'products successfully!');
        data.forEach(p => {
            console.log('  -', p.name);
        });

        console.log('\nYou can now run: node scripts/create_sample_enquiry.js');

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

createSampleProducts().catch(console.error);
