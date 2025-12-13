import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: orderId } = await params;    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the original order with all related data
        const { data: originalOrder, error: fetchError } = await supabase
            .from('export_orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (fetchError || !originalOrder) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Check if order can be revised
        const canRevise = ['pending', 'approved', 'rejected'].includes(originalOrder.status);
        if (!canRevise) {
            return NextResponse.json(
                { error: `Cannot revise order with status: ${originalOrder.status}` },
                { status: 400 }
            );
        }

        // Create new order (revision)
        const newVersion = (originalOrder.version || 1) + 1;
        const { order_items, id, created_at, updated_at, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, ...orderData } = originalOrder;

        const { data: newOrder, error: createError } = await supabase
            .from('export_orders')
            .insert({
                ...orderData,
                version: newVersion,
                status: 'pending',
                revised_from_id: orderId,
                approved_by: null,
                approved_at: null,
                rejected_by: null,
                rejected_at: null,
                rejection_reason: null,
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating revision:', createError);
            return NextResponse.json({ error: "Failed to create revision" }, { status: 500 });
        }

        // Copy order items to new order
        if (order_items && order_items.length > 0) {
            const newItems = order_items.map((item: any) => {
                const { id, order_id, created_at, updated_at, ...itemData } = item;
                return {
                    ...itemData,
                    order_id: newOrder.id,
                };
            });

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(newItems);

            if (itemsError) {
                console.error('Error copying order items:', itemsError);
                // Don't fail the whole operation, just log the error
            }
        }

        // Update original order status to 'revised'
        await supabase
            .from('export_orders')
            .update({
                status: 'revised',
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        return NextResponse.json({ order: newOrder });
    } catch (error) {
        console.error('Error in revise endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
