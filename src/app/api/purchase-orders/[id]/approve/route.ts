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

        // Get the purchase order
        const { data: po, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('id', poId)
            .single();

        if (fetchError || !po) {
            return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
        }

        // Check if PO is in pending status
        if (po.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot approve PO with status: ${po.status}` },
                { status: 400 }
            );
        }

        // Update PO to approved
        const { data: updatedPo, error: updateError } = await supabase
            .from('purchase_orders')
            .update({
                status: 'approved',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', poId)
            .select()
            .single();

        if (updateError) {
            console.error('Error approving PO:', updateError);
            return NextResponse.json({ error: "Failed to approve purchase order" }, { status: 500 });
        }

        return NextResponse.json({ po: updatedPo });
    } catch (error) {
        console.error('Error in approve endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
