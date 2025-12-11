const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
try {
    const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    const envConfig = dotenv.parse(envLocal);
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_ROLE_KEY;
} catch (e) {
    console.log("Could not read .env.local");
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mocking NumberingService logic here since we can't easily import TS in node script without compilation
// BUT, we can just run a query to check if the logic holds, or better, try to create a dummy record if safe.
// Since creating records affects DB, I will just simulate the "Get Next Number" logic.

async function testNumberingLogic() {
    console.log("Testing Numbering Logic...");

    const { data: users } = await supabase.auth.admin.listUsers();
    const testUser = users.users.find(u => u.email === 'sharath.babuk@gmail.com');
    const { data: companyUser } = await supabase.from('company_users').select('company_id').eq('user_id', testUser.id).single();
    const companyId = companyUser.company_id;
    console.log("Company ID:", companyId);

    const year = new Date().getFullYear();
    const types = [
        { type: 'ENQUIRY', table: 'enquiries', col: 'enquiry_number', prefix: 'ENQ' },
        { type: 'QUOTE', table: 'quotes', col: 'quote_number', prefix: 'QT' },
        { type: 'PROFORMA', table: 'proforma_invoices', col: 'invoice_number', prefix: 'PI' },
        { type: 'ORDER', table: 'export_orders', col: 'order_number', prefix: 'EO' },
        { type: 'SHIPPING_BILL', table: 'shipping_bills', col: 'sb_number', prefix: 'SB' }
    ];

    for (const t of types) {
        const pattern = `${t.prefix}-${year}-%`;
        const { data } = await supabase
            .from(t.table)
            .select(t.col)
            .eq('company_id', companyId)
            .ilike(t.col, pattern)
            .order('created_at', { ascending: false })
            .limit(1);

        console.log(`[${t.type}] Latest ${t.prefix} Record:`, data && data.length > 0 ? data[0][t.col] : 'None (Will start at 001)');
    }
}

testNumberingLogic();
