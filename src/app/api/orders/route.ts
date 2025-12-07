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
                order_items (
                    *,
                    skus (sku_code, name)
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

        // Auto-generate order number
        const order_number = `SO-${Date.now().toString().slice(-6)}`;

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
