const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyMigration() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log('='.repeat(70));
        console.log('VERIFYING total_price COLUMN');
        console.log('='.repeat(70));

        // Try to fetch quote items with the new column
        const { data: quoteItems, error } = await supabase
            .from('quote_items')
            .select('id, quantity, unit_price, discount_percent, tax_percent, line_total, total_price')
            .limit(5);

        if (error) {
            console.error('\n❌ Error fetching quote items:', error);
            console.log('\n⚠️  The total_price column may not exist yet.');
            console.log('Please ensure you ran the migration SQL in Supabase SQL Editor.');
            return;
        }

        console.log('\n✅ Column exists! Fetched quote items successfully.');

        if (quoteItems && quoteItems.length > 0) {
            console.log(`\nFound ${quoteItems.length} quote items:\n`);
            quoteItems.forEach((item, idx) => {
                console.log(`${idx + 1}. Quote Item ID: ${item.id.substring(0, 8)}...`);
                console.log(`   Quantity: ${item.quantity}`);
                console.log(`   Unit Price: ${item.unit_price}`);
                console.log(`   Discount: ${item.discount_percent}%`);
                console.log(`   Tax: ${item.tax_percent}%`);
                console.log(`   Line Total (after discount): ${item.line_total}`);
                console.log(`   Total Price (after discount + tax): ${item.total_price}`);
                console.log('');
            });
        } else {
            console.log('\nNo quote items found in database.');
        }

        // Now test the API endpoint
        console.log('='.repeat(70));
        console.log('TESTING /api/quotes ENDPOINT');
        console.log('='.repeat(70));

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'sharath.babuk@gmail.com',
            password: 'pass1234'
        });

        if (authError) {
            console.error('Login failed:', authError);
            return;
        }

        const response = await fetch('http://localhost:3000/api/quotes', {
            headers: {
                'Authorization': `Bearer ${authData.session.access_token}`
            }
        });

        const apiData = await response.json();

        if (response.ok) {
            console.log(`\n✅ API call successful! Found ${apiData.quotes?.length || 0} quotes`);

            if (apiData.quotes && apiData.quotes.length > 0) {
                const firstQuote = apiData.quotes[0];
                console.log(`\nFirst quote: ${firstQuote.quote_number}`);

                if (firstQuote.quote_items && firstQuote.quote_items.length > 0) {
                    console.log(`\nQuote items (showing total_price):`);
                    firstQuote.quote_items.forEach((item, idx) => {
                        console.log(`  ${idx + 1}. ${item.product_name || 'N/A'}`);
                        console.log(`     Line Total: ${item.line_total}, Total Price: ${item.total_price}`);
                    });
                }
            }
        } else {
            console.log(`\n❌ API call failed with status ${response.status}`);
            console.log('Error:', apiData);
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ VERIFICATION COMPLETE');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

verifyMigration().catch(console.error);
