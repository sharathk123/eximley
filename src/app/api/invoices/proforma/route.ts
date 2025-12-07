
import { createSessionClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        let query: any = supabase
            .from("proforma_invoices")
            .select(`
                *,
                entities(name),
                currencies(symbol),
                proforma_items(
                    *,
                    skus(sku_code, name)
                ),
                quotes(
                    id,
                    quote_number
                ),
                export_orders(
                    id,
                    order_number
                )
            `);

        if (id) {
            query = query.eq("id", id).single();
        } else {
            query = query.order("created_at", { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ invoices: id ? [data] : data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 400 });
        }

        const body = await request.json();
        const {
            buyer_id,
            date,
            currency_code,
            conversion_rate,
            items // Array of { sku_id, quantity, unit_price }
        } = body;

        // Auto-generate invoice number (Simple logic for now)
        // Ideally should check DB for last number like we did in Quotes/Enquiries
        const invoice_number = `PI-${Date.now().toString().slice(-6)}`;

        // Calculate total
        const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

        // 1. Insert Invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from("proforma_invoices")
            .insert({
                company_id: companyUser.company_id,
                invoice_number,
                buyer_id,
                date,
                currency_code,
                conversion_rate,
                total_amount,
                status: 'draft'
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // 2. Insert Items
        if (items && items.length > 0) {
            const { error: itemsError } = await supabase
                .from("proforma_items")
                .insert(
                    items.map((item: any) => ({
                        invoice_id: invoice.id,
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        description: item.description // Optional
                    }))
                );

            if (itemsError) {
                // Cleanup invoice if items fail
                await supabase.from("proforma_invoices").delete().eq("id", invoice.id);
                throw itemsError;
            }
        }

        return NextResponse.json({ invoice });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createSessionClient();
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("proforma_invoices")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update Invoice
export async function PUT(request: Request) {
    const supabase = await createSessionClient();
    try {
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Update invoice details
        const { error: invoiceError } = await supabase
            .from("proforma_invoices")
            .update(updateData)
            .eq("id", id);

        if (invoiceError) throw invoiceError;

        // Update items if provided (delete all and recreate is simplest strategy here)
        if (items) {
            // Delete existing items
            await supabase.from("proforma_items").delete().eq("invoice_id", id);

            // Insert new items
            const { error: itemsError } = await supabase
                .from("proforma_items")
                .insert(
                    items.map((item: any) => ({
                        invoice_id: id,
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        description: item.description
                    }))
                );

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
