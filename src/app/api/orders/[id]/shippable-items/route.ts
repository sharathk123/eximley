import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const orderId = params.id;
    const supabase = await createSessionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Order Items
    const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select(`
            id,
            product_id,
            quantity,
            unit_price,
            skus (sku_code, name),
            products (name)
        `)
        .eq("order_id", orderId);

    if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // 2. Fetch existing shipments for this order to calculate shipped quantities
    const { data: existingShipments, error: shipmentError } = await supabase
        .from("shipments")
        .select(`
            id,
            shipment_items (
                order_item_id,
                quantity
            )
        `)
        .eq("order_id", orderId);

    if (shipmentError) {
        return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }

    // 3. Calculate Shipped Quantities map
    const shippedQuantityMap: Record<string, number> = {};
    existingShipments.forEach(shipment => {
        shipment.shipment_items.forEach(item => {
            const current = shippedQuantityMap[item.order_item_id] || 0;
            shippedQuantityMap[item.order_item_id] = current + Number(item.quantity);
        });
    });

    // 4. Transform into "Shippable Items" (Remaining > 0)
    const shippableItems = orderItems.map(item => {
        const shipped = shippedQuantityMap[item.id] || 0;
        const remaining = Number(item.quantity) - shipped;

        return {
            ...item,
            shipped_quantity: shipped,
            remaining_quantity: remaining
        };
    }).filter(item => item.remaining_quantity > 0);

    return NextResponse.json(shippableItems);
}
