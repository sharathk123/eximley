const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkPIs() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('--- Checking Documents ---');

    // 1. List All Companies
    const { data: companies } = await supabase.from('companies').select('id, legal_name, email');
    const companyMap = {};
    companies.forEach(c => companyMap[c.id] = c.legal_name);

    // 2. List All Users and their Companies
    const { data: { users } } = await supabase.auth.admin.listUsers();
    console.log(`\nFound ${users.length} users:`);
    for (const u of users) {
        const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', u.id).single();
        const compName = cu ? companyMap[cu.company_id] : 'No Company';
        console.log(`- ${u.email} (ID: ${u.id}) -> ${compName} (${cu?.company_id})`);
    }

    // 3. List All Proforma Invoices
    const { data: pis, error } = await supabase.from('proforma_invoices').select('*');
    if (error) {
        console.error('Error fetching PIs:', error);
        return;
    }

    console.log(`\nFound ${pis.length} Proforma Invoices in DB:`);
    pis.forEach(pi => {
        const compName = companyMap[pi.company_id] || pi.company_id;
        console.log(`- ${pi.invoice_number}: Company=${compName}, Status=${pi.status}`);
    });

}

checkPIs();
