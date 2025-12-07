import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Convert quote to Proforma Invoice
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { quote_id } = body;

        if (!quote_id) {
            return NextResponse.json({ error: "Quote ID required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Get quote details with items
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .select(`
                *,
                quote_items (*)
            `)
            .eq("id", quote_id)
            .single();

        if (quoteError) throw quoteError;
        if (!quote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // Generate PI number
        const { data: existingPIs } = await supabase
            .from("proforma_invoices")
            .select("invoice_number")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false })
            .limit(1);

        let piNumber = "PI-2024-001";
        if (existingPIs && existingPIs.length > 0) {
            const lastNumber = existingPIs[0].invoice_number;
            const match = lastNumber.match(/PI-(\d{4})-(\d{3})/);
            if (match) {
                const year = new Date().getFullYear();
                const lastYear = parseInt(match[1]);
                const lastSeq = parseInt(match[2]);

                if (year === lastYear) {
                    piNumber = `PI-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
                } else {
                    piNumber = `PI-${year}-001`;
                }
            }
        } else {
            const year = new Date().getFullYear();
            piNumber = `PI-${year}-001`;
        }

        // Create Proforma Invoice
        const { data: pi, error: piError } = await supabase
            .from("proforma_invoices")
            .insert({
                company_id: companyUser.company_id,
                invoice_number: piNumber,
                buyer_id: quote.buyer_id,
                date: new Date().toISOString().split('T')[0],
                valid_until: quote.valid_until,
                currency_code: quote.currency_code,
                total_amount: quote.total_amount,
                status: 'draft',
            })
            .select()
            .single();

        if (piError) throw piError;

        // Create PI items from quote items
        if (quote.quote_items && Array.isArray(quote.quote_items) && quote.quote_items.length > 0) {
            const piItems = quote.quote_items.map((item: any) => ({
                invoice_id: pi.id,
                sku_id: item.sku_id,
                description: item.description || item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
            }));

            const { error: itemsError } = await supabase
                .from("proforma_items")
                .insert(piItems);

            if (itemsError) throw itemsError;
        }

        // Update quote status to converted
        const { error: updateError } = await supabase
            .from("quotes")
            .update({
                status: 'converted',
                pi_id: pi.id,
                converted_to_pi_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", quote_id);

        if (updateError) throw updateError;

        return NextResponse.json({ pi, quote_id }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/quotes/convert-to-pi error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
