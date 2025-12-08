import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { ERRORS } from "@/lib/constants/messages";

export async function GET(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        let query = supabase
            .from("export_orders")
            .select(`
                *,
                entities (name),
                currencies (symbol),
                proforma_invoices (
                    id,
                    invoice_number
                ),
                order_items (
                    *,
                    skus (
                        sku_code,
                        name,
                        hs_code,
                        products (
                            hsn_code
                        )
                    )
                ),
                order_payments (
                    id,
                    amount,
                    payment_date,
                    payment_method
                )
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ orders: data });
    } catch (error: any) {
        const statusCode = error.message === ERRORS.UNAUTHORIZED ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status: statusCode });
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
            pi_id,
            order_date,
            currency_code,
            status,
            items // Array of { sku_id, quantity, unit_price }
        } = body;

        // Auto-generate order number (Standardize to match convert logic if possible, or keep simple)
        // Using simple date-based for now to avoid complex locking logic in this snippet, 
        // but ideally should match the ORD-YYYY-XXX format from PI conversion.
        const order_number = `ORD-${Date.now().toString().slice(-6)}`;

        // Calculate total
        const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

        // 1. Insert Order
        const { data: order, error: orderError } = await supabase
            .from("export_orders")
            .insert({
                company_id: companyUser.company_id,
                order_number,
                buyer_id,
                pi_id: pi_id || null,
                order_date,
                currency_code,
                status: status || 'pending',
                total_amount
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Insert Items
        if (items && items.length > 0) {
            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(
                    items.map((item: any) => ({
                        order_id: order.id,
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        description: item.description // Optional
                    }))
                );

            if (itemsError) {
                // Rollback order
                await supabase.from("export_orders").delete().eq("id", order.id);
                throw itemsError;
            }
        }

        return NextResponse.json({ order });
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
            .from("export_orders")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const supabase = await createSessionClient();
    try {
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Update order details
        const { error: orderError } = await supabase
            .from("export_orders")
            .update(updateData)
            .eq("id", id);

        if (orderError) throw orderError;

        // Update items if provided
        if (items) {
            // Delete existing items
            await supabase.from("order_items").delete().eq("order_id", id);

            // Insert new items
            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(
                    items.map((item: any) => ({
                        order_id: id,
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
