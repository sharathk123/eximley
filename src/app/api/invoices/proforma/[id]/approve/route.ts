import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const invoiceId = id;

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
                { error: `Cannot approve invoice with status: ${invoice.status}` },
                { status: 400 }
            );
        }

        // Update invoice to approved
        const { data: updatedInvoice, error: updateError } = await supabase
            .from('proforma_invoices')
            .update({
                status: 'approved',
                approved_by: user.id,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId)
            .select()
            .single();

        if (updateError) {
            console.error('Error approving invoice:', updateError);
            return NextResponse.json({ error: "Failed to approve invoice" }, { status: 500 });
        }

        return NextResponse.json({ invoice: updatedInvoice });
    } catch (error) {
        console.error('Error in approve endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
