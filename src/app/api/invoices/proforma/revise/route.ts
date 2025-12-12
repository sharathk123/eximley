import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Create new version/revision of Proforma Invoice
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { invoice_id } = body;

        if (!invoice_id) {
            return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Get original invoice with items
        const { data: originalInvoice, error: invError } = await supabase
            .from("proforma_invoices")
            .select(`
                *,
                proforma_items (*)
            `)
            .eq("id", invoice_id)
            .single();

        if (invError) throw invError;
        if (!originalInvoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Create new invoice as revision
        const currentVersion = originalInvoice.version || 1;
        const newVersion = currentVersion + 1;
        const { id, proforma_items, created_at, updated_at, ...invData } = originalInvoice;

        const { data: newInvoice, error: newInvError } = await supabase
            .from("proforma_invoices")
            .insert({
                ...invData,
                version: newVersion,
                parent_invoice_id: invoice_id,
                status: 'draft',
                invoice_number: originalInvoice.invoice_number, // Keep number, version handles suffix in UI
                quote_id: originalInvoice.quote_id // Maintain lineage
            })
            .select()
            .single();

        if (newInvError) {
            console.error("PI revision error:", newInvError);
            throw newInvError;
        }

        // Copy items
        if (proforma_items && Array.isArray(proforma_items) && proforma_items.length > 0) {
            const newItems = proforma_items.map((item: any) => {
                const {
                    id,
                    invoice_id,
                    total_price, // Generated column
                    ...itemData
                } = item;

                return {
                    ...itemData,
                    invoice_id: newInvoice.id,
                };
            });

            const { error: itemsError } = await supabase
                .from("proforma_items")
                .insert(newItems);

            if (itemsError) throw itemsError;
        }

        // Update original invoice status to revised
        await supabase
            .from("proforma_invoices")
            .update({ status: 'revised' })
            .eq("id", invoice_id);

        return NextResponse.json({ invoice: newInvoice }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/invoices/proforma/revise error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
