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

        const sbId = params.id;

        // Get the shipping bill
        const { data: shippingBill, error: fetchError } = await supabase
            .from('shipping_bills')
            .select('*')
            .eq('id', sbId)
            .single();

        if (fetchError || !shippingBill) {
            return NextResponse.json({ error: "Shipping bill not found" }, { status: 404 });
        }

        // Check if shipping bill is in drafted or pending status
        if (shippingBill.status !== 'drafted' && shippingBill.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot approve shipping bill with status: ${shippingBill.status}` },
                { status: 400 }
            );
        }

        // Update shipping bill to filed (approved)
        const { data: updatedSB, error: updateError } = await supabase
            .from('shipping_bills')
            .update({
                status: 'filed',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', sbId)
            .select()
            .single();

        if (updateError) {
            console.error('Error approving shipping bill:', updateError);
            return NextResponse.json({ error: "Failed to approve shipping bill" }, { status: 500 });
        }

        return NextResponse.json({ shippingBill: updatedSB });
    } catch (error) {
        console.error('Error in approve endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
