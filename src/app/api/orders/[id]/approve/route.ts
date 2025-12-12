import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orderId = params.id;

        // Get the order
        const { data: order, error: fetchError } = await supabase
            .from('export_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Check if order is in pending status
        if (order.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot approve order with status: ${order.status}` },
                { status: 400 }
            );
        }

        // Update order to approved
        const { data: updatedOrder, error: updateError } = await supabase
            .from('export_orders')
            .update({
                status: 'approved',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select()
            .single();

        if (updateError) {
            console.error('Error approving order:', updateError);
            return NextResponse.json({ error: "Failed to approve order" }, { status: 500 });
        }

        return NextResponse.json({ order: updatedOrder });
    } catch (error) {
        console.error('Error in approve endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
