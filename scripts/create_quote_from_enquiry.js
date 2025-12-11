const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createQuoteFromEnquiry() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const userEmail = 'sharath.babuk@gmail.com';
        console.log('Finding user:', userEmail);

        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === userEmail);

        if (!user) {
            console.error('User not found');
            process.exit(1);
        }

        const { data: companyUsers } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        const companyId = companyUsers.company_id;
        console.log('Company ID:', companyId);

        // Get the enquiry
        const { data: enquiry } = await supabase
            .from('enquiries')
            .select('*, enquiry_items(*, products(*))')
            .eq('company_id', companyId)
            .eq('enquiry_number', 'ENQ-2024-001')
            .single();

        if (!enquiry) {
            console.error('Enquiry not found');
            process.exit(1);
        }

        console.log('Found enquiry:', enquiry.enquiry_number);
        console.log('Items:', enquiry.enquiry_items.length);

        // Generate quote number
        const { data: existingQuotes } = await supabase
            .from('quotes')
            .select('quote_number')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(1);

        let quoteNumber = 'QT-2024-001';
        if (existingQuotes && existingQuotes.length > 0) {
            const lastNumber = existingQuotes[0].quote_number;
            const match = lastNumber.match(/QT-(\d{4})-(\d{3})/);
            if (match) {
                const year = new Date().getFullYear();
                const lastSeq = parseInt(match[2]);
                quoteNumber = 'QT-' + year + '-' + String(lastSeq + 1).padStart(3, '0');
            }
        }

        console.log('Creating quote:', quoteNumber);

        // Calculate totals
        let subtotal = 0;
        enquiry.enquiry_items.forEach(item => {
            subtotal += (item.target_price || 50) * item.quantity;
        });

        // Create quote
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .insert({
                company_id: companyId,
                quote_number: quoteNumber,
                enquiry_id: enquiry.id,
                buyer_id: enquiry.entity_id,
                quote_date: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                currency_code: 'USD',
                subtotal: subtotal,
                total_amount: subtotal,
                status: 'draft',
                payment_terms: '50% advance, 50% on delivery',
                delivery_terms: 'FOB',
                incoterms: 'FOB',
                created_by: user.id
            })
            .select()
            .single();

        if (quoteError) throw quoteError;

        console.log('Created quote:', quote.quote_number);

        // Create quote items
        const quoteItems = enquiry.enquiry_items.map(item => ({
            quote_id: quote.id,
            product_name: item.products.name,
            description: item.products.description,
            quantity: item.quantity,
            unit_price: item.target_price || 50,
            discount_percent: 0
        }));

        const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(quoteItems);

        if (itemsError) throw itemsError;

        console.log('Created', quoteItems.length, 'quote items');
        console.log('\nQuote created successfully!');
        console.log('Quote Number:', quote.quote_number);
        console.log('Total Amount: USD', subtotal.toFixed(2));
        console.log('\nYou can now:');
        console.log('1. View this quote in the Quotes page');
        console.log('2. Click the PDF download button');

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

createQuoteFromEnquiry().catch(console.error);
