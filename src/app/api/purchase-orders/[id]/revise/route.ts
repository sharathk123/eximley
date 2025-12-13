import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: poId } = await params;
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the original PO with all related data
        const { data: originalPo, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('*, purchase_order_items(*)')
            .eq('id', poId)
            .single();

        if (fetchError || !originalPo) {
            return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
        }

        // Check if PO can be revised
        const canRevise = ['pending', 'approved', 'rejected'].includes(originalPo.status);
        if (!canRevise) {
            return NextResponse.json(
                { error: `Cannot revise PO with status: ${originalPo.status}` },
                { status: 400 }
            );
        }

        // Create new PO (revision)
        const newVersion = (originalPo.version || 1) + 1;
        const { purchase_order_items, id, created_at, updated_at, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, ...poData } = originalPo;

        const { data: newPo, error: createError } = await supabase
            .from('purchase_orders')
            .insert({
                ...poData,
                version: newVersion,
                status: 'pending',
                revised_from_id: poId,
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

        // Copy PO items to new PO
        if (purchase_order_items && purchase_order_items.length > 0) {
            const newItems = purchase_order_items.map((item: any) => {
                const { id, po_id, created_at, updated_at, ...itemData } = item;
                return {
                    ...itemData,
                    po_id: newPo.id,
                };
            });

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(newItems);

            if (itemsError) {
                console.error('Error copying PO items:', itemsError);
            }
        }

        // Update original PO status to 'revised'
        await supabase
            .from('purchase_orders')
            .update({
                status: 'revised',
                updated_at: new Date().toISOString(),
            })
            .eq('id', poId);

        return NextResponse.json({ po: newPo });
    } catch (error) {
        console.error('Error in revise endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
