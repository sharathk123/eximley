const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkQuotesData() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('='.repeat(70));
        console.log('CHECKING QUOTES DATA');
        console.log('='.repeat(70));

        // Check all quotes with company info
        const { data: quotes, error: quotesError } = await supabase
            .from('quotes')
            .select(`
                id,
                quote_number,
                company_id,
                enquiry_id,
                buyer_id,
                total_amount,
                status,
                created_at,
                currency_code,
                quote_date
            `)
            .order('created_at', { ascending: false });

        if (quotesError) {
            console.error('Error fetching quotes:', quotesError);
            return;
        }

        console.log(`\nTotal Quotes Found: ${quotes?.length || 0}\n`);

        if (quotes && quotes.length > 0) {
            for (const quote of quotes) {
                console.log('─'.repeat(70));
                console.log(`Quote Number: ${quote.quote_number}`);
                console.log(`Quote ID: ${quote.id}`);
                console.log(`Company ID: ${quote.company_id}`);
                console.log(`Quote Date: ${quote.quote_date || 'N/A'}`);
                console.log(`Currency: ${quote.currency_code || 'USD'}`);
                console.log(`Total Amount: ${quote.total_amount || 0}`);
                console.log(`Status: ${quote.status}`);
                console.log(`Enquiry ID: ${quote.enquiry_id || 'N/A'}`);
                console.log(`Buyer ID: ${quote.buyer_id || 'N/A'}`);
                console.log(`Created: ${new Date(quote.created_at).toLocaleString()}`);

                // Get buyer details if buyer_id exists
                if (quote.buyer_id) {
                    const { data: buyer } = await supabase
                        .from('entities')
                        .select('name, entity_type')
                        .eq('id', quote.buyer_id)
                        .single();

                    if (buyer) {
                        console.log(`Buyer Name: ${buyer.name} (${buyer.entity_type})`);
                    }
                }

                // Get company details
                const { data: company } = await supabase
                    .from('companies')
                    .select('id, name, created_at')
                    .eq('id', quote.company_id)
                    .single();

                if (company) {
                    console.log(`Company Name: ${company.name}`);
                }

                // Get quote items count
                const { data: items, count } = await supabase
                    .from('quote_items')
                    .select('*', { count: 'exact' })
                    .eq('quote_id', quote.id);

                console.log(`Quote Items: ${count || 0}`);

                if (items && items.length > 0) {
                    items.forEach((item, idx) => {
                        console.log(`  ${idx + 1}. ${item.description || item.product_name || 'N/A'} - Qty: ${item.quantity}, Unit Price: ${item.unit_price}`);
                    });
                }
            }
        } else {
            console.log('No quotes found in the database.');
        }

        // Check all companies
        console.log('\n' + '='.repeat(70));
        console.log('ALL COMPANIES');
        console.log('='.repeat(70));

        const { data: companies } = await supabase
            .from('companies')
            .select('id, name, created_at')
            .order('created_at', { ascending: false });

        if (companies && companies.length > 0) {
            companies.forEach((company, idx) => {
                console.log(`${idx + 1}. ${company.name}`);
                console.log(`   ID: ${company.id}`);
                console.log(`   Created: ${new Date(company.created_at).toLocaleString()}`);
            });
        }

        // Check current user's company
        console.log('\n' + '='.repeat(70));
        console.log('CHECKING YOUR USER ACCOUNT');
        console.log('='.repeat(70));

        const { data: users } = await supabase
            .from('company_users')
            .select(`
                user_id,
                company_id,
                role,
                companies (
                    id,
                    name
                )
            `);

        if (users && users.length > 0) {
            console.log('\nUser-Company Mappings:');
            users.forEach((user, idx) => {
                console.log(`${idx + 1}. User ID: ${user.user_id.substring(0, 12)}...`);
                console.log(`   Company: ${user.companies?.name || 'N/A'}`);
                console.log(`   Company ID: ${user.company_id}`);
                console.log(`   Role: ${user.role}`);
            });
        }

        // Check enquiries
        console.log('\n' + '='.repeat(70));
        console.log('CHECKING ENQUIRIES');
        console.log('='.repeat(70));

        const { data: enquiries } = await supabase
            .from('enquiries')
            .select('id, enquiry_number, company_id, buyer_name, status, created_at')
            .order('created_at', { ascending: false });

        console.log(`\nTotal Enquiries Found: ${enquiries?.length || 0}\n`);

        if (enquiries && enquiries.length > 0) {
            enquiries.forEach((enq, idx) => {
                console.log(`${idx + 1}. ${enq.enquiry_number} - ${enq.buyer_name || 'N/A'}`);
                console.log(`   Company ID: ${enq.company_id}`);
                console.log(`   Status: ${enq.status}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

checkQuotesData().catch(console.error);
