import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Fetch all quotes with optional filtering
export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { searchParams } = new URL(request.url);

        const status = searchParams.get("status");
        const buyer_id = searchParams.get("buyer_id");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        let query = supabase
            .from("quotes")
            .select(`
                *,
                entities (
                    id,
                    name,
                    email,
                    country
                ),
                enquiries (
                    id,
                    enquiry_number
                ),
                proforma_invoices (
                    id,
                    invoice_number
                ),
                quote_items (
                    id,
                    sku_id,
                    product_name,
                    description,
                    quantity,
                    unit_price,
                    discount_percent,
                    tax_percent,
                    line_total
                )
            `)
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false });

        if (status) query = query.eq("status", status);
        if (buyer_id) query = query.eq("buyer_id", buyer_id);

        const { data: quotes, error } = await query;

        if (error) throw error;

        return NextResponse.json({ quotes });
    } catch (error: any) {
        console.error("GET /api/quotes error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new quote
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { items, ...quoteData } = body;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Generate quote number
        const { data: existingQuotes } = await supabase
            .from("quotes")
            .select("quote_number")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false })
            .limit(1);

        let quoteNumber = "QT-2024-001";
        if (existingQuotes && existingQuotes.length > 0) {
            const lastNumber = existingQuotes[0].quote_number;
            const match = lastNumber.match(/QT-(\d{4})-(\d{3})/);
            if (match) {
                const year = new Date().getFullYear();
                const lastYear = parseInt(match[1]);
                const lastSeq = parseInt(match[2]);

                if (year === lastYear) {
                    quoteNumber = `QT-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
                } else {
                    quoteNumber = `QT-${year}-001`;
                }
            }
        } else {
            const year = new Date().getFullYear();
            quoteNumber = `QT-${year}-001`;
        }

        // Create quote
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .insert({
                ...quoteData,
                company_id: companyUser.company_id,
                quote_number: quoteNumber,
                created_by: user.id,
            })
            .select()
            .single();

        if (quoteError) throw quoteError;

        // Create quote items if provided
        if (items && Array.isArray(items) && items.length > 0) {
            const quoteItems = items.map((item: any) => ({
                quote_id: quote.id,
                ...item,
            }));

            const { error: itemsError } = await supabase
                .from("quote_items")
                .insert(quoteItems);

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ quote }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/quotes error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update quote
export async function PUT(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { id, items, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Quote ID required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Update quote
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (quoteError) throw quoteError;

        // Update items if provided
        if (items) {
            // Delete existing items
            await supabase.from("quote_items").delete().eq("quote_id", id);

            // Insert new items
            if (items.length > 0) {
                const quoteItems = items.map((item: any) => ({
                    quote_id: id,
                    ...item,
                }));

                const { error: itemsError } = await supabase
                    .from("quote_items")
                    .insert(quoteItems);

                if (itemsError) throw itemsError;
            }
        }

        return NextResponse.json({ quote });
    } catch (error: any) {
        console.error("PUT /api/quotes error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete quote
export async function DELETE(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Quote ID required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await supabase
            .from("quotes")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/quotes error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
