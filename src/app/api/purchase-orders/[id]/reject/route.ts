import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const poId = id;
        const body = await request.json();
        const { reason } = body;

        if (!reason || !reason.trim()) {
            return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
        }

        // Get the PO
        const { data: po, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('id', poId)
            .single();

        if (fetchError || !po) {
            return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
        }

        // Check if PO is in pending status
        if (po.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot reject PO with status: ${po.status}` },
                { status: 400 }
            );
        }

        // Update PO to rejected
        const { data: updatedPo, error: updateError } = await supabase
            .from('purchase_orders')
            .update({
                status: 'rejected',
                rejected_by: user.id,
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
                updated_at: new Date().toISOString(),
            })
            .eq('id', poId)
            .select()
            .single();

        if (updateError) {
            console.error('Error rejecting PO:', updateError);
            return NextResponse.json({ error: "Failed to reject purchase order" }, { status: 500 });
        }

        return NextResponse.json({ po: updatedPo });
    } catch (error) {
        console.error('Error in reject endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
