import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Create new version/revision of quote
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

        // Get original quote with items
        const { data: originalQuote, error: quoteError } = await supabase
            .from("quotes")
            .select(`
                *,
                quote_items (*)
            `)
            .eq("id", quote_id)
            .single();

        if (quoteError) throw quoteError;
        if (!originalQuote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // Create new quote as revision
        const newVersion = originalQuote.version + 1;
        const { id, quote_items, created_at, updated_at, ...quoteData } = originalQuote;

        const { data: newQuote, error: newQuoteError } = await supabase
            .from("quotes")
            .insert({
                ...quoteData,
                version: newVersion,
                parent_quote_id: quote_id,
                status: 'draft',
                pi_id: null,
                converted_to_pi_at: null,
                created_by: user.id,
            })
            .select()
            .single();

        if (newQuoteError) {
            console.error("Quote cloning error:", newQuoteError);
            throw newQuoteError;
        }

        // Copy quote items
        if (quote_items && Array.isArray(quote_items) && quote_items.length > 0) {
            const newItems = quote_items.map((item: any) => {
                // Exclude generated columns and identifiers
                const {
                    id,
                    quote_id,
                    created_at,
                    line_total,
                    total_price,
                    ...itemData
                } = item;

                return {
                    ...itemData,
                    quote_id: newQuote.id,
                };
            });

            const { error: itemsError } = await supabase
                .from("quote_items")
                .insert(newItems);

            if (itemsError) throw itemsError;
        }

        // Update original quote status to revised
        await supabase
            .from("quotes")
            .update({ status: 'revised' })
            .eq("id", quote_id);

        return NextResponse.json({ quote: newQuote }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/quotes/revise error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
