const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkTable() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Try to select from the table. If it fails, it doesn't exist.
    const { error } = await supabase.from('company_banks').select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.log('Table company_banks DOES NOT exist.');
        } else {
            console.log('Error checking table:', error);
        }
    } else {
        console.log('Table company_banks ALREADY EXISTS.');
    }
}

checkTable();
