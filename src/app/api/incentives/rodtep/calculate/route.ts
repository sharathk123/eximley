import { createSessionClient } from "@/lib/supabase/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { NextRequest, NextResponse } from "next/server";

// POST /api/incentives/rodtep/calculate
// Calculate RoDTEP incentive for a shipping bill
export async function POST(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const { shipping_bill_id } = body;

        if (!shipping_bill_id) {
            return NextResponse.json({ error: "shipping_bill_id is required" }, { status: 400 });
        }

        // Fetch shipping bill with items
        const { data: shippingBill, error: sbError } = await supabase
            .from("shipping_bills")
            .select(`
                *,
                export_orders (
                    order_number,
                    entities (name)
                ),
                shipping_bill_items (
                    id,
                    hsn_code,
                    description,
                    quantity,
                    unit,
                    unit_price,
                    total_value
                )
            `)
            .eq("id", shipping_bill_id)
            .eq("company_id", companyId)
            .single();

        if (sbError || !shippingBill) {
            return NextResponse.json({ error: "Shipping bill not found" }, { status: 404 });
        }

        // Calculate RoDTEP for each item
        const itemsWithRoDTEP = [];
        let totalRoDTEPAmount = 0;

        for (const item of shippingBill.shipping_bill_items || []) {
            // Get RoDTEP rate for this HSN code
            const { data: rateData } = await supabase.rpc('get_rodtep_rate', {
                p_hsn_code: item.hsn_code,
                p_date: shippingBill.sb_date
            });

            const rate = rateData?.[0];

            if (rate) {
                const itemFOB = item.total_value || (item.quantity * item.unit_price);
                let rodtepAmount = itemFOB * (rate.rate_percentage / 100);

                // Apply cap if exists
                if (rate.cap_per_unit) {
                    const maxAmount = item.quantity * rate.cap_per_unit;
                    rodtepAmount = Math.min(rodtepAmount, maxAmount);
                }

                totalRoDTEPAmount += rodtepAmount;

                itemsWithRoDTEP.push({
                    hsn_code: item.hsn_code,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    fob_value: itemFOB,
                    rodtep_rate: rate.rate_percentage,
                    rodtep_amount: Math.round(rodtepAmount * 100) / 100,
                    applicable: true,
                    cap_applied: rate.cap_per_unit ? (rodtepAmount === item.quantity * rate.cap_per_unit) : false
                });
            } else {
                // No rate found for this HSN
                itemsWithRoDTEP.push({
                    hsn_code: item.hsn_code,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    fob_value: item.total_value || (item.quantity * item.unit_price),
                    rodtep_rate: 0,
                    rodtep_amount: 0,
                    applicable: false,
                    reason: "No RoDTEP rate found for this HSN code"
                });
            }
        }

        // Calculate average rate
        const totalFOB = shippingBill.fob_value;
        const averageRate = totalFOB > 0 ? (totalRoDTEPAmount / totalFOB) * 100 : 0;

        return NextResponse.json({
            shipping_bill_id: shippingBill.id,
            shipping_bill_number: shippingBill.sb_number,
            sb_date: shippingBill.sb_date,
            buyer: shippingBill.export_orders?.entities?.name,
            order_number: shippingBill.export_orders?.order_number,
            total_fob_value: totalFOB,
            currency: shippingBill.currency_code,
            items: itemsWithRoDTEP,
            total_rodtep_amount: Math.round(totalRoDTEPAmount * 100) / 100,
            average_rodtep_rate: Math.round(averageRate * 100) / 100,
            calculated_at: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("RoDTEP calculation error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
