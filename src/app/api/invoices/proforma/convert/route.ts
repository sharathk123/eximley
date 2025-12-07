
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Convert Proforma Invoice to Confirmed Order
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { pi_id } = body;

        if (!pi_id) {
            return NextResponse.json({ error: "Proforma Invoice ID required" }, { status: 400 });
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

        // Get PI details with items
        const { data: pi, error: piError } = await supabase
            .from("proforma_invoices")
            .select("*, proforma_items(*)")
            .eq("id", pi_id)
            .single();

        if (piError) throw piError;
        if (!pi) {
            return NextResponse.json({ error: "Proforma Invoice not found" }, { status: 404 });
        }

        // Generate Order number
        const { data: existingOrders } = await supabase
            .from("export_orders")
            .select("order_number")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false })
            .limit(1);

        let orderNumber = "ORD-2024-001";
        if (existingOrders && existingOrders.length > 0) {
            const lastNumber = existingOrders[0].order_number;
            const match = lastNumber.match(/ORD-(\d{4})-(\d{3})/);
            if (match) {
                const year = new Date().getFullYear();
                const lastYear = parseInt(match[1]);
                const lastSeq = parseInt(match[2]);

                if (year === lastYear) {
                    orderNumber = `ORD-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
                } else {
                    orderNumber = `ORD-${year}-001`;
                }
            }
        } else {
            const year = new Date().getFullYear();
            orderNumber = `ORD-${year}-001`;
        }

        // Create Order
        const { data: order, error: orderError } = await supabase
            .from("export_orders")
            .insert({
                company_id: companyUser.company_id,
                order_number: orderNumber,
                buyer_id: pi.buyer_id,
                order_date: new Date().toISOString().split('T')[0],
                currency_code: pi.currency_code || 'USD',
                status: 'confirmed',
                total_amount: pi.total_amount,
                pi_id: pi.id
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Create Order Items from PI items
        if (pi.proforma_items && Array.isArray(pi.proforma_items)) {
            const orderItems = pi.proforma_items.map((item: any) => ({
                order_id: order.id,
                sku_id: item.sku_id,
                quantity: item.quantity,
                unit_price: item.unit_price
                // total_price is generated always
            }));

            if (orderItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from("order_items")
                    .insert(orderItems);

                if (itemsError) throw itemsError;
            }
        }

        // Update PI status to converted
        const { error: updateError } = await supabase
            .from("proforma_invoices")
            .update({
                status: 'converted'
            })
            .eq("id", pi_id);

        if (updateError) throw updateError;

        return NextResponse.json({ order, pi_id }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/invoices/proforma/convert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
