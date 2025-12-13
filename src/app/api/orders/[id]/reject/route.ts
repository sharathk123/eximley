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
        const body = await request.json();
        const { reason } = body;

        if (!reason || !reason.trim()) {
            return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
        }

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
                { error: `Cannot reject order with status: ${order.status}` },
                { status: 400 }
            );
        }

        // Update order to rejected
        const { data: updatedOrder, error: updateError } = await supabase
            .from('export_orders')
            .update({
                status: 'rejected',
                rejected_by: user.id,
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select()
            .single();

        if (updateError) {
            console.error('Error rejecting order:', updateError);
            return NextResponse.json({ error: "Failed to reject order" }, { status: 500 });
        }

        return NextResponse.json({ order: updatedOrder });
    } catch (error) {
        console.error('Error in reject endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
