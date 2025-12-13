import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: sbId } = await params;
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the original shipping bill with all related data
        const { data: originalSB, error: fetchError } = await supabase
            .from('shipping_bills')
            .select('*, shipping_bill_items(*)')
            .eq('id', sbId)
            .single();

        if (fetchError || !originalSB) {
            return NextResponse.json({ error: "Shipping bill not found" }, { status: 404 });
        }

        // Check if shipping bill can be revised
        const canRevise = ['drafted', 'pending', 'filed', 'rejected'].includes(originalSB.status);
        if (!canRevise) {
            return NextResponse.json(
                { error: `Cannot revise shipping bill with status: ${originalSB.status}` },
                { status: 400 }
            );
        }

        // Create new shipping bill (revision)
        const newVersion = (originalSB.version || 1) + 1;
        const { shipping_bill_items, id, created_at, updated_at, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, ...sbData } = originalSB;

        const { data: newSB, error: createError } = await supabase
            .from('shipping_bills')
            .insert({
                ...sbData,
                version: newVersion,
                status: 'drafted',
                revised_from_id: sbId,
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

        // Copy shipping bill items to new version
        if (shipping_bill_items && shipping_bill_items.length > 0) {
            const newItems = shipping_bill_items.map((item: any) => {
                const { id, shipping_bill_id, created_at, updated_at, ...itemData } = item;
                return {
                    ...itemData,
                    shipping_bill_id: newSB.id,
                };
            });

            const { error: itemsError } = await supabase
                .from('shipping_bill_items')
                .insert(newItems);

            if (itemsError) {
                console.error('Error copying shipping bill items:', itemsError);
            }
        }

        // Update original shipping bill status to 'revised'
        await supabase
            .from('shipping_bills')
            .update({
                status: 'revised',
                updated_at: new Date().toISOString(),
            })
            .eq('id', sbId);

        return NextResponse.json({ shippingBill: newSB });
    } catch (error) {
        console.error('Error in revise endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
