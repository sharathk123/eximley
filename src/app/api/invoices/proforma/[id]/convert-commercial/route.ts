
import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createSessionClient();

    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 1. Fetch current invoice to verify status
        const { data: invoice, error: fetchError } = await supabase
            .from("proforma_invoices")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !invoice) {
            return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 }
            );
        }

        if (invoice.invoice_type === 'commercial') {
            return NextResponse.json(
                { error: "Invoice is already a Commercial Invoice" },
                { status: 400 }
            );
        }

        if (invoice.status !== 'approved') {
            return NextResponse.json(
                { error: "Only approved Proforma Invoices can be converted" },
                { status: 400 }
            );
        }

        // 2. Update invoice type
        const { error: updateError } = await supabase
            .from("proforma_invoices")
            .update({
                invoice_type: 'commercial',
                converted_to_commercial_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (updateError) {
            console.error("Error converting invoice:", updateError);
            return NextResponse.json(
                { error: "Failed to convert invoice" },
                { status: 500 }
            );
        }

        // 3. Return updated invoice
        return NextResponse.json({
            success: true,
            message: "Converted to Commercial Invoice successfully"
        });

    } catch (error: any) {
        console.error("Error in convert-commercial route:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
