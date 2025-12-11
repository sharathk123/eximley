const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkQuotesForUser() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const userEmail = 'sharath.babuk@gmail.com';
        console.log('Checking data for:', userEmail);
        console.log('='.repeat(60));

        // Find user
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === userEmail);

        if (!user) {
            console.error('User not found');
            process.exit(1);
        }

        console.log('\nUser ID:', user.id);

        // Get user's company
        const { data: companyUsers } = await supabase
            .from('company_users')
            .select('company_id, companies(legal_name, trade_name)')
            .eq('user_id', user.id)
            .single();

        const companyId = companyUsers.company_id;
        const companyName = companyUsers.companies.legal_name || companyUsers.companies.trade_name;

        console.log('Company:', companyName);
        console.log('Company ID:', companyId);

        // Check enquiries
        console.log('\n' + '='.repeat(60));
        console.log('ENQUIRIES:');
        console.log('='.repeat(60));

        const { data: enquiries } = await supabase
            .from('enquiries')
            .select('id, enquiry_number, customer_name, status, company_id')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (enquiries && enquiries.length > 0) {
            enquiries.forEach(enq => {
                console.log(`- ${enq.enquiry_number}: ${enq.customer_name} (${enq.status})`);
            });
            console.log(`\nTotal: ${enquiries.length} enquiries`);
        } else {
            console.log('No enquiries found');
        }

        // Check quotes
        console.log('\n' + '='.repeat(60));
        console.log('QUOTES:');
        console.log('='.repeat(60));

        const { data: quotes } = await supabase
            .from('quotes')
            .select('id, quote_number, status, total_amount, currency_code, company_id, entities:buyer_id(name)')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (quotes && quotes.length > 0) {
            quotes.forEach(quote => {
                const buyerName = quote.entities?.name || 'N/A';
                console.log(`- ${quote.quote_number}: ${buyerName} - ${quote.currency_code} ${quote.total_amount} (${quote.status})`);
            });
            console.log(`\nTotal: ${quotes.length} quotes`);
        } else {
            console.log('No quotes found');
        }

        // Check products
        console.log('\n' + '='.repeat(60));
        console.log('PRODUCTS:');
        console.log('='.repeat(60));

        const { data: products } = await supabase
            .from('products')
            .select('id, name, category')
            .eq('company_id', companyId);

        if (products && products.length > 0) {
            products.forEach(prod => {
                console.log(`- ${prod.name} (${prod.category || 'No category'})`);
            });
            console.log(`\nTotal: ${products.length} products`);
        } else {
            console.log('No products found');
        }

        // Check entities
        console.log('\n' + '='.repeat(60));
        console.log('ENTITIES (Buyers/Suppliers):');
        console.log('='.repeat(60));

        const { data: entities } = await supabase
            .from('entities')
            .select('id, name, type, country')
            .eq('company_id', companyId);

        if (entities && entities.length > 0) {
            entities.forEach(ent => {
                console.log(`- ${ent.name} (${ent.type}) - ${ent.country || 'N/A'}`);
            });
            console.log(`\nTotal: ${entities.length} entities`);
        } else {
            console.log('No entities found');
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY:');
        console.log('='.repeat(60));
        console.log(`Company: ${companyName}`);
        console.log(`Enquiries: ${enquiries?.length || 0}`);
        console.log(`Quotes: ${quotes?.length || 0}`);
        console.log(`Products: ${products?.length || 0}`);
        console.log(`Entities: ${entities?.length || 0}`);
        console.log('='.repeat(60));

        // Document storage info
        console.log('\n' + '='.repeat(60));
        console.log('DOCUMENT STORAGE ARCHITECTURE:');
        console.log('='.repeat(60));
        console.log('\nCurrent Implementation:');
        console.log('- PDFs are generated on-demand (not stored)');
        console.log('- Direct download to browser');
        console.log('- No Supabase Storage required');
        console.log('\nMulti-tenant Structure (if we enable storage):');
        console.log('- Bucket: "documents"');
        console.log('- Path: documents/{company_id}/{document_type}/{filename}');
        console.log('- Example: documents/48750c5a.../quotes/QT-2025-004.pdf');
        console.log('- RLS policies ensure company isolation');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

checkQuotesForUser().catch(console.error);
