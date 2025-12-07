import { createSessionClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const supabase = await createSessionClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

    if (!userData) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { data: shipments, error } = await supabase
        .from("shipments")
        .select("*, export_orders(order_number, entities(name))")
        .eq("company_id", userData.company_id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ shipments });
}

export async function POST(request: NextRequest) {
    const supabase = await createSessionClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

    if (!userData) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    try {
        const body = await request.json();
        const { order_id, shipment_date, carrier, tracking_number, status, items } = body;

        // 1. Generate Shipment Number (Simple timestamp based for now)
        const shipment_number = `SH-${Date.now().toString().slice(-6)}`;

        // 2. Insert Shipment Header
        const { data: shipment, error: headerError } = await supabase
            .from("shipments")
            .insert({
                company_id: userData.company_id,
                shipment_number,
                order_id,
                shipment_date,
                carrier,
                tracking_number,
                status: status || 'drafted'
            })
            .select()
            .single();

        if (headerError) throw headerError;

        // 3. Insert Shipment Items (Packing List)
        if (items && items.length > 0) {
            const shipmentItems = items.map((item: any) => ({
                shipment_id: shipment.id,
                order_item_id: item.order_item_id,
                quantity: item.quantity,
                package_number: item.package_number
            }));

            const { error: itemsError } = await supabase
                .from("shipment_items")
                .insert(shipmentItems);

            if (itemsError) {
                // Rollback header if items fail
                await supabase.from("shipments").delete().eq("id", shipment.id);
                throw itemsError;
            }
        }

        return NextResponse.json({ success: true, shipment });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
