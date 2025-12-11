import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { NumberingService } from "@/lib/services/numberingService";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await context.params;

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

        // Fetch the original quote with items
        const { data: originalQuote, error: fetchError } = await supabase
            .from("quotes")
            .select(`
                *,
                quote_items (*)
            `)
            .eq("id", id)
            .eq("company_id", companyUser.company_id)
            .single();

        console.log('Duplicate API - Fetch result:', { originalQuote, fetchError, id, companyId: companyUser.company_id });

        if (fetchError) {
            console.error('Duplicate API - Fetch error:', fetchError);
            return NextResponse.json({ error: `Failed to fetch quote: ${fetchError.message}` }, { status: 404 });
        }

        if (!originalQuote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // Generate new quote number
        const quoteNumber = await NumberingService.generateNextNumber(companyUser.company_id, 'QUOTE');

        // Create duplicate quote
        const { data: newQuote, error: createError } = await supabase
            .from("quotes")
            .insert({
                company_id: companyUser.company_id,
                quote_number: quoteNumber,
                buyer_id: originalQuote.buyer_id,
                enquiry_id: originalQuote.enquiry_id,
                quote_date: new Date().toISOString().split('T')[0],
                valid_until: originalQuote.valid_until,
                currency_code: originalQuote.currency_code,
                status: 'draft',
                version: 1,
                subtotal: originalQuote.subtotal,
                tax_amount: originalQuote.tax_amount,
                discount_amount: originalQuote.discount_amount,
                total_amount: originalQuote.total_amount,
                payment_terms: originalQuote.payment_terms,
                delivery_terms: originalQuote.delivery_terms,
                incoterms: originalQuote.incoterms,
                notes: originalQuote.notes,
                created_by: user.id,
            })
            .select()
            .single();

        if (createError) throw createError;

        // Duplicate quote items
        if (originalQuote.quote_items && originalQuote.quote_items.length > 0) {
            const duplicateItems = originalQuote.quote_items.map((item: any) => ({
                quote_id: newQuote.id,
                sku_id: item.sku_id,
                product_name: item.product_name,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percent: item.discount_percent,
                tax_percent: item.tax_percent,
            }));

            const { error: itemsError } = await supabase
                .from("quote_items")
                .insert(duplicateItems);

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ quote: newQuote }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/quotes/[id]/duplicate error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
