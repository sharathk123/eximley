const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createApprovalQuote() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        const userEmail = 'sharath.babuk@gmail.com';
        console.log('Creating approval test quote for:', userEmail);

        // Get user
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === userEmail);

        if (!user) {
            console.error('User not found');
            process.exit(1);
        }

        // Get company
        const { data: companyUsers } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        const companyId = companyUsers.company_id;

        // Get a buyer
        let { data: buyers } = await supabase
            .from('entities')
            .select('*')
            .eq('company_id', companyId)
            .eq('type', 'buyer')
            .limit(1);

        const buyerId = buyers[0].id;

        // Create High Value Quote > 10000
        const quoteData = {
            company_id: companyId,
            buyer_id: buyerId,
            quote_number: `QT-APPROVAL-${Date.now()}`,
            quote_date: new Date().toISOString().split('T')[0],
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'draft',
            currency_code: 'USD',
            subtotal: 15000.00,
            tax_amount: 0,
            total_amount: 15000.00, // > 10,000 threshold
            payment_terms: 'Net 30',
            delivery_terms: 'FOB',
            notes: 'High value quote requiring approval'
        };

        const { data: quote, error } = await supabase
            .from('quotes')
            .insert(quoteData)
            .select()
            .single();

        if (error) throw error;

        console.log('Created High Value Quote:', quote.quote_number);
        console.log('ID:', quote.id);
        console.log('Total:', quote.total_amount);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createApprovalQuote();
