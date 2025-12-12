const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function simulateApi() {
    console.log("--- Starting API Simulation ---");
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Mock Auth (Get User)
    const email = 'testuser_v1@example.com';
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    if (!user) throw new Error("User not found");
    console.log(`[Auth] User ID: ${user.id}`);

    // 2. Mock Get Company
    const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
    if (!companyUser) throw new Error("Company not found");
    console.log(`[Auth] Company ID: ${companyUser.company_id}`);

    // 3. Mock Step 1: Fetch Invoices
    console.log("\n[Step 1] Fetching Invoices...");
    const { data: invoices, error: invError } = await supabase
        .from("proforma_invoices")
        .select(`
            id, invoice_number, buyer_id, bank_id, currency_code, total_amount,
            proforma_items(*)
        `)
        .eq("company_id", companyUser.company_id)
        .order("created_at", { ascending: false });

    if (invError) {
        console.error("FAILED to fetch invoices:", invError);
        return;
    }
    console.log(`Found ${invoices.length} invoices.`);

    // 4. Mock Step 2: Extract IDs
    const buyerIds = [...new Set(invoices.map(i => i.buyer_id).filter(Boolean))];
    const bankIds = [...new Set(invoices.map(i => i.bank_id).filter(Boolean))];
    const currencyCodes = [...new Set(invoices.map(i => i.currency_code).filter(Boolean))];

    console.log(`\n[Step 2] IDs extracted:`);
    console.log(`- Buyers: ${buyerIds.length}`);
    console.log(`- Banks: ${bankIds.length}`);
    console.log(`- Currencies: ${currencyCodes.length}`);

    // 5. Mock Step 3: Fetch Related
    console.log("\n[Step 3] Fetching Relation Data...");
    const [buyersRes, banksRes, currenciesRes] = await Promise.all([
        buyerIds.length ? supabase.from("entities").select("id, name").in("id", buyerIds) : { data: [] },
        bankIds.length ? supabase.from("company_banks").select("*").in("id", bankIds) : { data: [] },
        currencyCodes.length ? supabase.from("currencies").select("code, symbol").in("code", currencyCodes) : { data: [] }
    ]);

    if (buyersRes.error) console.error("Buyer Fetch Error:", buyersRes.error);
    if (banksRes.error) console.error("Bank Fetch Error:", banksRes.error);

    console.log(`Fetched ${buyersRes.data?.length} buyers.`);
    console.log(`Fetched ${banksRes.data?.length} banks.`);
    console.log(`Fetched ${currenciesRes.data?.length} currencies.`);

    // 6. Mock Step 4: Enrich
    console.log("\n[Step 4] Enriching Data...");
    const buyerMap = new Map(buyersRes.data?.map(b => [b.id, b]) || []);
    const bankMap = new Map(banksRes.data?.map(b => [b.id, b]) || []);
    const currencyMap = new Map(currenciesRes.data?.map(c => [c.code, c]) || []);

    const enrichedInvoices = invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        buyer_name: buyerMap.get(inv.buyer_id)?.name || 'Unknown',
        bank_name: bankMap.get(inv.bank_id)?.bank_name || 'None',
        currency: currencyMap.get(inv.currency_code)?.symbol || inv.currency_code
    }));

    console.log("\n--- RESULT Preview (First 3) ---");
    console.table(enrichedInvoices.slice(0, 3));
    console.log("--- Simulation Complete: SUCCESS ---");
}

simulateApi();
