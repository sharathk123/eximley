const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function moveEnquiriesToUserCompany() {
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

        // Find user by email
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();

        if (userError) throw userError;

        const user = users.users.find(u => u.email === userEmail);

        if (!user) {
            console.error('User not found:', userEmail);
            process.exit(1);
        }

        console.log('Found user:', user.id);

        // Get user's company
        const { data: companyUsers, error: companyUserError } = await supabase
            .from('company_users')
            .select('company_id, companies(id, legal_name)')
            .eq('user_id', user.id)
            .single();

        if (companyUserError) throw companyUserError;
        if (!companyUsers) {
            console.error('No company found for user');
            process.exit(1);
        }

        const targetCompanyId = companyUsers.company_id;
        console.log('Target company:', companyUsers.companies.legal_name, '(' + targetCompanyId + ')');

        // Get all enquiries not in this company
        const { data: enquiries, error: enquiriesError } = await supabase
            .from('enquiries')
            .select('id, enquiry_number, company_id')
            .neq('company_id', targetCompanyId);

        if (enquiriesError) throw enquiriesError;

        if (!enquiries || enquiries.length === 0) {
            console.log('No enquiries to move');
            return;
        }

        console.log('Found', enquiries.length, 'enquiries to move');

        // Move enquiries
        for (const enq of enquiries) {
            console.log('Moving enquiry:', enq.enquiry_number);

            const { error: updateError } = await supabase
                .from('enquiries')
                .update({
                    company_id: targetCompanyId,
                    assigned_to: user.id
                })
                .eq('id', enq.id);

            if (updateError) {
                console.error('Error moving', enq.enquiry_number, ':', updateError);
            } else {
                console.log('  Moved:', enq.enquiry_number);
            }
        }

        // Also move products and entities
        const { data: products } = await supabase
            .from('products')
            .select('id, name')
            .neq('company_id', targetCompanyId);

        if (products && products.length > 0) {
            console.log('\nMoving', products.length, 'products...');
            for (const prod of products) {
                await supabase
                    .from('products')
                    .update({ company_id: targetCompanyId })
                    .eq('id', prod.id);
                console.log('  Moved product:', prod.name);
            }
        }

        const { data: entities } = await supabase
            .from('entities')
            .select('id, name')
            .neq('company_id', targetCompanyId);

        if (entities && entities.length > 0) {
            console.log('\nMoving', entities.length, 'entities...');
            for (const ent of entities) {
                await supabase
                    .from('entities')
                    .update({ company_id: targetCompanyId })
                    .eq('id', ent.id);
                console.log('  Moved entity:', ent.name);
            }
        }

        console.log('\nAll data moved successfully!');
        console.log('You should now see the enquiries when logged in as', userEmail);

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

moveEnquiriesToUserCompany().catch(console.error);
