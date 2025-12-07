import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createSessionClient();
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
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }
    const companyId = companyUser.company_id;

    // Fetch shipments with related order and entity info
    const { data, error } = await supabase
        .from("shipments")
        .select(`
            *,
            export_orders (
                order_number,
                entities (name)
            ),
            shipment_items (
                id,
                quantity,
                package_number,
                order_items (
                    skus (sku_code, name)
                )
            )
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const supabase = await createSessionClient();
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
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }
    const companyId = companyUser.company_id;

    try {
        const json = await request.json();
        const { order_id, items, ...logistics } = json;

        if (!order_id || !items || !items.length) {
            return NextResponse.json({ error: "Order ID and Items are required" }, { status: 400 });
        }

        const shipment_number = `SHP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        // 1. Create Shipment
        const { data: shipment, error: shipmentError } = await supabase
            .from("shipments")
            .insert({
                company_id: companyId,
                shipment_number,
                order_id,
                status: 'drafted',
                ...logistics
            })
            .select()
            .single();

        if (shipmentError) throw shipmentError;

        // 2. Create Shipment Items
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
            // Cleanup shipment if items fail (Manual Rollback/Compensation since no Transactions via API readily available without RPC)
            // Or just accept partial failure risk for MVP prototype. 
            // Ideally use RPC for atomicity. For this prototype, separate inserts close enough.
            // We'll delete valid shipment to rollback.
            await supabase.from("shipments").delete().eq("id", shipment.id);
            throw itemsError;
        }

        // Update Order Status to 'shipped' or 'in_production'?
        // Maybe logic to check if full shipment? For now leave as 'in_production' or let user update.
        // Or update to 'in_production' if it was 'confirmed'.
        await supabase
            .from("export_orders")
            .update({ status: 'in_production' })
            .eq("id", order_id)
            .eq("status", "confirmed");


        return NextResponse.json(shipment);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createSessionClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const { error } = await supabase.from("shipments").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
    const supabase = await createSessionClient();
    const json = await request.json();
    const { id, ...updates } = json;

    if (!id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Safety: don't allow changing company_id
    delete updates.company_id;

    const { error } = await supabase.from("shipments").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
