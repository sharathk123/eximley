import { createSessionClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const supabase = await createSessionClient();
    const { searchParams } = new URL(request.url);
    const purchase_order_id = searchParams.get("purchase_order_id");

    if (!purchase_order_id) {
        return NextResponse.json({ error: "Purchase Order ID required" }, { status: 400 });
    }

    const { data: payments, error } = await supabase
        .from("purchase_order_payments")
        .select("*")
        .eq("purchase_order_id", purchase_order_id)
        .order("payment_date", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
    const supabase = await createSessionClient();

    try {
        const body = await request.json();
        const { purchase_order_id, payment_date, amount, currency_code, exchange_rate, payment_method, reference_number, notes } = body;

        // 1. Insert Payment
        const { data: payment, error: paymentError } = await supabase
            .from("purchase_order_payments")
            .insert({
                purchase_order_id,
                payment_date,
                amount,
                currency_code,
                exchange_rate: exchange_rate || 1,
                payment_method,
                reference_number,
                notes
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        // 2. Fetch all payments to calculate totals
        const { data: allPayments } = await supabase
            .from("purchase_order_payments")
            .select("amount")
            .eq("purchase_order_id", purchase_order_id);

        // 3. Fetch PO to get total amount
        const { data: po } = await supabase
            .from("purchase_orders")
            .select("total_amount")
            .eq("id", purchase_order_id)
            .single();

        // 4. Update Payment Status
        if (allPayments && po) {
            const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            const totalAmount = Number(po.total_amount);

            let payment_status = 'unpaid';
            if (totalPaid >= totalAmount && totalAmount > 0) {
                payment_status = 'paid';
            } else if (totalPaid > 0) {
                payment_status = 'partial';
            }

            // If Overpaid (unlikely but possible), it's still 'paid'

            await supabase
                .from("purchase_orders")
                .update({ payment_status })
                .eq("id", purchase_order_id);
        }

        return NextResponse.json({ success: true, payment });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
