
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Load env vars
let envConfig = {};
try {
    envConfig = dotenv.parse(fs.readFileSync('.env.local'));
} catch (e) {
    console.log('Could not read .env.local, checking process.env');
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_ANON_SECRET || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDocumentsTable() {
    console.log('Testing Documents Table Insert...');

    const dummyId = '00000000-0000-0000-0000-000000000000'; // UUID format

    const { data, error } = await supabase.from('documents').insert({
        entity_id: dummyId,
        entity_type: 'proforma_invoices',
        name: 'debug_test_file.pdf',
        type: 'pdf',
        size: 1024,
        url: 'commercial-docs/debug_test_file.pdf',
        bucket_id: 'commercial-docs'
    }).select();

    if (error) {
        console.error('Documents Insert Failed:', error);
        // Check if it's an RLS issue or schema issue
        if (error.code === '42703') {
            console.error('Schema Mismatch: Column does not exist.');
        }
    } else {
        console.log('Documents Insert Success:', data);

        // Clean up
        await supabase.from('documents').delete().eq('id', data[0].id);
    }
}

testDocumentsTable();
