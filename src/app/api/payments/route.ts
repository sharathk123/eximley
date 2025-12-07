import { createSessionClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const supabase = await createSessionClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

    if (!userData) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get("order_id");

    let query = supabase
        .from("order_payments")
        .select("*, currencies(symbol)")
        .eq("company_id", userData.company_id)
        .order("payment_date", { ascending: false });

    if (order_id) {
        query = query.eq("order_id", order_id);
    }

    const { data: payments, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ payments });
}

export async function POST(request: NextRequest) {
    const supabase = await createSessionClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

    if (!userData) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    try {
        const body = await request.json();
        const { order_id, payment_date, amount, currency_code, exchange_rate, payment_method, reference_number, remarks } = body;

        // 1. Insert Payment
        const { data: payment, error: paymentError } = await supabase
            .from("order_payments")
            .insert({
                company_id: userData.company_id,
                order_id,
                payment_date,
                amount,
                currency_code,
                exchange_rate: exchange_rate || 1,
                payment_method,
                reference_number,
                remarks
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        // 2. Calculate total paid and update order payment_status
        const { data: allPayments } = await supabase
            .from("order_payments")
            .select("amount")
            .eq("order_id", order_id);

        const { data: order } = await supabase
            .from("export_orders")
            .select("total_amount")
            .eq("id", order_id)
            .single();

        if (allPayments && order) {
            const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            const totalAmount = Number(order.total_amount);

            let payment_status = 'unpaid';
            if (totalPaid >= totalAmount) {
                payment_status = 'paid';
            } else if (totalPaid > 0) {
                payment_status = 'partial';
            }

            await supabase
                .from("export_orders")
                .update({ payment_status })
                .eq("id", order_id);
        }

        return NextResponse.json({ success: true, payment });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
