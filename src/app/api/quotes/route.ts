import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NumberingService } from "@/lib/services/numberingService";

// GET - Fetch all quotes with optional filtering
export const dynamic = 'force-dynamic';
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

        // Fetch quotes (RLS will filter by company automatically)
        let query = supabase
            .from("quotes")
            .select(`
                *,
                entities (
                    id,
                    name,
                    email,
                    phone,
                    address,
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
                    line_total,
                    total_price,
                    skus (
                        sku_code,
                        name,
                        hs_code,
                        products (
                            hsn_code
                        )
                    )
                )
            `)
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

        // Generate quote number using centralized service
        const quoteNumber = await NumberingService.generateNextNumber(companyUser.company_id, 'QUOTE');

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

        // Calculate totals from items if items are provided
        let calculatedTotals = {};
        if (items && Array.isArray(items)) {
            let subtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;

            items.forEach((item: any) => {
                const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
                const discount = itemSubtotal * ((item.discount_percent || 0) / 100);
                const afterDiscount = itemSubtotal - discount;
                const tax = afterDiscount * ((item.tax_percent || 0) / 100);

                subtotal += itemSubtotal;
                totalDiscount += discount;
                totalTax += tax;
            });

            calculatedTotals = {
                subtotal: subtotal,
                discount_amount: totalDiscount,
                tax_amount: totalTax,
                total_amount: subtotal - totalDiscount + totalTax
            };
        }

        // Update quote
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .update({
                ...updates,
                ...calculatedTotals,
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
                const quoteItems = items.map((item: any) => {
                    // Remove the id field if it exists (for new items)
                    const { id: itemId, ...itemData } = item;
                    return {
                        quote_id: id,
                        ...itemData,
                    };
                });

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
