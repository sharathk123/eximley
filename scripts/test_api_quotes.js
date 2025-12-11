const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testAPICall() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_SECRET;

  try {
    console.log('='.repeat(70));
    console.log('TESTING /api/quotes ENDPOINT');
    console.log('='.repeat(70));

    // Sign in as the user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: 'sharath.babuk@gmail.com',
      password: 'pass1234'
    });

    if (authError) {
      console.error('Login failed:', authError);
      return;
    }

    console.log('\n✅ Login successful!');
    console.log('Access Token:', authData.session.access_token.substring(0, 50) + '...');

    // Make API call to /api/quotes
    const response = await fetch('http://localhost:3000/api/quotes', {
      headers: {
        'Cookie': `sb-rsmnazjdqumqdsmlvzar-auth-token=${JSON.stringify(authData.session)}`,
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    });

    console.log('\nAPI Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ API call successful!');
      console.log(`Found ${data.quotes?.length || 0} quotes`);
      if (data.quotes && data.quotes.length > 0) {
        data.quotes.forEach(q => {
          console.log(`  - ${q.quote_number}`);
        });
      }
    } else {
      console.log('\n❌ API call failed!');
      console.log('Error:', data);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

testAPICall().catch(console.error);
