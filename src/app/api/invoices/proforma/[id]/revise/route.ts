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

        const invoiceId = params.id;

        // Get the original invoice with all related data
        const { data: originalInvoice, error: fetchError } = await supabase
            .from('proforma_invoices')
            .select('*, proforma_items(*)')
            .eq('id', invoiceId)
            .single();

        if (fetchError || !originalInvoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Check if invoice can be revised
        const canRevise = ['pending', 'approved', 'rejected'].includes(originalInvoice.status);
        if (!canRevise) {
            return NextResponse.json(
                { error: `Cannot revise invoice with status: ${originalInvoice.status}` },
                { status: 400 }
            );
        }

        // Create new invoice (revision)
        const newVersion = (originalInvoice.version || 1) + 1;
        const { proforma_items, id, created_at, updated_at, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, ...invoiceData } = originalInvoice;

        const { data: newInvoice, error: createError } = await supabase
            .from('proforma_invoices')
            .insert({
                ...invoiceData,
                version: newVersion,
                status: 'pending',
                revised_from_id: invoiceId,
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

        // Copy invoice items to new invoice
        if (proforma_items && proforma_items.length > 0) {
            const newItems = proforma_items.map((item: any) => {
                const { id, invoice_id, created_at, updated_at, ...itemData } = item;
                return {
                    ...itemData,
                    invoice_id: newInvoice.id,
                };
            });

            const { error: itemsError } = await supabase
                .from('proforma_items')
                .insert(newItems);

            if (itemsError) {
                console.error('Error copying invoice items:', itemsError);
            }
        }

        // Update original invoice status to 'revised'
        await supabase
            .from('proforma_invoices')
            .update({
                status: 'revised',
                updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);

        return NextResponse.json({ invoice: newInvoice });
    } catch (error) {
        console.error('Error in revise endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
