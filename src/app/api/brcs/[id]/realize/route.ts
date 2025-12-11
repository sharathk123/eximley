import { createSessionClient } from "@/lib/supabase/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { NextRequest, NextResponse } from "next/server";

// POST /api/brcs/[id]/realize - Record payment realization
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const { id: brcId } = await params;
        const body = await req.json();
        const {
            amount,
            payment_date,
            payment_reference,
            payment_id,
            exchange_rate,
            amount_inr
        } = body;

        if (!amount || !payment_date) {
            return NextResponse.json(
                { error: "amount and payment_date are required" },
                { status: 400 }
            );
        }

        // Verify BRC belongs to user's company
        const { data: brc, error: brcError } = await supabase
            .from("brcs")
            .select("*")
            .eq("id", brcId)
            .eq("company_id", companyId)
            .single();

        if (brcError || !brc) {
            return NextResponse.json({ error: "BRC not found or access denied" }, { status: 404 });
        }

        // Check if payment amount exceeds pending amount
        if (parseFloat(amount) > parseFloat(brc.pending_amount)) {
            return NextResponse.json(
                { error: `Payment amount (${amount}) exceeds pending amount (${brc.pending_amount})` },
                { status: 400 }
            );
        }

        // Create payment record
        const { data: payment, error: paymentError } = await supabase
            .from("brc_payments")
            .insert({
                brc_id: brcId,
                payment_id,
                amount: parseFloat(amount),
                payment_date,
                payment_reference,
                exchange_rate: exchange_rate ? parseFloat(exchange_rate) : null,
                amount_inr: amount_inr ? parseFloat(amount_inr) : null
            })
            .select()
            .single();

        if (paymentError) {
            return NextResponse.json({ error: paymentError.message }, { status: 500 });
        }

        // Fetch updated BRC (trigger will have updated status)
        const { data: updatedBrc } = await supabase
            .from("brcs")
            .select(`
                *,
                shipping_bills (
                    sb_number,
                    export_orders (
                        order_number,
                        entities (name)
                    )
                ),
                brc_payments (
                    id,
                    amount,
                    payment_date,
                    payment_reference
                )
            `)
            .eq("id", brcId)
            .single();

        return NextResponse.json({
            message: "Payment realized successfully",
            brc: updatedBrc,
            payment
        }, { status: 201 });

    } catch (error: any) {
        console.error("Realize payment error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
