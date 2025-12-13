import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: invoiceId } = await params;    try {
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

        // Get the invoice
        const { data: invoice, error: fetchError } = await supabase
            .from('proforma_invoices')
            .select('*')
            .eq('id', invoiceId)
            .single();

        if (fetchError || !invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Check if invoice is in pending status
        if (invoice.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot reject invoice with status: ${invoice.status}` },
                { status: 400 }
            );
        }

        // Update invoice to rejected
        const { data: updatedInvoice, error: updateError } = await supabase
            .from('proforma_invoices')
            .update({
                status: 'rejected',
                rejected_by: user.id,
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
                updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId)
            .select()
            .single();

        if (updateError) {
            console.error('Error rejecting invoice:', updateError);
            return NextResponse.json({ error: "Failed to reject invoice" }, { status: 500 });
        }

        return NextResponse.json({ invoice: updatedInvoice });
    } catch (error) {
        console.error('Error in reject endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
